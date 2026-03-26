/**
 * dashboard.js — Dashboard view for Bowling Hub
 */

import * as Storage from './storage.js';
import { navigateTo, statCard, scoreClass, formatDate } from './app.js';

export function renderDashboard(container) {
  const profile = Storage.getProfile();
  const stats = Storage.getScoreStats();
  const scores = Storage.getScores();
  const honors = Storage.getHonors();
  const schedule = Storage.getSchedule();
  const challenges = Storage.getChallenges();
  const leagues = Storage.getLeagues();

  // Recent 5 scores
  const recentScores = scores.slice(0, 5);

  // Next upcoming match
  const today = new Date().toISOString().split('T')[0];
  const nextMatch = schedule.find(m => m.date >= today);

  // Active challenges
  const activeChallenges = challenges.filter(c => c.status === 'Active' || c.status === 'Pending');

  // Greeting based on time of day
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';

  container.innerHTML = `
    <!-- Greeting -->
    <div class="mb-6">
      <h2 class="text-2xl md:text-3xl font-bold">${greeting}, ${profile.name}! 🎳</h2>
      <p class="text-bowl-muted mt-1">Ready to knock 'em down?</p>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      ${statCard('🎯', 'Average', stats.currentAvg || '—', 'text-bowl-amber')}
      ${statCard('🔥', 'High Game', stats.highGame || '—', 'text-bowl-red')}
      ${statCard('📊', 'High Series', stats.highSeries || '—', 'text-blue-400')}
      ${statCard('🎮', 'Total Games', stats.totalGames, 'text-bowl-green')}
      ${statCard('🏆', 'Honors', honors.length, 'text-yellow-400')}
    </div>

    <!-- Quick Actions -->
    <div class="flex flex-wrap gap-3 mb-6">
      <button id="quick-log-scores" class="bg-bowl-red hover:bg-red-600 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2">
        <i class="fa-solid fa-plus"></i> Log Scores
      </button>
      <button id="quick-view-leagues" class="bg-bowl-border hover:bg-gray-600 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2">
        <i class="fa-solid fa-users"></i> View Leagues
      </button>
    </div>

    <div class="grid md:grid-cols-2 gap-6">

      <!-- Recent Scores -->
      <div class="bg-bowl-dark border border-bowl-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg flex items-center gap-2"><i class="fa-solid fa-clock-rotate-left text-bowl-muted"></i> Recent Scores</h3>
          <button class="text-sm text-bowl-red hover:underline" id="dash-view-all-scores">View All</button>
        </div>
        ${recentScores.length === 0 ? `
          <div class="text-center py-8 text-bowl-muted">
            <i class="fa-solid fa-bowling-ball text-3xl mb-2"></i>
            <p>No scores yet. Start logging!</p>
          </div>
        ` : `
          <div class="space-y-2">
            ${recentScores.map(s => {
              const leagueName = s.leagueId ? (leagues.find(l => l.id === s.leagueId)?.name || 'League') : (s.leagueName || 'Practice');
              return `
                <div class="flex items-center justify-between py-2 border-b border-bowl-border/50 last:border-0">
                  <div>
                    <p class="text-sm font-medium">${leagueName}</p>
                    <p class="text-xs text-bowl-muted">${formatDate(s.date)}</p>
                  </div>
                  <div class="text-right">
                    <p class="font-mono text-sm">
                      ${(s.games || []).map(g => `<span class="${scoreClass(g)}">${g}</span>`).join(' · ')}
                    </p>
                    <p class="text-xs text-bowl-muted">Series: ${s.series} | Avg: ${s.avg}</p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Right Column -->
      <div class="space-y-6">

        <!-- Next Match -->
        <div class="bg-bowl-dark border border-bowl-border rounded-xl p-5">
          <h3 class="font-bold text-lg flex items-center gap-2 mb-4"><i class="fa-solid fa-calendar-check text-bowl-amber"></i> Next Match</h3>
          ${nextMatch ? (() => {
            const league = leagues.find(l => l.id === nextMatch.leagueId);
            return `
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">${league ? league.name : 'Match'}</p>
                  <p class="text-sm text-bowl-muted">vs ${nextMatch.opponent || 'TBD'}</p>
                  <p class="text-xs text-bowl-muted mt-1">${formatDate(nextMatch.date)} ${nextMatch.time ? '@ ' + nextMatch.time : ''}</p>
                </div>
                <div class="text-right">
                  ${nextMatch.lanes ? `<p class="text-sm">Lanes <span class="font-bold text-bowl-amber">${nextMatch.lanes}</span></p>` : ''}
                  ${nextMatch.weekNumber ? `<p class="text-xs text-bowl-muted">Week ${nextMatch.weekNumber}</p>` : ''}
                </div>
              </div>
            `;
          })() : `
            <div class="text-center py-4 text-bowl-muted">
              <i class="fa-solid fa-calendar-xmark text-2xl mb-2"></i>
              <p class="text-sm">No upcoming matches</p>
            </div>
          `}
        </div>

        <!-- Active Challenges -->
        <div class="bg-bowl-dark border border-bowl-border rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-lg flex items-center gap-2"><i class="fa-solid fa-bolt text-yellow-400"></i> Challenges</h3>
            <button class="text-sm text-bowl-red hover:underline" id="dash-view-challenges">View All</button>
          </div>
          ${activeChallenges.length === 0 ? `
            <div class="text-center py-4 text-bowl-muted">
              <p class="text-sm">No active challenges</p>
            </div>
          ` : `
            <div class="space-y-2">
              ${activeChallenges.slice(0, 3).map(c => `
                <div class="flex items-center justify-between py-2 border-b border-bowl-border/50 last:border-0">
                  <div>
                    <p class="text-sm font-medium">vs ${c.opponentName}</p>
                    <p class="text-xs text-bowl-muted">${c.type}</p>
                  </div>
                  <span class="text-xs px-2 py-0.5 rounded-full ${c.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}">${c.status}</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>

      </div>
    </div>
  `;

  // Event handlers
  document.getElementById('quick-log-scores')?.addEventListener('click', () => navigateTo('scores'));
  document.getElementById('quick-view-leagues')?.addEventListener('click', () => navigateTo('leagues'));
  document.getElementById('dash-view-all-scores')?.addEventListener('click', () => navigateTo('scores'));
  document.getElementById('dash-view-challenges')?.addEventListener('click', () => navigateTo('challenges'));
}
