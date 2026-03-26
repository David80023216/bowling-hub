/**
 * settings.js — Settings view for Bowling Hub
 */

import * as Storage from './storage.js';
import { showToast, formField, inputClass, updateProfileUI, navigateTo } from './app.js';

export function renderSettings(container) {
  const profile = Storage.getProfile() || {};
  const settings = Storage.getSettings();
  const leagues = Storage.getLeagues();

  container.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold flex items-center gap-2"><i class="fa-solid fa-gear text-bowl-muted"></i> Settings</h2>
      <p class="text-bowl-muted text-sm">Manage your profile and app settings</p>
    </div>

    <!-- Profile Section -->
    <div class="bg-bowl-dark border border-bowl-border rounded-xl p-5 mb-6">
      <h3 class="font-bold text-lg mb-4 flex items-center gap-2"><i class="fa-solid fa-user text-bowl-red"></i> Profile</h3>
      <div class="space-y-4">
        ${formField('Name', `<input type="text" id="settings-name" value="${profile.name || ''}" class="${inputClass()}" />`, 'settings-name')}
        ${formField('USBC Member ID', `<input type="text" id="settings-usbc" value="${profile.usbcId || ''}" placeholder="1234-56789" class="${inputClass()}" />`, 'settings-usbc')}
        ${formField('Home Center', `<input type="text" id="settings-center" value="${profile.homeCenter || ''}" placeholder="Sunset Lanes" class="${inputClass()}" />`, 'settings-center')}
        ${formField('Email', `<input type="email" id="settings-email" value="${profile.email || ''}" placeholder="bowler@email.com" class="${inputClass()}" />`, 'settings-email')}
        ${formField('bowl.com Username', `<input type="text" id="settings-bowlcom" value="${profile.bowlcomUsername || ''}" placeholder="For data sync" class="${inputClass()}" />`, 'settings-bowlcom')}

        <button id="settings-save-profile" class="bg-bowl-red hover:bg-red-600 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2">
          <i class="fa-solid fa-check"></i> Save Profile
        </button>
      </div>
    </div>

    <!-- League Connections -->
    <div class="bg-bowl-dark border border-bowl-border rounded-xl p-5 mb-6">
      <h3 class="font-bold text-lg mb-4 flex items-center gap-2"><i class="fa-solid fa-link text-blue-400"></i> League Connections</h3>
      ${leagues.length === 0 ? `
        <p class="text-bowl-muted text-sm">No leagues added yet. <button class="text-bowl-red hover:underline" id="settings-go-leagues">Add a league</button></p>
      ` : `
        <div class="space-y-2">
          ${leagues.map(l => `
            <div class="flex items-center justify-between bg-bowl-navy rounded-lg px-4 py-3">
              <div>
                <p class="font-medium text-sm">${l.name}</p>
                <p class="text-xs text-bowl-muted">${l.center || 'No center'}</p>
              </div>
              <span class="text-xs font-mono text-bowl-muted">${l.lssId ? `LSS: ${l.lssId}` : 'No LSS ID'}</span>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- Theme Toggle -->
    <div class="bg-bowl-dark border border-bowl-border rounded-xl p-5 mb-6">
      <h3 class="font-bold text-lg mb-4 flex items-center gap-2"><i class="fa-solid fa-palette text-purple-400"></i> Appearance</h3>
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium">Dark Mode</p>
          <p class="text-sm text-bowl-muted">Toggle dark/light theme</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="settings-theme-toggle" class="sr-only peer" ${settings.theme === 'dark' ? 'checked' : ''} />
          <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bowl-red"></div>
        </label>
      </div>
    </div>

    <!-- Data Management -->
    <div class="bg-bowl-dark border border-bowl-border rounded-xl p-5 mb-6">
      <h3 class="font-bold text-lg mb-4 flex items-center gap-2"><i class="fa-solid fa-database text-bowl-amber"></i> Data Management</h3>
      <div class="space-y-3">
        <div class="flex flex-wrap gap-3">
          <button id="settings-export" class="bg-bowl-border hover:bg-gray-600 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 text-sm">
            <i class="fa-solid fa-download"></i> Export Data
          </button>
          <label id="settings-import-label" class="bg-bowl-border hover:bg-gray-600 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 text-sm cursor-pointer">
            <i class="fa-solid fa-upload"></i> Import Data
            <input type="file" id="settings-import" accept=".json" class="hidden" />
          </label>
        </div>
        <hr class="border-bowl-border" />
        <button id="settings-clear" class="bg-red-600/20 hover:bg-red-600/30 text-red-400 font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 text-sm">
          <i class="fa-solid fa-trash-can"></i> Clear All Data
        </button>
      </div>
    </div>

    <!-- About -->
    <div class="bg-bowl-dark border border-bowl-border rounded-xl p-5">
      <h3 class="font-bold text-lg mb-2 flex items-center gap-2">🎳 About Bowling Hub</h3>
      <p class="text-sm text-bowl-muted mb-2">Your personal bowling companion app. Track scores, manage leagues, log honor achievements, and challenge friends.</p>
      <p class="text-xs text-bowl-muted">Version 1.0.0 • Built with ❤️ for bowlers</p>
      <p class="text-xs text-bowl-muted mt-1">All data is stored locally on your device using localStorage.</p>
    </div>
  `;

  // Save profile
  document.getElementById('settings-save-profile').addEventListener('click', () => {
    const name = document.getElementById('settings-name').value.trim();
    if (!name) {
      showToast('Name is required', 'error');
      return;
    }
    const updated = {
      ...profile,
      name,
      usbcId: document.getElementById('settings-usbc').value.trim(),
      homeCenter: document.getElementById('settings-center').value.trim(),
      email: document.getElementById('settings-email').value.trim(),
      bowlcomUsername: document.getElementById('settings-bowlcom').value.trim(),
    };
    Storage.saveProfile(updated);
    updateProfileUI();
    showToast('Profile saved! ✅', 'success');
  });

  // Go to leagues
  document.getElementById('settings-go-leagues')?.addEventListener('click', () => navigateTo('leagues'));

  // Theme toggle
  document.getElementById('settings-theme-toggle').addEventListener('change', (e) => {
    const theme = e.target.checked ? 'dark' : 'light';
    Storage.saveSettings({ ...settings, theme });
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    showToast(`${theme === 'dark' ? '🌙 Dark' : '☀️ Light'} mode activated`, 'info');
  });

  // Export
  document.getElementById('settings-export').addEventListener('click', () => {
    const data = Storage.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bowling-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported! 📦', 'success');
  });

  // Import
  document.getElementById('settings-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (confirm('This will overwrite all your current data. Continue?')) {
          Storage.importAllData(data);
          updateProfileUI();
          showToast('Data imported! ✅', 'success');
          renderSettings(container);
        }
      } catch (err) {
        showToast('Invalid JSON file', 'error');
      }
    };
    reader.readAsText(file);
  });

  // Clear all
  document.getElementById('settings-clear').addEventListener('click', () => {
    if (confirm('⚠️ This will delete ALL your bowling data permanently. Are you sure?')) {
      if (confirm('Really sure? This cannot be undone.')) {
        Storage.clearAllData();
        showToast('All data cleared', 'info');
        window.location.reload();
      }
    }
  });
}
