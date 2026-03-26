/**
 * app.js — Main application controller for Bowling Hub
 * Handles routing, navigation, modals, toasts, and view lifecycle.
 */

import * as Storage from './storage.js';
import { renderDashboard } from './dashboard.js';
import { renderScores } from './scores.js';
import { renderHonors } from './honors.js';
import { renderLeagues } from './leagues.js';
import { renderSchedule } from './schedule.js';
import { renderChallenges } from './challenges.js';
import { renderSettings } from './settings.js';

// ── State ────────────────────────────────────────────────
let currentView = 'dashboard';

// ── DOM References ───────────────────────────────────────
const viewContainer = document.getElementById('view-container');
const modalContainer = document.getElementById('modal-container');
const toastContainer = document.getElementById('toast-container');

// ── View Registry ────────────────────────────────────────
const views = {
  dashboard: renderDashboard,
  scores: renderScores,
  honors: renderHonors,
  leagues: renderLeagues,
  schedule: renderSchedule,
  challenges: renderChallenges,
  settings: renderSettings,
};

// ── Navigation ───────────────────────────────────────────
export function navigateTo(view) {
  if (!views[view]) return;
  currentView = view;

  // Update URL hash
  window.location.hash = view;

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    const isActive = item.dataset.view === view;
    item.classList.toggle('active', isActive);
    const indicator = item.querySelector('.nav-indicator');
    if (indicator) {
      indicator.style.width = isActive ? '100%' : '0';
    }
  });

  // Render the view
  viewContainer.innerHTML = '';
  viewContainer.className = 'p-4 md:p-6 lg:p-8 max-w-5xl mx-auto view-container';
  views[view](viewContainer);
}

// ── Modal System ─────────────────────────────────────────
export function showModal(title, contentBuilder, options = {}) {
  const { wide = false } = options;
  modalContainer.classList.remove('hidden');
  modalContainer.innerHTML = '';

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50';
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  const dialog = document.createElement('div');
  dialog.className = `bg-bowl-dark border border-bowl-border rounded-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[85vh] flex flex-col shadow-2xl`;

  // Header
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between p-5 border-b border-bowl-border';
  header.innerHTML = `
    <h3 class="text-lg font-bold">${title}</h3>
    <button id="modal-close-btn" class="text-gray-400 hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bowl-navy">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  // Body
  const body = document.createElement('div');
  body.className = 'p-5 overflow-y-auto flex-1';
  contentBuilder(body);

  dialog.appendChild(header);
  dialog.appendChild(body);
  backdrop.appendChild(dialog);
  modalContainer.appendChild(backdrop);

  // Close button
  header.querySelector('#modal-close-btn').addEventListener('click', closeModal);

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

export function closeModal() {
  modalContainer.classList.add('hidden');
  modalContainer.innerHTML = '';
}

// ── Toast Notifications ──────────────────────────────────
export function showToast(message, type = 'success') {
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-amber-600',
  };
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${colors[type] || colors.info} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm min-w-[250px]`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${message}`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ── Welcome / Setup Screen ──────────────────────────────
function renderSetup(container) {
  container.innerHTML = `
    <div class="min-h-[80vh] flex items-center justify-center">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="text-6xl mb-4 flex justify-center gap-2">
            <span class="pin-bounce inline-block">🎳</span>
          </div>
          <h1 class="text-3xl font-bold mb-2">Welcome to <span class="text-bowl-red">Bowling Hub</span></h1>
          <p class="text-bowl-muted">Your personal bowling companion. Track scores, leagues, and more.</p>
        </div>

        <div class="bg-bowl-dark border border-bowl-border rounded-2xl p-6 space-y-4">
          <h2 class="text-lg font-semibold mb-2"><i class="fa-solid fa-user-plus text-bowl-red mr-2"></i>Set Up Your Profile</h2>

          <div>
            <label class="block text-sm font-medium text-bowl-muted mb-1">Your Name *</label>
            <input type="text" id="setup-name" placeholder="John Smith" class="w-full bg-bowl-navy border border-bowl-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-bowl-red transition-colors" />
          </div>
          <div>
            <label class="block text-sm font-medium text-bowl-muted mb-1">USBC Member ID</label>
            <input type="text" id="setup-usbc" placeholder="1234-56789" class="w-full bg-bowl-navy border border-bowl-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-bowl-red transition-colors" />
          </div>
          <div>
            <label class="block text-sm font-medium text-bowl-muted mb-1">Home Center</label>
            <input type="text" id="setup-center" placeholder="Sunset Lanes" class="w-full bg-bowl-navy border border-bowl-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-bowl-red transition-colors" />
          </div>

          <button id="setup-submit" class="w-full bg-bowl-red hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2">
            <i class="fa-solid fa-bowling-ball"></i> Let's Bowl!
          </button>
        </div>

        <p class="text-center text-bowl-muted text-xs mt-6">Your data is stored locally on this device.</p>
      </div>
    </div>
  `;

  document.getElementById('setup-submit').addEventListener('click', () => {
    const name = document.getElementById('setup-name').value.trim();
    if (!name) {
      showToast('Please enter your name', 'error');
      return;
    }
    const profile = {
      name,
      usbcId: document.getElementById('setup-usbc').value.trim(),
      homeCenter: document.getElementById('setup-center').value.trim(),
      email: '',
      bowlcomUsername: '',
      createdAt: new Date().toISOString(),
    };
    Storage.saveProfile(profile);
    showToast(`Welcome, ${name}! 🎳`, 'success');
    updateProfileUI();
    navigateTo('dashboard');
    // Show nav
    document.getElementById('bottom-nav').classList.remove('hidden-force');
  });
}

// ── Profile UI Helpers ───────────────────────────────────
export function updateProfileUI() {
  const profile = Storage.getProfile();
  if (!profile) return;
  const initials = profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const sidebarName = document.getElementById('sidebar-name');
  const sidebarUsbc = document.getElementById('sidebar-usbc');
  const sidebarAvatar = document.querySelector('#sidebar-profile .rounded-full');
  const headerAvatar = document.getElementById('header-avatar');

  if (sidebarName) sidebarName.textContent = profile.name;
  if (sidebarUsbc) sidebarUsbc.textContent = profile.usbcId ? `USBC: ${profile.usbcId}` : 'USBC: —';
  if (sidebarAvatar) sidebarAvatar.textContent = initials;
  if (headerAvatar) headerAvatar.textContent = initials;
}

// ── Utility: format date ─────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function todayString() {
  return new Date().toISOString().split('T')[0];
}

// ── Utility: create a form field ─────────────────────────
export function formField(label, inputHTML, id) {
  return `
    <div>
      <label class="block text-sm font-medium text-bowl-muted mb-1" for="${id || ''}">${label}</label>
      ${inputHTML}
    </div>
  `;
}

export function inputClass() {
  return 'w-full bg-bowl-navy border border-bowl-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-bowl-red transition-colors';
}

export function selectClass() {
  return 'w-full bg-bowl-navy border border-bowl-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-bowl-red transition-colors';
}

export function btnPrimary(text, id, icon) {
  return `<button id="${id}" class="bg-bowl-red hover:bg-red-600 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2">
    ${icon ? `<i class="fa-solid ${icon}"></i>` : ''} ${text}
  </button>`;
}

export function btnSecondary(text, id, icon) {
  return `<button id="${id}" class="bg-bowl-border hover:bg-gray-600 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2">
    ${icon ? `<i class="fa-solid ${icon}"></i>` : ''} ${text}
  </button>`;
}

// ── Stat Card Helper ─────────────────────────────────────
export function statCard(icon, label, value, color = 'text-white') {
  return `
    <div class="bg-bowl-dark border border-bowl-border rounded-xl p-4 flex items-center gap-3">
      <div class="text-2xl">${icon}</div>
      <div>
        <p class="text-xs text-bowl-muted uppercase tracking-wide">${label}</p>
        <p class="text-xl font-bold ${color}">${value}</p>
      </div>
    </div>
  `;
}

// ── Score Highlight Class ────────────────────────────────
export function scoreClass(game) {
  if (game === 300) return 'rainbow-text font-bold';
  if (game >= 298) return 'text-bowl-amber font-bold';
  if (game >= 250) return 'text-bowl-amber';
  if (game >= 200) return 'text-bowl-green';
  return '';
}

// ── Detect Honor Scores ──────────────────────────────────
export function detectHonors(games, series) {
  const honors = [];
  games.forEach(g => {
    if (g === 300) honors.push({ type: '300 Game', label: '🏆 Perfect Game! 300!' });
    else if (g === 299) honors.push({ type: '299 Game', label: '⭐ 299 Game!' });
    else if (g === 298) honors.push({ type: '298 Game', label: '⭐ 298 Game!' });
  });
  if (series >= 800) honors.push({ type: '800 Series', label: '🏆 800+ Series!' });
  else if (series >= 700) honors.push({ type: '700 Series', label: '🌟 700+ Series!' });
  return honors;
}

// ── Initialize App ───────────────────────────────────────
function init() {
  // Apply saved theme
  const settings = Storage.getSettings();
  if (settings.theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }

  // Check if setup is done
  if (!Storage.isSetupComplete()) {
    renderSetup(viewContainer);
    return;
  }

  updateProfileUI();

  // Route from hash
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  if (views[hash]) {
    navigateTo(hash);
  } else {
    navigateTo('dashboard');
  }

  // Nav click handlers
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.view);
    });
  });

  // Hash change
  window.addEventListener('hashchange', () => {
    const h = window.location.hash.replace('#', '');
    if (views[h] && h !== currentView) {
      navigateTo(h);
    }
  });
}

// Start
init();
