(function () {
  const AD_SELECTORS = [
    '[class*="ad-"]', '[id*="ad-"]',
    '[class*="banner"]', '[id*="banner"]',
    '[class*="promo"]', '[id*="promo"]',
    '[class*="popup"]', '[id*="popup"]',
    '[class*="overlay"]', '[id*="overlay"]',
    '[class*="modal"]', '[id*="modal"]',
    '.yandex-rtb',
    '.yandex-ad',
    '[class*="yandex_rtb"]',
    '[id*="yandex_rtb"]',
    'ins.adsbygoogle',
    '[id*="google_ads"]',
    'iframe[src*="doubleclick"]',
    'iframe[src*="yandex"][src*="ad"]',
    'iframe[src*="adfox"]',
    'iframe[src*="criteo"]',
    '.cookie-notice',
    '.gdpr',
    '.cookie-banner'
  ];

  // Белый список iframe - их НИКОГДА не трогаем
  const SAFE_IFRAME_PATTERNS = [
    'youtube.com/embed',
    'youtube.com/watch',
    'youtu.be',
    'vk.com/video',
    'player.vimeo.com',
    'open.spotify.com',
    'maps.google.com',
    'yandex.ru/maps',
    'twitter.com/widgets',
    'facebook.com/plugins',
    'instagram.com/p',
    'twitch.tv',
    'discord.com/widget'
  ];

  let styleElement = null;
  let observer = null;
  let isEnabled = true;

  function isAdElement(element) {
    if (element.tagName === 'IFRAME') {
      const src = element.src || '';
      // Если iframe в белом списке - не трогаем
      return !SAFE_IFRAME_PATTERNS.some(pattern => src.includes(pattern));
    }
    return true;
  }

  function addHideStyles() {
    if (styleElement || !isEnabled) return;

    const css = AD_SELECTORS.join(', ') + ' { display: none !important; }';
    styleElement = document.createElement('style');
    styleElement.textContent = css;
    styleElement.id = 'adblock-hide-styles';
    document.documentElement.appendChild(styleElement);
  }

  function removeHideStyles() {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
  }

  function removeAds() {
    if (!isEnabled) return;

    AD_SELECTORS.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (!el.closest('header') && !el.closest('nav') && !el.closest('main')) {
            if (isAdElement(el)) {
              el.remove();
            }
          }
        });
      } catch (e) { }
    });
  }

  function startObserver() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
      if (!isEnabled) return;

      let needsCleanup = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          needsCleanup = true;
          break;
        }
      }
      if (needsCleanup) removeAds();
    });

    try {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } catch (e) { }
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function updateState(enabled) {
    isEnabled = enabled;

    if (enabled) {
      addHideStyles();
      removeAds();
      startObserver();
    } else {
      removeHideStyles();
      stopObserver();
      // Восстанавливаем все скрытые/удаленные элементы?
      // Они уже удалены, страницу надо перезагрузить
      // Покажем сообщение
      if (document.body) {
        const msg = document.createElement('div');
        msg.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          background: #E53935;
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          z-index: 999999;
          font-size: 14px;
        `;
        msg.textContent = 'Блокировщик отключен. Обновите страницу для восстановления элементов.';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 5000);
      }
    }
  }

  // Загружаем начальное состояние
  chrome.storage.local.get('enabled', (data) => {
    updateState(data.enabled !== false);
  });

  // Слушаем изменения
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.enabled) {
      updateState(changes.enabled.newValue);
    }
  });

  // Запускаем при загрузке страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      chrome.storage.local.get('enabled', (data) => {
        if (data.enabled !== false) {
          removeAds();
          startObserver();
        }
      });
    });
  } else {
    chrome.storage.local.get('enabled', (data) => {
      if (data.enabled !== false) {
        removeAds();
        startObserver();
      }
    });
  }
})();
