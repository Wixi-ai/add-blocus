document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get('enabled');

  const toggle = document.getElementById('toggle-blocking');
  toggle.checked = data.enabled !== false;

  const statusText = document.getElementById('status-text');
  const indicator = document.getElementById('status-indicator');

  statusText.textContent = toggle.checked ? 'Активен' : 'Отключен';
  indicator.style.background = toggle.checked ? '#4ade80' : '#ef4444';

  toggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.local.set({ enabled });

    statusText.textContent = enabled ? 'Активен' : 'Отключен';
    indicator.style.background = enabled ? '#4ade80' : '#ef4444';

    if (enabled) {
      chrome.action.setBadgeText({ text: '' });
    }
  });

  document.getElementById('open-settings').addEventListener('click', () => {
    alert('Настройки будут в следующей версии');
  });
});
