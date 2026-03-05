document.addEventListener('DOMContentLoaded', async () => {
  // Загружаем данные
  const data = await chrome.storage.local.get(['enabled', 'blockedCount', 'whitelist', 'blacklist']);

  // Переключатель
  const toggle = document.getElementById('toggle-blocking');
  toggle.checked = data.enabled !== false;

  const statusText = document.getElementById('status-text');
  const indicator = document.getElementById('status-indicator');

  statusText.textContent = toggle.checked ? 'Активен' : 'Отключен';
  indicator.style.background = toggle.checked ? '#4ade80' : '#ef4444';

  // Счетчик
  document.getElementById('blocked-count').textContent = data.blockedCount || 0;

  // Переключение вкладок
  const blacklistSection = document.getElementById('blacklist-section');
  const whitelistSection = document.getElementById('whitelist-section');
  const analyzeSection = document.getElementById('analyze-section');

  document.getElementById('tab-blacklist').addEventListener('click', () => {
    document.getElementById('tab-blacklist').style.background = 'rgba(79, 91, 255, 0.2)';
    document.getElementById('tab-whitelist').style.background = '';
    document.getElementById('tab-analyze').style.background = '';
    blacklistSection.style.display = 'block';
    whitelistSection.style.display = 'none';
    analyzeSection.style.display = 'none';
  });

  document.getElementById('tab-whitelist').addEventListener('click', () => {
    document.getElementById('tab-whitelist').style.background = 'rgba(79, 91, 255, 0.2)';
    document.getElementById('tab-blacklist').style.background = '';
    document.getElementById('tab-analyze').style.background = '';
    whitelistSection.style.display = 'block';
    blacklistSection.style.display = 'none';
    analyzeSection.style.display = 'none';
  });

  document.getElementById('tab-analyze').addEventListener('click', () => {
    document.getElementById('tab-analyze').style.background = 'rgba(79, 91, 255, 0.2)';
    document.getElementById('tab-blacklist').style.background = '';
    document.getElementById('tab-whitelist').style.background = '';
    analyzeSection.style.display = 'block';
    blacklistSection.style.display = 'none';
    whitelistSection.style.display = 'none';
  });

  // Обработчик переключателя
  toggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.local.set({ enabled });

    statusText.textContent = enabled ? 'Активен' : 'Отключен';
    indicator.style.background = enabled ? '#4ade80' : '#ef4444';

    if (enabled) {
      const data = await chrome.storage.local.get('blockedCount');
      chrome.action.setBadgeText({ text: String(data.blockedCount || 0) });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  });

  // Загрузка черного списка
  async function loadBlacklist() {
    const data = await chrome.storage.local.get('blacklist');
    const blacklist = data.blacklist || [];
    const container = document.getElementById('blacklist-items');

    if (blacklist.length === 0) {
      container.innerHTML = '<div class="empty-rules"><i class="fas fa-info-circle"></i><span>Нет заблокированных доменов</span></div>';
      return;
    }

    container.innerHTML = '';
    blacklist.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'rule-item';
      item.innerHTML = `
        <div class="rule-domain">
          <i class="fas fa-ban" style="color: #ef4444;"></i>
          <span>${domain}</span>
        </div>
        <button class="remove-rule" data-domain="${domain}" data-type="blacklist">
          <i class="fas fa-times"></i>
        </button>
      `;
      container.appendChild(item);
    });

    document.querySelectorAll('[data-type="blacklist"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const domain = e.currentTarget.dataset.domain;
        await chrome.runtime.sendMessage({ action: 'removeFromBlacklist', domain });
        loadBlacklist();
      });
    });
  }

  // Загрузка белого списка
  async function loadWhitelist() {
    const data = await chrome.storage.local.get('whitelist');
    const whitelist = data.whitelist || [];
    const container = document.getElementById('whitelist-items');

    if (whitelist.length === 0) {
      container.innerHTML = '<div class="empty-rules"><i class="fas fa-info-circle"></i><span>Нет сайтов в белом списке</span></div>';
      return;
    }

    container.innerHTML = '';
    whitelist.forEach(site => {
      const item = document.createElement('div');
      item.className = 'rule-item';
      item.innerHTML = `
        <div class="rule-domain">
          <i class="fas fa-check-circle" style="color: #4ade80;"></i>
          <span>${site}</span>
        </div>
        <button class="remove-rule" data-site="${site}" data-type="whitelist">
          <i class="fas fa-times"></i>
        </button>
      `;
      container.appendChild(item);
    });

    document.querySelectorAll('[data-type="whitelist"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const site = e.currentTarget.dataset.site;
        await chrome.runtime.sendMessage({ action: 'removeFromWhitelist', site });
        loadWhitelist();
      });
    });
  }

  // Добавление в черный список
  document.getElementById('add-blacklist').addEventListener('click', async () => {
    const input = document.getElementById('blacklist-domain');
    const domain = input.value.trim().toLowerCase();

    if (!domain) return;

    await chrome.runtime.sendMessage({ action: 'addToBlacklist', domain });
    input.value = '';
    loadBlacklist();
  });

  // Добавление в белый список
  document.getElementById('add-whitelist').addEventListener('click', async () => {
    const input = document.getElementById('whitelist-domain');
    const site = input.value.trim().toLowerCase();

    if (!site) return;

    await chrome.runtime.sendMessage({ action: 'addToWhitelist', site });
    input.value = '';
    loadWhitelist();
  });

  // Анализ сайта
  document.getElementById('analyze-button').addEventListener('click', async () => {
    const resultsDiv = document.getElementById('analyze-results');
    resultsDiv.innerHTML = '<div class="empty-rules"><i class="fas fa-spinner fa-spin"></i><span>Анализ...</span></div>';

    // Получаем текущую вкладку
    const tab = await chrome.runtime.sendMessage({ action: 'getCurrentTabInfo' });

    // Запускаем скрипт анализа
    chrome.scripting.executeScript({
      target: { tabId: (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id },
      func: () => {
        const domains = new Set();

        // Собираем все iframe
        document.querySelectorAll('iframe').forEach(iframe => {
          if (iframe.src) {
            try {
              const url = new URL(iframe.src);
              domains.add(url.hostname);
            } catch (e) { }
          }
        });

        // Собираем все скрипты
        document.querySelectorAll('script[src]').forEach(script => {
          try {
            const url = new URL(script.src);
            domains.add(url.hostname);
          } catch (e) { }
        });

        return Array.from(domains);
      }
    }, (results) => {
      const domains = results[0]?.result || [];

      // Рекламные ключевые слова
      const adKeywords = ['ad', 'doubleclick', 'googlead', 'yandex', 'adfox', 'criteo'];

      let html = '';
      domains.forEach(domain => {
        const isAd = adKeywords.some(keyword => domain.includes(keyword));
        html += `
          <div class="rule-item" style="border-color: ${isAd ? '#ef4444' : '#4f5bff'}">
            <div class="rule-domain" style="flex: 1;">
              <i class="fas ${isAd ? 'fa-exclamation-triangle' : 'fa-globe'}" style="color: ${isAd ? '#ef4444' : '#9f7aea'};"></i>
              <span>${domain}</span>
            </div>
            ${isAd ? `
              <button class="add-to-blacklist" data-domain="${domain}" style="
                background: rgba(239, 68, 68, 0.2);
                border: none;
                color: #ef4444;
                width: 28px;
                height: 28px;
                border-radius: 8px;
                cursor: pointer;
              ">
                <i class="fas fa-ban"></i>
              </button>
            ` : ''}
          </div>
        `;
      });

      resultsDiv.innerHTML = html || '<div class="empty-rules">Ничего не найдено</div>';

      // Добавляем обработчики для кнопок
      document.querySelectorAll('.add-to-blacklist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const domain = e.currentTarget.dataset.domain;
          await chrome.runtime.sendMessage({ action: 'addToBlacklist', domain });
          alert(`Домен ${domain} добавлен в черный список`);
          e.currentTarget.remove();
        });
      });
    });
  });

  // Сброс статистики
  document.getElementById('reset-stats').addEventListener('click', async () => {
    await chrome.storage.local.set({ blockedCount: 0 });
    chrome.action.setBadgeText({ text: '' });
    document.getElementById('blocked-count').textContent = '0';
  });

  // Enter в полях ввода
  document.getElementById('blacklist-domain').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('add-blacklist').click();
  });

  document.getElementById('whitelist-domain').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('add-whitelist').click();
  });

  // Загружаем списки
  loadBlacklist();
  loadWhitelist();
});
