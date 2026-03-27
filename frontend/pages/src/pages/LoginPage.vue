<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = reactive({ email: '', password: '' })
const isSubmitting = ref(false)

async function submitLogin() {
  isSubmitting.value = true

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const result = await response.json()

    if (response.ok) {
      if (result.token) localStorage.setItem('token', result.token)
      if (form.email) localStorage.setItem('user_email', form.email)
      await router.push('/')
      return
    }

    window.alert(`Login failed: ${result.message || 'Invalid credentials'}`)
  } catch {
    window.alert('Server is not responding.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <form id="loginForm" @submit.prevent="submitLogin">
        <div class="input-group">
          <label for="email">Email Address</label>
          <div class="field-wrapper">
            <input id="email" v-model="form.email" type="email" placeholder="email@example.com" required>
          </div>
        </div>
        <div class="input-group">
          <label for="password">Password</label>
          <div class="field-wrapper">
            <input id="password" v-model="form.password" type="password" placeholder="••••••••" required>
          </div>
        </div>
        <button id="loginBtn" type="submit" :disabled="isSubmitting">{{ isSubmitting ? 'Log In...' : 'Log In' }}</button>
      </form>
      <p class="register-text">
        Don't have an account? <RouterLink to="/register">Register</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  color: #2d3436;
  font-family: 'Segoe UI', Roboto, sans-serif;
}

.login-container {
  background: #ffffff;
  padding: 50px 40px;
  border-radius: 24px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.input-group { margin-bottom: 20px; }
.field-wrapper { position: relative; }

label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #636e72;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid #edf2f7;
  background: #f8fafc;
  color: #2d3436;
  font-size: 15px;
  transition: 0.3s ease;
}

input:focus {
  outline: none;
  border-color: #27ae60;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(39, 174, 96, 0.1);
}

button {
  width: 100%;
  padding: 16px;
  margin-top: 15px;
  border: none;
  border-radius: 12px;
  background: #27ae60;
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  transition: 0.3s ease;
}

button:hover {
  background: #2ecc71;
  transform: translateY(-2px);
}

.register-text {
  text-align: center;
  margin-top: 25px;
  font-size: 14px;
  color: #636e72;
}

.register-text a {
  color: #27ae60;
  text-decoration: none;
  font-weight: 700;
}
</style>
