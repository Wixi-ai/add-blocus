// Счетчик блокировок
let blockedCount = 0;

// При установке расширения
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.local.get('enabled');
  if (settings.enabled === undefined) {
    await chrome.storage.local.set({
      enabled: true,
      blockedCount: 0,
      whitelist: [],
      blacklist: []
    });
  }
});

// Считаем заблокированные запросы
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  chrome.storage.local.get('blockedCount', (data) => {
    const newCount = (data.blockedCount || 0) + 1;
    chrome.storage.local.set({ blockedCount: newCount });
    chrome.action.setBadgeText({ text: String(newCount) });
    chrome.action.setBadgeBackgroundColor({ color: '#4f5bff' });
  });
});

// Слушаем сообщения
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Получено сообщение:', request.action);

  if (request.action === 'getStats') {
    chrome.storage.local.get(['enabled', 'blockedCount', 'whitelist', 'blacklist'], (data) => {
      sendResponse(data);
    });
    return true;
  }

  if (request.action === 'resetStats') {
    chrome.storage.local.set({ blockedCount: 0 }, () => {
      chrome.action.setBadgeText({ text: '' });
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'elementBlocked') {
    chrome.storage.local.get('blockedCount', (data) => {
      const newCount = (data.blockedCount || 0) + 1;
      chrome.storage.local.set({ blockedCount: newCount }, () => {
        chrome.action.setBadgeText({ text: String(newCount) });
      });
    });
  }

  if (request.action === 'addToWhitelist') {
    chrome.storage.local.get('whitelist', (data) => {
      const whitelist = data.whitelist || [];
      if (!whitelist.includes(request.site)) {
        whitelist.push(request.site);
        chrome.storage.local.set({ whitelist }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: 'Уже есть' });
      }
    });
    return true;
  }

  if (request.action === 'removeFromWhitelist') {
    chrome.storage.local.get('whitelist', (data) => {
      const whitelist = (data.whitelist || []).filter(site => site !== request.site);
      chrome.storage.local.set({ whitelist }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'addToBlacklist') {
    chrome.storage.local.get('blacklist', (data) => {
      const blacklist = data.blacklist || [];
      if (!blacklist.includes(request.domain)) {
        blacklist.push(request.domain);
        chrome.storage.local.set({ blacklist }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: 'Уже есть' });
      }
    });
    return true;
  }

  if (request.action === 'removeFromBlacklist') {
    chrome.storage.local.get('blacklist', (data) => {
      const blacklist = (data.blacklist || []).filter(domain => domain !== request.domain);
      chrome.storage.local.set({ blacklist }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'getCurrentTabInfo') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ url: tabs[0]?.url || '' });
    });
    return true;
  }
});
