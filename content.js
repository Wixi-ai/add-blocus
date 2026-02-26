(function () {
  // Слова-маркеры, по которым находим рекламу
  const AD_KEYWORDS = [
    'ad', 'banner', 'promo', 'popup', 'overlay', 'modal',
    'yandex-rtb', 'yandex-ad', 'google_ads'
  ];

  // Рекламные домены для iframe
  const AD_DOMAINS = [
    'doubleclick.net',
    'googleadservices.com',
    'yandex.ru/ads',
    'adfox.ru',
    'criteo.com'
  ];

  // Безопасные iframe (YouTube, карты и т.д.)
  const SAFE_IFRAMES = [
    'youtube.com',
    'vk.com/video',
    'maps.google.com',
    'yandex.ru/maps'
  ];

  let styleElement = null;
  let observer = null;
  let isEnabled = true;

  // Проверяем, можно ли удалять элемент
  function canRemove(element) {
    if (element.closest('header') || element.closest('nav') || element.closest('main')) {
      return false;
    }
    if (element.tagName === 'IFRAME') {
      const src = element.src || '';
      for (let safe of SAFE_IFRAMES) {
        if (src.includes(safe)) return false;
      }
    }
    return true;
  }

  // Добавляем CSS для скрытия
  function addStyles() {
    if (styleElement) return;

    let css = '';
    AD_KEYWORDS.forEach(word => {
      css += `[class*="${word}"], [id*="${word}"], `;
    });
    AD_DOMAINS.forEach(domain => {
      css += `iframe[src*="${domain}"], `;
    });
    css = css.slice(0, -2) + ' { display: none !important; }';

    styleElement = document.createElement('style');
    styleElement.textContent = css;
    document.documentElement.appendChild(styleElement);
  }

  function removeStyles() {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
  }

  // Удаляем рекламу
  function removeAds() {
    if (!isEnabled) return;

    AD_KEYWORDS.forEach(word => {
      document.querySelectorAll(`[class*="${word}"], [id*="${word}"]`).forEach(el => {
        if (canRemove(el)) el.remove();
      });
    });

    AD_DOMAINS.forEach(domain => {
      document.querySelectorAll(`iframe[src*="${domain}"]`).forEach(el => {
        if (canRemove(el)) el.remove();
      });
    });
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => { if (isEnabled) removeAds(); });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // Слушаем изменения состояния
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      isEnabled = changes.enabled.newValue;
      if (isEnabled) {
        addStyles();
        removeAds();
        startObserver();
      } else {
        removeStyles();
        stopObserver();
      }
    }
  });

  // Загружаем начальное состояние
  chrome.storage.local.get('enabled', (data) => {
    isEnabled = data.enabled !== false;
    if (isEnabled) {
      addStyles();
      removeAds();
      startObserver();
    }
  });
})();
