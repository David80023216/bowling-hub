/* Leagues module – manage leagues, standings */

const Leagues = (() => {
  let myLeagues = [];
  let expandedLeague = null;

  async function load() {
    const container = document.getElementById('tab-leagues');
    const user = Auth.getUser();
    if (!user) return;

    container.innerHTML = '<div class="card"><div class="skeleton skeleton-block"></div></div>';

    try {
      const { data, error } = await sb.from('user_leagues')
        .select('*, league:leagues(*)')
        .eq('user_id', user.id);

      if (error) throw error;
      myLeagues = (data || []).map(ul => ({ ...ul.league, user_league_id: ul.id, team_name: ul.team_name })).filter(Boolean);

      render(container, user);
    } catch (err) {
      console.error('Leagues load error:', err);
      Toast.show('Error loading leagues', 'error');
    }
  }

  function render(container, user) {
    container.innerHTML = `
      <div class="page-header">
        <h1>🏟️ My Leagues</h1>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="Leagues.showAddForm()">+ Add League</button>
          <button class="btn btn-secondary" onclick="Leagues.showJoinForm()">Join League</button>
        </div>
      </div>

      <div id="league-add-form" class="card form-card" style="display:none;">
        <h3>Create New League</h3>
        <div class="form-grid">
          <div class="form-group"><label>League Name</label><input type="text" id="league-name" placeholder="Monday Night Strikers"></div>
          <div class="form-group"><label>Bowling Center</label><input type="text" id="league-center" placeholder="Center name"></div>
          <div class="form-group"><label>Day</label>
            <select id="league-day"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option></select>
          </div>
          <div class="form-group"><label>Time</label><input type="time" id="league-time" value="19:00"></div>
          <div class="form-group"><label>LSS ID (for auto-sync)</label><input type="text" id="league-lss" placeholder="Optional LSS ID"></div>
          <div class="form-group"><label>Your Team Name</label><input type="text" id="league-team" placeholder="Your team"></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="Leagues.createLeague()">Create League</button>
          <button class="btn btn-secondary" onclick="Leagues.hideAddForm()">Cancel</button>
        </div>
      </div>

      <div id="league-join-form" class="card form-card" style="display:none;">
        <h3>Join Existing League</h3>
        <div class="form-grid">
          <div class="form-group"><label>Search by Name or LSS ID</label>
            <input type="text" id="join-search" placeholder="Type to search..." oninput="Leagues.searchLeagues()">
          </div>
        </div>
        <div id="join-results" class="join-results"></div>
        <button class="btn btn-secondary" onclick="Leagues.hideJoinForm()">Cancel</button>
      </div>

      <div class="leagues-list">
        ${myLeagues.length === 0 ? '<div class="card"><p class="empty-state">No leagues yet. Create or join a league to get started!</p></div>' :
          myLeagues.map(l => renderLeagueCard(l, user)).join('')}
      </div>
    `;
  }

  function renderLeagueCard(league, user) {
    const isExpanded = expandedLeague === league.id;
    return `
      <div class="card league-card">
        <div class="league-header" onclick="Leagues.toggleExpand('${league.id}')">
          <div class="league-info">
            <h3>🎳 ${escHtml(league.name)}</h3>
            <p>${escHtml(league.center || '')} • ${escHtml(league.day || '')} ${escHtml(league.time || '')}</p>
            ${league.team_name ? `<span class="badge badge-team">Team: ${escHtml(league.team_name)}</span>` : ''}
          </div>
          <div class="league-actions">
            ${league.lss_id ? `<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); Leagues.syncLeague('${league.id}')">🔄 Sync from LSS</button>` : ''}
            <span class="expand-icon">${isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>
        ${league.last_synced ? `<div class="sync-time">Last synced: ${new Date(league.last_synced).toLocaleString()}</div>` : ''}
        <div class="league-detail" style="display:${isExpanded ? 'block' : 'none'};" id="league-detail-${league.id}">
          <div class="standings-loading">Loading standings...</div>
        </div>
      </div>
    `;
  }

  async function toggleExpand(leagueId) {
    if (expandedLeague === leagueId) {
      expandedLeague = null;
      document.getElementById('league-detail-' + leagueId).style.display = 'none';
      return;
    }
    expandedLeague = leagueId;

    // Collapse others
    document.querySelectorAll('.league-detail').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.expand-icon').forEach(el => el.textContent = '▼');

    const detail = document.getElementById('league-detail-' + leagueId);
    detail.style.display = 'block';
    detail.innerHTML = '<div class="standings-loading"><div class="spinner"></div> Loading standings...</div>';

    try {
      const { data, error } = await sb.from('standings')
        .select('*')
        .eq('league_id', leagueId)
        .order('position', { ascending: true });

      if (error) throw error;
      const standings = data || [];
      const user = Auth.getUser();
      const league = myLeagues.find(l => l.id === leagueId);
      const myTeam = league?.team_name;

      if (standings.length === 0) {
        detail.innerHTML = '<p class="empty-state">No standings data yet. Sync from LSS or standings will appear once data is available.</p>';
        return;
      }

      detail.innerHTML = `
        <table class="data-table standings-table">
          <thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>Pts Won</th><th>Pts Lost</th><th>Team Avg</th><th>Total Pins</th></tr></thead>
          <tbody>${standings.map(s => {
            const isMyTeam = myTeam && s.team_name && s.team_name.toLowerCase() === myTeam.toLowerCase();
            return `<tr class="${isMyTeam ? 'highlight-row' : ''}">
              <td>${s.position}</td>
              <td>${isMyTeam ? '📍 ' : ''}${escHtml(s.team_name)}</td>
              <td>${s.wins ?? ''}</td>
              <td>${s.losses ?? ''}</td>
              <td>${s.points_won ?? ''}</td>
              <td>${s.points_lost ?? ''}</td>
              <td>${s.team_avg ?? ''}</td>
              <td>${s.total_pins ? Number(s.total_pins).toLocaleString() : ''}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      `;
    } catch (err) {
      detail.innerHTML = '<p class="empty-state">Could not load standings.</p>';
    }
  }

  function showAddForm() {
    document.getElementById('league-add-form').style.display = 'block';
    document.getElementById('league-join-form').style.display = 'none';
  }
  function hideAddForm() { document.getElementById('league-add-form').style.display = 'none'; }
  function showJoinForm() {
    document.getElementById('league-join-form').style.display = 'block';
    document.getElementById('league-add-form').style.display = 'none';
  }
  function hideJoinForm() { document.getElementById('league-join-form').style.display = 'none'; }

  async function createLeague() {
    const user = Auth.getUser();
    if (!user) return;

    const name = document.getElementById('league-name').value.trim();
    const center = document.getElementById('league-center').value.trim();
    const day = document.getElementById('league-day').value;
    const time = document.getElementById('league-time').value;
    const lssId = document.getElementById('league-lss').value.trim();
    const teamName = document.getElementById('league-team').value.trim();

    if (!name) return Toast.show('League name is required', 'error');

    try {
      const { data: league, error } = await sb.from('leagues').insert({
        name,
        center: center || null,
        day: day || null,
        time: time || null,
        lss_id: lssId || null,
        created_by: user.id
      }).select().single();

      if (error) throw error;

      const { error: joinErr } = await sb.from('user_leagues').insert({
        user_id: user.id,
        league_id: league.id,
        team_name: teamName || null
      });
      if (joinErr) throw joinErr;

      Toast.show('League created! 🎳', 'success');
      hideAddForm();
      load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async function searchLeagues() {
    const query = document.getElementById('join-search').value.trim();
    if (query.length < 2) {
      document.getElementById('join-results').innerHTML = '';
      return;
    }

    try {
      const { data, error } = await sb.from('leagues')
        .select('*')
        .or(`name.ilike.%${query}%,lss_id.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      const results = data || [];
      const myIds = myLeagues.map(l => l.id);

      document.getElementById('join-results').innerHTML = results.length === 0
        ? '<p class="empty-state">No leagues found.</p>'
        : results.map(l => `
          <div class="join-result-item">
            <div>
              <strong>${escHtml(l.name)}</strong>
              <span>${escHtml(l.center || '')} • ${escHtml(l.day || '')}</span>
            </div>
            ${myIds.includes(l.id)
              ? '<span class="badge badge-success">Joined</span>'
              : `<button class="btn btn-sm btn-primary" onclick="Leagues.joinLeague('${l.id}')">Join</button>`}
          </div>
        `).join('');
    } catch (err) {
      Toast.show('Search error', 'error');
    }
  }

  async function joinLeague(leagueId) {
    const user = Auth.getUser();
    if (!user) return;

    const teamName = prompt('Enter your team name (optional):');

    try {
      const { error } = await sb.from('user_leagues').insert({
        user_id: user.id,
        league_id: leagueId,
        team_name: teamName || null
      });
      if (error) throw error;
      Toast.show('Joined league! 🎳', 'success');
      hideJoinForm();
      load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async function syncLeague(leagueId) {
    Toast.show('League sync is handled server-side. Check back shortly for updated standings.', 'info');
    // Update last_synced timestamp
    await sb.from('leagues').update({ last_synced: new Date().toISOString() }).eq('id', leagueId);
  }

  return { load, showAddForm, hideAddForm, showJoinForm, hideJoinForm, createLeague, searchLeagues, joinLeague, toggleExpand, syncLeague };
})();
