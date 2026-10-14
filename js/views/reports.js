'use strict';

import { $, F, esc } from '../core/utils.js';
import { S, okPays, sumP, money, cv } from '../core/store.js';

export const renderReports = () => {
  const now = new Date();
  const curCurrency = S.cfg.cur;
  const monthKeys = [];

  for (let i = 11; i >= 0; i--) {
    monthKeys.push(F(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7));
  }

  const monthlyVals = monthKeys.map(mKey => sumP(d => d.startsWith(mKey)));
  const maxVal = Math.max(...monthlyVals, 1);

  const year = now.getFullYear();
  const month = now.getMonth();
  const currentQuarterMonth = Math.floor(month / 3) * 3;

  const renderPeriodCard = (title, fromDate, toDate, totalDays) => {
    const periodPayments = okPays().filter(p => p.date >= fromDate && p.date <= toDate);
    const totalSpent = periodPayments.reduce((sum, p) => sum + cv(p.amount, p.cur), 0);
    return `
      <div class="card stat">
        <small>${title}</small>
        <b>${money(totalSpent, curCurrency)}</b>
        <small>${money(totalSpent / totalDays, curCurrency)} / day · ${periodPayments.length} payments</small>
      </div>
    `;
  };

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

  const categorySpending = {};
  const earliestMonth = monthKeys[0] + '-01';

  okPays()
    .filter(p => p.date >= earliestMonth)
    .forEach(p => {
      const sub = S.subs.find(x => x.id === p.subId);
      const categoryName = sub ? (S.cats.find(c => c.id == sub.categoryId)?.label || '—') : 'Unknown';
      categorySpending[categoryName] = (categorySpending[categoryName] || 0) + cv(p.amount, p.cur);
    });

  const catEntries = Object.entries(categorySpending).sort((a, b) => b[1] - a[1]);
  const catTotal = catEntries.reduce((sum, item) => sum + item[1], 0);

  let accumulatedPct = 0;
  const conicGradients = catEntries
    .map(([, amount], i) => {
      const startPct = (accumulatedPct / catTotal) * 100;
      accumulatedPct += amount;
      const endPct = (accumulatedPct / catTotal) * 100;
      return `var(--c${(i % 8) + 1}) ${startPct}% ${endPct}%`;
    })
    .join(',');

  const paymentYears = [...new Set(okPays().map(p => p.date.slice(0, 4)))].sort().reverse();

  $('#reports').innerHTML = `
    <div class="bar">
      <div>
        <h2>Expense reports</h2>
        <span class="muted">Based on succeeded payments, shown in ${curCurrency}</span>
      </div>
    </div>
    <div class="stats">
      ${renderPeriodCard('This month', `${monthKeys[11]}-01`, `${monthKeys[11]}-31`, daysInMonth(year, month))}
      ${renderPeriodCard(
        'This quarter',
        F(new Date(year, currentQuarterMonth, 1)),
        F(new Date(year, currentQuarterMonth + 3, 0)),
        daysInMonth(year, currentQuarterMonth) + daysInMonth(year, currentQuarterMonth + 1) + daysInMonth(year, currentQuarterMonth + 2)
      )}
      ${renderPeriodCard(
        'This year',
        `${year}-01-01`,
        `${year}-12-31`,
        (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
      )}
    </div>
    <div class="grid2">
      <div class="card">
        <h3>Monthly trend</h3>
        <small>Last 12 months</small>
        <div class="bars">
          ${monthlyVals
            .map((val, idx) => `
              <div title="${monthKeys[idx]}:${money(val, curCurrency)}">
                <span>${val ? Math.round(val) : ''}</span>
                <i style="height:${(val / maxVal) * 80}%"></i>
                <span>${monthKeys[idx].slice(5)}</span>
              </div>
            `).join('')}
        </div>
      </div>
      <div class="card">
        <h3>Spending by category</h3>
        <small>Last 12 months</small>
        ${
          catEntries.length
            ? `
              <div class="donut" style="background:conic-gradient(${conicGradients})"></div>
              <div class="legend">
                ${catEntries.map(([label, amount], i) => `
                  <span style="--c:var(--c${(i % 8) + 1})">
                    ${esc(label)} — ${money(amount, curCurrency)} (${((amount / catTotal) * 100).toFixed(1)}%)
                  </span>
                `).join('')}
              </div>
            `
            : '<p class="muted">No category data</p>'
        }
      </div>
    </div>
    <div class="card">
      <h3>Yearly totals</h3>
      <ul class="list">
        ${
          paymentYears.map(yy => `<li><span>${yy}</span><b>${money(sumP(d => d.startsWith(yy)), curCurrency)}</b></li>`).join('') || '<li class="muted">No payments yet</li>'
        }
      </ul>
    </div>
  `;
};