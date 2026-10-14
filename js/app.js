'use strict';

import { $,$$, toast } from './core/utils.js';
import { S, save, processDue, applyTheme } from './core/store.js';
import { initAuth } from './views/auth.js';
import { renderDashboard } from './views/dashboard.js';
import { renderSubscriptions, initSubscriptionsEvents } from './views/subscriptions.js';
import { renderReports } from './views/reports.js';
import { renderSettings, initSettingsEvents } from './views/settings.js';

let currentView = 'dashboard';

const views = {
  dashboard: renderDashboard,
  subs: renderSubscriptions,
  reports: renderReports,
  settings: renderSettings
};

const showView = viewId => {
  currentView = viewId;
  $$('.view').forEach(el => el.classList.toggle('on', el.id === viewId));$$
('#nav button').forEach(btn => btn.classList.toggle('on', btn.dataset.v === viewId));
  views[viewId]?.();
};

const startApp = () => {
  $('#login').hidden = true;
  $('#app').hidden = false;
  processDue();
  showView('dashboard');
};

// Application Header Navigation & Event Bindings
$('#nav').onclick = e => e.target.dataset.v && showView(e.target.dataset.v);

$('#theme').onclick = () => {
  const themes = ['light', 'dark', 'system'];
  S.cfg.theme = themes[(themes.indexOf(S.cfg.theme) + 1) % 3];
  save();
  applyTheme();
  toast(`Theme: ${S.cfg.theme}`);
};

// Logout Modal Handling
const logoutBtn = $('#logout');
const logoutDlg = $('#logoutDlg');
const confirmLogoutBtn = $('#confirmLogoutBtn');
const cancelLogoutBtn = $('#cancelLogoutBtn');
const closeLogoutDlg = $('#closeLogoutDlg');

if (logoutBtn && logoutDlg) {
  // Open modal when header Log out button is clicked
  logoutBtn.onclick = () => logoutDlg.showModal();

  const closeDlg = () => logoutDlg.close();

  if (cancelLogoutBtn) cancelLogoutBtn.onclick = closeDlg;
  if (closeLogoutDlg) closeLogoutDlg.onclick = closeDlg;

  // Close modal when clicking outside backdrop
  logoutDlg.onclick = e => {
    if (e.target === logoutDlg) closeDlg();
  };

  // Perform logout upon confirmation
  if (confirmLogoutBtn) {
    confirmLogoutBtn.onclick = () => {
      logoutDlg.close();
      $('#app').hidden = true;
      $('#login').hidden = false;
      toast('Logged out successfully');
    };
  }
}

// Initialize static view listeners
initSubscriptionsEvents();
initSettingsEvents();
applyTheme();

// Authentication Gate
if (sessionStorage.getItem('rb-auth')) {
  startApp();
} else {
  $('#login').hidden = false;
  initAuth(startApp);
}