'use strict';

import { $, esc, toast } from '../core/utils.js';
import { S, save, cv, money, annual, sumP, lab, SYM, userAmount, getLogoUrl } from '../core/store.js';

let disabledSimulatorIds = new Set();

export const renderReports = () => {
  const reportsEl = $('#reports');
  if (!reportsEl) return;

  const curCurrency = S.cfg?.cur || 'PHP';
  const currentSymbol = SYM[curCurrency] || curCurrency;
  const salary = Number(S.cfg?.salary) || 0;

  const subs = Array.isArray(S.subs) ? S.subs : [];
  const activeSubs = subs.filter(s => s && s.status === 'active');

  const monthlySubscriptionSpend = activeSubs.reduce((sum, s) => {
    const a = annual(s);
    return sum + (isNaN(a) ? 0 : a / 12);
  }, 0);

  const remainingSalary = salary - monthlySubscriptionSpend;
  const spentRatio = salary > 0 ? (monthlySubscriptionSpend / salary) * 100 : 0;
  const spentPercentageText = isNaN(spentRatio) ? '0.0' : spentRatio.toFixed(1);

  // Simulator Calculations
  const simulatedActiveSubs = activeSubs.filter(s => !disabledSimulatorIds.has(s.id));
  const simulatedMonthlySpend = simulatedActiveSubs.reduce((sum, s) => {
    const a = annual(s);
    return sum + (isNaN(a) ? 0 : a / 12);
  }, 0);
  const potentialMonthlySavings = monthlySubscriptionSpend - simulatedMonthlySpend;
  const potentialYearlySavings = potentialMonthlySavings * 12;

  // Health Badge Logic
  let healthBadgeClass = 'active';
  let healthStatusText = 'Healthy Budget (< 10%)';
  if (salary <= 0) {
    healthStatusText = 'Set salary to calculate ratio';
    healthBadgeClass = '';
  } else if (spentRatio > 25) {
    healthStatusText = 'High Overhead (> 25%)';
    healthBadgeClass = 'cancelled';
  } else if (spentRatio > 10) {
    healthStatusText = 'Moderate Commitment (10% - 25%)';
    healthBadgeClass = 'due';
  }

  // Monthly trend for past 12 months
  const now = new Date();
  const monthsList = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const ym = `${year}-${monthNum}`;
    const total = typeof sumP === 'function' ? sumP(dateStr => dateStr && dateStr.startsWith(ym)) : 0;
    monthsList.push({ ym, label: monthNum, total: isNaN(total) ? 0 : total });
  }

  const maxMonthVal = Math.max(...monthsList.map(m => m.total), 1);

  // Category Breakdown
  const categoryTotals = {};
  activeSubs.forEach(s => {
    const catLabel = lab('cats', s.categoryId);
    const a = annual(s);
    categoryTotals[catLabel] = (categoryTotals[catLabel] || 0) + (isNaN(a) ? 0 : a);
  });
  const totalAnnual = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  // Build Simulator Checklist HTML
  let simChecklistHTML = '<div class="empty-box">No active subscriptions to simulate</div>';
  if (activeSubs.length > 0) {
    simChecklistHTML = activeSubs.map(s => {
      const isKept = !disabledSimulatorIds.has(s.id);
      const mCost = (annual(s) || 0) / 12;
      const nameStr = esc(s.name || '');
      const planStr = esc(s.plan || 'Standard');
      const logoUrl = getLogoUrl(s);
      const costStr = money(mCost, curCurrency);
      const checkedAttr = isKept ? 'checked' : '';
      const disabledClass = isKept ? '' : 'disabled';

      return `
        <label class="sim-item ${disabledClass}">
          <input type="checkbox" class="sim-toggle" data-id="${s.id}" ${checkedAttr}>
          <img src="${logoUrl}" class="sub-logo-sm" alt="" onerror="this.src='img/logo.svg'">
          <span style="flex:1;"><b>${nameStr}</b> (${planStr})</span>
          <b>${costStr}/mo</b>
        </label>
      `;
    }).join('');
  }

  // Build Monthly Bars HTML
  const monthlyBarsHTML = monthsList.map(m => {
    const heightPct = m.total > 0 ? Math.max(8, (m.total / maxMonthVal) * 100) : 4;
    const amountFormatted = money(m.total, curCurrency);
    return `
      <div title="${m.ym}: ${amountFormatted}">
        <i style="height: ${heightPct}%;"></i>
        <span>${m.label}</span>
      </div>
    `;
  }).join('');

  // Build Category Breakdown HTML
  let categoryHTML = '<div class="empty-box">No active spending categories</div>';
  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  if (categoryEntries.length > 0) {
    categoryHTML = categoryEntries.map(([label, val]) => {
      const pct = totalAnnual ? ((val / totalAnnual) * 100).toFixed(1) : '0.0';
      const labelStr = esc(label);
      const valFormatted = money(val, curCurrency);
      return `
        <div class="cat-item">
          <div class="row" style="justify-content:space-between">
            <span>${labelStr}</span>
            <b>${valFormatted} (${pct}%)</b>
          </div>
          <div class="pct"><i style="width:${pct}%"></i></div>
        </div>
      `;
    }).join('');
  }

  // Main Container Render
  reportsEl.innerHTML = `
    <div class="bar">
      <div>
        <h2>Reports & Analytics</h2>
        <span class="muted">Income tracking, spending trends, and budget breakdown</span>
      </div>
    </div>

    <!-- Salary & Remaining Net Income Card -->
    <div class="salary-card">
      <div class="salary-input-box">
        <div>
          <h3>Monthly Income & Net Balance</h3>
          <span class="muted">Track your remaining salary after recurring subscriptions</span>
        </div>
        <div class="salary-input-group">
          <span>${currentSymbol}</span>
          <input type="number" id="salaryInput" min="0" step="100" value="${salary || ''}" placeholder="Enter monthly salary">
          <button class="btn primary sm" id="saveSalaryBtn">Save Income</button>
        </div>
      </div>

      <div class="salary-stats-grid">
        <div class="salary-stat-item">
          <small>Monthly Salary</small>
          <b>${money(salary, curCurrency)}</b>
        </div>
        <div class="salary-stat-item">
          <small>Subscriptions / Month</small>
          <b style="color:#818cf8;">${money(monthlySubscriptionSpend, curCurrency)}</b>
        </div>
        <div class="salary-stat-item">
          <small>Remaining Salary</small>
          <b class="${remainingSalary < 0 ? 'balance-negative' : 'balance-positive'}">
            ${money(remainingSalary, curCurrency)}
          </b>
        </div>
      </div>

      <div class="budget-progress-container">
        <div class="row" style="justify-content:space-between;">
          <small class="muted">Salary Allocated to Subscriptions: <b>${spentPercentageText}%</b></small>
          <span class="badge ${healthBadgeClass}">${healthStatusText}</span>
        </div>
        <div class="budget-bar-track">
          <div class="budget-bar-fill ${spentRatio > 25 ? 'danger' : spentRatio > 10 ? 'warning' : 'healthy'}" 
               style="width: ${Math.min(100, Math.max(0, spentRatio))}%;"></div>
        </div>
      </div>
    </div>

    <!-- Subscription Trimming & Savings Simulator -->
    <div class="card simulator-card" style="margin-bottom: 24px;">
      <div class="bar" style="width:100%;">
        <div style="text-align:left;">
          <h3>Potential Savings & Trimming Simulator</h3>
          <span class="muted">Uncheck subscriptions to simulate instant overhead savings</span>
        </div>
        <button class="btn sm" id="resetSimulator">Reset Simulator</button>
      </div>

      <div class="sim-stats-row">
        <div class="sim-stat">
          <small>Simulated Monthly Commitment</small>
          <b>${money(simulatedMonthlySpend, curCurrency)}</b>
        </div>
        <div class="sim-stat">
          <small>Monthly Savings</small>
          <b style="color:#34d399;">+${money(potentialMonthlySavings, curCurrency)}</b>
        </div>
        <div class="sim-stat">
          <small>Annual Savings Projection</small>
          <b style="color:#34d399;">+${money(potentialYearlySavings, curCurrency)}</b>
        </div>
      </div>

      <div class="sim-checklist">
        ${simChecklistHTML}
      </div>
    </div>

    <!-- Monthly Trend & Category Charts -->
    <div class="grid2">
      <div class="card">
        <h3>Monthly Spending Trend</h3>
        <small class="muted">Payments recorded over the last 12 months</small>
        <div class="bars">
          ${monthlyBarsHTML}
        </div>
      </div>

      <div class="card">
        <h3>Annual Category Spending</h3>
        <small class="muted">Distribution across active categories</small>
        <div style="width: 100%; margin-top: 10px;">
          ${categoryHTML}
        </div>
      </div>
    </div>
  `;

  // Attach Event Listeners
  const saveBtn = $('#saveSalaryBtn');
  const salaryInput = $('#salaryInput');

  if (saveBtn && salaryInput) {
    const performSave = () => {
      const val = parseFloat(salaryInput.value) || 0;
      if (!S.cfg) S.cfg = {};
      S.cfg.salary = Math.max(0, val);
      save();
      toast('Monthly income updated!');
      renderReports();
    };

    saveBtn.onclick = performSave;
    salaryInput.onkeydown = e => { if (e.key === 'Enter') performSave(); };
  }

  reportsEl.onclick = e => {
    if (e.target.id === 'resetSimulator') {
      disabledSimulatorIds.clear();
      renderReports();
      return;
    }

    if (e.target.classList.contains('sim-toggle')) {
      const id = +e.target.dataset.id;
      if (e.target.checked) {
        disabledSimulatorIds.delete(id);
      } else {
        disabledSimulatorIds.add(id);
      }
      renderReports();
    }
  };
};

export const initReportsEvents = () => {};