'use strict';

import { today, add } from './utils.js';

export const CY = ['CNY', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'TRY', 'HKD', 'PHP'];

export const SYM = {
  CNY: '¥', USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥', TRY: '₺', HKD: 'HK$', PHP: '₱'
};

export const RATES = {
  CNY: 1, USD: 0.1538, EUR: 0.1308, GBP: 0.1154, CAD: 0.1923, AUD: 0.2077, JPY: 16.9231, TRY: 4.2, HKD: 1.1923, PHP: 8.10
};

export const CYC = { monthly: 1, quarterly: 3, semiannual: 6, yearly: 12 };

const K = 'rewindbasis';

export const seed = () => ({
  id: 1,
  subs: [],
  pays: [],
  cats: [
    'Video Streaming', 'Music Streaming', 'Software', 'Cloud Storage',
    'News & Magazines', 'Games', 'Productivity', 'Education', 'Finance', 'Other'
  ].map((label, index) => ({ id: index + 1, label })),
  pms: [
    'Credit Card', 'Debit Card', 'PayPal', 'Apple Pay',
    'Google Pay', 'Bank Transfer', 'Cryptocurrency', 'Other'
  ].map((label, index) => ({ id: index + 1, label })),
  cfg: { cur: 'PHP', orig: true, theme: 'dark', rates: { ...RATES } }
});

export let S;
try {
  S = JSON.parse(localStorage.getItem(K)) || seed();
  if (S && S.cfg) {
    S.cfg.rates = { ...RATES, ...(S.cfg.rates || {}) };
    if (!S.cfg.cur) S.cfg.cur = 'PHP';
  }
} catch {
  S = seed();
}

export const save = () => {
  try {
    localStorage.setItem(K, JSON.stringify(S));
  } catch {}
};

export const resetStore = () => {
  const fresh = seed();
  Object.keys(S).forEach(key => delete S[key]);
  Object.assign(S, fresh);
  save();
};

export const cv = (amount, fromCur, toCur = S.cfg?.cur || 'PHP') => {
  const numAmount = Number(amount) || 0;
  const fromRate = S.cfg?.rates?.[fromCur] ?? RATES[fromCur] ?? 1;
  const toRate = S.cfg?.rates?.[toCur] ?? RATES[toCur] ?? 1;
  if (fromCur === toCur) return numAmount;
  return (numAmount * toRate) / fromRate;
};

export const money = (amount, currency = S.cfg?.cur || 'PHP') => {
  const num = Number(amount) || 0;
  return (SYM[currency] || currency) +
  num.toLocaleString('en-US', {
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2
  });
};

export const mu = (amount, currency) => {
  const targetCur = S.cfg?.cur || 'PHP';
  const converted = money(cv(amount, currency), targetCur);
  return currency === targetCur || !S.cfg?.orig ? converted : `${converted} (${money(amount, currency)})`;
};

export const lab = (listKey, id) => (S[listKey]?.find(item => item.id == id) || {}).label || '—';

export const annual = sub => (cv(sub.amount, sub.currency) * 12) / CYC[sub.billingCycle];

export const addPay = (sub, payment) => {
  S.pays.push({
    id: S.id++,
    subId: sub.id,
    date: payment.date,
    amount: sub.amount,
    cur: sub.currency,
    from: payment.from,
    to: payment.to,
    status: 'succeeded',
    notes: payment.notes || ''
  });
};

export const genPays = sub => {
  S.pays = S.pays.filter(p => p.subId !== sub.id);
  let currentDate = sub.startDate;
  let iterations = 0;
  const endDate = sub.lastBillingDate || today();

  while (currentDate <= endDate && iterations++ < 600) {
    const toDate = add(currentDate, sub.billingCycle, 1, CYC);
    addPay(sub, { date: currentDate, from: currentDate, to: toDate, notes: 'Auto-generated' });
    currentDate = toDate;
  }
};

export const renew = (sub, kind) => {
  const t = today();
  const payDate = kind === 'auto' ? sub.nextBillingDate : t;
  const baseDate = kind === 'manual' && sub.nextBillingDate < t ? t : sub.nextBillingDate;
  const nextDate = add(baseDate, sub.billingCycle, 1, CYC);

  addPay(sub, {
    date: payDate,
    from: sub.nextBillingDate,
    to: nextDate,
    notes: `${kind === 'auto' ? 'Auto' : 'Manual'} renewal`
  });

  sub.lastBillingDate = payDate;
  sub.nextBillingDate = nextDate;
  sub.status = 'active';
};

export const processDue = () => {
  const t = today();
  let count = 0;

  S.subs.forEach(sub => {
    if (sub.status !== 'active') return;

    if (sub.renewalType === 'auto') {
      while (sub.nextBillingDate <= t && count < 999) {
        renew(sub, 'auto');
        count++;
      }
    } else if (sub.nextBillingDate < t) {
      sub.status = 'cancelled';
      count++;
    }
  });

  if (count > 0) save();
  return count;
};

export const okPays = () => S.pays.filter(p => p.status === 'succeeded');

export const sumP = filterFn =>
  okPays()
    .filter(p => filterFn(p.date))
    .reduce((sum, p) => sum + cv(p.amount, p.cur), 0);

export const applyTheme = () => {
  const theme = S.cfg?.theme || 'dark';
  const isDark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
};

const USERS_KEY = 'rb-users';

export const getUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || { admin: 'admin' };
  } catch {
    return { admin: 'admin' };
  }
};

export const saveUsers = users => {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {}
};