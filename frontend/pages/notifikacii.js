function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag)

  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') node.className = String(value)
    else node.setAttribute(key, String(value))
  })

  children.forEach((child) => node.append(child))
  return node
}

function text(value) {
  return document.createTextNode(value)
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

function buildMetaChips(meta = []) {
  return meta
    .filter((item) => item?.value)
    .map((item) => el('span', { class: 'notify-chip' }, [
      el('span', { class: 'notify-chip-label' }, [text(`${item.label}: `)]),
      text(item.value),
    ]))
}

function createNotificationCard(item) {
  const chips = buildMetaChips(item.meta)

  return el('article', { class: 'notify-row' }, [
    el('div', { class: 'notify-icon', 'aria-hidden': 'true' }, [text(item.icon || '•')]),
    el('div', { class: 'notify-main' }, [
      el('div', { class: 'notify-topline' }, [
        el('span', { class: `notify-kind ${item.kindClass || ''}`.trim() }, [text(item.kind || 'Известие')]),
        ...(item.date ? [el('span', { class: 'notify-date' }, [text(item.date)])] : []),
      ]),
      el('div', { class: 'notify-title' }, [text(item.title)]),
      ...(item.body ? [el('div', { class: 'notify-body' }, [text(item.body)])] : []),
      ...(chips.length ? [el('div', { class: 'notify-meta' }, chips)] : []),
    ]),
    el('div', { class: 'notify-arrow', 'aria-hidden': 'true' }, [text('↗')]),
  ])
}

function renderList(container, items) {
  container.innerHTML = ''

  if (!items.length) {
    container.append(
      el('div', { class: 'notify-empty' }, [text('Няма нотификации засега.')]),
    )
    return
  }

  items.forEach((item) => {
    container.append(createNotificationCard(item))
  })
}

function createInboxItems(profile, offers) {
  const profileInterest = profile?.location || profile?.phone
    ? [{
        icon: '✦',
        kind: 'Интерес',
        kindClass: 'notify-kind-accent',
        title: 'Има нов интерес към твоя профил',
        body: 'Провери контактните си данни и местоположението, за да не изпуснеш потенциален купувач.',
        date: formatDate(new Date().toISOString()),
        meta: [
          { label: 'Местоположение', value: profile?.location || '—' },
          { label: 'Телефон', value: profile?.phone || '—' },
        ],
      }]
    : []

  const newOffers = offers.slice(0, 5).map((offer) => ({
    icon: '●',
    kind: 'Нова обява',
    kindClass: 'notify-kind-soft',
    title: `Нова обява в системата: ${offer.product || 'Продукт'}`,
    body: 'Появи се нова възможност в marketplace-а, която може да е интересна за теб.',
    date: formatDate(offer.createdAt),
    meta: [
      { label: 'Регион', value: offer.region || '—' },
      { label: 'Цена', value: offer.price ? `${offer.price} €` : '—' },
      { label: 'Продавач', value: offer.sellerName || '—' },
    ],
  }))

  return [...profileInterest, ...newOffers]
}

function createOutboxItems(offers) {
  return offers.map((offer) => ({
    icon: '↺',
    kind: 'Твоя обява',
    kindClass: 'notify-kind-success',
    title: `Публикувана обява: ${offer.product || 'Продукт'}`,
    body: 'Обявата е активна и видима за останалите потребители в платформата.',
    date: formatDate(offer.createdAt),
    meta: [
      { label: 'Цена', value: offer.price ? `${offer.price} €` : '—' },
      { label: 'Регион', value: offer.region || '—' },
      { label: 'Описание', value: offer.description || 'Без описание' },
    ],
  }))
}

function init() {
  const inbox = document.getElementById('inboxList')
  const outbox = document.getElementById('outboxList')

  if (!inbox || !outbox) return

  const profile = safeJsonParse(localStorage.getItem('mp_profile'), null)
  const offers = safeJsonParse(localStorage.getItem('mp_offers'), [])

  renderList(inbox, createInboxItems(profile, offers))
  renderList(outbox, createOutboxItems(offers))
}

init()
