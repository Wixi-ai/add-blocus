const MAX_RULES = 5000;
const STATIC_RULES_COUNT = 7;

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.storage.local.set({ blockedCount: 0 });

    const settings = await chrome.storage.local.get('enabled');
    if (settings.enabled === undefined) {
      await chrome.storage.local.set({ enabled: true });
    }

    // Очистка некорректных правил при установке
    await cleanupInvalidDynamicRules();
  } catch (error) {
    console.error('Ошибка инициализации:', error);
  }
});

chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
  chrome.storage.local.get('blockedCount', (data) => {
    try {
      const newCount = (data.blockedCount || 0) + 1;
      chrome.storage.local.set({ blockedCount: newCount });

      chrome.action.setBadgeText({ text: newCount.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#E53935' });
    } catch (error) {
      console.error('Ошибка обновления счетчика:', error);
    }
  });
});

async function addUserRule(domain) {
  try {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();

    // Проверка на дубликаты
    const exists = rules.some(r =>
      r.condition.urlFilter === `||${domain}^`
    );

    if (exists) {
      throw new Error('Правило уже существует');
    }

    if (rules.length >= MAX_RULES - STATIC_RULES_COUNT) {
      throw new Error('Достигнут лимит правил');
    }

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

    return { success: true };
  } catch (error) {
    console.error('Ошибка добавления правила:', error);
    throw error;
  }
}

async function removeUserRule(domain) {
  try {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleToRemove = rules.find(r =>
      r.condition.urlFilter === `||${domain}^`
    );

    if (ruleToRemove) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleToRemove.id]
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Ошибка удаления правила:', error);
    throw error;
  }
}

async function cleanupInvalidDynamicRules() {
  try {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;

    for (const rule of rules) {
      const domain = rule.condition.urlFilter.replace('||', '').replace('^', '');
      if (!domainRegex.test(domain)) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [rule.id]
        });
      }
    }
  } catch (error) {
    console.error('Ошибка очистки правил:', error);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleAsync = async () => {
    try {
      if (request.action === 'addRule') {
        return await addUserRule(request.domain);
      }
      if (request.action === 'removeRule') {
        return await removeUserRule(request.domain);
      }
      if (request.action === 'getStats') {
        const data = await chrome.storage.local.get(['blockedCount', 'enabled']);
        return data;
      }
      return { success: false, error: 'Неизвестное действие' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  handleAsync().then(sendResponse);
  return true;
});
