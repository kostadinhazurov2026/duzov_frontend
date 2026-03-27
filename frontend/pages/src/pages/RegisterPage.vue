<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = reactive({ email: '', password: '', confirmPassword: '' })
const isSubmitting = ref(false)

async function submitRegister() {
  if (form.password !== form.confirmPassword) {
    window.alert('Passwords do not match!')
    return
  }

  if (form.password.length < 6) {
    window.alert('Password must be at least 6 characters long.')
    return
  }

  isSubmitting.value = true

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, password: form.password }),
    })

    const result = await response.json()

    if (response.ok) {
      window.alert('Registration successful! Now you can log in.')
      await router.push('/login')
      return
    }

    window.alert(`Registration failed: ${result.message || 'Unknown error'}`)
  } catch {
    window.alert('Could not connect to the server.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <div class="login-container">
      <form id="registerForm" @submit.prevent="submitRegister">
        <div class="input-group">
          <label for="reg-email">Email Address</label>
          <div class="field-wrapper">
            <input id="reg-email" v-model="form.email" type="email" placeholder="email@example.com" required>
          </div>
        </div>
        <div class="input-group">
          <label for="reg-password">Password</label>
          <div class="field-wrapper">
            <input id="reg-password" v-model="form.password" type="password" placeholder="Create password" required>
          </div>
        </div>
        <div class="input-group">
          <label for="confirm-password">Confirm Password</label>
          <div class="field-wrapper">
            <input id="confirm-password" v-model="form.confirmPassword" type="password" placeholder="Repeat password" required>
          </div>
        </div>
        <button id="registerBtn" type="submit" :disabled="isSubmitting">{{ isSubmitting ? 'Create Account...' : 'Create Account' }}</button>
      </form>
      <p class="register-text">
        Already have an account? <RouterLink to="/login">Log In</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.register-page {
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

.input-group { margin-bottom: 24px; }
.field-wrapper { position: relative; }

label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #636e72;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 2px solid #edf2f7;
  background: #f8fafc;
  color: #2d3436;
  font-size: 15px;
  transition: all 0.3s ease;
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
  margin-top: 10px;
  border: none;
  border-radius: 12px;
  background: #27ae60;
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  transition: 0.3s ease;
  box-shadow: 0 8px 15px rgba(39, 174, 96, 0.2);
}

button:hover {
  background: #2ecc71;
  transform: translateY(-2px);
  box-shadow: 0 12px 20px rgba(39, 174, 96, 0.3);
}

.register-text {
  text-align: center;
  margin-top: 35px;
  font-size: 14px;
  color: #636e72;
}

.register-text a {
  color: #27ae60;
  text-decoration: none;
  font-weight: 700;
}

.register-text a:hover {
  text-decoration: underline;
}
</style>
