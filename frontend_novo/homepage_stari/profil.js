function safeJsonParse(s, fallback) {
  try { return JSON.parse(s) } catch { return fallback }
}

function init() {
  const form = document.getElementById('profileForm')
  const clearBtn = document.getElementById('pfClear')
  const status = document.getElementById('profileStatus')
  if (!form) return

  const existing = safeJsonParse(localStorage.getItem('mp_profile'), null)
  if (existing) {
    const set = (id, v) => {
      const el = document.getElementById(id)
      if (el && v) el.value = v
    }
    set('pfName', existing.name)
    set('pfPhone', existing.phone)
    set('pfRegion', existing.region)
    set('pfProduct', existing.product)
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (status) {
      status.textContent = ''
      status.className = 'form-status'
    }

    const fd = new FormData(form)
    const phone = String(fd.get('phone') || '').trim()
    const phoneDigits = phone.replace(/\D/g, '')

    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      if (status) {
        status.textContent = 'Въведи валиден телефонен номер.'
        status.classList.add('form-status-error')
      }
      return
    }

    const profile = {
      name: String(fd.get('name') || '').trim(),
      phone,
      region: String(fd.get('region') || '').trim(),
      product: String(fd.get('product') || '').trim(),
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
      if (status) {
        status.textContent = 'Профилът е изчистен.'
        status.className = 'form-status'
      }
    })
  }
}

init()
