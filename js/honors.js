/**
 * honors.js — Honor Scores view for Bowling Hub
 */

import * as Storage from './storage.js';
import { showModal, closeModal, showToast, formatDate, todayString, formField, inputClass, selectClass, btnPrimary } from './app.js';

const HONOR_TYPES = ['300 Game', '299 Game', '298 Game', '800 Series', '700 Series', '11-in-a-row'];

const HONOR_ICONS = {
  '300 Game': '🏆',
  '299 Game': '🥇',
  '298 Game': '🥈',
  '800 Series': '🏆',
  '700 Series': '🥇',
  '11-in-a-row': '⭐',
};

const HONOR_COLORS = {
  '300 Game': 'from-yellow-500 to-amber-600',
  '299 Game': 'from-blue-500 to-indigo-600',
  '298 Game': 'from-purple-500 to-pink-600',
  '800 Series': 'from-red-500 to-orange-600',
  '700 Series': 'from-green-500 to-teal-600',
  '11-in-a-row': 'from-cyan-500 to-blue-600',
};

export function renderHonors(container) {
  const honors = Storage.getHonors();

  // Group by type
  const grouped = {};
  HONOR_TYPES.forEach(t => { grouped[t] = []; });
  honors.forEach(h => {
    if (grouped[h.type]) grouped[h.type].push(h);
    else grouped[h.type] = [h]; // fallback
  });

  container.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold flex items-center gap-2"><i class="fa-solid fa-trophy text-yellow-400"></i> Honor Scores</h2>
        <p class="text-bowl-muted text-sm">Your certified bowling achievements</p>
      </div>
      ${btnPrimary('Add Honor', 'btn-add-honor', 'fa-medal')}
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
      ${HONOR_TYPES.map(type => {
        const count = grouped[type].length;
        return `
          <div class="bg-bowl-dark border border-bowl-border rounded-xl p-3 text-center">
            <div class="text-2xl mb-1">${HONOR_ICONS[type]}</div>
            <p class="text-xl font-bold ${count > 0 ? 'text-bowl-amber' : 'text-gray-600'}">${count}</p>
            <p class="text-[10px] text-bowl-muted leading-tight">${type}</p>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Honor Entries -->
    <div class="space-y-4">
      ${honors.length === 0 ? `
        <div class="text-center py-16 text-bowl-muted">
          <i class="fa-solid fa-medal text-5xl mb-4 opacity-50"></i>
          <p class="text-lg">No honor scores yet</p>
          <p class="text-sm">Keep bowling — greatness awaits! 🎳</p>
        </div>
      ` : honors.map(h => renderHonorCard(h)).join('')}
    </div>
  `;

  // Add honor handler
  document.getElementById('btn-add-honor').addEventListener('click', () => openAddHonorModal());

  // Delete handlers
  document.querySelectorAll('.btn-delete-honor').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Remove this honor score?')) {
        Storage.deleteHonor(btn.dataset.id);
        showToast('Honor score removed', 'info');
        renderHonors(container);
      }
    });
  });
}

function renderHonorCard(h) {
  const gradient = HONOR_COLORS[h.type] || 'from-gray-500 to-gray-600';
  const icon = HONOR_ICONS[h.type] || '🎳';

  return `
    <div class="bg-bowl-dark border border-bowl-border rounded-xl overflow-hidden">
      <div class="bg-gradient-to-r ${gradient} px-5 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-3xl">${icon}</span>
          <div>
            <p class="font-bold text-white text-lg">${h.type}</p>
            <p class="text-white/80 text-sm">${formatDate(h.date)}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${h.verified ? '<span class="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> Verified</span>' : '<span class="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full">Unverified</span>'}
          <button class="btn-delete-honor text-white/60 hover:text-white transition-colors" data-id="${h.id}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="px-5 py-3 flex flex-wrap gap-4 text-sm">
        ${h.league ? `<div><span class="text-bowl-muted">League:</span> <span class="font-medium">${h.league}</span></div>` : ''}
        ${h.center ? `<div><span class="text-bowl-muted">Center:</span> <span class="font-medium">${h.center}</span></div>` : ''}
        ${h.games && h.games.length > 0 ? `<div><span class="text-bowl-muted">Games:</span> <span class="font-mono font-medium">${h.games.join(' - ')}</span></div>` : ''}
        ${h.series ? `<div><span class="text-bowl-muted">Series:</span> <span class="font-bold">${h.series}</span></div>` : ''}
      </div>
    </div>
  `;
}

function openAddHonorModal() {
  showModal('🏆 Add Honor Score', (body) => {
    const profile = Storage.getProfile();
    const leagues = Storage.getLeagues();

    body.innerHTML = `
      <div class="space-y-4">
        ${formField('Honor Type', `
          <select id="honor-type" class="${selectClass()}">
            ${HONOR_TYPES.map(t => `<option value="${t}">${HONOR_ICONS[t]} ${t}</option>`).join('')}
          </select>
        `, 'honor-type')}

        ${formField('Date', `<input type="date" id="honor-date" value="${todayString()}" class="${inputClass()}" />`, 'honor-date')}

        ${formField('League', `
          <select id="honor-league" class="${selectClass()}">
            <option value="">Select League</option>
            <option value="Practice">Practice</option>
            ${leagues.map(l => `<option value="${l.name}">${l.name}</option>`).join('')}
          </select>
        `, 'honor-league')}

        ${formField('Center', `<input type="text" id="honor-center" value="${profile.homeCenter || ''}" placeholder="Bowling center name" class="${inputClass()}" />`, 'honor-center')}

        <div>
          <label class="block text-sm font-medium text-bowl-muted mb-2">Games</label>
          <div class="grid grid-cols-3 gap-2">
            <input type="number" id="honor-g1" min="0" max="300" placeholder="Game 1" class="${inputClass()} text-center" />
            <input type="number" id="honor-g2" min="0" max="300" placeholder="Game 2" class="${inputClass()} text-center" />
            <input type="number" id="honor-g3" min="0" max="300" placeholder="Game 3" class="${inputClass()} text-center" />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input type="checkbox" id="honor-verified" class="w-4 h-4 accent-bowl-red" />
          <label for="honor-verified" class="text-sm text-bowl-muted">USBC Verified / Certified</label>
        </div>

        <button id="honor-save" class="w-full bg-bowl-red hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
          <i class="fa-solid fa-medal"></i> Save Honor Score
        </button>
      </div>
    `;

    body.querySelector('#honor-save').addEventListener('click', () => {
      const type = body.querySelector('#honor-type').value;
      const date = body.querySelector('#honor-date').value;
      const league = body.querySelector('#honor-league').value;
      const center = body.querySelector('#honor-center').value.trim();
      const games = [1,2,3].map(i => body.querySelector(`#honor-g${i}`).value).filter(Boolean).map(Number);
      const series = games.reduce((a, b) => a + b, 0);
      const verified = body.querySelector('#honor-verified').checked;

      if (!date) {
        showToast('Please enter a date', 'error');
        return;
      }

      Storage.saveHonor({ type, date, league, center, games, series, verified });
      closeModal();
      showToast(`${type} added to Honor Roll! 🏆`, 'success');
      renderHonors(document.getElementById('view-container'));
    });
  });
}
