'use strict';

import { $,$$, esc, dl } from '../core/utils.js';
import { S, save, resetStore, CY, SYM, RATES, applyTheme } from '../core/store.js';

export const renderSettings = () => {
  $('#settings').innerHTML = `
    <div class="bar">
      <div>
        <h2>Settings</h2>
        <span class="muted">Manage preferences, exchange rates, and data options</span>
      </div>
    </div>

    <div class="grid2">
      <!-- General Preferences -->
      <div class="card">
        <h3>Preferences</h3>
        <div class="fg">
          <label>Default Currency
            <select id="cur">
              ${CY.map(c => `<option value="${c}" ${c === S.cfg.cur ? 'selected' : ''}>${c} (${SYM[c]})</option>`).join('')}
            </select>
          </label>
          <label>Theme
            <select id="th">
              <option value="dark" ${S.cfg.theme === 'dark' ? 'selected' : ''}>Dark</option>
              <option value="light" ${S.cfg.theme === 'light' ? 'selected' : ''}>Light</option>
            </select>
          </label>
        </div>
        <label class="chk" style="margin-top:12px;">
          <input type="checkbox" id="orig" ${S.cfg.orig ? 'checked' : ''}>
          <span>Show original currency alongside converted values</span>
        </label>
      </div>

      <!-- Exchange Rates -->
      <div class="card">
        <div class="bar">
          <h3>Exchange Rates (vs 1 CNY)</h3>
          <button class="btn sm" id="rr">Reset rates</button>
        </div>
        <div class="fg">
          ${CY.map(
            c => `
              <label>${c} (${SYM[c]})
                <input type="number" step="0.0001" data-rate="${c}" value="${S.cfg.rates?.[c] ?? RATES[c]}">
              </label>
            `
          ).join('')}
        </div>
      </div>
    </div>

    <div class="grid2">
      <!-- Category Management -->
      <div class="card">
        <h3>Categories</h3>
        <ul class="list" id="cat-list">
          ${S.cats
            .map(
              c => `
                <li>
                  <span>${esc(c.label)}</span>
                  <span class="row">
                    <button class="btn sm" data-edit="cats" data-id="${c.id}">Rename</button>
                    <button class="btn sm danger" data-del="cats" data-id="${c.id}">Delete</button>
                  </span>
                </li>
              `
            )
            .join('')}
        </ul>
        <div class="row" style="margin-top:12px;">
          <input id="n-cats" placeholder="New category">
          <button class="btn primary" data-add="cats">Add</button>
        </div>
      </div>

      <!-- Payment Methods Management -->
      <div class="card">
        <h3>Payment Methods</h3>
        <ul class="list" id="pm-list">
          ${S.pms
            .map(
              p => `
                <li>
                  <span>${esc(p.label)}</span>
                  <span class="row">
                    <button class="btn sm" data-edit="pms" data-id="${p.id}">Rename</button>
                    <button class="btn sm danger" data-del="pms" data-id="${p.id}">Delete</button>
                  </span>
                </li>
              `
            )
            .join('')}
        </ul>
        <div class="row" style="margin-top:12px;">
          <input id="n-pms" placeholder="New payment method">
          <button class="btn primary" data-add="pms">Add</button>
        </div>
      </div>
    </div>

    <!-- Data Backup & Reset -->
    <div class="grid2">
      <div class="card">
        <h3>Data Backup</h3>
        <p class="muted">All your subscriptions and configuration settings are stored in local browser storage.</p>
        <div class="row" style="justify-content:center;">
          <button class="btn" id="export-json">Export JSON</button>
        </div>
      </div>

      <div class="card" style="border-color: rgba(239, 68, 68, 0.35);">
        <h3 style="color: var(--er);">Reset Data</h3>
        <p class="muted">Deletes all subscriptions, payment histories, categories, and settings permanently.</p>
        <div class="row" style="justify-content:center;">
          <button class="btn danger" id="reset-all">Reset all data</button>
        </div>
      </div>
    </div>
  `;
};

export const initSettingsEvents = () => {
  const container = $('#settings');
  if (!container) return;

  container.addEventListener('change', e => {
    if (e.target.id === 'cur') {
      S.cfg.cur = e.target.value;
      save();
    } else if (e.target.id === 'th') {
      S.cfg.theme = e.target.value;
      applyTheme();
      save();
    } else if (e.target.id === 'orig') {
      S.cfg.orig = e.target.checked;
      save();
    } else if (e.target.dataset.rate) {
      const code = e.target.dataset.rate;
      const val = parseFloat(e.target.value);
      if (val > 0) {
        if (!S.cfg.rates) S.cfg.rates = { ...RATES };
        S.cfg.rates[code] = val;
        save();
      }
    }
  });

  container.addEventListener('click', e => {
    if (e.target.id === 'rr') {
      S.cfg.rates = { ...RATES };
      save();
      renderSettings();
      return;
    }

    const addKey = e.target.dataset.add;
    const editKey = e.target.dataset.edit;
    const delKey = e.target.dataset.del;

    if (addKey) {
      const input = $(`#n-${addKey}`);
      const val = input ? input.value.trim() : '';
      if (!val) return;
      S[addKey].push({ id: S.id++, label: val });
      save();
      renderSettings();
    } else if (editKey) {
      const id = +e.target.dataset.id;
      const item = S[editKey].find(x => x.id === id);
      if (!item) return;
      const name = prompt('Rename item:', item.label);
      if (name && name.trim()) {
        item.label = name.trim();
        save();
        renderSettings();
      }
    } else if (delKey) {
      const id = +e.target.dataset.id;
      if (S[delKey].length <= 1) return alert('At least one option must remain.');
      if (confirm('Delete this item?')) {
        S[delKey] = S[delKey].filter(x => x.id !== id);
        save();
        renderSettings();
      }
    } else if (e.target.id === 'export-json') {
      dl(`rewindbasis-data-${new Date().toISOString().slice(0, 10)}.json`, S);
    } else if (e.target.id === 'reset-all') {
      if (confirm('Are you sure you want to delete all data? This action cannot be undone.')) {
        resetStore();
        location.reload();
      }
    }
  });
};