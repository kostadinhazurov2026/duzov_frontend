function safeJsonParse(s, fallback) {
  try { return JSON.parse(s) } catch { return fallback }
}

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag)
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') n.className = String(v)
    else n.setAttribute(k, String(v))
  })
  children.forEach((c) => n.append(c))
  return n
}

function renderList(container, items) {
  container.innerHTML = ''
  if (!items.length) {
    container.append(el('div', { class: 'notify-empty' }, [document.createTextNode('Няма нотификации засега.')]))
    return
  }

  items.forEach((it) => {
    const row = el('div', { class: 'notify-row' }, [
      el('div', { class: 'notify-main' }, [
        el('div', { class: 'notify-title' }, [document.createTextNode(it.title)]),
        el('div', { class: 'notify-meta' }, [document.createTextNode(it.meta)]),
      ]),
    ])
    container.append(row)
  })
}

function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'неизвестна дата'
  return d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function init() {
  const inbox = document.getElementById('inboxList')
  const outbox = document.getElementById('outboxList')
  if (!inbox || !outbox) return

  const profile = safeJsonParse(localStorage.getItem('mp_profile'), null)
  const offers = safeJsonParse(localStorage.getItem('mp_offers'), [])

  const inboxItems = [
    ...(profile?.product ? [{
      title: `Има интерес към твоя продукт: ${profile.product}`,
      meta: `Твоят регион: ${profile.region || '—'} • Телефон: ${profile.phone || '—'}`,
    }] : []),
    ...offers.slice(0, 5).map((offer) => ({
      title: `Нова обява в системата: ${offer.product || 'Продукт'}`,
      meta: `Количество: ${offer.quantity || '—'} • Регион: ${offer.region || '—'} • Публикувана: ${formatDate(offer.createdAt)}`,
    })),
  ]

  const outboxItems = offers.map((offer) => ({
    title: `Твоя обява: ${offer.product || 'Продукт'}`,
    meta: `Количество: ${offer.quantity || '—'} • Цена: ${offer.price || '—'} лв. • Регион: ${offer.region || '—'}`,
  }))

  renderList(inbox, inboxItems)
  renderList(outbox, outboxItems)
}

init()
