/* Scores module – add, view, edit, delete bowling sessions */

const Scores = (() => {
  let allScores = [];
  let userLeagues = [];
  let editingId = null;

  async function load() {
    const container = document.getElementById('tab-scores');
    const user = Auth.getUser();
    if (!user) return;

    container.innerHTML = skeletonHTML();

    try {
      const [scoresRes, leaguesRes] = await Promise.all([
        sb.from('scores').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        sb.from('user_leagues').select('*, league:leagues(id, name)').eq('user_id', user.id)
      ]);

      allScores = scoresRes.data || [];
      userLeagues = (leaguesRes.data || []).map(ul => ul.league).filter(Boolean);

      render(container);
    } catch (err) {
      console.error('Scores load error:', err);
      Toast.show('Error loading scores', 'error');
    }
  }

  function render(container) {
    // Compute stats
    const allGames = [];
    allScores.forEach(s => (s.games || []).forEach(g => allGames.push(Number(g))));
    const totalGames = allGames.length;
    const avg = totalGames > 0 ? Math.round(allGames.reduce((a, b) => a + b, 0) / totalGames) : 0;
    const highGame = totalGames > 0 ? Math.max(...allGames) : 0;
    let highSeries = 0;
    allScores.forEach(s => {
      if (s.games && s.games.length >= 3) {
        const t = s.games.slice(0, 3).reduce((a, b) => a + Number(b), 0);
        if (t > highSeries) highSeries = t;
      }
    });

    const leagueOpts = userLeagues.map(l => `<option value="${l.id}">${escHtml(l.name)}</option>`).join('');

    container.innerHTML = `
      <div class="page-header">
        <h1>🎳 My Scores</h1>
        <button class="btn btn-primary" onclick="Scores.toggleAddForm()">+ Add Session</button>
      </div>

      <div class="stat-cards stat-cards-sm">
        <div class="stat-card"><div class="stat-value">${avg}</div><div class="stat-label">Average</div></div>
        <div class="stat-card accent"><div class="stat-value">${highGame}</div><div class="stat-label">High Game</div></div>
        <div class="stat-card"><div class="stat-value">${highSeries}</div><div class="stat-label">High Series</div></div>
        <div class="stat-card"><div class="stat-value">${totalGames}</div><div class="stat-label">Games</div></div>
      </div>

      <div id="score-form-container" class="card form-card" style="display:none;">
        <h3 id="score-form-title">Add New Session</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>League</label>
            <select id="score-league"><option value="">Practice</option>${leagueOpts}</select>
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="score-date" value="${new Date().toISOString().slice(0, 10)}">
          </div>
        </div>
        <div class="form-group">
          <label>Game Scores (enter each game)</label>
          <div id="game-inputs" class="game-inputs">
            <input type="number" class="game-input" min="0" max="300" placeholder="Game 1">
            <input type="number" class="game-input" min="0" max="300" placeholder="Game 2">
            <input type="number" class="game-input" min="0" max="300" placeholder="Game 3">
          </div>
          <button class="btn btn-sm btn-secondary" onclick="Scores.addGameInput()">+ Add Game</button>
        </div>
        <div id="score-calc" class="score-calc"></div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="Scores.saveSession()">Save Session</button>
          <button class="btn btn-secondary" onclick="Scores.toggleAddForm()">Cancel</button>
        </div>
      </div>

      <div class="card">
        <div class="filter-row">
          <select id="filter-league" onchange="Scores.applyFilters()">
            <option value="">All Leagues</option>
            <option value="practice">Practice Only</option>
            ${leagueOpts}
          </select>
          <input type="date" id="filter-from" onchange="Scores.applyFilters()" placeholder="From">
          <input type="date" id="filter-to" onchange="Scores.applyFilters()" placeholder="To">
        </div>
        <div id="scores-table-wrap">
          ${renderScoresTable(allScores)}
        </div>
      </div>
    `;

    // Bind game input live calc
    container.addEventListener('input', e => {
      if (e.target.classList.contains('game-input')) updateCalc();
    });
  }

  function renderScoresTable(scores) {
    if (scores.length === 0) return '<p class="empty-state">No scores recorded yet. Add your first session above!</p>';
    return `<table class="data-table">
      <thead><tr><th>Date</th><th>League</th><th>Games</th><th>Series</th><th>Avg</th><th></th></tr></thead>
      <tbody>${scores.map(s => {
        const games = s.games || [];
        const series = games.reduce((a, b) => a + Number(b), 0);
        const sAvg = games.length > 0 ? Math.round(series / games.length) : 0;
        const isHonorGame = games.some(g => Number(g) >= 250);
        const isHonorSeries = series >= 700 && games.length >= 3;
        return `<tr class="${isHonorGame || isHonorSeries ? 'honor-row' : ''}">
          <td>${formatDate(s.date)}</td>
          <td>${escHtml(s.league_name || 'Practice')}</td>
          <td>${games.map(g => `<span class="${Number(g) >= 250 ? 'honor-text' : ''}">${g}</span>`).join(', ')}</td>
          <td class="${isHonorSeries ? 'honor-text' : ''}">${series}</td>
          <td>${sAvg}</td>
          <td class="action-cell">
            <button class="btn-icon" onclick="Scores.editScore('${s.id}')" title="Edit">✏️</button>
            <button class="btn-icon" onclick="Scores.deleteScore('${s.id}')" title="Delete">🗑️</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  function toggleAddForm() {
    const form = document.getElementById('score-form-container');
    if (!form) return;
    const showing = form.style.display !== 'none';
    form.style.display = showing ? 'none' : 'block';
    if (!showing && !editingId) {
      document.getElementById('score-form-title').textContent = 'Add New Session';
      document.getElementById('score-league').value = '';
      document.getElementById('score-date').value = new Date().toISOString().slice(0, 10);
      document.getElementById('game-inputs').innerHTML =
        '<input type="number" class="game-input" min="0" max="300" placeholder="Game 1">' +
        '<input type="number" class="game-input" min="0" max="300" placeholder="Game 2">' +
        '<input type="number" class="game-input" min="0" max="300" placeholder="Game 3">';
      editingId = null;
    }
  }

  function addGameInput() {
    const wrap = document.getElementById('game-inputs');
    const count = wrap.querySelectorAll('.game-input').length + 1;
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'game-input';
    input.min = '0';
    input.max = '300';
    input.placeholder = `Game ${count}`;
    wrap.appendChild(input);
  }

  function updateCalc() {
    const inputs = document.querySelectorAll('#game-inputs .game-input');
    const games = [];
    inputs.forEach(i => { if (i.value) games.push(Number(i.value)); });
    const series = games.reduce((a, b) => a + b, 0);
    const avg = games.length > 0 ? Math.round(series / games.length) : 0;
    const el = document.getElementById('score-calc');
    if (el && games.length > 0) {
      el.innerHTML = `<span>Series: <strong>${series}</strong></span> <span>Average: <strong>${avg}</strong></span>`;
    }
  }

  async function saveSession() {
    const user = Auth.getUser();
    if (!user) return;

    const leagueId = document.getElementById('score-league').value || null;
    const leagueName = leagueId ? document.getElementById('score-league').selectedOptions[0].textContent : 'Practice';
    const date = document.getElementById('score-date').value;
    const inputs = document.querySelectorAll('#game-inputs .game-input');
    const games = [];
    inputs.forEach(i => { if (i.value) games.push(Number(i.value)); });

    if (games.length === 0) return Toast.show('Enter at least one game score', 'error');
    if (games.some(g => g < 0 || g > 300)) return Toast.show('Scores must be 0-300', 'error');
    if (!date) return Toast.show('Select a date', 'error');

    const row = {
      user_id: user.id,
      league_id: leagueId,
      league_name: leagueName,
      date,
      games,
      series_total: games.reduce((a, b) => a + b, 0),
      session_average: Math.round(games.reduce((a, b) => a + b, 0) / games.length)
    };

    try {
      if (editingId) {
        const { error } = await sb.from('scores').update(row).eq('id', editingId);
        if (error) throw error;
        Toast.show('Session updated!', 'success');
      } else {
        const { error } = await sb.from('scores').insert(row);
        if (error) throw error;
        Toast.show('Session saved! 🎳', 'success');

        // Check for honor scores
        if (games.some(g => g >= 250)) {
          Toast.show('🏆 Great game! Consider adding it to your Honor Roll!', 'success');
        }
        if (games.length >= 3 && games.slice(0, 3).reduce((a, b) => a + b, 0) >= 700) {
          Toast.show('⭐ Awesome series! Consider adding it to your Honor Roll!', 'success');
        }
      }
      editingId = null;
      load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async function editScore(id) {
    const score = allScores.find(s => s.id === id);
    if (!score) return;
    editingId = id;

    const form = document.getElementById('score-form-container');
    form.style.display = 'block';
    document.getElementById('score-form-title').textContent = 'Edit Session';
    document.getElementById('score-league').value = score.league_id || '';
    document.getElementById('score-date').value = score.date;

    const wrap = document.getElementById('game-inputs');
    wrap.innerHTML = (score.games || []).map((g, i) =>
      `<input type="number" class="game-input" min="0" max="300" placeholder="Game ${i + 1}" value="${g}">`
    ).join('');
    updateCalc();
  }

  async function deleteScore(id) {
    if (!confirm('Delete this session?')) return;
    try {
      const { error } = await sb.from('scores').delete().eq('id', id);
      if (error) throw error;
      Toast.show('Session deleted', 'success');
      load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  function applyFilters() {
    const league = document.getElementById('filter-league').value;
    const from = document.getElementById('filter-from').value;
    const to = document.getElementById('filter-to').value;

    let filtered = [...allScores];
    if (league === 'practice') {
      filtered = filtered.filter(s => !s.league_id);
    } else if (league) {
      filtered = filtered.filter(s => s.league_id === league);
    }
    if (from) filtered = filtered.filter(s => s.date >= from);
    if (to) filtered = filtered.filter(s => s.date <= to);

    document.getElementById('scores-table-wrap').innerHTML = renderScoresTable(filtered);
  }

  function skeletonHTML() {
    return '<div class="page-header"><div class="skeleton skeleton-title"></div></div>' +
      '<div class="stat-cards stat-cards-sm">' + '<div class="stat-card"><div class="skeleton skeleton-stat"></div></div>'.repeat(4) + '</div>' +
      '<div class="card"><div class="skeleton skeleton-block"></div></div>';
  }

  return { load, toggleAddForm, addGameInput, saveSession, editScore, deleteScore, applyFilters };
})();
