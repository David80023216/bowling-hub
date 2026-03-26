/**
 * scores.js — My Scores view for Bowling Hub
 */

import * as Storage from './storage.js';
import { showModal, closeModal, showToast, formatDate, todayString, formField, inputClass, selectClass, btnPrimary, scoreClass, detectHonors, navigateTo } from './app.js';

export function renderScores(container) {
  const scores = Storage.getScores();
  const leagues = Storage.getLeagues();
  const stats = Storage.getScoreStats();

  container.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold flex items-center gap-2"><i class="fa-solid fa-list-ol text-bowl-red"></i> My Scores</h2>
        <p class="text-bowl-muted text-sm">Track and review your bowling sessions</p>
      </div>
      ${btnPrimary('Add Scores', 'btn-add-score', 'fa-plus')}
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="bg-bowl-dark border border-bowl-border rounded-xl p-3 text-center">
        <p class="text-xs text-bowl-muted">Average</p>
        <p class="text-xl font-bold text-bowl-amber">${stats.currentAvg || '—'}</p>
      </div>
      <div class="bg-bowl-dark border border-bowl-border rounded-xl p-3 text-center">
        <p class="text-xs text-bowl-muted">High Game</p>
        <p class="text-xl font-bold text-bowl-red">${stats.highGame || '—'}</p>
      </div>
      <div class="bg-bowl-dark border border-bowl-border rounded-xl p-3 text-center">
        <p class="text-xs text-bowl-muted">High Series</p>
        <p class="text-xl font-bold text-blue-400">${stats.highSeries || '—'}</p>
      </div>
      <div class="bg-bowl-dark border border-bowl-border rounded-xl p-3 text-center">
        <p class="text-xs text-bowl-muted">Total Games</p>
        <p class="text-xl font-bold text-bowl-green">${stats.totalGames}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-4">
      <select id="filter-league" class="bg-bowl-dark border border-bowl-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bowl-red">
        <option value="">All Leagues</option>
        <option value="practice">Practice</option>
        ${leagues.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
      </select>
      <input type="date" id="filter-date-from" class="bg-bowl-dark border border-bowl-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bowl-red" placeholder="From" />
      <input type="date" id="filter-date-to" class="bg-bowl-dark border border-bowl-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bowl-red" placeholder="To" />
    </div>

    <!-- Score Trend Chart -->
    ${scores.length >= 2 ? renderTrendChart(scores) : ''}

    <!-- Score List -->
    <div id="score-list" class="space-y-3">
      ${scores.length === 0 ? `
        <div class="text-center py-16 text-bowl-muted">
          <i class="fa-solid fa-bowling-ball text-5xl mb-4 opacity-50"></i>
          <p class="text-lg">No scores recorded yet</p>
          <p class="text-sm">Tap "Add Scores" to log your first session!</p>
        </div>
      ` : scores.map(s => renderScoreCard(s, leagues)).join('')}
    </div>
  `;

  // Add score handler
  document.getElementById('btn-add-score').addEventListener('click', () => openAddScoreModal(leagues));

  // Filter handlers
  const filterLeague = document.getElementById('filter-league');
  const filterDateFrom = document.getElementById('filter-date-from');
  const filterDateTo = document.getElementById('filter-date-to');

  function applyFilters() {
    const leagueVal = filterLeague.value;
    const dateFrom = filterDateFrom.value;
    const dateTo = filterDateTo.value;

    let filtered = Storage.getScores();
    if (leagueVal === 'practice') {
      filtered = filtered.filter(s => !s.leagueId);
    } else if (leagueVal) {
      filtered = filtered.filter(s => s.leagueId === leagueVal);
    }
    if (dateFrom) filtered = filtered.filter(s => s.date >= dateFrom);
    if (dateTo) filtered = filtered.filter(s => s.date <= dateTo);

    const listEl = document.getElementById('score-list');
    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="text-center py-8 text-bowl-muted"><p>No scores match your filters.</p></div>`;
    } else {
      listEl.innerHTML = filtered.map(s => renderScoreCard(s, leagues)).join('');
    }
    attachDeleteHandlers();
  }

  filterLeague.addEventListener('change', applyFilters);
  filterDateFrom.addEventListener('change', applyFilters);
  filterDateTo.addEventListener('change', applyFilters);

  attachDeleteHandlers();
}

function attachDeleteHandlers() {
  document.querySelectorAll('.btn-delete-score').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (confirm('Delete this score session?')) {
        Storage.deleteScore(id);
        showToast('Score deleted', 'info');
        const container = document.getElementById('view-container');
        renderScores(container);
      }
    });
  });
}

function renderScoreCard(s, leagues) {
  const leagueName = s.leagueId ? (leagues.find(l => l.id === s.leagueId)?.name || 'League') : (s.leagueName || 'Practice');
  const isPractice = !s.leagueId;
  const hasHonor = (s.games || []).some(g => g >= 298) || s.series >= 700;

  return `
    <div class="bg-bowl-dark border ${hasHonor ? 'border-bowl-amber glow-amber' : 'border-bowl-border'} rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg ${isPractice ? 'bg-bowl-navy' : 'bg-bowl-red/20'} flex items-center justify-center text-lg">
          ${isPractice ? '🎳' : '🏆'}
        </div>
        <div>
          <p class="font-medium">${leagueName}</p>
          <p class="text-xs text-bowl-muted">${formatDate(s.date)}${s.notes ? ' — ' + s.notes : ''}</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="font-mono text-lg flex gap-2">
          ${(s.games || []).map(g => `<span class="px-2 py-0.5 rounded ${g === 300 ? 'score-perfect text-white' : g >= 250 ? 'bg-bowl-amber/20' : ''} ${scoreClass(g)}">${g}</span>`).join('')}
        </div>
        <div class="text-right min-w-[80px]">
          <p class="font-bold">${s.series}</p>
          <p class="text-xs text-bowl-muted">Avg: ${s.avg}</p>
        </div>
        <button class="btn-delete-score text-gray-500 hover:text-red-400 transition-colors" data-id="${s.id}" title="Delete">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  `;
}

function renderTrendChart(scores) {
  // Take last 20 sessions for chart
  const recent = scores.slice(0, 20).reverse();
  const avgs = recent.map(s => s.avg);
  const maxAvg = Math.max(...avgs, 200);
  const minAvg = Math.min(...avgs, 100);
  const range = maxAvg - minAvg || 1;

  return `
    <div class="bg-bowl-dark border border-bowl-border rounded-xl p-5 mb-6">
      <h3 class="font-bold text-sm text-bowl-muted mb-3 flex items-center gap-2"><i class="fa-solid fa-chart-line"></i> Average Trend (Last ${recent.length} Sessions)</h3>
      <div class="flex items-end gap-1 h-24">
        ${avgs.map((avg, i) => {
          const height = Math.max(10, ((avg - minAvg) / range) * 100);
          const isLast = i === avgs.length - 1;
          return `<div class="flex-1 flex flex-col items-center gap-1">
            <span class="text-[10px] text-bowl-muted ${isLast ? 'font-bold text-bowl-amber' : ''}">${Math.round(avg)}</span>
            <div class="w-full ${isLast ? 'bg-bowl-red' : 'bg-blue-500/60'} rounded-t transition-all" style="height: ${height}%" title="${recent[i].date}: ${avg}"></div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function openAddScoreModal(leagues) {
  showModal('🎳 Log New Scores', (body) => {
    body.innerHTML = `
      <div class="space-y-4">
        ${formField('League', `
          <select id="score-league" class="${selectClass()}">
            <option value="">Practice / Open Bowling</option>
            ${leagues.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
          </select>
        `, 'score-league')}

        ${formField('Date', `<input type="date" id="score-date" value="${todayString()}" class="${inputClass()}" />`, 'score-date')}

        <div>
          <label class="block text-sm font-medium text-bowl-muted mb-2">Games (enter 1-6 scores)</label>
          <div class="grid grid-cols-3 gap-2">
            <input type="number" id="score-g1" min="0" max="300" placeholder="Game 1" class="${inputClass()} text-center" />
            <input type="number" id="score-g2" min="0" max="300" placeholder="Game 2" class="${inputClass()} text-center" />
            <input type="number" id="score-g3" min="0" max="300" placeholder="Game 3" class="${inputClass()} text-center" />
            <input type="number" id="score-g4" min="0" max="300" placeholder="Game 4" class="${inputClass()} text-center" />
            <input type="number" id="score-g5" min="0" max="300" placeholder="Game 5" class="${inputClass()} text-center" />
            <input type="number" id="score-g6" min="0" max="300" placeholder="Game 6" class="${inputClass()} text-center" />
          </div>
        </div>

        ${formField('Notes (optional)', `<input type="text" id="score-notes" placeholder="Tournament, lane conditions..." class="${inputClass()}" />`, 'score-notes')}

        <div id="score-preview" class="hidden bg-bowl-navy rounded-lg p-3 text-center">
          <p class="text-sm text-bowl-muted">Series: <span id="preview-series" class="font-bold text-white">0</span> | Average: <span id="preview-avg" class="font-bold text-white">0</span></p>
        </div>

        <button id="score-save" class="w-full bg-bowl-red hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
          <i class="fa-solid fa-check"></i> Save Scores
        </button>
      </div>
    `;

    // Live preview
    const gameInputs = [1,2,3,4,5,6].map(i => body.querySelector(`#score-g${i}`));
    const previewEl = body.querySelector('#score-preview');
    const previewSeries = body.querySelector('#preview-series');
    const previewAvg = body.querySelector('#preview-avg');

    function updatePreview() {
      const games = gameInputs.map(i => i.value ? parseInt(i.value) : null).filter(g => g !== null);
      if (games.length > 0) {
        const series = games.reduce((a, b) => a + b, 0);
        const avg = Math.round(series / games.length * 100) / 100;
        previewSeries.textContent = series;
        previewAvg.textContent = avg;
        previewEl.classList.remove('hidden');
      } else {
        previewEl.classList.add('hidden');
      }
    }

    gameInputs.forEach(i => i.addEventListener('input', updatePreview));

    // Save handler
    body.querySelector('#score-save').addEventListener('click', () => {
      const games = gameInputs.map(i => i.value ? parseInt(i.value) : null).filter(g => g !== null);
      if (games.length === 0) {
        showToast('Enter at least one game score', 'error');
        return;
      }

      // Validate range
      for (const g of games) {
        if (g < 0 || g > 300) {
          showToast('Scores must be between 0 and 300', 'error');
          return;
        }
      }

      const leagueId = body.querySelector('#score-league').value || null;
      const date = body.querySelector('#score-date').value;
      const notes = body.querySelector('#score-notes').value.trim();

      const score = Storage.saveScore({ leagueId, date, games, notes });

      // Check for honors
      const honorDetected = detectHonors(score.games, score.series);
      if (honorDetected.length > 0) {
        honorDetected.forEach(h => {
          const league = leagueId ? (leagues.find(l => l.id === leagueId)?.name || '') : 'Practice';
          const profile = Storage.getProfile();
          if (confirm(`${h.label}\nAdd this to your Honor Roll?`)) {
            Storage.saveHonor({
              type: h.type,
              date,
              league,
              center: profile.homeCenter || '',
              games: score.games,
              series: score.series,
              verified: false,
            });
            showToast(`${h.type} added to Honor Roll! 🏆`, 'success');
          }
        });
      }

      closeModal();
      showToast('Scores saved! 🎳', 'success');
      const container = document.getElementById('view-container');
      renderScores(container);
    });
  });
}
