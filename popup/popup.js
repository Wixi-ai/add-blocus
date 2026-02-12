document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get(['enabled', 'blockedCount']);

  const toggle = document.getElementById('toggle-blocking');
  toggle.checked = data.enabled !== false;
  document.getElementById('status-text').textContent =
    toggle.checked ? 'Активен' : 'Отключен';

  document.getElementById('blocked-count').textContent =
    data.blockedCount || 0;

  toggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.local.set({ enabled });
    document.getElementById('status-text').textContent =
      enabled ? 'Активен' : 'Отключен';

    if (enabled) {
      const data = await chrome.storage.local.get('blockedCount');
      chrome.action.setBadgeText({ text: (data.blockedCount || 0).toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  });

  document.getElementById('add-domain').addEventListener('click', async () => {
    const domain = document.getElementById('domain').value.trim();
    if (domain) {
      await chrome.runtime.sendMessage({
        action: 'addRule',
        domain: domain
      });
      document.getElementById('domain').value = '';
      loadCustomRules();
    }
  });

  async function loadCustomRules() {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const list = document.getElementById('custom-rules-list');
    list.innerHTML = '';

    rules.forEach(rule => {
      const domain = rule.condition.urlFilter.replace('||', '').replace('^', '');
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        margin-top: 8px;
        background: #333;
        border-radius: 4px;
        font-size: 12px;
      `;
      item.innerHTML = `
        <span>${domain}</span>
        <button data-id="${rule.id}" style="
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
        ">✕</button>
      `;

      item.querySelector('button').addEventListener('click', async (e) => {
        e.stopPropagation();
        await chrome.runtime.sendMessage({
          action: 'removeRule',
          domain: domain
        });
        loadCustomRules();
      });

      list.appendChild(item);
    });
  }

  await loadCustomRules();
});
