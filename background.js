// Просто храним состояние включено/выключено
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.local.get('enabled');
  if (settings.enabled === undefined) {
    await chrome.storage.local.set({ enabled: true });
  }
});

// Слушаем запросы из попапа
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getState') {
    chrome.storage.local.get('enabled', (data) => {
      sendResponse({ enabled: data.enabled !== false });
    });
    return true;
  }
});
