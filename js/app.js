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

$('#logout').onclick = () => {
  sessionStorage.removeItem('rb-auth');
  $('#app').hidden = true;
  $('#login').hidden = false;
};

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