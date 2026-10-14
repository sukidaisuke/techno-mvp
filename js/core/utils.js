'use strict';

export const $ = (selector, root = document) => root.querySelector(selector); export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export const esc = str =>
  String(str ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

export const D = dateStr => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const F = dateObj =>
  `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

export const today = () => F(new Date());

export const days = dateStr => Math.round((D(dateStr) - D(today())) / 864e5);

export const add = (dateStr, cycle, count = 1, CYC) => {
  const d = D(dateStr);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + CYC[cycle] * count);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return F(d);
};

export const nextFrom = (startStr, cycle, CYC) => {
  let nextDate = startStr;
  let iterations = 0;
  while (nextDate <= today() && iterations++ < 600) {
    nextDate = add(nextDate, cycle, 1, CYC);
  }
  return nextDate;
};

export const toast = message => {
  const t = $('#toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
};

export const fill = (selectEl, options, selectedValue) => {
  selectEl.innerHTML = options
    .map(opt => `<option value="${esc(opt.id ?? opt)}">${esc(opt.label ?? opt)}</option>`)
    .join('');
  if (selectedValue != null) selectEl.value = selectedValue;
};

export const dl = (filename, data) => {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 500);
};

export const row = (label, rightValue, subtext) =>
  `<li><span><b>${label}</b><br><small>${subtext || ''}</small></span><span>${rightValue}</span></li>`;