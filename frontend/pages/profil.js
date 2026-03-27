async function loadProfileFromAPI() {
  try {
    const response = await fetch('/api/profile')

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error loading profile from API:', error)
    return null
  }
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

async function saveProfile(profile) {
  try {
    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    console.error('Error saving profile to API:', error)
  }
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

async function init() {
  const form = document.getElementById('profileForm')
  const imageInput = document.getElementById('pfImage')
  const nameInput = document.getElementById('pfName')
  const emailInput = document.getElementById('pfEmail')
  const phoneInput = document.getElementById('pfPhone')
  const locationInput = document.getElementById('pfLocation')
  const status = document.getElementById('profileStatus')

  if (!form) return

  async function loadProfile() {
    let existing = await loadProfileFromAPI()

    if (!existing) {
      existing = safeJsonParse(localStorage.getItem('mp_profile'), null)
    }

    return existing
  }

  const existing = await loadProfile()
  const loginEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email')

  if (existing) {
    if (nameInput && existing.name) nameInput.value = existing.name
    if (emailInput && existing.email) emailInput.value = existing.email
    if (phoneInput && existing.phone) phoneInput.value = existing.phone
    if (locationInput && existing.location) locationInput.value = existing.location
  }

  if (loginEmail && emailInput && !emailInput.value) {
    emailInput.value = loginEmail
  }

  if (imageInput) {
    imageInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0]

      if (!file) return
      if (file.size > 5242880) {
        showStatus('Файлът е твърде голям (макс 5MB)', 'error')
        return
      }

      const reader = new FileReader()
      reader.onload = (loadEvent) => {
        const placeholder = document.querySelector('.profile-image-placeholder')
        if (!placeholder) return

        placeholder.innerHTML = `<img src="${loadEvent.target?.result || ''}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" alt="Profile">`
      }
      reader.readAsDataURL(file)
    })
  }

  function showStatus(message, type) {
    if (!status) return

    status.textContent = message
    status.className = 'form-status'

    if (type === 'success') {
      status.classList.add('form-status-success')
    } else if (type === 'error') {
      status.classList.add('form-status-error')
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    const name = (nameInput?.value || '').trim()
    const email = (emailInput?.value || '').trim()
    const phone = (phoneInput?.value || '').trim()
    const location = (locationInput?.value || '').trim()

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
      location,
      updatedAt: new Date().toISOString(),
    }

    try {
      await saveProfile(profile)
      localStorage.setItem('mp_profile', JSON.stringify(profile))
      showStatus('Профилът е запазен успешно! ✓', 'success')
    } catch (error) {
      showStatus('Грешка при запазване на профила. Моля опитайте отново.', 'error')
      return
    }

    setTimeout(() => {
      if (!status) return
      status.textContent = ''
      status.className = 'form-status'
    }, 3500)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init())
} else {
  init()
}
