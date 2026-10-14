'use strict';

import { $, today, days, esc, row } from '../core/utils.js';
import { S, sumP, annual, processDue, money, mu, lab } from '../core/store.js';

export const renderDashboard = () => {
  const t = today();
  const activeSubs = S.subs.filter(s => s.status === 'active');

  const upcoming = activeSubs
    .filter(s => {
      const d = days(s.nextBillingDate);
      return d >= 0 && d <= 7;
    })
    .sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate));

  const recentlyPaid = S.subs
    .filter(s => s.lastBillingDate && days(s.lastBillingDate) <= 0 && days(s.lastBillingDate) >= -7)
    .sort((a, b) => b.lastBillingDate.localeCompare(a.lastBillingDate));

  const categoryTotals = {};
  activeSubs.forEach(s => {
    const categoryLabel = lab('cats', s.categoryId);
    categoryTotals[categoryLabel] = (categoryTotals[categoryLabel] || 0) + annual(s);
  });

  const totalAnnual = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
  const curCurrency = S.cfg.cur;

  $('#dashboard').innerHTML = `
    <div class="bar">
      <div>
        <h2>Dashboard</h2>
        <span class="muted">Expense overview and active renewals</span>
      </div>
      <button class="btn" id="refresh">↻ Refresh</button>
    </div>

    <!-- Centered Neon Stat Cards -->
    <div class="stats">
      <div class="card stat-card">
        <div class="stat-icon" style="background:rgba(99,102,241,0.15); border-color:rgba(99,102,241,0.3); color:#818cf8;">💳</div>
        <div class="stat-info">
          <small>Monthly Spending</small>
          <b>${money(sumP(d => d.startsWith(t.slice(0, 7))), curCurrency)}</b>
          <small class="muted">Current month total</small>
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-icon" style="background:rgba(56,189,248,0.15); border-color:rgba(56,189,248,0.3); color:#38bdf8;">📅</div>
        <div class="stat-info">
          <small>Yearly Spending</small>
          <b>${money(sumP(d => d.startsWith(t.slice(0, 4))), curCurrency)}</b>
          <small class="muted">Current year total</small>
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-icon" style="background:rgba(16,185,129,0.15); border-color:rgba(16,185,129,0.3); color:#34d399;">⚡</div>
        <div class="stat-info">
          <small>Active Subscriptions</small>
          <b>${activeSubs.length}</b>
          <small class="muted">Tracked services</small>
        </div>
      </div>
    </div>

    <!-- Centered Detail Cards -->
    <div class="grid">
      <div class="card">
        <h3>Recently Paid</h3>
        <small class="muted">Paid in the last 7 days</small>
        ${
          recentlyPaid.length > 0
            ? `<ul class="list">${recentlyPaid.map(s => row(esc(s.name), mu(s.amount, s.currency), `Paid ${s.lastBillingDate}`)).join('')}</ul>`
            : '<div class="empty-box">Nothing paid recently</div>'
        }
      </div>

      <div class="card">
        <h3>Upcoming Renewals</h3>
        <small class="muted">Renewing in the next 7 days</small>
        ${
          upcoming.length > 0
            ? `<ul class="list">${upcoming.map(s => {
                const d = days(s.nextBillingDate);
                const badgeText = d === 0 ? 'today' : `${d}d`;
                return row(esc(s.name), `${mu(s.amount, s.currency)} <span class="badge due">${badgeText}</span>`, s.nextBillingDate);
              }).join('')}</ul>`
            : '<div class="empty-box">No renewals this week</div>'
        }
      </div>

      <div class="card">
        <h3>Spending by Category</h3>
        <small class="muted">Annualised, active subscriptions</small>
        ${
          Object.entries(categoryTotals).length > 0
            ? Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([label, val]) => {
                  const pct = totalAnnual ? ((val / totalAnnual) * 100).toFixed(1) : '0.0';
                  return `
                    <div class="cat-item">
                      <div class="row" style="justify-content:space-between">
                        <span>${esc(label)}</span>
                        <b>${money(val, curCurrency)} (${pct}%)</b>
                      </div>
                      <div class="pct"><i style="width:${pct}%"></i></div>
                    </div>
                  `;
                })
                .join('')
            : '<div class="empty-box">No spending data</div>'
        }
      </div>
    </div>
  `;

  $('#refresh').onclick = () => {
    processDue();
    renderDashboard();
  };
};