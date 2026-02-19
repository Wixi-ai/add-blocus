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
    '.fb-like',
    '.twitter-share-button',
    '.vkontakte-share',
    '.cookie-notice',
    '.gdpr',
    '.cookie-banner'
  ];

  // Социальные iframe, которые не нужно удалять
  const SAFE_IFRAME_PATTERNS = [
    'youtube.com/embed',
    'youtube.com/watch',
    'vk.com/video',
    'player.vimeo.com',
    'open.spotify.com',
    'maps.google.com',
    'yandex.ru/maps',
    'twitter.com/widgets',
    'facebook.com/plugins'
  ];

  function isAdElement(element) {
    if (element.tagName === 'IFRAME') {
      const src = element.src || '';
      return !SAFE_IFRAME_PATTERNS.some(pattern => src.includes(pattern));
    }
    return true;
  }

  function removeAds() {
    try {
      chrome.storage.local.get('enabled', (data) => {
        if (data.enabled === false) return;

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
          } catch (e) {
            // Игнорируем ошибки селекторов
          }
        });
      });
    } catch (e) {
      // Игнорируем ошибки доступа к storage
    }
  }

  const AD_HIDE_CSS = AD_SELECTORS.join(', ') + ' { display: none !important; }';

  try {
    const style = document.createElement('style');
    style.textContent = AD_HIDE_CSS;
    document.documentElement.appendChild(style);
  } catch (e) {
    // Игнорируем ошибки добавления стилей
  }

  const observer = new MutationObserver((mutations) => {
    try {
      chrome.storage.local.get('enabled', (data) => {
        if (data.enabled === true) {
          let needsCleanup = false;

          for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
              needsCleanup = true;
              break;
            }
          }

          if (needsCleanup) {
            removeAds();
          }
        }
      });
    } catch (e) {
      // Игнорируем ошибки
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      removeAds();
      try {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      } catch (e) {
        // Игнорируем ошибки наблюдения
      }
    });
  } else {
    removeAds();
    try {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } catch (e) {
      // Игнорируем ошибки наблюдения
    }
  }

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.enabled) {
        if (changes.enabled.newValue) {
          removeAds();
          try {
            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
          } catch (e) {
            // Игнорируем ошибки
          }
        } else {
          observer.disconnect();
        }
      }
    });
  } catch (e) {
    // Игнорируем ошибки
  }
})();
