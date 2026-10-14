'use strict';

import { $, esc, toast } from '../core/utils.js';
import { S, save, CY, resetStore, applyTheme } from '../core/store.js';

export const renderSettings = () => {
  const settingsEl = $('#settings');
  if (!settingsEl) return;

  const cfg = S.cfg || {};

  settingsEl.innerHTML = `
    <div class="bar">
      <div>
        <h2>Settings & Preferences</h2>
        <span class="muted">Customize currencies, categories, payment options, and app preferences</span>
      </div>
    </div>

    <div class="settings-grid">
      <!-- General Preferences -->
      <div class="card settings-card">
        <div class="card-header-left">
          <h3>General Preferences</h3>
          <span class="muted">Default display currency and visual options</span>
        </div>

        <div class="settings-group">
          <label class="setting-row">
            <div>
              <b>Base Currency</b>
              <small class="muted">All spending totals will convert to this currency</small>
            </div>
            <select id="cfgCurrency" class="setting-select">
              ${CY.map(c => `<option value="${c}" ${cfg.cur === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </label>

          <label class="setting-row">
            <div>
              <b>App Theme</b>
              <small class="muted">Choose your preferred visual appearance</small>
            </div>
            <select id="cfgTheme" class="setting-select">
              <option value="dark" ${cfg.theme === 'dark' ? 'selected' : ''}>Dark (Default)</option>
              <option value="light" ${cfg.theme === 'light' ? 'selected' : ''}>Light (Rose Quartz)</option>
            </select>
          </label>

          <label class="setting-row chk-row">
            <div>
              <b>Show Original Currency</b>
              <small class="muted">Display original currency alongside converted amounts</small>
            </div>
            <input type="checkbox" id="cfgOrig" ${cfg.orig ? 'checked' : ''}>
          </label>
        </div>
      </div>

      <!-- Category Management -->
      <div class="card settings-card">
        <div class="card-header-left">
          <h3>Manage Categories</h3>
          <span class="muted">Add, rename, or remove subscription categories</span>
        </div>

        <div class="add-item-bar">
          <input type="text" id="newCatInput" placeholder="New category name..." />
          <button class="btn primary sm" id="addCatBtn">+ Add</button>
        </div>

        <div class="settings-list">
          ${S.cats.map(c => `
            <div class="settings-item-row" data-cat-id="${c.id}">
              <span class="item-label">${esc(c.label)}</span>
              <div class="item-actions">
                <button class="btn sm ghost" data-act="rename-cat">Rename</button>
                <button class="btn sm danger ghost" data-act="del-cat">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Payment Method Management -->
      <div class="card settings-card">
        <div class="card-header-left">
          <h3>Manage Payment Methods</h3>
          <span class="muted">Add, rename, or remove payment options</span>
        </div>

        <div class="add-item-bar">
          <input type="text" id="newPmInput" placeholder="New payment method name..." />
          <button class="btn primary sm" id="addPmBtn">+ Add</button>
        </div>

        <div class="settings-list">
          ${S.pms.map(p => `
            <div class="settings-item-row" data-pm-id="${p.id}">
              <span class="item-label">${esc(p.label)}</span>
              <div class="item-actions">
                <button class="btn sm ghost" data-act="rename-pm">Rename</button>
                <button class="btn sm danger ghost" data-act="del-pm">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Data Management / Danger Zone -->
      <div class="card settings-card danger-zone">
        <div class="card-header-left">
          <h3>Data & Storage</h3>
          <span class="muted">Reset application data or clear local store</span>
        </div>

        <div class="setting-row">
          <div>
            <b>Reset Application Data</b>
            <small class="muted">Restores default settings and clears all tracked subscriptions</small>
          </div>
          <button class="btn danger sm" id="resetDataBtn">Reset All Data</button>
        </div>
      </div>
    </div>
  `;

  // Attach Event Handlers
  $('#cfgCurrency').onchange = e => {
    S.cfg.cur = e.target.value;
    save();
    toast('Base currency updated');
  };

  $('#cfgTheme').onchange = e => {
    S.cfg.theme = e.target.value;
    applyTheme();
    save();
    toast('Theme preference saved');
  };

  $('#cfgOrig').onchange = e => {
    S.cfg.orig = e.target.checked;
    save();
    toast('Currency display updated');
  };

  // Category Actions
  $('#addCatBtn').onclick = () => {
    const input = $('#newCatInput');
    const val = input.value.trim();
    if (!val) return;
    const maxId = S.cats.reduce((max, c) => Math.max(max, c.id), 0);
    S.cats.push({ id: maxId + 1, label: val });
    save();
    input.value = '';
    toast('Category added');
    renderSettings();
  };

  // Payment Method Actions
  $('#addPmBtn').onclick = () => {
    const input = $('#newPmInput');
    const val = input.value.trim();
    if (!val) return;
    const maxId = S.pms.reduce((max, p) => Math.max(max, p.id), 0);
    S.pms.push({ id: maxId + 1, label: val });
    save();
    input.value = '';
    toast('Payment method added');
    renderSettings();
  };

  // Event Delegation for Row Actions
  settingsEl.onclick = e => {
    const btn = e.target.closest('[data-act]');

    if (e.target.id === 'resetDataBtn') {
      if (confirm('Are you sure you want to reset ALL subscriptions and settings to defaults? This cannot be undone.')) {
        resetStore();
        toast('Data reset to defaults');
        renderSettings();
      }
      return;
    }

    if (!btn) return;
    const act = btn.dataset.act;

    if (act === 'rename-cat') {
      const row = btn.closest('[data-cat-id]');
      const id = +row.dataset.catId;
      const cat = S.cats.find(c => c.id === id);
      if (!cat) return;
      const newName = prompt('Enter new category name:', cat.label);
      if (newName && newName.trim()) {
        cat.label = newName.trim();
        save();
        toast('Category renamed');
        renderSettings();
      }
    } else if (act === 'del-cat') {
      const row = btn.closest('[data-cat-id]');
      const id = +row.dataset.catId;
      if (S.cats.length <= 1) {
        toast('Must keep at least one category');
        return;
      }
      if (confirm('Delete this category?')) {
        S.cats = S.cats.filter(c => c.id !== id);
        save();
        toast('Category removed');
        renderSettings();
      }
    } else if (act === 'rename-pm') {
      const row = btn.closest('[data-pm-id]');
      const id = +row.dataset.pmId;
      const pm = S.pms.find(p => p.id === id);
      if (!pm) return;
      const newName = prompt('Enter new payment method name:', pm.label);
      if (newName && newName.trim()) {
        pm.label = newName.trim();
        save();
        toast('Payment method renamed');
        renderSettings();
      }
    } else if (act === 'del-pm') {
      const row = btn.closest('[data-pm-id]');
      const id = +row.dataset.pmId;
      if (S.pms.length <= 1) {
        toast('Must keep at least one payment method');
        return;
      }
      if (confirm('Delete this payment method?')) {
        S.pms = S.pms.filter(p => p.id !== id);
        save();
        toast('Payment method removed');
        renderSettings();
      }
    }
  };
};

export const initSettingsEvents = () => {};