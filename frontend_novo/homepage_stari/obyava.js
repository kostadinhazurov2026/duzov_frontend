function safeJsonParse(s, fallback) {
  try { return JSON.parse(s) } catch { return fallback }
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Неуспешно зареждане на снимка.'))
    reader.readAsDataURL(file)
  })
}

function loadProfile() {
  return safeJsonParse(localStorage.getItem('mp_profile'), null)
}

function saveOffer(offer) {
  const arr = safeJsonParse(localStorage.getItem('mp_offers'), [])
  arr.unshift(offer)
  localStorage.setItem('mp_offers', JSON.stringify(arr.slice(0, 50)))
}

function init() {
  const form = document.getElementById('offerForm')
  const saveBtn = document.getElementById('offerSaveBtn')
  const status = document.getElementById('offerStatus')
  const photoInput = document.getElementById('offerPhoto')
  const photoPlaceholder = document.getElementById('offerPhotoPlaceholder')
  const photoPreview = document.getElementById('offerPhotoPreview')
  const profile = loadProfile()

  if (!form || !saveBtn) return

  let currentPhotoDataUrl = ''

  // Image upload and preview
  if (photoInput) {
    photoInput.addEventListener('change', async (e) => {
      const file = photoInput.files?.[0]
      if (!file) return

      // Validate file size (max 10MB)
      if (file.size > 10485760) {
        showStatus('Файлът е твърде голям (макс 10MB)', 'error')
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        showStatus('Моля качи снимка (JPG, PNG, WebP)', 'error')
        return
      }

      try {
        const dataUrl = await toDataUrl(file)
        currentPhotoDataUrl = dataUrl
        
        // Hide placeholder, show preview
        if (photoPlaceholder) photoPlaceholder.hidden = true
        if (photoPreview) {
          photoPreview.src = dataUrl
          photoPreview.hidden = false
        }
      } catch (err) {
        showStatus(err instanceof Error ? err.message : 'Проблем при заредване', 'error')
      }
    })
  }

  function showStatus(message, type) {
    if (status) {
      status.textContent = message
      status.className = 'form-status'
      if (type === 'error') status.classList.add('form-status-error')
      if (type === 'success') status.classList.add('form-status-success')
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (saveBtn) saveBtn.disabled = true

    const fd = new FormData(form)
    const product = String(fd.get('product') || '').trim()
    const quantity = String(fd.get('quantity') || '').trim()
    const priceRaw = String(fd.get('price') || '').trim().replace(',', '.')
    const price = Number(priceRaw)
    const region = String(fd.get('region') || '').trim()
    const description = String(fd.get('description') || '').trim()

    // Validation
    if (!product) {
      showStatus('Моля въведи наименование на продукта.', 'error')
      if (saveBtn) saveBtn.disabled = false
      return
    }

    if (!quantity) {
      showStatus('Моля въведи количество.', 'error')
      if (saveBtn) saveBtn.disabled = false
      return
    }

    if (!Number.isFinite(price) || price <= 0) {
      showStatus('Моля въведи валидна цена, по-голяма от 0.', 'error')
      if (saveBtn) saveBtn.disabled = false
      return
    }

    if (!currentPhotoDataUrl) {
      showStatus('Моля качи снимка на продукта.', 'error')
      if (saveBtn) saveBtn.disabled = false
      return
    }

    const offer = {
      id: crypto?.randomUUID?.() || String(Date.now()),
      product,
      region,
      quantity: `${quantity} кг`,
      price: `${price.toFixed(2)} €`,
      description,
      photoDataUrl: currentPhotoDataUrl,
      createdAt: new Date().toISOString(),
      sellerName: profile?.name || '',
      sellerEmail: profile?.email || '',
      sellerPhone: profile?.phone || '',
    }

    saveOffer(offer)
    showStatus('Обявата е публикувана успешно! ✓', 'success')
    
    setTimeout(() => {
      window.location.href = 'Homepage.html'
    }, 1500)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
