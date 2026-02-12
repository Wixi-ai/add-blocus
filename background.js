const MAX_RULES = 5000;
let blockedCount = 0;

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ blockedCount: 0 });

  const settings = await chrome.storage.local.get('enabled');
  if (settings.enabled === undefined) {
    await chrome.storage.local.set({ enabled: true });
  }

  console.log('Прометей AdBlock активирован');
});

chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener(
  (info) => {
    chrome.storage.local.get('blockedCount', (data) => {
      const newCount = (data.blockedCount || 0) + 1;
      chrome.storage.local.set({ blockedCount: newCount });

      chrome.action.setBadgeText({ text: newCount.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    });
  }
);

async function addUserRule(domain) {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const nextId = rules.length > 0
    ? Math.max(...rules.map(r => r.id)) + 1
    : 1000;

  const newRule = {
    id: nextId,
    priority: 2,
    action: { type: "block" },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ["script", "image", "xmlhttprequest", "sub_frame"]
    }
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [newRule]
  });
}

async function removeUserRule(domain) {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const ruleToRemove = rules.find(r =>
    r.condition.urlFilter === `||${domain}^`
  );

  if (ruleToRemove) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleToRemove.id]
    });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addRule') {
    addUserRule(request.domain).then(() => sendResponse({ success: true }));
    return true;
  }
  if (request.action === 'removeRule') {
    removeUserRule(request.domain).then(() => sendResponse({ success: true }));
    return true;
  }
  if (request.action === 'getStats') {
    chrome.storage.local.get(['blockedCount', 'enabled'], (data) => {
      sendResponse(data);
    });
    return true;
  }
});
