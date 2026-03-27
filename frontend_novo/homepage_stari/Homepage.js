const SEED = {
  towns: ['София', 'Пловдив', 'Варна', 'Бургас', 'Русе', 'Стара Загора', 'Плевен', 'Велико Търново', 'с. Железница'],
  products: ['Домати', 'Краставици', 'Картофи', 'Ябълки', 'Мед', 'Мляко', 'Жито', 'Царевица', 'Слънчоглед'],
  quantities: ['10 кг', '25 кг', '50 кг', '100 кг', '250 кг', '500 кг', '1 бр.', '5 бр.', '10 бр.', '25 бр.', '50 бр.', '100 бр.', '1 т'],
  prices: ['1.00', '1.50', '2.00', '2.50', '3.00', '5.00', '10.00'],
  items: [
    { type: 'farmer', name: 'Ферма ЗеленЛист', location: 'София', product: 'Домати', price: 2.4, unit: 'kg', rating: 4.8, tags: ['био', 'фактура'] },
    { type: 'farmer', name: 'Пчелин Тракия', location: 'Пловдив', product: 'Мед', price: 12, unit: 'pcs', rating: 4.6, tags: ['домашен'] },
    { type: 'offer', title: 'Жито реколта 2025', location: 'Варна', product: 'Жито', price: 1.5, unit: 'kg', rating: 4.4, tags: ['налично'] },
    { type: 'offer', title: 'Картофи едро', location: 'Русе', product: 'Картофи', price: 0.95, unit: 'kg', rating: 4.2, tags: ['едро'] },
  ],
}

function escapeHtml(s) {
  return String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function unitText(unit) {
  if (unit === 'kg') return 'кг'
  if (unit === 'pcs') return 'бр.'
  if (unit === 't') return 'т'
  return unit || ''
}

function parseUnit(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (!s) return ''
  if (s.startsWith('кг') || s === 'kg') return 'kg'
  if (s.startsWith('бр') || s === 'pcs' || s === 'pc') return 'pcs'
  if (s === 'т' || s === 't') return 't'
  return ''
}

function parseQuantity(text) {
  const src = String(text || '').trim().toLowerCase()
  if (!src) return { raw: '', amount: NaN, unit: '' }
  const match = src.match(/(\d+(?:[.,]\d+)?)\s*(кг|kg|бр\.?|pcs?|т|t)/i)
  if (!match) return { raw: src, amount: NaN, unit: '' }
  return { raw: src, amount: Number(match[1].replace(',', '.')), unit: parseUnit(match[2]) }
}

function safeJsonParse(s, fallback) {
  try { return JSON.parse(s) } catch { return fallback }
}

function normalizeOffer(offer) {
  const quantity = parseQuantity(offer.quantity)
  const rawPrice = String(offer.price ?? '')
  // Supports both numeric prices and strings like "12.34 лв." / "12.34 €"
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
  try {
    const offers = JSON.parse(localStorage.getItem('mp_offers') || '[]')
    if (!Array.isArray(offers)) return []
    return offers.map(normalizeOffer)
  } catch { return [] }
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Грешка при зареждане на снимка.'))
    reader.readAsDataURL(file)
  })
}

// Custom dropdown – shows max 3 filtered options
function setupDropdown(inputId, dropdownId, options, forceOpenUp = false) {
  const input = document.getElementById(inputId)
  const dropdown = document.getElementById(dropdownId)
  if (!input || !dropdown) return

  function renderOptions(filter) {
    const query = (filter || '').toLowerCase()
    const filtered = query
      ? options.filter(o => o.toLowerCase().includes(query)).slice(0, 3)
      : options.slice(0, 3)
    dropdown.innerHTML = filtered.map(o => `<div class="dd-option">${escapeHtml(o)}</div>`).join('')
    const hasItems = filtered.length > 0
    dropdown.classList.toggle('open', hasItems)
    dropdown.classList.toggle('open-up', hasItems && forceOpenUp)
    if (hasItems) schedulePositionDropdown()
  }

  function positionDropdown() {
    if (!dropdown.classList.contains('open')) return

    if (forceOpenUp) return

    const rect = dropdown.getBoundingClientRect()
    const padding = 10
    const fitsDown = rect.bottom <= (window.innerHeight - padding)

    if (!fitsDown) {
      dropdown.classList.add('open-up')

      // If it still doesn't fit (rare), keep it up; user interaction is still usable.
    }
  }

  let rafPos = 0
  function schedulePositionDropdown() {
    cancelAnimationFrame(rafPos)
    rafPos = requestAnimationFrame(() => positionDropdown())
  }

  input.addEventListener('focus', () => renderOptions(input.value))
  input.addEventListener('input', () => renderOptions(input.value))

  dropdown.addEventListener('mousedown', (e) => {
    e.preventDefault()
    const opt = e.target.closest('.dd-option')
    if (opt) {
      input.value = opt.textContent
      dropdown.classList.remove('open')
    }
  })

  // Close dropdown when clicking outside (prevents instant close after focus change)
  document.addEventListener('pointerdown', (e) => {
    const target = e.target
    const isInside = target === input || dropdown.contains(target)
    if (!isInside) dropdown.classList.remove('open')
    if (!isInside) dropdown.classList.remove('open-up')
  }, { capture: true })

  window.addEventListener('resize', schedulePositionDropdown)
}

// ── SEARCH ──
const els = {
  form: document.getElementById('searchForm'),
  resetBtn: document.getElementById('resetBtn'),
  resultsGrid: document.getElementById('resultsGrid'),
  resultsMeta: document.getElementById('resultsMeta'),
  emptyState: document.getElementById('emptyState'),
  resultsScroll: document.getElementById('resultsScroll'),
  brandLink: document.querySelector('.brand'),
}

function parseForm() {
  const fd = new FormData(els.form)
  return {
    product: String(fd.get('product') || '').trim().toLowerCase(),
    location: String(fd.get('location') || '').trim().toLowerCase(),
    quantity: String(fd.get('quantity') || '').trim().toLowerCase(),
    maxPrice: Number(String(fd.get('maxPrice') || '').replace(',', '.')),
  }
}

async function searchOffers(query) {
  try {
    const params = new URLSearchParams();
    if (query.product) params.append('product', query.product);
    if (query.location) params.append('location', query.location);
    if (query.quantity) params.append('quantity', query.quantity);
    if (query.maxPrice && Number.isFinite(query.maxPrice)) params.append('maxPrice', query.maxPrice.toString());

    const response = await fetch(`/api/offers/search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const offers = await response.json();
    return offers.map(normalizeOffer);
  } catch (error) {
    console.error('Error searching offers:', error);
    // Fallback to localStorage if API fails
    return filterItemsLocal(query);
  }
}

function filterItemsLocal(q) {
  const parsedQueryQty = parseQuantity(q.quantity)
  return [...loadOffers(), ...SEED.items]
    .filter(it => !q.product || String(it.product || '').toLowerCase().includes(q.product))
    .filter(it => !q.location || String(it.location || '').toLowerCase().includes(q.location))
    .filter(it => !Number.isFinite(q.maxPrice) || Number(it.price) <= q.maxPrice)
    .filter(it => {
      if (!q.quantity) return true
      const itemQty = Number.isFinite(it.amount) ? { amount: it.amount, unit: it.unit } : parseQuantity(it.quantityLabel || '')
      if (parsedQueryQty.unit && itemQty.unit && parsedQueryQty.unit !== itemQty.unit) return false
      if (Number.isFinite(parsedQueryQty.amount) && Number.isFinite(itemQty.amount)) return itemQty.amount >= parsedQueryQty.amount
      const qtyLabel = String(it.quantityLabel || `${it.amount || ''} ${unitText(it.unit)}`).toLowerCase()
      return qtyLabel.includes(q.quantity)
    })
}

async function render(query) {
  try {
    const items = await searchOffers(query);
    els.resultsGrid.innerHTML = ''
    els.emptyState.hidden = true
    if (els.resultsMeta) els.resultsMeta.textContent = items.length ? `Намерени: ${items.length}` : ''

    if (!items.length) { els.emptyState.hidden = false; return }

    els.resultsGrid.innerHTML = items.map((it, i) => {
      const isFarmer = it.type === 'farmer'
      const title = isFarmer ? it.name : it.title
      const badge = isFarmer ? 'Производител' : 'Обява'
      return `
        <article class="ad-card" style="animation-delay:${Math.min(i * 60, 260)}ms">
          <div class="ad-image-box">${escapeHtml(it.product || 'Продукт')}</div>
          <div class="ad-details">
            <div class="ad-topline">
              <h3>${escapeHtml(title)}</h3>
              <span class="badge">${badge}</span>
            </div>
            <p>${escapeHtml(it.location || '')}</p>
            <div class="ad-footer">
              <span class="price-tag">${escapeHtml(Number(it.price).toFixed(2))} €</span>
              <span class="unit-tag">за ${escapeHtml(unitText(it.unit))}</span>
            </div>
            <div class="meta-row">
              <span class="meta-chip">Продукт: ${escapeHtml(it.product)}</span>
              ${it.quantityLabel ? `<span class="meta-chip">Количество: ${escapeHtml(it.quantityLabel)}</span>` : ''}
              <span class="meta-chip">Рейтинг: ${escapeHtml(Number(it.rating).toFixed(1))}</span>
              ${(it.tags || []).slice(0, 2).map(t => `<span class="meta-chip">${escapeHtml(t)}</span>`).join('')}
            </div>
          </div>
        </article>`
    }).join('')

    els.resultsScroll.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    console.error('Error rendering results:', error);
    // Show error state
    els.resultsGrid.innerHTML = '<div class="error-message">Грешка при зареждане на резултатите. Моля опитайте отново.</div>';
    els.emptyState.hidden = true;
  }
}

// ── OFFER FORM ──
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

  if (photoInput) {
    photoInput.addEventListener('change', async () => {
      const file = photoInput.files?.[0]
      if (!file) return
      if (file.size > 10485760) { showOfferStatus('Файлът е твърде голям (макс. 10MB)', 'error'); return }
      if (!file.type.startsWith('image/')) { showOfferStatus('Моля, качи снимка (JPG, PNG, WebP)', 'error'); return }
      try {
        const dataUrl = await toDataUrl(file)
        currentPhotoDataUrl = dataUrl
        if (photoPlaceholder) photoPlaceholder.classList.add('photo-loaded')
        if (photoPreview) {
          photoPreview.src = dataUrl
          photoPreview.hidden = false
          photoPreview.classList.add('show')
        }
        if (photoChangeBtn) photoChangeBtn.classList.add('show')
      } catch (err) {
        showOfferStatus(err instanceof Error ? err.message : 'Грешка при зареждане', 'error')
      }
    })
  }

  if (photoChangeBtn && photoInput) {
    photoChangeBtn.addEventListener('click', () => photoInput.click())
  }

  function showOfferStatus(message, type) {
    if (!status) return
    const show = Boolean(message)
    status.textContent = message || ''
    status.className = 'form-status'
    if (show) status.classList.add('show')
    if (type === 'error') status.classList.add('form-status-error')
    if (type === 'success') status.classList.add('form-status-success')
  }

  function saveOffer(offer) {
    const arr = safeJsonParse(localStorage.getItem('mp_offers'), [])
    arr.unshift(offer)
    localStorage.setItem('mp_offers', JSON.stringify(arr.slice(0, 50)))
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    saveBtn.disabled = true

    const fd = new FormData(form)
    const product = String(fd.get('product') || '').trim()
    const quantity = String(fd.get('quantity') || '').trim()
    const priceRaw = String(fd.get('price') || '').trim().replace(',', '.')
    const price = Number(priceRaw)
    const region = String(fd.get('region') || '').trim()
    const description = String(fd.get('description') || '').trim()

    if (!product) { showOfferStatus('Моля, въведи име на продукта.', 'error'); saveBtn.disabled = false; return }
    if (!quantity) { showOfferStatus('Моля, въведи количество.', 'error'); saveBtn.disabled = false; return }
    if (!Number.isFinite(price) || price <= 0) { showOfferStatus('Моля, въведи валидна цена.', 'error'); saveBtn.disabled = false; return }
    if (!currentPhotoDataUrl) { showOfferStatus('Моля, качи снимка на продукта.', 'error'); saveBtn.disabled = false; return }

    const offer = {
      id: crypto?.randomUUID?.() || String(Date.now()),
      product, region,
      quantity: `${quantity} кг`,
      price: Number(price.toFixed(2)),
      description,
      photoDataUrl: currentPhotoDataUrl,
      createdAt: new Date().toISOString(),
      sellerName: profile?.name || '',
      sellerEmail: profile?.email || '',
      sellerPhone: profile?.phone || '',
    }

    saveOffer(offer)
    showOfferStatus('Обявата е публикувана! ✓', 'success')

    // Reset form
    form.reset()
    currentPhotoDataUrl = ''
    if (photoPlaceholder) photoPlaceholder.classList.remove('photo-loaded')
    if (photoPreview) {
      photoPreview.src = ''
      photoPreview.hidden = true
      photoPreview.classList.remove('show')
    }
    if (photoChangeBtn) photoChangeBtn.classList.remove('show')
    saveBtn.disabled = false

    // Refresh results
    setTimeout(async () => {
      const q = parseForm()
      await render(q)
      showOfferStatus('', '')
    }, 2000)
  })
}

// ── INIT ──
function init() {
  if (!els.form) return

  // Force "product" dropdown to open upwards so it stays fully visible
  setupDropdown('productInput', 'productDropdown', SEED.products, true)
  setupDropdown('locationInput', 'locationDropdown', SEED.towns)
  setupDropdown('quantityInput', 'quantityDropdown', SEED.quantities)
  setupDropdown('maxPriceInput', 'maxPriceDropdown', SEED.prices)

  if (els.brandLink) {
    els.brandLink.addEventListener('click', (e) => {
      const href = els.brandLink.getAttribute('href') || ''
      if (href.endsWith('Homepage.html')) e.preventDefault()
    })
  }

  els.form.addEventListener('submit', async (e) => {
    e.preventDefault()
    await render(parseForm())
  })

  if (els.resetBtn) els.resetBtn.addEventListener('click', () => {
    els.form.reset()
    els.resultsGrid.innerHTML = ''
    els.emptyState.hidden = true
    if (els.resultsMeta) els.resultsMeta.textContent = ''
  })

  initOfferForm()
}

init()
