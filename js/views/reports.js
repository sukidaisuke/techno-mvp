'use strict';

import { $, esc, today, toast } from '../core/utils.js';
import { S, save, cv, money, annual, sumP, lab, SYM } from '../core/store.js';

export const renderReports = () => {
  const curCurrency = S.cfg?.cur || 'PHP';
  const currentSymbol = SYM[curCurrency] || curCurrency;
  const salary = Number(S.cfg?.salary) || 0;

  // Calculate total monthly recurring commitment for active subscriptions
  const activeSubs = S.subs.filter(s => s.status === 'active');
  const monthlySubscriptionSpend = activeSubs.reduce((sum, s) => sum + (annual(s) / 12), 0);
  const remainingSalary = salary - monthlySubscriptionSpend;
  const spentRatio = salary > 0 ? (monthlySubscriptionSpend / salary) * 100 : 0;
  const spentPercentageText = spentRatio.toFixed(1);

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

  // Monthly trend for past 12 months (Fixed Local Timezone formatting)
  const now = new Date();
  const monthsList = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const ym = `${year}-${monthNum}`;
    const total = sumP(dateStr => dateStr && dateStr.startsWith(ym));
    monthsList.push({ ym, label: monthNum, total });
  }

  const maxMonthVal = Math.max(...monthsList.map(m => m.total), 1);

  // Category Breakdown
  const categoryTotals = {};
  activeSubs.forEach(s => {
    const catLabel = lab('cats', s.categoryId);
    categoryTotals[catLabel] = (categoryTotals[catLabel] || 0) + annual(s);
  });
  const totalAnnual = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  $('#reports').innerHTML = `
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
               style="width: ${Math.min(100, spentRatio)}%;"></div>
        </div>
      </div>
    </div>

    <!-- Monthly Trend & Category Charts -->
    <div class="grid2">
      <div class="card">
        <h3>Monthly Spending Trend</h3>
        <small class="muted">Payments recorded over the last 12 months</small>
        <div class="bars">
          ${monthsList
            .map(m => {
              const heightPct = m.total > 0 ? Math.max(8, (m.total / maxMonthVal) * 100) : 4;
              return `
                <div title="${m.ym}:${money(m.total, curCurrency)}">
                  <i style="height: ${heightPct}%;"></i>
                  <span>${m.label}</span>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>

      <div class="card">
        <h3>Annual Category Spending</h3>
        <small class="muted">Distribution across active categories</small>
        <div style="width: 100%; margin-top: 10px;">
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
              : '<div class="empty-box">No active spending categories</div>'
          }
        </div>
      </div>
    </div>
  `;

  // Direct Event Attachment
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
    salaryInput.onkeydown = e => {
      if (e.key === 'Enter') performSave();
    };
  }
};

export const initReportsEvents = () => {
  // Maintained for app.js import compatibility
};