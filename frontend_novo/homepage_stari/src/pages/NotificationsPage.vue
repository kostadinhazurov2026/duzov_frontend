<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

function safeJsonParse(value, fallback) {
  try {
    if (typeof value !== 'string' || !value.trim()) return fallback
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function formatDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Неизвестна дата'

  return date.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const profile = computed(() => safeJsonParse(localStorage.getItem('mp_profile'), null))
const offers = computed(() => safeJsonParse(localStorage.getItem('mp_offers'), []))

const inboxItems = computed(() => {
  const profileInterest = profile.value?.location || profile.value?.phone
    ? [{
        icon: '✦',
        kind: 'Интерес',
        kindClass: 'notify-kind-accent',
        title: 'Има нов интерес към твоя профил',
        body: 'Провери контактните си данни и местоположението, за да не не изпуснеш потенциален купувач.',
        date: formatDate(new Date().toISOString()),
      }]
    : []

  return profileInterest
})

const outboxItems = computed(() =>
  offers.value.slice(0, 3).map((offer) => ({
    icon: '↺',
    kind: 'Твоя обява',
    kindClass: 'notify-kind-success',
    title: `Публикувана обява: ${offer.product || 'Продукт'}`,
    body: 'Обявата е активна и видима за останалите потребители в платформата.',
    date: formatDate(offer.createdAt),
  })),
)
</script>

<template>
  <div>
    <header class="topbar">
      <div class="topbar-inner">
        <RouterLink class="brand" :to="{ name: 'home' }" aria-label="Начало">
          <span class="brand-mark" aria-hidden="true"></span>
          <span class="brand-text">Marketplace</span>
        </RouterLink>

        <nav class="topbar-actions">
          <RouterLink class="icon-btn" :class="{ active: route.name === 'home' }" :to="{ name: 'home' }">
            <span class="icon">🏠</span>
            <span class="label">Начало</span>
          </RouterLink>
          <RouterLink class="icon-btn" :class="{ active: route.name === 'notifications' }" :to="{ name: 'notifications' }">
            <span class="icon">🔔</span>
            <span class="label">Известия</span>
          </RouterLink>
          <RouterLink class="icon-btn" :class="{ active: route.name === 'profile' }" :to="{ name: 'profile' }">
            <span class="icon">👤</span>
            <span class="label">Профил</span>
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="page notifications-page">
      <section class="panel-card notifications-summary-card">
        <div class="notify-section-head">
          <div class="filter-title">Към теб</div>
          <span class="notify-counter">ВХОДЯЩИ</span>
        </div>
        <p class="filter-subtitle">Кой иска да купи от теб и от кого ти искаш да купиш.</p>

        <div v-if="inboxItems.length" class="notify-list compact-list">
          <article v-for="(item, index) in inboxItems" :key="`in-${index}`" class="notify-row">
            <div class="notify-icon" aria-hidden="true">{{ item.icon }}</div>
            <div class="notify-main">
              <div class="notify-topline">
                <span :class="['notify-kind', item.kindClass]">{{ item.kind }}</span>
                <span class="notify-date">{{ item.date }}</span>
              </div>
              <div class="notify-title">{{ item.title }}</div>
              <div class="notify-body">{{ item.body }}</div>
            </div>
            <div class="notify-arrow" aria-hidden="true">↗</div>
          </article>
        </div>
      </section>

      <section class="panel-card notifications-summary-card">
        <div class="notify-section-head">
          <div class="filter-title">От теб</div>
          <span class="notify-counter">ИЗХОДЯЩИ</span>
        </div>
        <p class="filter-subtitle">Активни и изпратени запитвания.</p>

        <div v-if="outboxItems.length" class="notify-list compact-list">
          <article v-for="(item, index) in outboxItems" :key="`out-${index}`" class="notify-row">
            <div class="notify-icon" aria-hidden="true">{{ item.icon }}</div>
            <div class="notify-main">
              <div class="notify-topline">
                <span :class="['notify-kind', item.kindClass]">{{ item.kind }}</span>
                <span class="notify-date">{{ item.date }}</span>
              </div>
              <div class="notify-title">{{ item.title }}</div>
              <div class="notify-body">{{ item.body }}</div>
            </div>
            <div class="notify-arrow" aria-hidden="true">↗</div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style src="../../Homepage.css"></style>
<style scoped>
.notifications-summary-card {
  min-height: 142px;
  padding: 28px 30px;
}

.compact-list {
  margin-top: 22px;
}
</style>
