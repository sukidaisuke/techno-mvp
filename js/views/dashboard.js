'use strict';

import { $, esc, today, days } from '../core/utils.js';
import { S, cv, money, mu, annual, lab, userAmount, getLogoUrl } from '../core/store.js';

let calOffset = 0; // Calendar month offset

export const renderDashboard = () => {
  const t = today();
  const curCurrency = S.cfg.cur;

  // Active subscriptions calculation
  const activeSubs = S.subs.filter(s => s.status === 'active');
  const trialSubs = S.subs.filter(s => s.status === 'trial');

  // Spending totals using user share
  const currentMonthPrefix = t.slice(0, 7);
  const currentYearPrefix = t.slice(0, 4);

  const monthSpend = S.pays
    .filter(p => p.status === 'succeeded' && p.date.startsWith(currentMonthPrefix))
    .reduce((sum, p) => sum + cv(p.amount, p.cur), 0);

  const yearSpend = S.pays
    .filter(p => p.status === 'succeeded' && p.date.startsWith(currentYearPrefix))
    .reduce((sum, p) => sum + cv(p.amount, p.cur), 0);

  // Recently Paid & Upcoming
  const recentPays = [...S.pays]
    .filter(p => p.status === 'succeeded' && days(p.date) >= -7 && days(p.date) <= 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  const upcomingRenewals = activeSubs
    .filter(s => {
      const d = days(s.nextBillingDate);
      return d >= 0 && d <= 7;
    })
    .sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate));

  // Category Annual Spending Projections
  const categoryTotals = {};
  activeSubs.forEach(s => {
    const catLabel = lab('cats', s.categoryId);
    categoryTotals[catLabel] = (categoryTotals[catLabel] || 0) + annual(s);
  });
  const totalCategoryAnnual = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  // Render Calendar Widget Data
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + calOffset);
  const calYear = targetDate.getFullYear();
  const calMonth = targetDate.getMonth();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthName = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Map renewals to month days
  const calendarRenewals = {};
  S.subs.forEach(sub => {
    if (sub.status === 'cancelled') return;
    const parts = sub.nextBillingDate.split('-');
    if (+parts[0] === calYear && +parts[1] === calMonth + 1) {
      const dayNum = +parts[2];
      if (!calendarRenewals[dayNum]) calendarRenewals[dayNum] = [];
      calendarRenewals[dayNum].push(sub);
    }
  });

  $('#dashboard').innerHTML = `
    <div class="bar">
      <div>
        <h2>Dashboard</h2>
        <span class="muted">Expense overview and active renewals</span>
      </div>
      <button class="btn" id="refreshDash">↻ Refresh</button>
    </div>

    <!-- Free Trial Expiration Guard Alert -->
    ${
      trialSubs.length > 0
        ? `
        <div class="trial-guard-card">
          <div class="trial-guard-header">
            <span class="trial-guard-icon">⏳</span>
            <div>
              <h3>Free Trial Expiration Guard (${trialSubs.length})</h3>
              <span class="muted">Active trial subscriptions scheduled for billing renewal</span>
            </div>
          </div>
          <div class="trial-guard-list">
            ${trialSubs
              .map(s => {
                const d = days(s.nextBillingDate);
                const dueText = d < 0 ? 'Trial Expired' : d === 0 ? 'Ends Today!' : `Ends in ${d} day(s)`;
                return `
                  <div class="trial-item">
                    <img src="${getLogoUrl(s)}" class="sub-logo-sm" alt="" onerror="this.src='img/logo.svg'">
                    <div style="flex:1;">
                      <b>${esc(s.name)} (${esc(s.plan)})</b>
                      <small class="muted" style="display:block;">Next Charge: ${mu(s.amount, s.currency)} on ${s.nextBillingDate}</small>
                    </div>
                    <span class="badge due">${dueText}</span>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `
        : ''
    }

    <!-- Stat Cards -->
    <div class="stats">
      <div class="card stat-card">
        <div class="stat-icon">💳</div>
        <div class="stat-info">
          <small>Monthly Spending</small>
          <b>${money(monthSpend, curCurrency)}</b>
          <small>Current Month Total</small>
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-info">
          <small>Yearly Spending</small>
          <b>${money(yearSpend, curCurrency)}</b>
          <small>Current Year Total</small>
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-icon">⚡</div>
        <div class="stat-info">
          <small>Active Subscriptions</small>
          <b>${activeSubs.length}</b>
          <small>Tracked Services</small>
        </div>
      </div>
    </div>

    <!-- Interactive Renewal Calendar Card -->
    <div class="card calendar-card" style="margin-bottom: 24px;">
      <div class="bar" style="width:100%; margin-bottom:12px;">
        <div style="text-align:left;">
          <h3>Renewal Calendar</h3>
          <span class="muted">${monthName}</span>
        </div>
        <div class="row">
          <button class="btn sm" id="calPrev">‹ Prev</button>
          <button class="btn sm" id="calToday">Today</button>
          <button class="btn sm" id="calNext">Next ›</button>
        </div>
      </div>

      <div class="calendar-grid">
        <div class="cal-day-head">Sun</div><div class="cal-day-head">Mon</div>
        <div class="cal-day-head">Tue</div><div class="cal-day-head">Wed</div>
        <div class="cal-day-head">Thu</div><div class="cal-day-head">Fri</div>
        <div class="cal-day-head">Sat</div>
        ${Array(firstDayIndex).fill('<div class="cal-day empty"></div>').join('')}
        ${Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum = i + 1;
          const isToday = calOffset === 0 && dayNum === new Date().getDate();
          const items = calendarRenewals[dayNum] || [];
          return `
            <div class="cal-day ${isToday ? 'today' : ''} ${items.length > 0 ? 'has-event' : ''}">
              <span class="cal-num">${dayNum}</span>${items
                .map(
                  sub => `
                <div class="cal-badge" title="${esc(sub.name)} - ${mu(sub.amount, sub.currency)}">
                  <img src="${getLogoUrl(sub)}" class="cal-logo" alt="" onerror="this.style.display='none'">
                  <span>${esc(sub.name)}</span>
                </div>
              `
                )
                .join('')}
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Grid Layout for Lists -->
    <div class="grid">
      <div class="card" style="align-items: stretch; text-align: left;">
        <h3>Recently Paid</h3>
        <small class="muted" style="margin-bottom:10px;">Paid in the last 7 days</small>
        ${
          recentPays.length > 0
            ? recentPays
                .map(p => {
                  const sub = S.subs.find(s => s.id === p.subId);
                  return `
                    <div class="list-row-item">
                      <img src="${sub ? getLogoUrl(sub) : ''}" class="sub-logo-sm" alt="" onerror="this.src='img/logo.svg'">
                      <div>
                        <b>${esc(sub?.name || 'Subscription')}</b>
                        <small class="muted" style="display:block;">Paid ${p.date}</small>
                      </div>
                      <b>${money(cv(p.amount, p.cur), curCurrency)}</b>
                    </div>
                  `;
                })
                .join('')
            : '<div class="empty-box">No recent payments</div>'
        }
      </div>

      <div class="card" style="align-items: stretch; text-align: left;">
        <h3>Upcoming Renewals</h3>
        <small class="muted" style="margin-bottom:10px;">Renewing in the next 7 days</small>
        ${
          upcomingRenewals.length > 0
            ? upcomingRenewals
                .map(s => {
                  const d = days(s.nextBillingDate);
                  return `
                    <div class="list-row-item">
                      <img src="${getLogoUrl(s)}" class="sub-logo-sm" alt="" onerror="this.src='img/logo.svg'">
                      <div>
                        <b>${esc(s.name)}</b>
                        <small class="muted" style="display:block;">Due ${s.nextBillingDate} (${d === 0 ? 'Today' : d + 'd'})</small>
                      </div>
                      <b>${mu(userAmount(s), s.currency)}</b>
                    </div>
                  `;
                })
                .join('')
            : '<div class="empty-box">No renewals this week</div>'
        }
      </div>

      <div class="card" style="align-items: stretch; text-align: left;">
        <h3>Spending by Category</h3>
        <small class="muted" style="margin-bottom:10px;">Annualised, active subscriptions</small>
        ${
          Object.entries(categoryTotals).length > 0
            ? Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, val]) => {
                  const pct = totalCategoryAnnual ? ((val / totalCategoryAnnual) * 100).toFixed(1) : '0.0';
                  return `
                    <div class="cat-item">
                      <div class="row" style="justify-content:space-between">
                        <span>${esc(cat)}</span>
                        <b>${money(val, curCurrency)} (${pct}%)</b>
                      </div>
                      <div class="pct"><i style="width:${pct}%"></i></div>
                    </div>
                  `;
                })
                .join('')
            : '<div class="empty-box">No active categories</div>'
        }
      </div>
    </div>
  `;

  // Calendar Controls
  $('#calPrev').onclick = () => { calOffset--; renderDashboard(); };
  $('#calNext').onclick = () => { calOffset++; renderDashboard(); };
  $('#calToday').onclick = () => { calOffset = 0; renderDashboard(); };
  $('#refreshDash').onclick = () => renderDashboard();
};

export const initDashboardEvents = () => {};