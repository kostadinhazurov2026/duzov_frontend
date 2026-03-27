function safeJsonParse(s, fallback) {
  try { return JSON.parse(s) } catch { return fallback }
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

function init() {
  const form = document.getElementById('profileForm')
  const imageInput = document.getElementById('pfImage')
  const nameInput = document.getElementById('pfName')
  const emailInput = document.getElementById('pfEmail')
  const phoneInput = document.getElementById('pfPhone')
  const status = document.getElementById('profileStatus')
  
  if (!form) return

  // Load existing profile data
  const existing = safeJsonParse(localStorage.getItem('mp_profile'), null)
  const loginEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email')
  
  if (existing) {
    if (nameInput && existing.name) nameInput.value = existing.name
    if (emailInput && existing.email) emailInput.value = existing.email
    if (phoneInput && existing.phone) phoneInput.value = existing.phone
  }
  
  // Auto-load email from login if not already set
  if (loginEmail && emailInput && !emailInput.value) {
    emailInput.value = loginEmail
  }

  // Handle image preview
  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0]
      if (file) {
        if (file.size > 5242880) {
          showStatus('Файлът е твърде голям (макс 5MB)', 'error')
          return
        }
        const reader = new FileReader()
        reader.onload = (event) => {
          const placeholder = document.querySelector('.profile-image-placeholder')
          if (placeholder) {
            placeholder.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" alt="Profile">`
          }
        }
        reader.readAsDataURL(file)
      }
    })
  }

  function showStatus(message, type) {
    if (status) {
      status.textContent = message
      status.className = 'form-status'
      if (type === 'success') {
        status.classList.add('form-status-success')
      } else if (type === 'error') {
        status.classList.add('form-status-error')
      }
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    
    const name = (nameInput?.value || '').trim()
    const email = (emailInput?.value || '').trim()
    const phone = (phoneInput?.value || '').trim()
    
    if (!name) {
      showStatus('Моля, въведи потребителско име.', 'error')
      return
    }
    
    if (!email || !validateEmail(email)) {
      showStatus('Моля, въведи валиден имейл адрес.', 'error')
      return
    }
    
    const phoneDigits = phone.replace(/\D/g, '')
    if (!phone || phoneDigits.length < 8 || phoneDigits.length > 15) {
      showStatus('Моля, въведи валиден телефонен номер.', 'error')
      return
    }

    const profile = {
      name,
      email,
      phone,
      updatedAt: new Date().toISOString(),
    }

    localStorage.setItem('mp_profile', JSON.stringify(profile))
    showStatus('Профилът е запазен успешно! ✓', 'success')

    setTimeout(() => {
      if (status) {
        status.textContent = ''
        status.className = 'form-status'
      }
    }, 3500)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
