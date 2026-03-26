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

function init() {
  const form = document.getElementById('profileForm')
  const clearBtn = document.getElementById('pfClear')
  const status = document.getElementById('profileStatus')
  const photoInput = document.getElementById('pfPhoto')
  const photoPreview = document.getElementById('pfPhotoPreview')
  if (!form) return

  const existing = safeJsonParse(localStorage.getItem('mp_profile'), null)
  let currentPhotoDataUrl = existing?.photoDataUrl || ''
  let currentPhotoName = existing?.photoName || ''
  if (existing) {
    const set = (id, v) => {
      const el = document.getElementById(id)
      if (el && v) el.value = v
    }
    set('pfName', existing.name)
    set('pfPhone', existing.phone)
    set('pfRegion', existing.region)
    set('pfProduct', existing.product)
    if (photoPreview && existing.photoDataUrl) {
      photoPreview.src = existing.photoDataUrl
      photoPreview.hidden = false
    }
  }

  if (photoInput && photoPreview) {
    photoInput.addEventListener('change', async () => {
      const file = photoInput.files?.[0]
      if (!file) return
      try {
        const dataUrl = await toDataUrl(file)
        currentPhotoDataUrl = dataUrl
        currentPhotoName = file.name
        photoPreview.src = dataUrl
        photoPreview.hidden = false
      } catch {
        photoPreview.hidden = true
      }
    })
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (status) {
      status.textContent = ''
      status.className = 'form-status'
    }

    const fd = new FormData(form)
    const file = photoInput?.files?.[0]
    const phone = String(fd.get('phone') || '').trim()
    const phoneDigits = phone.replace(/\D/g, '')

    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      if (status) {
        status.textContent = 'Въведи валиден телефонен номер.'
        status.classList.add('form-status-error')
      }
      return
    }

    let photoDataUrl = currentPhotoDataUrl
    let photoName = currentPhotoName
    if (file) {
      try {
        photoDataUrl = await toDataUrl(file)
        photoName = file.name
      } catch (err) {
        if (status) {
          status.textContent = err instanceof Error ? err.message : 'Проблем при качване на снимка.'
          status.classList.add('form-status-error')
        }
        return
      }
    }

    const profile = {
      name: String(fd.get('name') || '').trim(),
      phone,
      region: String(fd.get('region') || '').trim(),
      product: String(fd.get('product') || '').trim(),
      photoName,
      photoDataUrl,
      updatedAt: new Date().toISOString(),
    }

    localStorage.setItem('mp_profile', JSON.stringify(profile))
    if (status) {
      status.textContent = 'Профилът е запазен успешно.'
      status.classList.add('form-status-success')
    }
    window.location.href = 'Homepage.html'
  })

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      form.reset()
      localStorage.removeItem('mp_profile')
      if (photoPreview) {
        photoPreview.src = ''
        photoPreview.hidden = true
      }
      currentPhotoDataUrl = ''
      currentPhotoName = ''
      if (status) {
        status.textContent = 'Профилът е изчистен.'
        status.className = 'form-status'
      }
    })
  }
}

init()
