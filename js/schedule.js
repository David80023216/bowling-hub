/* Schedule module – upcoming matches & calendar */

const Schedule = (() => {

  async function load() {
    const container = document.getElementById('tab-schedule');
    const user = Auth.getUser();
    if (!user) return;

    container.innerHTML = '<div class="card"><div class="skeleton skeleton-block"></div></div>';

    try {
      const today = new Date().toISOString().slice(0, 10);

      const [upcomingRes, pastRes, leaguesRes] = await Promise.all([
        sb.from('schedules').select('*, league:leagues(name)').eq('user_id', user.id)
          .gte('match_date', today).order('match_date', { ascending: true }),
        sb.from('schedules').select('*, league:leagues(name)').eq('user_id', user.id)
          .lt('match_date', today).order('match_date', { ascending: false }).limit(20),
        sb.from('user_leagues').select('league:leagues(id, name)').eq('user_id', user.id)
      ]);

      const upcoming = upcomingRes.data || [];
      const past = pastRes.data || [];
      const leagues = (leaguesRes.data || []).map(ul => ul.league).filter(Boolean);

      render(container, upcoming, past, leagues, user);
    } catch (err) {
      console.error('Schedule load error:', err);
      Toast.show('Error loading schedule', 'error');
    }
  }

  function render(container, upcoming, past, leagues, user) {
    // Next week matches
    const today = new Date();
    const nextWeekEnd = new Date(today);
    nextWeekEnd.setDate(today.getDate() + 7);
    const nextWeek = upcoming.filter(m => new Date(m.match_date) <= nextWeekEnd);
    const later = upcoming.filter(m => new Date(m.match_date) > nextWeekEnd);

    const leagueOpts = leagues.map(l => `<option value="${l.id}">${escHtml(l.name)}</option>`).join('');

    container.innerHTML = `
      <div class="page-header">
        <h1>📅 Schedule</h1>
        <button class="btn btn-primary" onclick="Schedule.showAddForm()">+ Add Match</button>
      </div>

      <div id="schedule-add-form" class="card form-card" style="display:none;">
        <h3>Add Match</h3>
        <div class="form-grid">
          <div class="form-group"><label>League</label><select id="sched-league"><option value="">Select League</option>${leagueOpts}</select></div>
          <div class="form-group"><label>Date</label><input type="date" id="sched-date"></div>
          <div class="form-group"><label>Time</label><input type="time" id="sched-time" value="19:00"></div>
          <div class="form-group"><label>Opponent</label><input type="text" id="sched-opponent" placeholder="Team name"></div>
          <div class="form-group"><label>Lanes</label><input type="text" id="sched-lanes" placeholder="e.g. 5-6"></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="Schedule.addMatch()">Add</button>
          <button class="btn btn-secondary" onclick="Schedule.hideAddForm()">Cancel</button>
        </div>
      </div>

      ${nextWeek.length > 0 ? `
        <div class="card highlight-card">
          <h3>🔥 This Week</h3>
          <div class="schedule-list">
            ${nextWeek.map(m => renderMatchItem(m, true)).join('')}
          </div>
        </div>
      ` : '<div class="card"><h3>🔥 This Week</h3><p class="empty-state">No matches this week.</p></div>'}

      ${later.length > 0 ? `
        <div class="card">
          <h3>📋 Upcoming</h3>
          <div class="schedule-list">
            ${later.map(m => renderMatchItem(m, false)).join('')}
          </div>
        </div>
      ` : ''}

      ${past.length > 0 ? `
        <div class="card">
          <h3>📜 Past Matches</h3>
          <table class="data-table">
            <thead><tr><th>Date</th><th>League</th><th>Opponent</th><th>Lanes</th><th>Result</th></tr></thead>
            <tbody>${past.map(m => `
              <tr>
                <td>${formatDate(m.match_date)}</td>
                <td>${escHtml(m.league?.name || '')}</td>
                <td>${escHtml(m.opponent || 'TBD')}</td>
                <td>${escHtml(m.lanes || '')}</td>
                <td>${m.result ? escHtml(m.result) : '<span class="text-muted">-</span>'}</td>
              </tr>
            `).join('')}</tbody>
          </table>
        </div>
      ` : ''}
    `;
  }

  function renderMatchItem(m, isThisWeek) {
    const d = new Date(m.match_date + 'T00:00:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    return `
      <div class="schedule-item ${isThisWeek ? 'this-week' : ''}">
        <div class="schedule-date-block">
          <div class="schedule-day">${dayName}</div>
          <div class="schedule-date">${formatDate(m.match_date)}</div>
          ${m.match_time ? `<div class="schedule-time">${m.match_time}</div>` : ''}
        </div>
        <div class="schedule-details">
          <div class="schedule-league">${escHtml(m.league?.name || 'League')}</div>
          <div class="schedule-opponent">vs ${escHtml(m.opponent || 'TBD')}</div>
          ${m.lanes ? `<div class="schedule-lanes">Lanes ${escHtml(m.lanes)}</div>` : ''}
        </div>
        <button class="btn-icon" onclick="Schedule.deleteMatch('${m.id}')" title="Delete">🗑️</button>
      </div>
    `;
  }

  function showAddForm() { document.getElementById('schedule-add-form').style.display = 'block'; }
  function hideAddForm() { document.getElementById('schedule-add-form').style.display = 'none'; }

  async function addMatch() {
    const user = Auth.getUser();
    if (!user) return;

    const leagueId = document.getElementById('sched-league').value || null;
    const date = document.getElementById('sched-date').value;
    const time = document.getElementById('sched-time').value;
    const opponent = document.getElementById('sched-opponent').value.trim();
    const lanes = document.getElementById('sched-lanes').value.trim();

    if (!date) return Toast.show('Select a date', 'error');

    try {
      const { error } = await sb.from('schedules').insert({
        user_id: user.id,
        league_id: leagueId,
        match_date: date,
        match_time: time || null,
        opponent: opponent || null,
        lanes: lanes || null
      });
      if (error) throw error;
      Toast.show('Match added!', 'success');
      hideAddForm();
      load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async function deleteMatch(id) {
    if (!confirm('Delete this match?')) return;
    try {
      const { error } = await sb.from('schedules').delete().eq('id', id);
      if (error) throw error;
      Toast.show('Match removed', 'success');
      load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  return { load, showAddForm, hideAddForm, addMatch, deleteMatch };
})();
