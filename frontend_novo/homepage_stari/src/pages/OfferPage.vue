<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeDropdown = ref(false)
const photoPreview = ref('')
const isSubmitting = ref(false)
const status = reactive({ message: '', type: '' })
const fieldErrors = reactive({ product: false, price: false, quantity: false, region: false })
const form = reactive({ product: '', price: '', quantity: '', description: '', region: '' })
const products = ['Домати', 'Краставици', 'Картофи', 'Ябълки', 'Мед', 'Мляко', 'Жито', 'Царевица', 'Слънчоглед']

function safeJsonParse(value, fallback) {
  try { return JSON.parse(value) } catch { return fallback }
}

function loadProfile() {
  return safeJsonParse(localStorage.getItem('mp_profile'), null)
}

function showStatus(message, type) {
  status.message = message
  status.type = type
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Неуспешно зареждане на снимка.'))
    reader.readAsDataURL(file)
  })
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

async function onPhotoChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 10485760) return showStatus('Файлът е твърде голям (макс 10MB)', 'error')
  if (!file.type.startsWith('image/')) return showStatus('Моля качи снимка (JPG, PNG, WebP)', 'error')

  try {
    photoPreview.value = await toDataUrl(file)
  } catch (error) {
    showStatus(error instanceof Error ? error.message : 'Проблем при зареждане', 'error')
  }
}

function clearFieldError(field) {
  fieldErrors[field] = false
}

function validateField(field) {
  const value = form[field].trim()
  fieldErrors[field] = false

  if ((field === 'product' || field === 'price' || field === 'quantity') && !value) {
    fieldErrors[field] = true
    return false
  }

  if (field === 'price' && value) {
    const price = Number(value.replace(',', '.'))
    if (!Number.isFinite(price) || price <= 0) {
      fieldErrors[field] = true
      return false
    }
  }

  if (field === 'quantity' && value) {
    const qty = Number(value.replace(',', '.'))
    if (!Number.isFinite(qty) || qty <= 0) {
      fieldErrors[field] = true
      return false
    }
  }

  return true
}

const filteredProducts = computed(() => {
  const query = form.product.toLowerCase()
  return (query ? products.filter((item) => item.toLowerCase().includes(query)) : products).slice(0, 5)
})

async function submitOffer() {
  const valid = ['product', 'price', 'quantity', 'region'].every(validateField)
  if (!valid) return showStatus('Моля попълнете всички задължителни полета правилно.', 'error')
  if (!photoPreview.value) return showStatus('Моля качи снимка на продукта.', 'error')

  const price = Number(form.price.trim().replace(',', '.'))
  const profile = loadProfile()
  const offer = {
    id: crypto?.randomUUID?.() || String(Date.now()),
    product: form.product.trim(),
    region: form.region.trim(),
    quantity: `${form.quantity.trim()} кг`,
    price: `${price.toFixed(2)} €`,
    description: form.description.trim(),
    photoDataUrl: photoPreview.value,
    createdAt: new Date().toISOString(),
    sellerName: profile?.name || '',
    sellerEmail: profile?.email || '',
    sellerPhone: profile?.phone || '',
  }

  isSubmitting.value = true

  try {
    await publishOffer(offer)
    const offers = safeJsonParse(localStorage.getItem('mp_offers'), [])
    offers.unshift(offer)
    localStorage.setItem('mp_offers', JSON.stringify(offers.slice(0, 50)))
    showStatus('Обявата е публикувана успешно! ✓', 'success')

    window.setTimeout(() => {
      form.product = ''
      form.price = ''
      form.quantity = ''
      form.description = ''
      form.region = ''
      photoPreview.value = ''
      activeDropdown.value = false
      isSubmitting.value = false
      status.message = ''
      status.type = ''
    }, 1500)
  } catch {
    isSubmitting.value = false
    showStatus('Грешка при публикуване на обявата. Моля опитайте отново.', 'error')
  }
}

function handlePointerDown(event) {
  if (!event.target.closest('[data-product-dropdown]')) activeDropdown.value = false
}

onMounted(() => document.addEventListener('pointerdown', handlePointerDown, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handlePointerDown, true))
</script>

<template>
  <header class="topbar" aria-label="Горно меню">
    <div class="topbar-inner">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="Начало">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-text">Marketplace</span>
      </RouterLink>
      <nav class="topbar-actions">
        <RouterLink class="icon-btn" :class="{ active: route.name === 'home' }" :to="{ name: 'home' }"><span class="icon">↩</span><span class="label">Начало</span></RouterLink>
        <RouterLink class="icon-btn" :class="{ active: route.name === 'offer' }" :to="{ name: 'offer' }"><span class="icon">＋</span><span class="label">Нова обява</span></RouterLink>
        <RouterLink class="icon-btn" :class="{ active: route.name === 'notifications' }" :to="{ name: 'notifications' }"><span class="icon">🔔</span><span class="label">Нотификации</span></RouterLink>
        <RouterLink class="icon-btn" :class="{ active: route.name === 'profile' }" :to="{ name: 'profile' }"><span class="icon">👤</span><span class="label">Профил</span></RouterLink>
      </nav>
    </div>
  </header>

  <main class="page">
    <section class="panel-card offer-card">
      <div class="offer-header">
        <h1 class="filter-title">Създаване на обява</h1>
      </div>

      <form id="offerForm" class="offer-form" @submit.prevent="submitOffer">
        <div class="offer-section">
          <div class="offer-section-head">
            <span class="offer-section-icon">📸</span>
            <h2 class="offer-section-title">Снимки на продукта</h2>
          </div>
          <div class="offer-image-section">
            <input id="offerPhoto" type="file" name="photo" class="offer-image-input" accept="image/*" @change="onPhotoChange">
            <label for="offerPhoto" class="offer-image-label">
              <div id="offerPhotoPlaceholder" class="offer-image-placeholder" :style="photoPreview ? 'opacity:0' : ''">
                <p class="offer-placeholder-text">Прикачи снимка</p>
                <button type="button" class="btn btn-primary btn-file-select">Избери файл</button>
              </div>
              <img v-if="photoPreview" id="offerPhotoPreview" :src="photoPreview" class="offer-image-preview show" alt="Преглед">
            </label>
            <button v-if="photoPreview" type="button" id="offerPhotoChange" class="offer-image-change" title="Смени снимка" @click="$event.currentTarget.previousElementSibling?.click()">↻</button>
          </div>
          <div class="offer-image-actions">
            <button id="offerSaveBtn" type="submit" class="btn btn-secondary btn-publish-main" :disabled="isSubmitting">{{ isSubmitting ? 'Публикуване...' : 'Публикувай обява' }}</button>
          </div>
        </div>

        <div class="offer-section">
          <div class="offer-section-head">
            <span class="offer-section-icon">📋</span>
            <h2 class="offer-section-title">Детайли за продукта</h2>
          </div>
          <div class="offer-details-vertical">
            <div class="offer-field">
              <label for="offerProduct">Име на продукта</label>
              <div data-product-dropdown class="dropdown-wrap">
                <input id="offerProduct" v-model="form.product" name="product" class="styled-input" :class="{ 'field-error': fieldErrors.product }" placeholder="Въведи текст тук" required autocomplete="off" @focus="activeDropdown = true" @input="clearFieldError('product'); activeDropdown = true" @blur="validateField('product')">
                <div id="offerProductDropdown" class="dropdown" :class="{ open: activeDropdown }">
                  <button v-for="option in filteredProducts" :key="option" type="button" class="dd-option" @mousedown.prevent="form.product = option; activeDropdown = false; clearFieldError('product')">{{ option }}</button>
                </div>
              </div>
            </div>
            <div class="offer-field">
              <label for="offerPrice">Цена (€)</label>
              <input id="offerPrice" v-model="form.price" name="price" class="styled-input" :class="{ 'field-error': fieldErrors.price }" placeholder="Въведи цена в евро" inputmode="decimal" required @input="clearFieldError('price')" @blur="validateField('price')">
            </div>
            <div class="offer-field">
              <label for="offerQty">Количество</label>
              <div class="quantity-wrapper">
                <input id="offerQty" v-model="form.quantity" name="quantity" class="styled-input" :class="{ 'field-error': fieldErrors.quantity }" placeholder="Въведи текст тук" inputmode="decimal" required @input="clearFieldError('quantity')" @blur="validateField('quantity')">
                <span class="quantity-unit">кг</span>
              </div>
            </div>
            <div class="offer-field offer-field-description">
              <label for="offerDescription">Описание</label>
              <textarea id="offerDescription" v-model="form.description" name="description" class="styled-textarea" placeholder="Въведи описание тук" rows="4"></textarea>
            </div>
          </div>
        </div>

        <div class="offer-section">
          <div class="offer-section-head">
            <span class="offer-section-icon">📍</span>
            <h2 class="offer-section-title">Местоположение</h2>
          </div>
          <div class="offer-field">
            <label for="offerRegion">Местоположение</label>
            <input id="offerRegion" v-model="form.region" name="region" class="styled-input" placeholder="Въведи текст тук" :class="{ 'field-error': fieldErrors.region }" @input="clearFieldError('region')" @blur="validateField('region')">
          </div>
        </div>

        <p v-if="status.message" id="offerStatus" class="form-status show" :class="status.type === 'success' ? 'form-status-success' : 'form-status-error'" aria-live="polite">
          {{ status.message }}
        </p>
      </form>
    </section>
  </main>
</template>

<style src="../../Homepage.css"></style>
