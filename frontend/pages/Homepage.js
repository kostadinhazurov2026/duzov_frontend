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

const SEARCH_ERROR_MESSAGE = 'Грешка при зареждане на резултатите. Моля опитайте отново.'

const els = {
  form: document.getElementById('searchForm'),
  resetBtn: document.getElementById('resetBtn'),
  resultsGrid: document.getElementById('resultsGrid'),
  resultsMeta: document.getElementById('resultsMeta'),
  emptyState: document.getElementById('emptyState'),
  resultsScroll: document.getElementById('resultsScroll'),
  brandLink: document.querySelector('.brand'),
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function unitText(unit) {
  if (unit === 'kg') return 'кг'
  if (unit === 'pcs') return 'бр.'
  if (unit === 't') return 'т'
  return unit || ''
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

  if (!source) {
    return { raw: '', amount: NaN, unit: '' }
  }

  const match = source.match(/(\d+(?:[.,]\d+)?)\s*(кг|kg|бр\.?|pcs?|т|t)/i)

  if (!match) {
    return { raw: source, amount: NaN, unit: '' }
  }

  return {
    raw: source,
    amount: Number(match[1].replace(',', '.')),
    unit: parseUnit(match[2]),
  }
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function normalizeOffer(offer) {
  const quantity = parseQuantity(offer.quantity)
  const rawPrice = String(offer.price ?? '')
  const match = rawPrice.replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  const price = match ? Number(match[0]) : NaN

  return {
    type: 'offer',
    title: offer.sellerName ? `Обява от ${offer.sellerName}` : `Обява: ${offer.product || 'Продукт'}`,
    location: offer.region || '',
    product: offer.product || '',
    price: Number.isFinite(price) ? price : 0,
    unit: quantity.unit || '',
    amount: quantity.amount,
    quantityLabel: offer.quantity || '',
    rating: 5,
    tags: ['нова'],
  }
}

function loadOffers() {
  const offers = safeJsonParse(localStorage.getItem('mp_offers') || '[]', [])
  if (!Array.isArray(offers)) return []
  return offers.map(normalizeOffer)
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Грешка при зареждане на снимката.'))

    reader.readAsDataURL(file)
  })
}

function setupDropdown(inputId, dropdownId, options) {
  const input = document.getElementById(inputId)
  const dropdown = document.getElementById(dropdownId)

  if (!input || !dropdown) return

  function renderOptions(filter) {
    const query = String(filter || '').toLowerCase()
    const filteredOptions = query
      ? options.filter(option => option.toLowerCase().includes(query)).slice(0, 3)
      : options.slice(0, 3)

    dropdown.innerHTML = filteredOptions
      .map(option => `<div class="dd-option">${escapeHtml(option)}</div>`)
      .join('')

    dropdown.classList.toggle('open', filteredOptions.length > 0)
  }

  input.addEventListener('focus', () => renderOptions(input.value))
  input.addEventListener('input', () => renderOptions(input.value))

  dropdown.addEventListener('mousedown', (event) => {
    event.preventDefault()

    const option = event.target.closest('.dd-option')
    if (!option) return

    input.value = option.textContent
    dropdown.classList.remove('open')
  })

  document.addEventListener('pointerdown', (event) => {
    const target = event.target
    const isInside = target === input || dropdown.contains(target)

    if (!isInside) {
      dropdown.classList.remove('open')
    }
  }, { capture: true })
}

function parseForm() {
  const formData = new FormData(els.form)

  return {
    product: String(formData.get('product') || '').trim().toLowerCase(),
    location: String(formData.get('location') || '').trim().toLowerCase(),
    maxPrice: Number(String(formData.get('maxPrice') || '').replace(',', '.')),
  }
}

function buildSearchParams(query) {
  const params = new URLSearchParams()

  if (query.product) params.append('product', query.product)
  if (query.location) params.append('location', query.location)
  if (query.maxPrice && Number.isFinite(query.maxPrice)) {
    params.append('maxPrice', query.maxPrice.toString())
  }

  return params
}

async function searchOffers(query) {
  try {
    const params = buildSearchParams(query)
    const response = await fetch(`/api/offers/search?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const offers = await response.json()
    return offers.map(normalizeOffer)
  } catch (error) {
    console.error('Error searching offers:', error)
    return filterItemsLocal(query)
  }
}

function filterItemsLocal(query) {
  return [...loadOffers(), ...SEED.items]
    .filter(item => !query.product || String(item.product || '').toLowerCase().includes(query.product))
    .filter(item => !query.location || String(item.location || '').toLowerCase().includes(query.location))
    .filter(item => !Number.isFinite(query.maxPrice) || Number(item.price) <= query.maxPrice)
}

function clearSearchResults() {
  els.resultsGrid.innerHTML = ''
  els.emptyState.hidden = true

  if (els.resultsMeta) {
    els.resultsMeta.textContent = ''
  }
}

function buildResultCard(item, index) {
  const isFarmer = item.type === 'farmer'
  const title = isFarmer ? item.name : item.title
  const badge = isFarmer ? 'Производител' : 'Обява'
  const unitLabel = unitText(item.unit)
  const quantityChip = item.quantityLabel
    ? `<span class="meta-chip">Количество: ${escapeHtml(item.quantityLabel)}</span>`
    : ''
  const unitTag = unitLabel
    ? `<span class="unit-tag">за ${escapeHtml(unitLabel)}</span>`
    : ''
  const tagChips = (item.tags || [])
    .slice(0, 2)
    .map(tag => `<span class="meta-chip">${escapeHtml(tag)}</span>`)
    .join('')

  return `
    <article class="ad-card" style="animation-delay:${Math.min(index * 60, 260)}ms">
      <div class="ad-image-box">${escapeHtml(item.product || 'Продукт')}</div>
      <div class="ad-details">
        <div class="ad-topline">
          <h3>${escapeHtml(title)}</h3>
          <span class="badge">${badge}</span>
        </div>
        <p>${escapeHtml(item.location || '')}</p>
        <div class="ad-footer">
          <span class="price-tag">${escapeHtml(Number(item.price).toFixed(2))} €</span>
          ${unitTag}
        </div>
        <div class="meta-row">
          <span class="meta-chip">Продукт: ${escapeHtml(item.product)}</span>
          ${quantityChip}
          <span class="meta-chip">Рейтинг: ${escapeHtml(Number(item.rating).toFixed(1))}</span>
          ${tagChips}
        </div>
      </div>
    </article>`
}

async function render(query) {
  try {
    const items = await searchOffers(query)

    clearSearchResults()

    if (els.resultsMeta) {
      els.resultsMeta.textContent = items.length ? `Намерени: ${items.length}` : ''
    }

    if (!items.length) {
      els.emptyState.hidden = false
      return
    }

    els.resultsGrid.innerHTML = items.map(buildResultCard).join('')
    els.resultsScroll.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    console.error('Error rendering results:', error)
    els.resultsGrid.innerHTML = `<div class="error-message">${SEARCH_ERROR_MESSAGE}</div>`
    els.emptyState.hidden = true
  }
}

function initOfferForm() {
  const form = document.getElementById('offerForm')
  const saveBtn = document.getElementById('offerSaveBtn')
  const status = document.getElementById('offerStatus')
  const photoInput = document.getElementById('offerPhoto')
  const photoPlaceholder = document.getElementById('offerPhotoPlaceholder')
  const photoPreview = document.getElementById('offerPhotoPreview')
  const photoChangeBtn = document.getElementById('offerPhotoChange')
  const profile = safeJsonParse(localStorage.getItem('mp_profile'), null)

  if (!form || !saveBtn) return

  let currentPhotoDataUrl = ''

  function showOfferStatus(message, type) {
    if (!status) return

    const shouldShow = Boolean(message)
    status.textContent = message || ''
    status.className = 'form-status'

    if (shouldShow) status.classList.add('show')
    if (type === 'error') status.classList.add('form-status-error')
    if (type === 'success') status.classList.add('form-status-success')
  }

  function resetPhotoState() {
    currentPhotoDataUrl = ''

    if (photoPlaceholder) {
      photoPlaceholder.classList.remove('photo-loaded')
    }

    if (photoPreview) {
      photoPreview.src = ''
      photoPreview.hidden = true
      photoPreview.classList.remove('show')
    }

    if (photoChangeBtn) {
      photoChangeBtn.classList.remove('show')
    }
  }

  function saveOffer(offer) {
    const offers = safeJsonParse(localStorage.getItem('mp_offers'), [])
    offers.unshift(offer)
    localStorage.setItem('mp_offers', JSON.stringify(offers.slice(0, 50)))
  }

  if (photoInput) {
    photoInput.addEventListener('change', async () => {
      const file = photoInput.files?.[0]

      if (!file) return
      if (file.size > 10485760) {
        showOfferStatus('Файлът е твърде голям (макс. 10MB)', 'error')
        return
      }
      if (!file.type.startsWith('image/')) {
        showOfferStatus('Моля, качи снимка (JPG, PNG, WebP)', 'error')
        return
      }

      try {
        currentPhotoDataUrl = await toDataUrl(file)

        if (photoPlaceholder) {
          photoPlaceholder.classList.add('photo-loaded')
        }

        if (photoPreview) {
          photoPreview.src = currentPhotoDataUrl
          photoPreview.hidden = false
          photoPreview.classList.add('show')
        }

        if (photoChangeBtn) {
          photoChangeBtn.classList.add('show')
        }
      } catch (error) {
        showOfferStatus(error instanceof Error ? error.message : 'Грешка при зареждане', 'error')
      }
    })
  }

  if (photoChangeBtn && photoInput) {
    photoChangeBtn.addEventListener('click', () => photoInput.click())
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    saveBtn.disabled = true

    const formData = new FormData(form)
    const product = String(formData.get('product') || '').trim()
    const priceRaw = String(formData.get('price') || '').trim().replace(',', '.')
    const price = Number(priceRaw)
    const region = String(formData.get('region') || '').trim()
    const description = String(formData.get('description') || '').trim()

    if (!product) {
      showOfferStatus('Моля, въведи име на продукта.', 'error')
      saveBtn.disabled = false
      return
    }

    if (!Number.isFinite(price) || price <= 0) {
      showOfferStatus('Моля, въведи валидна цена.', 'error')
      saveBtn.disabled = false
      return
    }

    if (!currentPhotoDataUrl) {
      showOfferStatus('Моля, качи снимка на продукта.', 'error')
      saveBtn.disabled = false
      return
    }

    saveOffer({
      id: crypto?.randomUUID?.() || String(Date.now()),
      product,
      region,
      price: Number(price.toFixed(2)),
      description,
      photoDataUrl: currentPhotoDataUrl,
      createdAt: new Date().toISOString(),
      sellerName: profile?.name || '',
      sellerEmail: profile?.email || '',
      sellerPhone: profile?.phone || '',
    })

    showOfferStatus('Обявата е публикувана! ✓', 'success')

    form.reset()
    resetPhotoState()
    saveBtn.disabled = false

    setTimeout(async () => {
      await render(parseForm())
      showOfferStatus('', '')
    }, 2000)
  })
}

function init() {
  if (!els.form) return

  setupDropdown('productInput', 'productDropdown', SEED.products)
  setupDropdown('locationInput', 'locationDropdown', SEED.towns)
  setupDropdown('maxPriceInput', 'maxPriceDropdown', SEED.prices)

  if (els.brandLink) {
    els.brandLink.addEventListener('click', (event) => {
      const href = els.brandLink.getAttribute('href') || ''
      if (href.endsWith('Homepage.html')) event.preventDefault()
    })
  }

  els.form.addEventListener('submit', async (event) => {
    event.preventDefault()
    await render(parseForm())
  })

  if (els.resetBtn) {
    els.resetBtn.addEventListener('click', () => {
      els.form.reset()
      clearSearchResults()
    })
  }

  initOfferForm()
}

init()
