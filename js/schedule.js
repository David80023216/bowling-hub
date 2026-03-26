/**
 * schedule.js — Schedule view for Bowling Hub
 */

import * as Storage from './storage.js';
import { showModal, closeModal, showToast, formatDate, formatDateShort, todayString, formField, inputClass, selectClass, btnPrimary } from './app.js';

export function renderSchedule(container) {
  const schedule = Storage.getSchedule();
  const leagues = Storage.getLeagues();
  const today = todayString();

  // Separate upcoming and past
  const upcoming = schedule.filter(m => m.date >= today);
  const past = schedule.filter(m => m.date < today);

  // Find "this week" matches (within 7 days)
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const weekStr = weekFromNow.toISOString().split('T')[0];
  const thisWeek = upcoming.filter(m => m.date <= weekStr);

  container.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold flex items-center gap-2"><i class="fa-solid fa-calendar-days text-bowl-amber"></i> Schedule</h2>
        <p class="text-bowl-muted text-sm">Your upcoming matches and events</p>
      </div>
      ${btnPrimary('Add Match', 'btn-add-match', 'fa-plus')}
    </div>

    ${thisWeek.length > 0 ? `
      <div class="mb-6">
        <h3 class="font-bold text-bowl-amber mb-3 flex items-center gap-2"><i class="fa-solid fa-star"></i> This Week</h3>
        <div class="space-y-2">
          ${thisWeek.map(m => renderMatchCard(m, leagues, true)).join('')}
        </div>
      </div>
    ` : ''}

    ${upcoming.length > 0 ? `
      <div class="mb-6">
        <h3 class="font-bold text-bowl-muted mb-3">Upcoming</h3>
        <div class="space-y-2">
          ${upcoming.filter(m => !thisWeek.includes(m)).map(m => renderMatchCard(m, leagues, false)).join('')}
        </div>
      </div>
    ` : ''}

    ${upcoming.length === 0 && thisWeek.length === 0 ? `
      <div class="text-center py-16 text-bowl-muted">
        <i class="fa-solid fa-calendar-xmark text-5xl mb-4 opacity-50"></i>
        <p class="text-lg">No upcoming matches</p>
        <p class="text-sm">Add your next match to stay on track!</p>
      </div>
    ` : ''}

    ${past.length > 0 ? `
      <div>
        <h3 class="font-bold text-bowl-muted mb-3">Past Matches</h3>
        <div class="space-y-2">
          ${past.reverse().map(m => renderMatchCard(m, leagues, false, true)).join('')}
        </div>
      </div>
    ` : ''}
  `;

  document.getElementById('btn-add-match').addEventListener('click', () => openAddMatchModal(leagues));

  // Delete handlers
  document.querySelectorAll('.btn-delete-match').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Remove this match?')) {
        Storage.deleteMatch(btn.dataset.id);
        showToast('Match removed', 'info');
        renderSchedule(container);
      }
    });
  });
}

function renderMatchCard(match, leagues, isThisWeek, isPast = false) {
  const league = leagues.find(l => l.id === match.leagueId);
  const leagueName = league ? league.name : (match.leagueName || 'Match');

  return `
    <div class="bg-bowl-dark border ${isThisWeek ? 'border-bowl-amber glow-amber' : 'border-bowl-border'} ${isPast ? 'opacity-60' : ''} rounded-xl p-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="text-center min-w-[50px]">
          <p class="text-2xl font-bold ${isThisWeek ? 'text-bowl-amber' : 'text-white'}">${new Date(match.date + 'T00:00:00').getDate()}</p>
          <p class="text-xs text-bowl-muted uppercase">${new Date(match.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</p>
        </div>
        <div class="border-l border-bowl-border pl-3">
          <p class="font-medium">${leagueName}</p>
          <p class="text-sm text-bowl-muted">vs ${match.opponent || 'TBD'}</p>
          <div class="flex gap-3 mt-1 text-xs text-bowl-muted">
            ${match.time ? `<span><i class="fa-solid fa-clock mr-1"></i>${match.time}</span>` : ''}
            ${match.lanes ? `<span><i class="fa-solid fa-location-dot mr-1"></i>Lanes ${match.lanes}</span>` : ''}
            ${match.weekNumber ? `<span>Week ${match.weekNumber}</span>` : ''}
          </div>
        </div>
      </div>
      <button class="btn-delete-match text-gray-500 hover:text-red-400 transition-colors" data-id="${match.id}">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;
}

function openAddMatchModal(leagues) {
  showModal('📅 Add Match', (body) => {
    body.innerHTML = `
      <div class="space-y-4">
        ${formField('League', `
          <select id="match-league" class="${selectClass()}">
            <option value="">Select League</option>
            ${leagues.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
          </select>
        `, 'match-league')}

        ${formField('Date *', `<input type="date" id="match-date" value="${todayString()}" class="${inputClass()}" />`, 'match-date')}
        ${formField('Time', `<input type="time" id="match-time" class="${inputClass()}" />`, 'match-time')}
        ${formField('Opponent Team', `<input type="text" id="match-opponent" placeholder="Pin Busters" class="${inputClass()}" />`, 'match-opponent')}
        ${formField('Lanes', `<input type="text" id="match-lanes" placeholder="e.g., 25-26" class="${inputClass()}" />`, 'match-lanes')}
        ${formField('Week Number', `<input type="number" id="match-week" min="1" max="52" placeholder="12" class="${inputClass()}" />`, 'match-week')}

        <button id="match-save" class="w-full bg-bowl-red hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
          <i class="fa-solid fa-check"></i> Add Match
        </button>
      </div>
    `;

    body.querySelector('#match-save').addEventListener('click', () => {
      const date = body.querySelector('#match-date').value;
      if (!date) {
        showToast('Please select a date', 'error');
        return;
      }

      const match = {
        leagueId: body.querySelector('#match-league').value || null,
        date,
        time: body.querySelector('#match-time').value,
        opponent: body.querySelector('#match-opponent').value.trim(),
        lanes: body.querySelector('#match-lanes').value.trim(),
        weekNumber: body.querySelector('#match-week').value ? Number(body.querySelector('#match-week').value) : null,
      };

      Storage.saveMatch(match);
      closeModal();
      showToast('Match added! 📅', 'success');
      renderSchedule(document.getElementById('view-container'));
    });
  });
}
