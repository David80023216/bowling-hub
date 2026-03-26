/* Main app controller – tab navigation, sidebar, initialization */

const App = (() => {
  const tabs = ['dashboard', 'scores', 'honors', 'leagues', 'schedule', 'challenges', 'settings'];
  let activeTab = 'dashboard';

  function init() {
    bindNav();
    bindSidebarToggle();
    navigate('dashboard');
  }

  function bindNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        if (tab) navigate(tab);
      });
    });
  }

  function bindSidebarToggle() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggle) toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
    if (overlay) overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
    // Close sidebar on nav click (mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth < 768) {
          sidebar.classList.remove('open');
          overlay.classList.remove('active');
        }
      });
    });
  }

  function navigate(tab) {
    activeTab = tab;
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    // Show/hide sections
    document.querySelectorAll('.tab-content').forEach(el => {
      el.classList.toggle('active', el.id === 'tab-' + tab);
    });
    // Load tab data
    switch (tab) {
      case 'dashboard': Dashboard.load(); break;
      case 'scores': Scores.load(); break;
      case 'honors': Honors.load(); break;
      case 'leagues': Leagues.load(); break;
      case 'schedule': Schedule.load(); break;
      case 'challenges': Challenges.load(); break;
      case 'settings': Settings.load(); break;
    }
  }

  return { init, navigate };
})();
