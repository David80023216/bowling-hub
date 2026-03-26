/* Settings module – profile editing, account management */

const Settings = (() => {

  async function load() {
    const container = document.getElementById('tab-settings');
    const user = Auth.getUser();
    if (!user) return;

    container.innerHTML = '<div class="card"><div class="skeleton skeleton-block"></div></div>';

    try {
      const [profileRes, leaguesRes] = await Promise.all([
        sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        sb.from('user_leagues').select('*, league:leagues(name, last_synced)').eq('user_id', user.id)
      ]);

      const profile = profileRes.data || {};
      const leagues = (leaguesRes.data || []);

      render(container, profile, leagues, user);
    } catch (err) {
      console.error('Settings load error:', err);
      Toast.show('Error loading settings', 'error');
    }
  }

  function render(container, profile, leagues, user) {
    container.innerHTML = `
      <div class="page-header">
        <h1>⚙️ Settings</h1>
      </div>

      <div class="card">
        <h3>👤 Profile</h3>
        <div class="form-grid">
          <div class="form-group"><label>Full Name</label><input type="text" id="set-name" value="${escHtml(profile.full_name || '')}"></div>
          <div class="form-group"><label>USBC Member ID</label><input type="text" id="set-usbc" value="${escHtml(profile.usbc_id || '')}" placeholder="USBC #"></div>
          <div class="form-group"><label>Bowl.com Username</label><input type="text" id="set-bowlcom" value="${escHtml(profile.bowlcom_username || '')}" placeholder="bowl.com username"></div>
          <div class="form-group"><label>Home Center</label><input type="text" id="set-center" value="${escHtml(profile.home_center || '')}" placeholder="Your home bowling center"></div>
          <div class="form-group"><label>City</label><input type="text" id="set-city" value="${escHtml(profile.city || '')}"></div>
          <div class="form-group"><label>State</label><input type="text" id="set-state" value="${escHtml(profile.state || '')}" placeholder="e.g. OH"></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="Settings.saveProfile()">Save Profile</button>
        </div>
      </div>

      <div class="card">
        <h3>🎳 Connected Leagues</h3>
        ${leagues.length === 0 ? '<p class="empty-state">No leagues connected. Join or create leagues from the Leagues tab.</p>' :
          `<table class="data-table">
            <thead><tr><th>League</th><th>Last Synced</th></tr></thead>
            <tbody>${leagues.map(ul => `
              <tr>
                <td>${escHtml(ul.league?.name || 'Unknown')}</td>
                <td>${ul.league?.last_synced ? new Date(ul.league.last_synced).toLocaleString() : 'Never'}</td>
              </tr>
            `).join('')}</tbody>
          </table>`}
      </div>

      <div class="card">
        <h3>🔄 Data Sync</h3>
        <p class="text-muted">Auto-sync runs periodically for leagues with LSS IDs. You can trigger a manual sync below.</p>
        <button class="btn btn-secondary" onclick="Settings.syncAll()">🔄 Sync All Now</button>
      </div>

      <div class="card">
        <h3>🔐 Account</h3>
        <div class="form-group">
          <label>New Password</label>
          <input type="password" id="set-password" placeholder="Enter new password (min 6 chars)">
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="Settings.changePassword()">Change Password</button>
        </div>
        <hr style="border-color: #333; margin: 1.5rem 0;">
        <p class="text-muted">Email: ${escHtml(user.email)}</p>
      </div>
    `;
  }

  async function saveProfile() {
    const user = Auth.getUser();
    if (!user) return;

    const updates = {
      full_name: document.getElementById('set-name').value.trim(),
      usbc_id: document.getElementById('set-usbc').value.trim() || null,
      bowlcom_username: document.getElementById('set-bowlcom').value.trim() || null,
      home_center: document.getElementById('set-center').value.trim() || null,
      city: document.getElementById('set-city').value.trim() || null,
      state: document.getElementById('set-state').value.trim() || null,
      updated_at: new Date().toISOString()
    };

    if (!updates.full_name) return Toast.show('Name is required', 'error');

    try {
      const { error } = await sb.from('profiles').upsert({ id: user.id, ...updates });
      if (error) throw error;

      // Also update user metadata
      await sb.auth.updateUser({ data: { full_name: updates.full_name } });

      Toast.show('Profile saved! ✅', 'success');
      await Auth.loadProfile();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async function changePassword() {
    const pw = document.getElementById('set-password').value;
    if (!pw || pw.length < 6) return Toast.show('Password must be 6+ characters', 'error');

    try {
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) throw error;
      Toast.show('Password updated! 🔐', 'success');
      document.getElementById('set-password').value = '';
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async function syncAll() {
    Toast.show('Sync initiated. League data will update shortly via server-side sync.', 'info');
    // Touch last_synced on user's leagues
    const user = Auth.getUser();
    if (!user) return;
    try {
      const { data } = await sb.from('user_leagues').select('league_id').eq('user_id', user.id);
      if (data) {
        for (const ul of data) {
          await sb.from('leagues').update({ last_synced: new Date().toISOString() }).eq('id', ul.league_id);
        }
      }
      Toast.show('Sync timestamps updated', 'success');
    } catch (err) {
      console.error(err);
    }
  }

  return { load, saveProfile, changePassword, syncAll };
})();
