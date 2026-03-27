<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const profileImage = ref('')
const status = reactive({ message: '', type: '' })
const form = reactive({ name: '', email: '', phone: '', location: '' })

function safeJsonParse(value, fallback) {
  try { return JSON.parse(value) } catch { return fallback }
}

async function loadProfileFromAPI() {
  try {
    const response = await fetch('/api/profile')
    if (!response.ok) throw new Error()
    return await response.json()
  } catch {
    return null
  }
}

async function saveProfile(profile) {
  const response = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })

  if (!response.ok) throw new Error()
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function showStatus(message, type) {
  status.message = message
  status.type = type
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Грешка при зареждане на снимката.'))
    reader.readAsDataURL(file)
  })
}

async function onImageChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 5242880) {
    showStatus('Файлът е твърде голям (макс 5MB)', 'error')
    return
  }

  try {
    profileImage.value = await toDataUrl(file)
  } catch (error) {
    showStatus(error instanceof Error ? error.message : 'Грешка при зареждане.', 'error')
  }
}

async function submitProfile() {
  const name = form.name.trim()
  const email = form.email.trim()
  const phone = form.phone.trim()
  const location = form.location.trim()

  if (!name) return showStatus('Моля, въведи потребителско име.', 'error')
  if (!email || !validateEmail(email)) return showStatus('Моля, въведи валиден имейл адрес.', 'error')

  const phoneDigits = phone.replace(/\D/g, '')
  if (!phone || phoneDigits.length < 8 || phoneDigits.length > 15) {
    return showStatus('Моля, въведи валиден телефонен номер.', 'error')
  }

  const profile = { name, email, phone, location, image: profileImage.value, updatedAt: new Date().toISOString() }

  try {
    await saveProfile(profile)
    localStorage.setItem('mp_profile', JSON.stringify(profile))
    showStatus('Профилът е запазен успешно! ✓', 'success')
    window.setTimeout(() => showStatus('', ''), 3500)
  } catch {
    showStatus('Грешка при запазване на профила. Моля опитайте отново.', 'error')
  }
}

onMounted(async () => {
  let existing = await loadProfileFromAPI()
  if (!existing) existing = safeJsonParse(localStorage.getItem('mp_profile'), null)

  const loginEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email')

  if (existing) {
    form.name = existing.name || ''
    form.email = existing.email || ''
    form.phone = existing.phone || ''
    form.location = existing.location || ''
    profileImage.value = existing.image || ''
  }

  if (loginEmail && !form.email) form.email = loginEmail
})
</script>

<template>
  <header class="topbar" aria-label="Горно меню">
    <div class="topbar-inner">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="Начало">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-text">NaturaLinka</span>
      </RouterLink>
      <nav class="topbar-actions">
        <RouterLink class="icon-btn" :class="{ active: route.name === 'home' }" :to="{ name: 'home' }"><span class="icon">🏠</span><span class="label">Начало</span></RouterLink>
        <RouterLink class="icon-btn" :class="{ active: route.name === 'notifications' }" :to="{ name: 'notifications' }"><span class="icon">🔔</span><span class="label">Известия</span></RouterLink>
        <RouterLink class="icon-btn" :class="{ active: route.name === 'profile' }" :to="{ name: 'profile' }"><span class="icon">👤</span><span class="label">Профил</span></RouterLink>
      </nav>
    </div>
  </header>

  <main class="page">
    <section class="panel-card profile-card">
      <form id="profileForm" class="profile-form" @submit.prevent="submitProfile">
        <div class="profile-picture-section">
          <div class="profile-picture-container">
            <input id="pfImage" type="file" name="image" class="profile-image-input" accept="image/*" hidden @change="onImageChange">
            <label for="pfImage" class="profile-image-label">
              <div v-if="!profileImage" class="profile-image-placeholder">
                <span class="camera-icon">📷</span>
                <p class="profile-image-text">(По избор)</p>
              </div>
              <img v-else :src="profileImage" alt="Profile" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">
            </label>
          </div>
        </div>

        <div class="profile-fields">
          <div class="profile-field">
            <label for="pfName">Потребителско име</label>
            <input id="pfName" v-model="form.name" name="name" class="styled-input" placeholder="Въведи твоето име" required>
          </div>
          <div class="profile-field">
            <label for="pfEmail">Имейл за контакт</label>
            <input id="pfEmail" v-model="form.email" name="email" class="styled-input" placeholder="example@mail.com" type="email" required>
          </div>
          <div class="profile-field">
            <label for="pfPhone">Телефон за контакт</label>
            <input id="pfPhone" v-model="form.phone" name="phone" class="styled-input" placeholder="+359 123 456 789" required>
          </div>
          <div class="profile-field">
            <label for="pfLocation">Местоположение</label>
            <input id="pfLocation" v-model="form.location" name="location" class="styled-input" placeholder="Град или село">
          </div>
        </div>

        <p v-if="status.message" id="profileStatus" class="form-status show" :class="status.type === 'success' ? 'form-status-success' : 'form-status-error'" aria-live="polite">
          {{ status.message }}
        </p>

        <div class="profile-actions">
          <button class="btn btn-primary btn-create" type="submit">Запази профил</button>
        </div>
      </form>
    </section>
  </main>
</template>

<style src="../../Homepage.css"></style>
