/* Honors module – honor roll tracking */

const Honors = (() => {
  const CATEGORIES = [
    { key: '300_game', label: '300 Game', icon: '🏆', desc: 'Perfect game' },
    { key: '800_series', label: '800 Series', icon: '⭐', desc: '800+ three-game series' },
    { key: '299_game', label: '299 Game', icon: '🥈', desc: 'One pin away' },
    { key: '298_game', label: '298 Game', icon: '🥉', desc: 'Two pins from perfection' },
    { key: '11_in_a_row', label: '11 in a Row', icon: '🔥', desc: '11 consecutive strikes' },
  ];

  async function load() {
    const container = document.getElementById('tab-honors');
    const user = Auth.getUser();
    if (!user) return;

    container.innerHTML = '<div class="card"><div class="skeleton skeleton-block"></div></div>';

    try {
      const [myRes, publicRes] = await Promise.all([
        sb.from('honors').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        sb.from('honors').select('*, profile:profiles(full_name)').order('date', { ascending: false }).limit(50)
      ]);

      const myHonors = myRes.data || [];
      const allHonors = publicRes.data || [];

      render(container, myHonors, allHonors, user);
    } catch (err) {
      console.error('Honors load error:', err);
      Toast.show('Error loading honors', 'error');
    }
  }

  function render(container, myHonors, allHonors, user) {
    // Count by category
    const counts = {};
    CATEGORIES.forEach(c => counts[c.key] = 0);
    myHonors.forEach(h => { if (counts[h.category] !== undefined) counts[h.category]++; });

    container.innerHTML = `
      <div class="page-header">
        <h1>🏆 Honor Roll</h1>
        <button class="btn btn-primary" onclick="Honors.showAddForm()">+ Add Honor</button>
      </div>

      <div class="honor-badges">
        ${CATEGORIES.map(c => `
          <div class="honor-badge ${counts[c.key] > 0 ? 'earned' : 'unearned'}">
            <div class="badge-icon">${c.icon}</div>
            <div class="badge-count">${counts[c.key]}</div>
            <div class="badge-label">${c.label}</div>
            <div class="badge-desc">${c.desc}</div>
          </div>
        `).join('')}
      </div>

      <div id="honor-form-container" class="card form-card" style="display:none;">
        <h3>Add Honor Achievement</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Category</label>
            <select id="honor-category">
              ${CATEGORIES.map(c => `<option value="${c.key}">${c.icon} ${c.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="honor-date" value="${new Date().toISOString().slice(0, 10)}">
          </div>
          <div class="form-group">
            <label>Score / Series Total</label>
            <input type="number" id="honor-score" placeholder="e.g. 300">
          </div>
          <div class="form-group">
            <label>Bowling Center</label>
            <input type="text" id="honor-center" placeholder="Center name">
          </div>
          <div class="form-group">
            <label>League</label>
            <input type="text" id="honor-league" placeholder="League name (optional)">
          </div>
          <div class="form-group">
            <label>USBC Award Number</label>
            <input type="text" id="honor-award" placeholder="Award # (optional)">
          </div>
        </div>
        <div class="form-group">
          <label><input type="checkbox" id="honor-certified"> USBC Certified</label>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="Honors.saveHonor()">Save Honor</button>
          <button class="btn btn-secondary" onclick="Honors.hideAddForm()">Cancel</button>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3>My Honors</h3>
          ${myHonors.length === 0 ? '<p class="empty-state">No honors yet. Keep bowling! 🎳</p>' :
            `<table class="data-table">
              <thead><tr><th>Date</th><th>Type</th><th>Score</th><th>Center</th><th>Status</th><th></th></tr></thead>
              <tbody>${myHonors.map(h => {
                const cat = CATEGORIES.find(c => c.key === h.category);
                return `<tr>
                  <td>${formatDate(h.date)}</td>
                  <td>${cat ? cat.icon : ''} ${cat ? cat.label : h.category}</td>
                  <td class="honor-text">${h.score || ''}</td>
                  <td>${escHtml(h.center || '')}</td>
                  <td>${h.certified ? '<span class="badge badge-success">Certified</span>' : '<span class="badge badge-pending">Pending</span>'}</td>
                  <td><button class="btn-icon" onclick="Honors.deleteHonor('${h.id}')" title="Delete">🗑️</button></td>
                </tr>`;
              }).join('')}</tbody>
            </table>`}
        </div>

        <div class="card">
          <h3>🌐 Public Honor Roll</h3>
          ${allHonors.length === 0 ? '<p class="empty-state">No honors posted yet.</p>' :
            `<table class="data-table">
              <thead><tr><th>Bowler</th><th>Type</th><th>Score</th><th>Date</th></tr></thead>
              <tbody>${allHonors.map(h => {
                const cat = CATEGORIES.find(c => c.key === h.category);
                const isMe = h.user_id === user.id;
                return `<tr class="${isMe ? 'highlight-row' : ''}">
                  <td>${escHtml(h.profile?.full_name || 'Bowler')}</td>
                  <td>${cat ? cat.icon : ''} ${cat ? cat.label : h.category}</td>
                  <td class="honor-text">${h.score || ''}</td>
                  <td>${formatDate(h.date)}</td>
                </tr>`;
              }).join('')}</tbody>
            </table>`}
        </div>
      </div>
    `;
  }

  function showAddForm() {
    document.getElementById('honor-form-container').style.display = 'block';
  }

  function hideAddForm() {
    document.getElementById('honor-form-container').style.display = 'none';
  }

  async function saveHonor() {
    const user = Auth.getUser();
    if (!user) return;

    const category = document.getElementById('honor-category').value;
    const date = document.getElementById('honor-date').value;
    const score = document.getElementById('honor-score').value ? Number(document.getElementById('honor-score').value) : null;
    const center = document.getElementById('honor-center').value.trim();
    const league = document.getElementById('honor-league').value.trim();
    const awardNumber = document.getElementById('honor-award').value.trim();
    const certified = document.getElementById('honor-certified').checked;

    if (!date) return Toast.show('Select a date', 'error');

    try {
      const { error } = await sb.from('honors').insert({
        user_id: user.id,
        category,
        date,
        score,
        center: center || null,
        league_name: league || null,
        award_number: awardNumber || null,
        certified
      });
      if (error) throw error;
      Toast.show('Honor added! 🏆', 'success');
      hideAddForm();
      load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async function deleteHonor(id) {
    if (!confirm('Delete this honor?')) return;
    try {
      const { error } = await sb.from('honors').delete().eq('id', id);
      if (error) throw error;
      Toast.show('Honor removed', 'success');
      load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  return { load, showAddForm, hideAddForm, saveHonor, deleteHonor };
})();
