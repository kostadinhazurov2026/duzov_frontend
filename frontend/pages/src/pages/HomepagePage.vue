<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const SEARCH_ERROR_MESSAGE = 'Грешка при зареждане на резултатите. Моля опитайте отново.'
const photoDataUrl = ref('')
const activeDropdown = ref('')
const hasSearched = ref(false)
const isSavingOffer = ref(false)
const results = ref([])
const resultsError = ref('')
const offerStatus = reactive({ message: '', type: '' })
const searchForm = reactive({ product: '', location: '', maxPrice: '' })
const offerForm = reactive({ product: '', region: '', price: '', description: '' })

const SEED = {
  towns: ['София', 'Пловдив', 'Варна', 'Бургас', 'Русе', 'Стара Загора', 'Плевен', 'Велико Търново', 'с. Железница'],
  products: ['Домати', 'Краставици', 'Картофи', 'Ябълки', 'Мед', 'Мляко', 'Жито', 'Царевица', 'Слънчоглед'],
  prices: ['1.00', '1.50', '2.00', '2.50', '3.00', '5.00', '10.00'],
  items: [
    { type: 'farmer', name: 'Ферма ЗеленЛист', location: 'София', product: 'Домати', price: 2.4, unit: 'kg', rating: 4.8, tags: ['био', 'фактура'] },
    { type: 'farmer', name: 'Пчелин Тракия', location: 'Пловдив', product: 'Мед', price: 12, unit: 'pcs', rating: 4.6, tags: ['домашен'] },
    { type: 'offer', title: 'Жито реколта 2025', location: 'Варна', product: 'Жито', price: 1.5, unit: 'kg', rating: 4.4, tags: ['налично'] },
    { type: 'offer', title: 'Картофи едро', location: 'Русе', product: 'Картофи', price: 0.95, unit: 'kg', rating: 4.2, tags: ['едро'] },
  ],
}

function safeJsonParse(value, fallback) {
  try { return JSON.parse(value) } catch { return fallback }
}

function parseUnit(raw) {
  const value = String(raw || '').trim().toLowerCase()
  if (!value) return ''
  if (value.startsWith('кг') || value === 'kg') return 'kg'
  if (value.startsWith('бр') || value === 'pcs' || value === 'pc') return 'pcs'
  if (value === 'т' || value === 't') return 't'
  return ''
}

function parseQuantity(text) {
  const source = String(text || '').trim().toLowerCase()
  const match = source.match(/(\d+(?:[.,]\d+)?)\s*(кг|kg|бр\.?|pcs?|т|t)/i)
  if (!match) return { amount: Number.NaN, unit: '' }
  return { amount: Number(match[1].replace(',', '.')), unit: parseUnit(match[2]) }
}

function unitText(unit) {
  if (unit === 'kg') return 'кг'
  if (unit === 'pcs') return 'бр.'
  if (unit === 't') return 'т'
  return unit || ''
}

function normalizeOffer(offer) {
  const quantity = parseQuantity(offer.quantity)
  const priceMatch = String(offer.price ?? '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  const price = priceMatch ? Number(priceMatch[0]) : Number.NaN

  return {
    type: 'offer',
    title: offer.sellerName ? `Обява от ${offer.sellerName}` : `Обява: ${offer.product || 'Продукт'}`,
    location: offer.region || '',
    product: offer.product || '',
    price: Number.isFinite(price) ? price : 0,
    unit: quantity.unit || '',
    quantityLabel: offer.quantity || '',
    rating: 5,
    tags: ['нова'],
  }
}

function loadOffers() {
  const offers = safeJsonParse(localStorage.getItem('mp_offers') || '[]', [])
  return Array.isArray(offers) ? offers.map(normalizeOffer) : []
}

function filterItemsLocal(query) {
  return [...loadOffers(), ...SEED.items]
    .filter((item) => !query.product || String(item.product || '').toLowerCase().includes(query.product))
    .filter((item) => !query.location || String(item.location || '').toLowerCase().includes(query.location))
    .filter((item) => !Number.isFinite(query.maxPrice) || Number(item.price) <= query.maxPrice)
}

function buildSearchParams(query) {
  const params = new URLSearchParams()
  if (query.product) params.append('product', query.product)
  if (query.location) params.append('location', query.location)
  if (query.maxPrice && Number.isFinite(query.maxPrice)) params.append('maxPrice', String(query.maxPrice))
  return params
}

function parsedQuery() {
  return {
    product: searchForm.product.trim().toLowerCase(),
    location: searchForm.location.trim().toLowerCase(),
    maxPrice: Number(searchForm.maxPrice.replace(',', '.')),
  }
}

async function searchOffers(query) {
  try {
    const response = await fetch(`/api/offers/search?${buildSearchParams(query).toString()}`)
    if (!response.ok) throw new Error()
    const offers = await response.json()
    return offers.map(normalizeOffer)
  } catch {
    return filterItemsLocal(query)
  }
}

function showOfferStatus(message, type) {
  offerStatus.message = message
  offerStatus.type = type
}

function saveOfferLocal(offer) {
  const offers = safeJsonParse(localStorage.getItem('mp_offers'), [])
  offers.unshift(offer)
  localStorage.setItem('mp_offers', JSON.stringify(offers.slice(0, 50)))
}

async function publishOffer(offer) {
  const response = await fetch('/api/offers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(offer),
  })

  if (!response.ok) throw new Error()
  return response.json()
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Грешка при зареждане на снимката.'))
    reader.readAsDataURL(file)
  })
}

async function onPhotoSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 10485760) return showOfferStatus('Файлът е твърде голям (макс. 10MB)', 'error')
  if (!file.type.startsWith('image/')) return showOfferStatus('Моля, качи снимка (JPG, PNG, WebP)', 'error')

  try {
    photoDataUrl.value = await toDataUrl(file)
  } catch (error) {
    showOfferStatus(error instanceof Error ? error.message : 'Грешка при зареждане', 'error')
  }
}

async function submitSearch() {
  hasSearched.value = true
  resultsError.value = ''
  try {
    results.value = await searchOffers(parsedQuery())
  } catch {
    results.value = []
    resultsError.value = SEARCH_ERROR_MESSAGE
  } finally {
    activeDropdown.value = ''
  }
}

function resetSearch() {
  searchForm.product = ''
  searchForm.location = ''
  searchForm.maxPrice = ''
  results.value = []
  resultsError.value = ''
  hasSearched.value = false
  activeDropdown.value = ''
}

async function submitOffer() {
  const product = offerForm.product.trim()
  const price = Number(offerForm.price.trim().replace(',', '.'))
  const region = offerForm.region.trim()
  const description = offerForm.description.trim()
  const profile = safeJsonParse(localStorage.getItem('mp_profile'), null)

  if (!product) return showOfferStatus('Моля, въведи име на продукта.', 'error')
  if (!Number.isFinite(price) || price <= 0) return showOfferStatus('Моля, въведи валидна цена.', 'error')
  if (!photoDataUrl.value) return showOfferStatus('Моля, качи снимка на продукта.', 'error')

  isSavingOffer.value = true

  const offer = {
    id: crypto?.randomUUID?.() || String(Date.now()),
    product,
    region,
    price: Number(price.toFixed(2)),
    description,
    photoDataUrl: photoDataUrl.value,
    createdAt: new Date().toISOString(),
    sellerName: profile?.name || '',
    sellerEmail: profile?.email || '',
    sellerPhone: profile?.phone || '',
  }

  try {
    await publishOffer(offer)
    saveOfferLocal(offer)
  } catch {
    isSavingOffer.value = false
    return showOfferStatus('Грешка при публикуване на обявата. Моля опитайте отново.', 'error')
  }

  offerForm.product = ''
  offerForm.region = ''
  offerForm.price = ''
  offerForm.description = ''
  photoDataUrl.value = ''
  isSavingOffer.value = false
  showOfferStatus('Обявата е публикувана! ✓', 'success')

  window.setTimeout(async () => {
    if (hasSearched.value) await submitSearch()
    showOfferStatus('', '')
  }, 2000)
}

const productOptions = computed(() => {
  const query = searchForm.product.toLowerCase()
  return (query ? SEED.products.filter((option) => option.toLowerCase().includes(query)) : SEED.products).slice(0, 3)
})

const locationOptions = computed(() => {
  const query = searchForm.location.toLowerCase()
  return (query ? SEED.towns.filter((option) => option.toLowerCase().includes(query)) : SEED.towns).slice(0, 3)
})

const priceOptions = computed(() => {
  const query = searchForm.maxPrice.toLowerCase()
  return (query ? SEED.prices.filter((option) => option.toLowerCase().includes(query)) : SEED.prices).slice(0, 3)
})

function selectDropdownValue(key, value) {
  searchForm[key] = value
  activeDropdown.value = ''
}

function handlePointerDown(event) {
  if (!event.target.closest('[data-dropdown-root]')) activeDropdown.value = ''
}

onMounted(() => document.addEventListener('pointerdown', handlePointerDown, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handlePointerDown, true))
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="Към началната страница">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-text">NaturaLinka</span>
      </RouterLink>

      <nav class="topbar-actions" aria-label="Основна навигация">
        <RouterLink class="icon-btn" :class="{ active: route.name === 'home' }" :to="{ name: 'home' }"><span class="icon">🏠</span><span class="label">Начало</span></RouterLink>
        <RouterLink class="icon-btn" :class="{ active: route.name === 'notifications' }" :to="{ name: 'notifications' }"><span class="icon">🔔</span><span class="label">Известия</span></RouterLink>
        <RouterLink class="icon-btn" :class="{ active: route.name === 'profile' }" :to="{ name: 'profile' }"><span class="icon">👤</span><span class="label">Профил</span></RouterLink>
      </nav>
    </div>
  </header>

  <main class="page">
    <form id="searchForm" class="section-card" autocomplete="off" @submit.prevent="submitSearch">
      <div class="section-header">
        <span class="section-icon" aria-hidden="true">🔍</span>
        <h2 class="section-title">Търсене на продукти</h2>
      </div>

      <div class="filter-row">
        <div data-dropdown-root class="filter-field dropdown-wrap">
          <label for="productInput">Продукт</label>
          <input id="productInput" v-model="searchForm.product" name="product" class="styled-input" type="text" placeholder="Всички продукти" autocomplete="off" @focus="activeDropdown = 'product'" @input="activeDropdown = 'product'">
          <div id="productDropdown" class="custom-dropdown" :class="{ open: activeDropdown === 'product' && productOptions.length }">
            <button v-for="option in productOptions" :key="option" type="button" class="dd-option" @mousedown.prevent="selectDropdownValue('product', option)">{{ option }}</button>
          </div>
        </div>

        <div data-dropdown-root class="filter-field dropdown-wrap">
          <label for="locationInput">Регион</label>
          <input id="locationInput" v-model="searchForm.location" name="location" class="styled-input" type="text" placeholder="Всички региони" autocomplete="off" @focus="activeDropdown = 'location'" @input="activeDropdown = 'location'">
          <div id="locationDropdown" class="custom-dropdown" :class="{ open: activeDropdown === 'location' && locationOptions.length }">
            <button v-for="option in locationOptions" :key="option" type="button" class="dd-option" @mousedown.prevent="selectDropdownValue('location', option)">{{ option }}</button>
          </div>
        </div>

        <div data-dropdown-root class="filter-field dropdown-wrap">
          <label for="maxPriceInput">Макс. цена</label>
          <input id="maxPriceInput" v-model="searchForm.maxPrice" name="maxPrice" class="styled-input" type="text" placeholder="0.00 €" autocomplete="off" @focus="activeDropdown = 'maxPrice'" @input="activeDropdown = 'maxPrice'">
          <div id="maxPriceDropdown" class="custom-dropdown" :class="{ open: activeDropdown === 'maxPrice' && priceOptions.length }">
            <button v-for="option in priceOptions" :key="option" type="button" class="dd-option" @mousedown.prevent="selectDropdownValue('maxPrice', option)">{{ option }}</button>
          </div>
        </div>

        <div class="filter-buttons">
          <button id="searchBtn" class="btn btn-primary" type="submit">🔍 Търси</button>
          <button id="resetBtn" class="btn btn-ghost" type="button" @click="resetSearch">Изчисти</button>
        </div>
      </div>
    </form>

    <section class="section-card" aria-labelledby="offer-section-title">
      <div class="section-header">
        <span class="section-icon" aria-hidden="true">📝</span>
        <h2 id="offer-section-title" class="section-title">Създаване на обява</h2>
      </div>

      <form id="offerForm" class="offer-layout" @submit.prevent="submitOffer">
        <div class="offer-left">
          <div class="offer-image-wrapper">
            <label class="offer-image-label" for="offerPhoto">
              <div id="offerPhotoPlaceholder" class="offer-image-placeholder" :class="{ 'photo-loaded': photoDataUrl }">
                <span class="upload-icon-big" aria-hidden="true">📷</span>
                <p class="offer-placeholder-text">Прикачи снимка</p>
                <span class="btn btn-primary btn-sm">Избери файл</span>
              </div>
              <img v-if="photoDataUrl" id="offerPhotoPreview" :src="photoDataUrl" class="offer-image-preview show" alt="Преглед на снимката">
            </label>
            <button v-if="photoDataUrl" type="button" id="offerPhotoChange" class="offer-photo-change show" title="Смени снимка" aria-label="Смени снимка" @click="$event.currentTarget.previousElementSibling?.click()">↻</button>
          </div>

          <input id="offerPhoto" type="file" name="photo" accept="image/*" hidden @change="onPhotoSelected">

          <div class="offer-image-actions">
            <button id="offerSaveBtn" class="btn btn-accent btn-publish-main" type="submit" :disabled="isSavingOffer">
              {{ isSavingOffer ? 'Публикуване...' : 'Публикувай обява' }}
            </button>
          </div>
        </div>

        <div class="offer-right">
          <div class="offer-fields-row">
            <div class="offer-field">
              <label for="offerProduct">Име на продукта</label>
              <input id="offerProduct" v-model="offerForm.product" name="product" class="styled-input" type="text" placeholder="напр. Домати от градината" required>
            </div>
            <div class="offer-field">
              <label for="offerRegion">Местоположение</label>
              <input id="offerRegion" v-model="offerForm.region" name="region" class="styled-input" type="text" placeholder="Град или село">
            </div>
          </div>

          <div class="offer-fields-row">
            <div class="offer-field">
              <label for="offerPrice">Цена (€)</label>
              <div class="input-suffix-wrap">
                <input id="offerPrice" v-model="offerForm.price" name="price" class="styled-input" type="text" placeholder="0.00" inputmode="decimal" required>
                <span class="input-suffix">€</span>
              </div>
            </div>
          </div>

          <div class="offer-field">
            <label for="offerDescription">Описание</label>
            <textarea id="offerDescription" v-model="offerForm.description" name="description" class="styled-textarea" placeholder="Разкажи повече за продукта..." rows="3"></textarea>
            <p v-if="offerStatus.message" id="offerStatus" class="form-status show" :class="offerStatus.type === 'success' ? 'form-status-success' : 'form-status-error'" aria-live="polite">
              {{ offerStatus.message }}
            </p>
          </div>
        </div>
      </form>
    </section>

    <section class="section-card results-section" aria-labelledby="results-section-title">
      <div class="section-header">
        <div>
          <h2 id="results-section-title" class="section-title">Налични днес</h2>
          <span id="resultsMeta" class="results-meta">{{ hasSearched && results.length ? `Намерени: ${results.length}` : '' }}</span>
        </div>
      </div>

      <div id="resultsScroll" class="results-scroll">
        <div v-if="resultsError" class="error-message">{{ resultsError }}</div>
        <div v-else id="resultsGrid" class="grid-layout">
          <article v-for="(item, index) in results" :key="`${item.type}-${index}`" class="ad-card" :style="{ animationDelay: `${Math.min(index * 60, 260)}ms` }">
            <div class="ad-image-box">{{ item.product || 'Продукт' }}</div>
            <div class="ad-details">
              <div class="ad-topline">
                <h3>{{ item.type === 'farmer' ? item.name : item.title }}</h3>
                <span class="badge">{{ item.type === 'farmer' ? 'Производител' : 'Обява' }}</span>
              </div>
              <p>{{ item.location || '' }}</p>
              <div class="ad-footer">
                <span class="price-tag">{{ Number(item.price).toFixed(2) }} €</span>
                <span v-if="item.unit" class="unit-tag">за {{ unitText(item.unit) }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-chip">Продукт: {{ item.product }}</span>
                <span v-if="item.quantityLabel" class="meta-chip">Количество: {{ item.quantityLabel }}</span>
                <span class="meta-chip">Рейтинг: {{ Number(item.rating).toFixed(1) }}</span>
                <span v-for="tag in (item.tags || []).slice(0, 2)" :key="tag" class="meta-chip">{{ tag }}</span>
              </div>
            </div>
          </article>
        </div>

        <div id="emptyState" class="empty-state" :hidden="results.length || !hasSearched || !!resultsError">
          <div class="empty-title">Няма намерени резултати</div>
        </div>
      </div>
    </section>
  </main>
</template>

<style src="../../Homepage.css"></style>
<style scoped>
.custom-dropdown {
  border: none;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(60, 40, 10, 0.18);
}

.custom-dropdown .dd-option {
  background: #ffffff;
  border: none;
}
</style>
