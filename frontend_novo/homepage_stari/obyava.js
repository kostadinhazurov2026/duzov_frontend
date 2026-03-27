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

async function publishOffer(offer) {
  try {
    const response = await fetch('/api/offers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(offer)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error publishing offer:', error);
    throw error;
  }
}

function init() {
  const form = document.getElementById('offerForm')
  const saveBtn = document.getElementById('offerSaveBtn')
  const status = document.getElementById('offerStatus')
  const photoInput = document.getElementById('offerPhoto')
  const photoPlaceholder = document.getElementById('offerPhotoPlaceholder')
  const photoPreview = document.getElementById('offerPhotoPreview')
  const photoChangeBtn = document.getElementById('offerPhotoChange')
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
        
        // Hide placeholder and show preview in the same space
        if (photoPlaceholder) photoPlaceholder.style.opacity = '0'
        if (photoPreview) {
          photoPreview.src = dataUrl
          photoPreview.classList.add('show')
          photoPreview.hidden = false
        }
        if (photoChangeBtn) photoChangeBtn.style.display = 'flex'
      } catch (err) {
        showStatus(err instanceof Error ? err.message : 'Проблем при заредване', 'error')
      }
    })
  }

  // Real-time validation
  const inputs = [offerProduct, offerPrice, offerQty, offerRegion]
  inputs.forEach(input => {
    if (input) {
      input.addEventListener('blur', () => {
        validateField(input)
      })
      
      input.addEventListener('input', () => {
        clearFieldError(input)
      })
    }
  })

  function validateField(input) {
    const value = input.value.trim()
    const fieldName = input.getAttribute('name')
    
    // Remove existing error styling
    input.classList.remove('field-error')
    
    // Basic validation
    if (input.hasAttribute('required') && !value) {
      showFieldError(input, 'Това поле е задължително')
      return false
    }
    
    if (fieldName === 'price' && value) {
      const price = parseFloat(value.replace(',', '.'))
      if (isNaN(price) || price <= 0) {
        showFieldError(input, 'Въведете валидна цена')
        return false
      }
    }
    
    if (fieldName === 'quantity' && value) {
      const qty = parseFloat(value.replace(',', '.'))
      if (isNaN(qty) || qty <= 0) {
        showFieldError(input, 'Въведете валидно количество')
        return false
      }
    }
    
    return true
  }

  function showFieldError(input, message) {
    input.classList.add('field-error')
    // You could add a tooltip or error message display here
  }

  function clearFieldError(input) {
    input.classList.remove('field-error')
  }

  function showStatus(message, type) {
    if (status) {
      status.textContent = message
      status.className = 'form-status'
      status.classList.add('show')
      if (type === 'error') status.classList.add('form-status-error')
      if (type === 'success') status.classList.add('form-status-success')
      
      // Auto-hide success messages after 3 seconds
      if (type === 'success') {
        setTimeout(() => {
          status.classList.remove('show')
        }, 3000)
      }
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    // Validate all fields before submission
    let isValid = true
    inputs.forEach(input => {
      if (!validateField(input)) {
        isValid = false
      }
    })
    
    if (!isValid) {
      showStatus('Моля попълнете всички задължителни полета правилно.', 'error')
      return
    }
    
    if (saveBtn) {
      saveBtn.disabled = true
      saveBtn.textContent = 'Публикуване...'
    }

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

    try {
      await publishOffer(offer)
      showStatus('Обявата е публикувана успешно! ✓', 'success')
    } catch (error) {
      showStatus('Грешка при публикуване на обявата. Моля опитайте отново.', 'error')
      if (saveBtn) {
        saveBtn.disabled = false
        saveBtn.textContent = 'Публикувай обява'
      }
      return
    }
    
    // Reset form after successful submission
    setTimeout(() => {
      form.reset()
      currentPhotoDataUrl = ''
      if (photoPlaceholder) photoPlaceholder.style.opacity = '1'
      if (photoPreview) {
        photoPreview.classList.remove('show')
        photoPreview.hidden = true
      }
      if (photoChangeBtn) photoChangeBtn.style.display = 'none'
      
      if (saveBtn) {
        saveBtn.disabled = false
        saveBtn.textContent = 'Публикувай обява'
      }
    }, 1500)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
