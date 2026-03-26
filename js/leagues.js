/**
 * leagues.js — My Leagues view for Bowling Hub
 */

import * as Storage from './storage.js';
import { showModal, closeModal, showToast, formatDate, todayString, formField, inputClass, selectClass, btnPrimary, btnSecondary } from './app.js';

export function renderLeagues(container) {
  const leagues = Storage.getLeagues();
  const standings = Storage.getStandings();

  container.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold flex items-center gap-2"><i class="fa-solid fa-users text-bowl-green"></i> My Leagues</h2>
        <p class="text-bowl-muted text-sm">Manage your league memberships and standings</p>
      </div>
      ${btnPrimary('Add League', 'btn-add-league', 'fa-plus')}
    </div>

    ${leagues.length === 0 ? `
      <div class="text-center py-16 text-bowl-muted">
        <i class="fa-solid fa-users text-5xl mb-4 opacity-50"></i>
        <p class="text-lg">No leagues added yet</p>
        <p class="text-sm">Add your bowling leagues to track standings and schedules!</p>
      </div>
    ` : `
      <div class="space-y-4" id="league-list">
        ${leagues.map(l => renderLeagueCard(l, standings[l.id])).join('')}
      </div>
    `}
  `;

  // Add league handler
  document.getElementById('btn-add-league').addEventListener('click', () => openAddLeagueModal());

  // Expand/collapse standings
  document.querySelectorAll('.btn-toggle-standings').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById(`standings-${btn.dataset.id}`);
      const icon = btn.querySelector('i.fa-chevron-down, i.fa-chevron-up');
      if (panel) {
        panel.classList.toggle('hidden');
        if (icon) icon.classList.toggle('fa-chevron-down');
        if (icon) icon.classList.toggle('fa-chevron-up');
      }
    });
  });

  // Delete handlers
  document.querySelectorAll('.btn-delete-league').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Remove this league?')) {
        Storage.deleteLeague(btn.dataset.id);
        showToast('League removed', 'info');
        renderLeagues(container);
      }
    });
  });

  // Sync handlers
  document.querySelectorAll('.btn-sync-standings').forEach(btn => {
    btn.addEventListener('click', () => syncStandings(btn.dataset.id, btn.dataset.lss, container));
  });
}

function renderLeagueCard(league, standingsData) {
  // Calculate current week
  let weekInfo = '';
  if (league.startDate && league.totalWeeks) {
    const start = new Date(league.startDate + 'T00:00:00');
    const now = new Date();
    const diffWeeks = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const currentWeek = Math.max(1, Math.min(diffWeeks, league.totalWeeks));
    const pct = (currentWeek / league.totalWeeks) * 100;
    weekInfo = `
      <div class="mt-3">
        <div class="flex justify-between text-xs text-bowl-muted mb-1">
          <span>Week ${currentWeek} of ${league.totalWeeks}</span>
          <span>${Math.round(pct)}%</span>
        </div>
        <div class="w-full bg-bowl-navy rounded-full h-2">
          <div class="bg-bowl-red h-2 rounded-full transition-all" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }

  const hasStandings = standingsData && standingsData.length > 0;

  return `
    <div class="bg-bowl-dark border border-bowl-border rounded-xl overflow-hidden">
      <div class="p-5">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-bowl-red/20 flex items-center justify-center text-2xl">🏆</div>
            <div>
              <p class="font-bold text-lg">${league.name}</p>
              <p class="text-sm text-bowl-muted">${league.center || 'No center set'}</p>
            </div>
          </div>
          <button class="btn-delete-league text-gray-500 hover:text-red-400 transition-colors" data-id="${league.id}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div class="text-sm">
            <span class="text-bowl-muted block text-xs">Day/Time</span>
            <span class="font-medium">${league.day || '—'} ${league.time || ''}</span>
          </div>
          <div class="text-sm">
            <span class="text-bowl-muted block text-xs">Team</span>
            <span class="font-medium">${league.teamName || '—'}</span>
          </div>
          <div class="text-sm">
            <span class="text-bowl-muted block text-xs">Average</span>
            <span class="font-medium text-bowl-amber">${league.currentAvg || '—'}</span>
          </div>
          <div class="text-sm">
            <span class="text-bowl-muted block text-xs">LSS ID</span>
            <span class="font-medium font-mono">${league.lssId || '—'}</span>
          </div>
        </div>

        ${weekInfo}

        <div class="flex gap-2 mt-4">
          ${hasStandings ? `
            <button class="btn-toggle-standings text-sm bg-bowl-navy hover:bg-bowl-border text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1" data-id="${league.id}">
              <i class="fa-solid fa-chevron-down text-xs"></i> Standings
            </button>
          ` : ''}
          ${league.lssId ? `
            <button class="btn-sync-standings text-sm bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1" data-id="${league.id}" data-lss="${league.lssId}">
              <i class="fa-solid fa-sync text-xs"></i> Sync Standings
            </button>
          ` : ''}
        </div>
      </div>

      ${hasStandings ? `
        <div id="standings-${league.id}" class="hidden border-t border-bowl-border">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-bowl-navy text-bowl-muted text-xs uppercase">
                  <th class="px-4 py-2 text-left">#</th>
                  <th class="px-4 py-2 text-left">Team</th>
                  <th class="px-4 py-2 text-center">W</th>
                  <th class="px-4 py-2 text-center">L</th>
                  <th class="px-4 py-2 text-center">Pts</th>
                  <th class="px-4 py-2 text-center">Avg</th>
                  <th class="px-4 py-2 text-center">HC</th>
                </tr>
              </thead>
              <tbody>
                ${standingsData.map((row, i) => `
                  <tr class="border-t border-bowl-border/30 ${row.teamName === league.teamName ? 'bg-bowl-red/10 font-bold' : ''}">
                    <td class="px-4 py-2">${row.rank || i + 1}</td>
                    <td class="px-4 py-2">${row.teamName}</td>
                    <td class="px-4 py-2 text-center">${row.wins}</td>
                    <td class="px-4 py-2 text-center">${row.losses}</td>
                    <td class="px-4 py-2 text-center">${row.points || '—'}</td>
                    <td class="px-4 py-2 text-center">${row.teamAvg || '—'}</td>
                    <td class="px-4 py-2 text-center">${row.handicap || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

async function syncStandings(leagueId, lssId, container) {
  showToast('Syncing standings...', 'info');
  try {
    const resp = await fetch(`data/leagues/${lssId}.json`);
    if (!resp.ok) {
      showToast('Standings data not found for this LSS ID', 'warning');
      return;
    }
    const data = await resp.json();
    Storage.saveStandings(leagueId, data.standings || data);
    showToast('Standings synced! ✅', 'success');
    renderLeagues(container);
  } catch (e) {
    showToast('Could not sync standings. Data may not be available yet.', 'warning');
  }
}

function openAddLeagueModal() {
  showModal('🏆 Add League', (body) => {
    const profile = Storage.getProfile();

    body.innerHTML = `
      <div class="space-y-4">
        ${formField('League Name *', `<input type="text" id="league-name" placeholder="Monday Night Mixed" class="${inputClass()}" />`, 'league-name')}
        ${formField('Bowling Center', `<input type="text" id="league-center" value="${profile.homeCenter || ''}" placeholder="Sunset Lanes" class="${inputClass()}" />`, 'league-center')}

        <div class="grid grid-cols-2 gap-3">
          ${formField('Day', `
            <select id="league-day" class="${selectClass()}">
              <option value="">Select Day</option>
              <option>Monday</option><option>Tuesday</option><option>Wednesday</option>
              <option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option>
            </select>
          `, 'league-day')}
          ${formField('Time', `<input type="time" id="league-time" class="${inputClass()}" />`, 'league-time')}
        </div>

        ${formField('Your Team Name', `<input type="text" id="league-team" placeholder="Pin Crushers" class="${inputClass()}" />`, 'league-team')}
        ${formField('Current Average', `<input type="number" id="league-avg" min="0" max="300" placeholder="210" class="${inputClass()}" />`, 'league-avg')}

        <div class="grid grid-cols-2 gap-3">
          ${formField('Start Date', `<input type="date" id="league-start" class="${inputClass()}" />`, 'league-start')}
          ${formField('Total Weeks', `<input type="number" id="league-weeks" min="1" max="52" placeholder="36" class="${inputClass()}" />`, 'league-weeks')}
        </div>

        ${formField('LSS ID (for auto-sync)', `<input type="text" id="league-lss" placeholder="e.g., 12345" class="${inputClass()}" />`, 'league-lss')}

        <button id="league-save" class="w-full bg-bowl-red hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
          <i class="fa-solid fa-check"></i> Add League
        </button>
      </div>
    `;

    body.querySelector('#league-save').addEventListener('click', () => {
      const name = body.querySelector('#league-name').value.trim();
      if (!name) {
        showToast('Please enter a league name', 'error');
        return;
      }

      const league = {
        name,
        center: body.querySelector('#league-center').value.trim(),
        day: body.querySelector('#league-day').value,
        time: body.querySelector('#league-time').value,
        teamName: body.querySelector('#league-team').value.trim(),
        currentAvg: body.querySelector('#league-avg').value ? Number(body.querySelector('#league-avg').value) : null,
        startDate: body.querySelector('#league-start').value,
        totalWeeks: body.querySelector('#league-weeks').value ? Number(body.querySelector('#league-weeks').value) : null,
        lssId: body.querySelector('#league-lss').value.trim(),
        endDate: null,
      };

      Storage.saveLeague(league);
      closeModal();
      showToast('League added! 🏆', 'success');
      renderLeagues(document.getElementById('view-container'));
    });
  });
}
