/* Challenges module – create, accept, track bowling challenges */

const Challenges = (() => {
  const TYPES = [
    { key: 'high_series', label: 'High Series', desc: 'Highest 3-game series wins' },
    { key: 'high_game', label: 'High Game', desc: 'Highest single game wins' },
    { key: 'head_to_head', label: 'Head to Head', desc: 'Bowl against each other directly' },
    { key: 'pins_over_avg', label: 'Pins Over Average', desc: 'Most pins over your average wins' },
    { key: 'total_pins', label: 'Total Pins', desc: 'Highest total pins in date range wins' },
  ];

  async function load() {
    const container = document.getElementById('tab-challenges');
    const user = Auth.getUser();
    if (!user) return;

    container.innerHTML = '<div class="card"><div class="skeleton skeleton-block"></div></div>';

    try {
      const { data, error } = await sb.from('challenges')
        .select('*, challenger:profiles!challenges_challenger_id_fkey(full_name), opponent:profiles!challenges_opponent_id_fkey(full_name)')
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const all = data || [];

      const pending = all.filter(c => c.status === 'pending' && c.opponent_id === user.id);
      const active = all.filter(c => c.status === 'active');
      const myPending = all.filter(c => c.status === 'pending' && c.challenger_id === user.id);
      const completed = all.filter(c => c.status === 'completed' || c.status === 'declined');

      render(container, pending, active, myPending, completed, user);
    } catch (err) {
      console.error('Challenges load error:', err);
      Toast.show('Error loading challenges', 'error');
    }
  }

  function render(container, pending, active, myPending, completed, user) {
    container.innerHTML = `
      <div class="page-header">
        <h1>⚔️ Challenges</h1>
        <button class="btn btn-primary" onclick="Challenges.showCreateForm()">+ New Challenge</button>
      </div>

      <div id="challenge-create-form" class="card form-card" style="display:none;">
        <h3>Create Challenge</h3>
        <div class="form-group">
          <label>Search Opponent</label>
          <input type="text" id="challenge-search" placeholder="Search by name..." oninput="Challenges.searchOpponents()">
          <div id="challenge-search-results" class="search-results"></div>
          <input type="hidden" id="challenge-opponent-id">
          <div id="challenge-opponent-name" class="selected-opponent"></div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Challenge Type</label>
            <select id="challenge-type">
              ${TYPES.map(t => `<option value="${t.key}">${t.label} – ${t.desc}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Wager Description</label><input type="text" id="challenge-wager-desc" placeholder="e.g. Loser buys dinner"></div>
          <div class="form-group"><label>Wager Amount ($)</label><input type="number" id="challenge-wager-amt" placeholder="0" min="0" step="0.01"></div>
          <div class="form-group"><label>Start Date</label><input type="date" id="challenge-start" value="${new Date().toISOString().slice(0, 10)}"></div>
          <div class="form-group"><label>End Date</label><input type="date" id="challenge-end"></div>
          <div class="form-group"><label>League (optional)</label><input type="text" id="challenge-league" placeholder="League name"></div>
        </div>
        <div class="disclaimer">⚠️ <strong>Disclaimer:</strong> Wagers are between participants only. Bowling Hub is not responsible for any wager outcomes or disputes. Ensure wagers comply with local laws.</div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="Challenges.createChallenge()">Send Challenge</button>
          <button class="btn btn-secondary" onclick="Challenges.hideCreateForm()">Cancel</button>
        </div>
      </div>

      ${pending.length > 0 ? `
        <div class="card highlight-card">
          <h3>📨 Incoming Challenges <span class="notif-badge">${pending.length}</span></h3>
          <div class="challenge-cards">
            ${pending.map(c => `
              <div class="challenge-card pending">
                <div class="challenge-card-header">
                  <span class="challenge-type-badge">${TYPES.find(t => t.key === c.challenge_type)?.label || c.challenge_type}</span>
                  <span class="challenge-dates">${formatDate(c.start_date)} – ${formatDate(c.end_date)}</span>
                </div>
                <p><strong>${escHtml(c.challenger?.full_name || 'Someone')}</strong> challenges you!</p>
                ${c.wager_description ? `<p class="challenge-wager">💰 ${escHtml(c.wager_description)} ${c.wager_amount ? '($' + Number(c.wager_amount).toFixed(2) + ')' : ''}</p>` : ''}
                <div class="challenge-actions">
                  <button class="btn btn-sm btn-primary" onclick="Challenges.respond('${c.id}', 'active')">✅ Accept</button>
                  <button class="btn btn-sm btn-danger" onclick="Challenges.respond('${c.id}', 'declined')">❌ Decline</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${myPending.length > 0 ? `
        <div class="card">
          <h3>⏳ Awaiting Response</h3>
          <div class="challenge-cards">
            ${myPending.map(c => `
              <div class="challenge-card waiting">
                <div class="challenge-card-header">
                  <span class="challenge-type-badge">${TYPES.find(t => t.key === c.challenge_type)?.label || c.challenge_type}</span>
                </div>
                <p>Waiting for <strong>${escHtml(c.opponent?.full_name || 'opponent')}</strong> to respond</p>
                ${c.wager_description ? `<p class="challenge-wager">💰 ${escHtml(c.wager_description)}</p>` : ''}
                <button class="btn btn-sm btn-danger" onclick="Challenges.cancelChallenge('${c.id}')">Cancel</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="card">
        <h3>🔥 Active Challenges</h3>
        ${active.length === 0 ? '<p class="empty-state">No active challenges. Send one!</p>' :
          `<div class="challenge-cards">
            ${active.map(c => {
              const isChallenger = c.challenger_id === user.id;
              const opponentName = isChallenger ? c.opponent?.full_name : c.challenger?.full_name;
              return `
                <div class="challenge-card active-challenge">
                  <div class="challenge-card-header">
                    <span class="challenge-type-badge">${TYPES.find(t => t.key === c.challenge_type)?.label || c.challenge_type}</span>
                    <span class="challenge-dates">${formatDate(c.start_date)} – ${formatDate(c.end_date)}</span>
                  </div>
                  <p>vs <strong>${escHtml(opponentName || 'Opponent')}</strong></p>
                  ${c.wager_description ? `<p class="challenge-wager">💰 ${escHtml(c.wager_description)} ${c.wager_amount ? '($' + Number(c.wager_amount).toFixed(2) + ')' : ''}</p>` : ''}
                  <div class="challenge-progress">
                    <div class="progress-label">Your Score: ${c.challenger_id === user.id ? (c.challenger_score || '–') : (c.opponent_score || '–')}</div>
                    <div class="progress-label">Their Score: ${c.challenger_id === user.id ? (c.opponent_score || '–') : (c.challenger_score || '–')}</div>
                  </div>
                  <button class="btn btn-sm btn-secondary" onclick="Challenges.updateScore('${c.id}', ${c.challenger_id === user.id})">Update My Score</button>
                </div>
              `;
            }).join('')}
          </div>`}
      </div>

      ${completed.length > 0 ? `
        <div class="card">
          <h3>📋 Completed / Declined</h3>
          <table class="data-table">
            <thead><tr><th>Type</th><th>Opponent</th><th>Wager</th><th>Status</th><th>Result</th></tr></thead>
            <tbody>${completed.map(c => {
              const isChallenger = c.challenger_id === user.id;
              const opponentName = isChallenger ? c.opponent?.full_name : c.challenger?.full_name;
              return `<tr>
                <td>${TYPES.find(t => t.key === c.challenge_type)?.label || c.challenge_type}</td>
                <td>${escHtml(opponentName || 'Unknown')}</td>
                <td>${escHtml(c.wager_description || '-')}</td>
                <td><span class="badge badge-${c.status === 'completed' ? 'success' : 'danger'}">${c.status}</span></td>
                <td>${c.winner_id ? (c.winner_id === user.id ? '🏆 Won!' : 'Lost') : '-'}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      ` : ''}

      <div class="card">
        <h3>ℹ️ Challenge Types</h3>
        <div class="types-grid">
          ${TYPES.map(t => `
            <div class="type-card">
              <h4>${t.label}</h4>
              <p>${t.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function showCreateForm() { document.getElementById('challenge-create-form').style.display = 'block'; }
  function hideCreateForm() { document.getElementById('challenge-create-form').style.display = 'none'; }

  async function searchOpponents() {
    const query = document.getElementById('challenge-search').value.trim();
    const results = document.getElementById('challenge-search-results');
    if (query.length < 2) { results.innerHTML = ''; return; }

    const user = Auth.getUser();
    try {
      const { data, error } = await sb.from('profiles')
        .select('id, full_name, city, state')
        .ilike('full_name', `%${query}%`)
        .neq('id', user.id)
        .limit(10);

      if (error) throw error;
      results.innerHTML = (data || []).map(p =>
        `<div class="search-result-item" onclick="Challenges.selectOpponent('${p.id}', '${escHtml(p.full_name)}')">
          <strong>${escHtml(p.full_name)}</strong>
          <span class="text-muted">${escHtml([p.city, p.state].filter(Boolean).join(', ') || '')}</span>
        </div>`
      ).join('') || '<p class="empty-state">No bowlers found.</p>';
    } catch (err) {
      results.innerHTML = '';
    }
  }

  function selectOpponent(id, name) {
    document.getElementById('challenge-opponent-id').value = id;
    document.getElementById('challenge-opponent-name').innerHTML = `Selected: <strong>${name}</strong>`;
    document.getElementById('challenge-search-results').innerHTML = '';
    document.getElementById('challenge-search').value = '';
  }

  async function createChallenge() {
    const user = Auth.getUser();
    if (!user) return;

    const opponentId = document.getElementById('challenge-opponent-id').value;
    if (!opponentId) return Toast.show('Select an opponent', 'error');

    const type = document.getElementById('challenge-type').value;
    const wagerDesc = document.getElementById('challenge-wager-desc').value.trim();
    const wagerAmt = document.getElementById('challenge-wager-amt').value ? Number(document.getElementById('challenge-wager-amt').value) : null;
    const startDate = document.getElementById('challenge-start').value;
    const endDate = document.getElementById('challenge-end').value;
    const league = document.getElementById('challenge-league').value.trim();

    if (!startDate || !endDate) return Toast.show('Set start and end dates', 'error');

    try {
      const { error } = await sb.from('challenges').insert({
        challenger_id: user.id,
        opponent_id: opponentId,
        challenge_type: type,
        wager_description: wagerDesc || null,
        wager_amount: wagerAmt,
        start_date: startDate,
        end_date: endDate,
        league_name: league || null,
        status: 'pending'
      });
      if (error) throw error;
      Toast.show('Challenge sent! ⚔️', 'success');
      hideCreateForm();
      load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async function respond(id, status) {
    try {
      const { error } = await sb.from('challenges').update({ status }).eq('id', id);
      if (error) throw error;
      Toast.show(status === 'active' ? 'Challenge accepted! Game on! 🎳' : 'Challenge declined.', status === 'active' ? 'success' : 'info');
      load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async function cancelChallenge(id) {
    if (!confirm('Cancel this challenge?')) return;
    try {
      const { error } = await sb.from('challenges').delete().eq('id', id);
      if (error) throw error;
      Toast.show('Challenge cancelled', 'success');
      load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async function updateScore(id, isChallenger) {
    const score = prompt('Enter your current score:');
    if (!score || isNaN(score)) return;

    const field = isChallenger ? 'challenger_score' : 'opponent_score';
    try {
      const { error } = await sb.from('challenges').update({ [field]: Number(score) }).eq('id', id);
      if (error) throw error;
      Toast.show('Score updated!', 'success');
      load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  return { load, showCreateForm, hideCreateForm, searchOpponents, selectOpponent, createChallenge, respond, cancelChallenge, updateScore };
})();
