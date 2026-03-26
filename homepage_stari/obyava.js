function safeJsonParse(s, fallback) {
  try { return JSON.parse(s) } catch { return fallback }
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
  const profile = loadProfile()

  if (!form || !saveBtn) return

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (saveBtn) saveBtn.disabled = true
    if (status) {
      status.textContent = ''
      status.className = 'form-status'
    }

    const fd = new FormData(form)
    const quantity = String(fd.get('quantity') || '').trim()
    const priceRaw = String(fd.get('price') || '').trim().replace(',', '.')
    const price = Number(priceRaw)
    const hasValidQuantity = /^\d+([.,]\d+)?\s*(кг|бр\.?|т)$/i.test(quantity)

    if (!hasValidQuantity) {
      if (status) {
        status.textContent = 'Въведи количество като число и единица: кг, бр. или т (пример: 50 кг).'
        status.classList.add('form-status-error')
      }
      if (saveBtn) saveBtn.disabled = false
      return
    }

    if (!Number.isFinite(price) || price <= 0) {
      if (status) {
        status.textContent = 'Въведи валидна цена, по-голяма от 0.'
        status.classList.add('form-status-error')
      }
      if (saveBtn) saveBtn.disabled = false
      return
    }

    const offer = {
      id: crypto?.randomUUID?.() || String(Date.now()),
      product: String(fd.get('product') || '').trim(),
      region: String(fd.get('region') || '').trim(),
      quantity,
      price: price.toFixed(2),
      createdAt: new Date().toISOString(),
      sellerName: profile?.name || '',
      sellerPhone: profile?.phone || '',
    }

    saveOffer(offer)
    if (status) {
      status.textContent = 'Обявата е публикувана успешно.'
      status.classList.add('form-status-success')
    }
    window.location.href = 'Homepage.html'
  })
}

init()
