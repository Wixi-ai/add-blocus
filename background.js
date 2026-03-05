// Счетчик блокировок через Chrome API
let blockedCount = 0;

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.local.get('enabled');
  if (settings.enabled === undefined) {
    await chrome.storage.local.set({ enabled: true, blockedCount: 0 });
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    chrome.storage.local.get(['enabled', 'blockedCount'], sendResponse);
    return true;
  }
  if (request.action === 'resetStats') {
    chrome.storage.local.set({ blockedCount: 0 });
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ success: true });
    return true;
  }
});
