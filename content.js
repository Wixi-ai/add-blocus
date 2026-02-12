const AD_SELECTORS = [
  '[class*="ad-"]', '[id*="ad-"]',
  '[class*="banner"]', '[id*="banner"]',
  '[class*="promo"]', '[id*="promo"]',
  '[class*="popup"]', '[id*="popup"]',
  '.yandex-rtb',
  '.yandex-ad',
  '[class*="yandex_rtb"]',
  '[id*="yandex_rtb"]',
  'ins.adsbygoogle',
  '[id*="google_ads"]',
  'iframe[src*="googleads"]',
  '.fb-like',
  '.twitter-share-button',
  '.vkontakte-share',
  '.cookie-notice',
  '.gdpr',
  '.modal-dialog',
  'iframe[src=""]',
  'iframe:empty'
];

const AD_HIDE_CSS = AD_SELECTORS.join(', ') + ' { display: none !important; }';

const style = document.createElement('style');
style.textContent = AD_HIDE_CSS;
document.documentElement.appendChild(style);

function removeAds() {
  chrome.storage.local.get('enabled', (data) => {
    if (data.enabled === false) return;

    AD_SELECTORS.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (!el.closest('header') && !el.closest('nav')) {
            el.remove();

            chrome.runtime.sendMessage({
              type: 'elementBlocked',
              selector: selector
            });
          }
        });
      } catch (e) {
      }
    });
  });
}

const observer = new MutationObserver((mutations) => {
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
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    removeAds();
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
} else {
  removeAds();
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enabled) {
    if (changes.enabled.newValue) {
      removeAds();
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      observer.disconnect();
    }
  }
});
