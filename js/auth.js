/*  Auth module – handles signup, login, logout, session management */

const Auth = (() => {
  let currentUser = null;
  let currentProfile = null;

  async function init() {
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        currentUser = session.user;
        await loadProfile();
        hideAuthModal();
        showApp();
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        currentProfile = null;
        hideApp();
        showAuthModal();
      }
    });

    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      currentUser = session.user;
      await loadProfile();
      hideAuthModal();
      showApp();
    } else {
      hideApp();
      showAuthModal();
    }
  }

  async function loadProfile() {
    if (!currentUser) return;
    const { data, error } = await sb.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    if (!error && data) {
      currentProfile = data;
    } else {
      currentProfile = { id: currentUser.id, full_name: currentUser.user_metadata?.full_name || 'Bowler' };
    }
    updateSidebarUser();
  }

  function updateSidebarUser() {
    const el = document.getElementById('sidebar-user-name');
    if (el) el.textContent = currentProfile?.full_name || currentUser?.user_metadata?.full_name || 'Bowler';
    const avatar = document.getElementById('sidebar-user-avatar');
    if (avatar) {
      const name = currentProfile?.full_name || 'B';
      avatar.textContent = name.charAt(0).toUpperCase();
    }
  }

  async function signUp(email, password, fullName) {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    Toast.show('Account created! Check your email to confirm, or log in if email confirmation is disabled.', 'success');
    return data;
  }

  async function login(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function logout() {
    await sb.auth.signOut();
  }

  function getUser() { return currentUser; }
  function getProfile() { return currentProfile; }

  function showAuthModal() {
    document.getElementById('auth-modal').classList.add('active');
  }

  function hideAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
  }

  function showApp() {
    document.getElementById('app-container').style.display = 'flex';
  }

  function hideApp() {
    document.getElementById('app-container').style.display = 'none';
  }

  /* Wire up auth form listeners after DOM ready */
  function bindEvents() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const toggleToSignup = document.getElementById('toggle-signup');
    const toggleToLogin = document.getElementById('toggle-login');
    const logoutBtn = document.getElementById('logout-btn');

    toggleToSignup.addEventListener('click', e => {
      e.preventDefault();
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
    });

    toggleToLogin.addEventListener('click', e => {
      e.preventDefault();
      signupForm.style.display = 'none';
      loginForm.style.display = 'block';
    });

    document.getElementById('btn-login').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const pw = document.getElementById('login-password').value;
      if (!email || !pw) return Toast.show('Fill in all fields', 'error');
      try {
        document.getElementById('btn-login').disabled = true;
        await login(email, pw);
        Toast.show('Welcome back! 🎳', 'success');
      } catch (err) {
        Toast.show(err.message, 'error');
      } finally {
        document.getElementById('btn-login').disabled = false;
      }
    });

    document.getElementById('btn-signup').addEventListener('click', async () => {
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const pw = document.getElementById('signup-password').value;
      if (!name || !email || !pw) return Toast.show('Fill in all fields', 'error');
      if (pw.length < 6) return Toast.show('Password must be 6+ characters', 'error');
      try {
        document.getElementById('btn-signup').disabled = true;
        await signUp(email, pw, name);
      } catch (err) {
        Toast.show(err.message, 'error');
      } finally {
        document.getElementById('btn-signup').disabled = false;
      }
    });

    if (logoutBtn) logoutBtn.addEventListener('click', logout);
  }

  return { init, bindEvents, getUser, getProfile, loadProfile, login, logout, signUp };
})();
