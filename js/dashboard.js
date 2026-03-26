/* Dashboard module */

const Dashboard = (() => {
  let loaded = false;

  async function load() {
    const container = document.getElementById('tab-dashboard');
    if (!loaded) {
      container.innerHTML = skeletonHTML();
    }

    const user = Auth.getUser();
    const profile = Auth.getProfile();
    if (!user) return;

    try {
      const [scoresRes, honorsRes, challengesRes, schedulesRes] = await Promise.all([
        sb.from('scores').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
        sb.from('honors').select('*').eq('user_id', user.id),
        sb.from('challenges').select('*, challenger:profiles!challenges_challenger_id_fkey(full_name), opponent:profiles!challenges_opponent_id_fkey(full_name)').or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`).eq('status', 'active').limit(5),
        sb.from('schedules').select('*, league:leagues(name)').eq('user_id', user.id).gte('match_date', new Date().toISOString().slice(0, 10)).order('match_date', { ascending: true }).limit(5)
      ]);

      const scores = scoresRes.data || [];
      const honors = honorsRes.data || [];
      const challenges = challengesRes.data || [];
      const upcoming = schedulesRes.data || [];

      // Compute stats
      const allGames = [];
      scores.forEach(s => {
        if (s.games && Array.isArray(s.games)) {
          s.games.forEach(g => allGames.push(Number(g)));
        }
      });

      const totalGames = allGames.length;
      const avg = totalGames > 0 ? Math.round(allGames.reduce((a, b) => a + b, 0) / totalGames) : 0;
      const highGame = totalGames > 0 ? Math.max(...allGames) : 0;

      // High series (best 3-game set from a single session)
      let highSeries = 0;
      scores.forEach(s => {
        if (s.games && s.games.length >= 3) {
          const total = s.games.slice(0, 3).reduce((a, b) => a + Number(b), 0);
          if (total > highSeries) highSeries = total;
        }
      });

      const recentScores = scores.slice(0, 5);

      container.innerHTML = `
        <div class="page-header">
          <h1>Welcome back, ${escHtml(profile?.full_name || 'Bowler')}! 🎳</h1>
          <p class="subtitle">Here's your bowling snapshot</p>
        </div>

        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-value">${avg}</div>
            <div class="stat-label">Current Average</div>
          </div>
          <div class="stat-card accent">
            <div class="stat-icon">🎯</div>
            <div class="stat-value">${highGame}</div>
            <div class="stat-label">High Game</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔥</div>
            <div class="stat-value">${highSeries}</div>
            <div class="stat-label">High Series</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-value">${honors.length}</div>
            <div class="stat-label">Honor Count</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🎳</div>
            <div class="stat-value">${totalGames}</div>
            <div class="stat-label">Games Bowled</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <h3>📋 Recent Scores</h3>
            ${recentScores.length === 0 ? '<p class="empty-state">No scores yet. Head to My Scores to log your first session!</p>' :
              `<table class="data-table">
                <thead><tr><th>Date</th><th>League</th><th>Games</th><th>Series</th><th>Avg</th></tr></thead>
                <tbody>${recentScores.map(s => {
                  const games = s.games || [];
                  const series = games.reduce((a, b) => a + Number(b), 0);
                  const sAvg = games.length > 0 ? Math.round(series / games.length) : 0;
                  return `<tr>
                    <td>${formatDate(s.date)}</td>
                    <td>${escHtml(s.league_name || 'Practice')}</td>
                    <td>${games.join(', ')}</td>
                    <td class="${series >= 700 ? 'honor-text' : ''}">${series}</td>
                    <td>${sAvg}</td>
                  </tr>`;
                }).join('')}</tbody>
              </table>`}
          </div>

          <div class="card">
            <h3>📅 Upcoming Matches</h3>
            ${upcoming.length === 0 ? '<p class="empty-state">No upcoming matches scheduled.</p>' :
              `<div class="upcoming-list">${upcoming.map(m => `
                <div class="upcoming-item">
                  <div class="upcoming-date">${formatDate(m.match_date)}</div>
                  <div class="upcoming-details">
                    <strong>${escHtml(m.league?.name || 'League')}</strong>
                    <span>vs ${escHtml(m.opponent || 'TBD')} ${m.lanes ? '• Lanes ' + escHtml(m.lanes) : ''}</span>
                  </div>
                </div>
              `).join('')}</div>`}
          </div>
        </div>

        <div class="card">
          <h3>⚔️ Active Challenges</h3>
          ${challenges.length === 0 ? '<p class="empty-state">No active challenges. Create one from the Challenges tab!</p>' :
            `<div class="challenge-list">${challenges.map(c => {
              const isChallenger = c.challenger_id === user.id;
              const opponentName = isChallenger ? c.opponent?.full_name : c.challenger?.full_name;
              return `<div class="challenge-item">
                <span class="challenge-type">${escHtml(c.challenge_type || 'Challenge')}</span>
                <span>vs ${escHtml(opponentName || 'Unknown')}</span>
                <span class="challenge-wager">${escHtml(c.wager_description || '')}</span>
              </div>`;
            }).join('')}</div>`}
        </div>
      `;
      loaded = true;
    } catch (err) {
      console.error('Dashboard load error:', err);
      Toast.show('Error loading dashboard', 'error');
    }
  }

  function skeletonHTML() {
    return `<div class="page-header"><div class="skeleton skeleton-title"></div></div>
      <div class="stat-cards">${'<div class="stat-card"><div class="skeleton skeleton-stat"></div></div>'.repeat(5)}</div>
      <div class="grid-2"><div class="card"><div class="skeleton skeleton-block"></div></div><div class="card"><div class="skeleton skeleton-block"></div></div></div>`;
  }

  return { load };
})();
