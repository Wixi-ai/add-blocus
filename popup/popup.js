document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get(['enabled', 'blockedCount']);

  // Переключатель
  const toggle = document.getElementById('toggle-blocking');
  toggle.checked = data.enabled !== false;
  document.getElementById('status-text').textContent =
    toggle.checked ? 'Активен' : 'Отключен';

  // Статус индикатор
  const statusIndicator = document.getElementById('status-indicator');
  statusIndicator.style.background = data.enabled !== false ? '#4ade80' : '#ef4444';
  statusIndicator.style.boxShadow = data.enabled !== false
    ? '0 0 15px #4ade80'
    : '0 0 15px #ef4444';

  // Счетчики
  document.getElementById('blocked-count').textContent = data.blockedCount || 0;

  toggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.local.set({ enabled });

    const statusText = document.getElementById('status-text');
    statusText.textContent = enabled ? 'Активен' : 'Отключен';
    statusText.style.background = enabled
      ? 'linear-gradient(135deg, #4f5bff, #9f7aea)'
      : 'linear-gradient(135deg, #ef4444, #f97316)';

    statusIndicator.style.background = enabled ? '#4ade80' : '#ef4444';
    statusIndicator.style.boxShadow = enabled ? '0 0 15px #4ade80' : '0 0 15px #ef4444';

    if (enabled) {
      const data = await chrome.storage.local.get('blockedCount');
      chrome.action.setBadgeText({ text: (data.blockedCount || 0).toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#4f5bff' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  });

  // Добавление домена
  document.getElementById('add-domain').addEventListener('click', async () => {
    const domain = document.getElementById('domain').value.trim();
    if (domain) {
      const addBtn = document.getElementById('add-domain');
      addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      addBtn.disabled = true;

      await chrome.runtime.sendMessage({
        action: 'addRule',
        domain: domain
      });

      document.getElementById('domain').value = '';
      addBtn.innerHTML = '<i class="fas fa-plus"></i>';
      addBtn.disabled = false;
      loadCustomRules();
    }
  });

  // Enter в поле ввода
  document.getElementById('domain').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('add-domain').click();
    }
  });

  // Загрузка правил
  async function loadCustomRules() {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const list = document.getElementById('custom-rules-list');
    const customCountEl = document.getElementById('custom-rules-count');
    const totalRulesEl = document.getElementById('rules-count');

    customCountEl.textContent = rules.length;
    if (totalRulesEl) {
      totalRulesEl.textContent = 5 + rules.length;
    }

    if (rules.length === 0) {
      list.innerHTML = `
        <div class="empty-rules">
          <i class="fas fa-info-circle"></i>
          <span>Нет заблокированных доменов</span>
        </div>
      `;
      return;
    }

    list.innerHTML = '';
    rules.forEach(rule => {
      const domain = rule.condition.urlFilter.replace('||', '').replace('^', '');
      const item = document.createElement('div');
      item.className = 'rule-item';
      item.innerHTML = `
        <div class="rule-domain">
          <i class="fas fa-shield"></i>
          <span title="${domain}">${domain}</span>
        </div>
        <button class="remove-rule" data-domain="${domain}">
          <i class="fas fa-times"></i>
        </button>
      `;

      item.querySelector('.remove-rule').addEventListener('click', async (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        const domain = btn.dataset.domain;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;

        await chrome.runtime.sendMessage({
          action: 'removeRule',
          domain: domain
        });

        loadCustomRules();
      });

      list.appendChild(item);
    });
  }

  // Заглушки для кнопок
  document.getElementById('open-settings').addEventListener('click', () => {
    alert('⚙️ Настройки будут доступны в следующей версии');
  });

  document.getElementById('open-stats').addEventListener('click', () => {
    alert('📊 Расширенная статистика будет доступна в следующей версии');
  });

  await loadCustomRules();
});
