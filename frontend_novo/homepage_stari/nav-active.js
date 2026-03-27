// Определи активната страница и осветли съответния бутон
(function() {
  const currentPage = window.location.pathname.split('/').pop() || 'Homepage.html'
  
  // Карта за съответствие между URL и текста на бутона
  const pageMap = {
    'Homepage.html': 'Начало',
    'profil.html': 'Профил',
    'notifikacii.html': 'Нотификации',
    'obyava.html': 'Нова обява',
    '': 'Начало', // ако е root
    'index.html': 'Начало'
  }

  const currentPageButton = pageMap[currentPage]
  
  if (!currentPageButton) return

  // Намери всички бутони в топния бар
  const buttons = document.querySelectorAll('.topbar-actions .icon-btn')
  
  buttons.forEach((btn) => {
    const label = btn.querySelector('.label')
    if (label && label.textContent === currentPageButton) {
      btn.classList.add('active')
    }
  })
})()
