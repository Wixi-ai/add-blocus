(function () {
  // Ключевые слова для поиска рекламы
  const AD_KEYWORDS = ['ad', 'banner', 'promo', 'popup', 'yandex', 'google_ads'];

  // Рекламные домены (базовые)
  const AD_DOMAINS = ['doubleclick.net', 'yandex.ru/ads', 'adfox.ru', 'criteo.com'];

  // Безопасные iframe
  const SAFE_IFRAMES = ['youtube.com', 'vk.com/video', 'maps.google.com', 'github.com'];

  let styleElement = null;
  let observer = null;
  let isEnabled = true;
  let debounceTimer = null;
  let whitelist = [];

  // Загружаем белый список
  function loadWhitelist() {
    chrome.storage.local.get('whitelist', (data) => {
      whitelist = data.whitelist || [];
    });
  }

  // Проверка белого списка
  function isWhitelisted() {
    const url = window.location.hostname;
    return whitelist.some(site => url.includes(site));
  }

  // Проверка можно ли удалять элемент
  function canRemove(element) {
    if (element.closest('header') || element.closest('nav')) return false;
    if (element.tagName === 'IFRAME') {
      const src = element.src || '';
      for (let safe of SAFE_IFRAMES) {
        if (src.includes(safe)) return false;
      }
    }
    return true;
  }

  // Удаление рекламы с задержкой
  function debouncedRemoveAds() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!isEnabled || isWhitelisted()) return;

      // Поиск по ключевым словам
      AD_KEYWORDS.forEach(word => {
        document.querySelectorAll(`[class*="${word}"], [id*="${word}"]`).forEach(el => {
          if (canRemove(el)) {
            el.remove();
            chrome.runtime.sendMessage({ type: 'elementBlocked' });
          }
        });
      });

      // Поиск по базовым доменам
      AD_DOMAINS.forEach(domain => {
        document.querySelectorAll(`iframe[src*="${domain}"]`).forEach(el => {
          if (canRemove(el)) {
            el.remove();
            chrome.runtime.sendMessage({ type: 'elementBlocked' });
          }
        });
      });

      // Поиск по пользовательским доменам
      chrome.storage.local.get('blacklist', (data) => {
        const blacklist = data.blacklist || [];
        blacklist.forEach(domain => {
          document.querySelectorAll(`iframe[src*="${domain}"], script[src*="${domain}"]`).forEach(el => {
            if (canRemove(el)) {
              el.remove();
              chrome.runtime.sendMessage({ type: 'elementBlocked' });
            }
          });
        });
      });
    }, 100);
  }

  // Добавление CSS стилей
  function addStyles() {
    if (styleElement || isWhitelisted()) return;

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

  // Удаление стилей
  function removeStyles() {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
  }

  // Запуск наблюдения
  function startObserver() {
    if (observer || isWhitelisted()) return;

    observer = new MutationObserver(debouncedRemoveAds);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  // Остановка наблюдения
  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // Обновление состояния
  function updateState(enabled) {
    isEnabled = enabled;
    loadWhitelist();

    if (enabled && !isWhitelisted()) {
      addStyles();
      debouncedRemoveAds();
      startObserver();
    } else {
      removeStyles();
      stopObserver();
    }
  }

  // Слушаем изменения
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) updateState(changes.enabled.newValue);
    if (changes.whitelist) {
      loadWhitelist();
      updateState(isEnabled);
    }
  });

  // Загружаем начальное состояние
  chrome.storage.local.get(['enabled', 'whitelist'], (data) => {
    whitelist = data.whitelist || [];
    updateState(data.enabled !== false);
  });
})();
