document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadInitialData();
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    showError('Не удалось загрузить данные');
  }

  // Обработчики событий
  document.getElementById('toggle-blocking').addEventListener('change', handleToggle);
  document.getElementById('add-domain').addEventListener('click', handleAddDomain);
  document.getElementById('domain').addEventListener('keypress', handleEnterKey);
  document.getElementById('open-settings').addEventListener('click', () => showMessage('⚙️ Настройки будут доступны в следующей версии'));
  document.getElementById('open-stats').addEventListener('click', () => showMessage('📊 Расширенная статистика будет доступна в следующей версии'));

  // Автоматическая очистка устаревших правил
  await cleanupInvalidRules();
});

async function loadInitialData() {
  const data = await chrome.storage.local.get(['enabled', 'blockedCount']).catch(() => ({ enabled: true, blockedCount: 0 }));

  const toggle = document.getElementById('toggle-blocking');
  toggle.checked = data.enabled !== false;

  updateStatusDisplay(data.enabled !== false);
  updateCounters(data.blockedCount || 0);
  await loadCustomRules();
}

function updateStatusDisplay(enabled) {
  document.getElementById('status-text').textContent = enabled ? 'Активен' : 'Отключен';

  const statusIndicator = document.getElementById('status-indicator');
  statusIndicator.style.background = enabled ? '#4ade80' : '#ef4444';
  statusIndicator.style.boxShadow = enabled ? '0 0 15px #4ade80' : '0 0 15px #ef4444';
}

function updateCounters(blockedCount) {
  document.getElementById('blocked-count').textContent = blockedCount || 0;
}

async function handleToggle(e) {
  const enabled = e.target.checked;
  const toggle = e.target;
  const statusText = document.getElementById('status-text');
  const originalText = statusText.textContent;

  try {
    toggle.disabled = true;
    statusText.textContent = '...';

    await chrome.storage.local.set({ enabled });
    updateStatusDisplay(enabled);

    if (enabled) {
      const data = await chrome.storage.local.get('blockedCount');
      chrome.action.setBadgeText({ text: (data.blockedCount || 0).toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#E53935' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Ошибка переключения:', error);
    toggle.checked = !enabled;
    statusText.textContent = originalText;
    showError('Не удалось изменить состояние');
  } finally {
    toggle.disabled = false;
  }
}

async function handleAddDomain() {
  const input = document.getElementById('domain');
  const domain = input.value.trim().toLowerCase();
  const addBtn = document.getElementById('add-domain');

  if (!domain) {
    showError('Введите домен');
    return;
  }

  if (!isValidDomain(domain)) {
    showError('Некорректный домен');
    return;
  }

  const originalBtnContent = addBtn.innerHTML;
  addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  addBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'addRule',
      domain: domain
    });

    if (response?.success) {
      input.value = '';
      await loadCustomRules();
      showSuccess('Домен добавлен');
    } else {
      throw new Error('Ошибка добавления');
    }
  } catch (error) {
    console.error('Ошибка добавления домена:', error);
    showError('Не удалось добавить домен');
  } finally {
    addBtn.innerHTML = originalBtnContent;
    addBtn.disabled = false;
  }
}

function isValidDomain(domain) {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;
  return domainRegex.test(domain);
}

function handleEnterKey(e) {
  if (e.key === 'Enter') {
    document.getElementById('add-domain').click();
  }
}

async function loadCustomRules() {
  const list = document.getElementById('custom-rules-list');
  const customCountEl = document.getElementById('custom-rules-count');
  const totalRulesEl = document.getElementById('rules-count');

  try {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();

    customCountEl.textContent = rules.length;
    if (totalRulesEl) {
      totalRulesEl.textContent = 7 + rules.length;
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
    rules.sort((a, b) => a.id - b.id).forEach(rule => {
      const domain = extractDomainFromRule(rule);
      list.appendChild(createRuleElement(domain, rule.id));
    });
  } catch (error) {
    console.error('Ошибка загрузки правил:', error);
    list.innerHTML = `
      <div class="empty-rules">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Ошибка загрузки правил</span>
      </div>
    `;
  }
}

function extractDomainFromRule(rule) {
  return rule.condition.urlFilter
    .replace('||', '')
    .replace('^', '')
    .replace('*://*.', '')
    .replace('/*', '');
}

function createRuleElement(domain, ruleId) {
  const item = document.createElement('div');
  item.className = 'rule-item';
  item.innerHTML = `
    <div class="rule-domain">
      <i class="fas fa-shield"></i>
      <span title="${domain}">${domain}</span>
    </div>
    <button class="remove-rule" data-domain="${domain}" data-rule-id="${ruleId}">
      <i class="fas fa-times"></i>
    </button>
  `;

  item.querySelector('.remove-rule').addEventListener('click', handleRemoveRule);
  return item;
}

async function handleRemoveRule(e) {
  e.stopPropagation();
  const btn = e.currentTarget;
  const domain = btn.dataset.domain;
  const ruleId = btn.dataset.ruleId;
  const originalContent = btn.innerHTML;

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'removeRule',
      domain: domain
    });

    if (response?.success) {
      await loadCustomRules();
      showSuccess('Домен удален');
    } else {
      throw new Error('Ошибка удаления');
    }
  } catch (error) {
    console.error('Ошибка удаления домена:', error);
    btn.innerHTML = originalContent;
    btn.disabled = false;
    showError('Не удалось удалить домен');
  }
}

async function cleanupInvalidRules() {
  try {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const invalidRules = rules.filter(rule => {
      const domain = extractDomainFromRule(rule);
      return !isValidDomain(domain);
    });

    for (const rule of invalidRules) {
      await chrome.runtime.sendMessage({
        action: 'removeRule',
        domain: extractDomainFromRule(rule)
      });
    }
  } catch (error) {
    console.error('Ошибка очистки правил:', error);
  }
}

function showError(message) {
  showNotification(message, '#E53935');
}

function showSuccess(message) {
  showNotification(message, '#4ade80');
}

function showNotification(message, color) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: ${color};
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: fadeInOut 2s ease-in-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 2000);
}

function showMessage(message) {
  alert(message);
}
