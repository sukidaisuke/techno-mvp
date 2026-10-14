'use strict';

import { $,$$, esc, today, days, add, nextFrom, fill, toast, dl } from '../core/utils.js';
import { S, CY, CYC, save, genPays, renew, mu, lab } from '../core/store.js';

const Q = { q: '', st: 'all', cat: '', cyc: '', asc: true };
let E = null;
let touched = false;

export const renderSubscriptions = () => {
  fill($('#fc'), [{ id: '', label: 'All categories' }, ...S.cats], Q.cat);

  const filteredSubs = S.subs
    .filter(s => {
      const matchStatus = Q.st === 'all' || s.status === Q.st;
      const matchCategory = !Q.cat || s.categoryId == Q.cat;
      const matchCycle = !Q.cyc || s.billingCycle === Q.cyc;
      const matchSearch = (s.name + ' ' + s.plan).toLowerCase().includes(Q.q.toLowerCase());
      return matchStatus && matchCategory && matchCycle && matchSearch;
    })
    .sort((a, b) => (a.nextBillingDate < b.nextBillingDate ? -1 : 1) * (Q.asc ? 1 : -1));

  $('#cards').innerHTML =
    filteredSubs
      .map(s => {
        const d = days(s.nextBillingDate);
        const soon = s.status === 'active' && d <= 7;
        const dueText = d < 0 ? 'overdue' : d === 0 ? 'today' : `${d}d`;

        return `
          <article class="card sub-card" data-id="${s.id}">
            <div class="sub-header">
              <div class="sub-title-group">
                <h3 class="sub-name">${esc(s.name)}</h3>
                <span class="badge ${s.status}">${s.status}</span>
              </div>
              <span class="sub-plan">${esc(s.plan || 'Standard')}</span>
            </div>

            <div class="sub-price-row">
              <div class="sub-amount">${mu(s.amount, s.currency)}</div>
              <span class="badge cyc">${s.billingCycle}</span>
            </div>

            <ul class="sub-meta">
              <li class="meta-item"><span>🏷 Category</span> <b>${esc(lab('cats', s.categoryId))}</b></li>
              <li class="meta-item"><span>📅 Next Billing</span> <b class="${soon ? 'warn' : ''}">${s.nextBillingDate} ${soon ? `<span class="badge due">${dueText}</span>` : ''}</b></li>
              <li class="meta-item"><span>💳 Payment</span> <b>${esc(lab('pms', s.paymentMethodId))}</b></li>
              <li class="meta-item"><span>🔁 Renewal</span> <b>${s.renewalType === 'auto' ? 'Automatic' : 'Manual'}</b></li>
            </ul>

            <div class="sub-actions">
              <button class="btn sm" data-act="edit">Edit</button>
              <button class="btn sm" data-act="toggle">${s.status === 'active' ? 'Cancel' : 'Activate'}</button>
              ${s.renewalType === 'manual' && s.status === 'active' ? '<button class="btn sm" data-act="renew">Renew now</button>' : ''}
              <button class="btn sm danger" data-act="del">Delete</button>
            </div>
          </article>
        `;
      })
      .join('') || '<div class="empty-box full-width">No subscriptions found.</div>';
};

export const initSubscriptionsEvents = () => {
  $('#add').onclick = () => openForm(null);
  $('#q').oninput = e => { Q.q = e.target.value; renderSubscriptions(); };
  $('#fc').onchange = e => { Q.cat = e.target.value; renderSubscriptions(); };
  $('#fy').onchange = e => { Q.cyc = e.target.value; renderSubscriptions(); };

  $('#sort').onclick = e => {
    Q.asc = !Q.asc;
    e.target.textContent = `Next billing ${Q.asc ? '↑' : '↓'}`;
    renderSubscriptions();
  };

  $('#st').onclick = e => { const btn = e.target.closest('button'); if (!btn) return; const status = btn.dataset.s; if (!status) return; Q.st = status; $$('#st button').forEach(b => b.classList.toggle('active', b.dataset.s === status));
    renderSubscriptions();
  };

  $('#cards').onclick = e => {
    const card = e.target.closest('[data-id]');
    if (!card) return;

    const id = +card.dataset.id;
    const action = e.target.closest('[data-act]')?.dataset.act;
    const sub = S.subs.find(x => x.id === id);

    if (!action) return openDet(id);

    if (action === 'edit') {
      openForm(id);
    } else if (action === 'toggle') {
      sub.status = sub.status === 'active' ? 'cancelled' : 'active';
      save();
      renderSubscriptions();
      toast('Status updated');
    } else if (action === 'renew') {
      renew(sub, 'manual');
      save();
      renderSubscriptions();
      toast(`Renewed. Next payment ${sub.nextBillingDate}`);
    } else if (action === 'del' && confirm(`Delete "${sub.name}" and its payment history?`)) {
      S.subs = S.subs.filter(x => x.id !== id);
      S.pays = S.pays.filter(p => p.subId !== id);
      save();
      renderSubscriptions();
      toast('Subscription deleted');
    }
  };

  $('#exp').onclick = () => dl(`subscriptions-${today()}.json`, S.subs);

  $('#imp').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then(text => {
      const parsedData = JSON.parse(text);
      const items = Array.isArray(parsedData) ? parsedData : parsedData.subscriptions || parsedData.state?.subscriptions;
      if (!Array.isArray(items)) throw new Error('No subscriptions found');

      let count = 0;
      items.forEach(rawItem => {
        if (!rawItem || !rawItem.name || rawItem.amount == null) return;
        const cycle = CYC[rawItem.billingCycle] ? rawItem.billingCycle : 'monthly';
        const startDate = rawItem.startDate || today();
        const newSub = {
          id: S.id++,
          name: String(rawItem.name),
          plan: String(rawItem.plan || 'Basic'),
          categoryId: S.cats.some(c => c.id == rawItem.categoryId) ? +rawItem.categoryId : S.cats.at(-1).id,
          paymentMethodId: S.pms.some(p => p.id == rawItem.paymentMethodId) ? +rawItem.paymentMethodId : S.pms[0].id,
          amount: Math.max(0, +rawItem.amount || 0),
          currency: CY.includes(rawItem.currency) ? rawItem.currency : S.cfg.cur,
          billingCycle: cycle,
          startDate,
          nextBillingDate: rawItem.nextBillingDate || nextFrom(startDate, cycle, CYC),
          status: ['active', 'trial', 'cancelled'].includes(rawItem.status) ? rawItem.status : 'active',
          renewalType: rawItem.renewalType === 'auto' ? 'auto' : 'manual',
          website: rawItem.website || '',
          notes: rawItem.notes || ''
        };
        newSub.lastBillingDate = add(newSub.nextBillingDate, cycle, -1, CYC);
        S.subs.push(newSub);
        genPays(newSub);
        count++;
      });
      save();
      renderSubscriptions();
      toast(`${count} subscription(s) imported`);
    }).catch(err => toast('Import failed: ' + err.message)).finally(() => { e.target.value = ''; });
  };
};

const openForm = subId => {
  E = subId;
  touched = false;
  const form = $('#f');
  const sub = subId && S.subs.find(x => x.id === subId);
  const elements = form.elements;

  $('#ft').textContent = sub ? 'Edit subscription' : 'Add new subscription';
  fill(elements.categoryId, S.cats);
  fill(elements.paymentMethodId, S.pms);
  fill(elements.currency, CY);

  const initialValues = sub || {
    name: '', plan: '', categoryId: S.cats[0]?.id, paymentMethodId: S.pms[0]?.id,
    amount: '', currency: S.cfg.cur, billingCycle: 'monthly', status: 'active',
    startDate: today(), nextBillingDate: nextFrom(today(), 'monthly', CYC), renewalType: 'manual', website: '', notes: ''
  };

  Object.keys(initialValues).forEach(key => {
    if (elements[key]) elements[key].value = initialValues[key] ?? '';
  });

  $('#dlg').showModal();
};

$('#f').addEventListener('input', e => {
  const elements = $('#f').elements;
  if (e.target.name === 'nextBillingDate') touched = true;
  if (['startDate', 'billingCycle'].includes(e.target.name) && !touched && elements.startDate.value) {
    elements.nextBillingDate.value = nextFrom(elements.startDate.value, elements.billingCycle.value, CYC);
  }
});

$('#f').onsubmit = e => {
  e.preventDefault();
  const values = Object.fromEntries(new FormData($('#f')));

  const subData = {
    name: values.name.trim(), plan: values.plan.trim(),
    categoryId: +values.categoryId, paymentMethodId: +values.paymentMethodId,
    amount: Math.max(0, +values.amount || 0), currency: values.currency, billingCycle: values.billingCycle,
    startDate: values.startDate, nextBillingDate: values.nextBillingDate || nextFrom(values.startDate, values.billingCycle, CYC),
    status: values.status, renewalType: values.renewalType, website: values.website.trim(), notes: values.notes.trim()
  };

  if (E) {
    const existingSub = S.subs.find(x => x.id === E);
    const dateOrPriceChanged = ['startDate', 'billingCycle', 'nextBillingDate', 'amount', 'currency'].some(k => existingSub[k] !== subData[k]);
    Object.assign(existingSub, subData);
    if (dateOrPriceChanged) {
      existingSub.lastBillingDate = add(subData.nextBillingDate, subData.billingCycle, -1, CYC);
      genPays(existingSub);
    }
    toast('Subscription updated');
  } else {
    const newSub = { id: S.id++, ...subData, lastBillingDate: add(subData.nextBillingDate, subData.billingCycle, -1, CYC) };
    S.subs.push(newSub);
    genPays(newSub);
    toast('Subscription added');
  }

  save();
  $('#dlg').close();
  renderSubscriptions();
};

const openDet = subId => {
  const sub = S.subs.find(x => x.id === subId);
  if (!sub) return;

  const payments = S.pays.filter(p => p.subId === subId).sort((a, b) => b.date.localeCompare(a.date));
  const detModal = $('#det');
  detModal.dataset.id = subId;

  detModal.innerHTML = `
    <div class="dh">
      <h3>${esc(sub.name)} <span class="badge ${sub.status}">${sub.status}</span></h3>
      <button class="btn ghost" data-x>✕</button>
    </div>
    <dl>
      <dt>Plan</dt><dd>${esc(sub.plan)}</dd>
      <dt>Amount</dt><dd>${mu(sub.amount, sub.currency)} / ${sub.billingCycle}</dd>
      <dt>Category</dt><dd>${esc(lab('cats', sub.categoryId))}</dd>
      <dt>Payment method</dt><dd>${esc(lab('pms', sub.paymentMethodId))}</dd>
      <dt>Renewal</dt><dd>${sub.renewalType === 'auto' ? 'Automatic' : 'Manual'}</dd>
      <dt>Start date</dt><dd>${sub.startDate}</dd>
      <dt>Last payment</dt><dd>${sub.lastBillingDate || '—'}</dd>
      <dt>Next payment</dt><dd>${sub.nextBillingDate}</dd>
      ${sub.website ? `<dt>Website</dt><dd><a href="${esc(sub.website)}" target="_blank" rel="noopener">${esc(sub.website)}</a></dd>` : ''}
      ${sub.notes ? `<dt>Notes</dt><dd>${esc(sub.notes)}</dd>` : ''}
    </dl>
    <div class="bar">
      <h4>Payment history (${payments.length})</h4>
      <button class="btn sm" data-act="addpay">+ Add payment</button>
    </div>
    <ul class="list">
      ${
        payments
          .map(p => `
            <li>
              <span>${p.date}<br><small>${p.from} →${p.to}</small></span>
              <span>${mu(p.amount, p.cur)} <button class="btn ghost sm danger" data-act="delpay" data-pid="${p.id}">Delete</button></span>
            </li>
          `)
          .join('') || '<li class="muted">No payments recorded</li>'
      }
    </ul>
  `;

  detModal.showModal();
};

$('#dlg').onclick = e => {
  if (e.target.dataset.x !== undefined || e.target === $('#dlg')) $('#dlg').close();
};

$('#det').onclick = e => {
  const detModal = $('#det');
  const id = +detModal.dataset.id;
  const action = e.target.dataset.act;

  if (e.target.dataset.x !== undefined || e.target === detModal) return detModal.close();

  const sub = S.subs.find(x => x.id === id);

  if (action === 'delpay' && confirm('Delete this payment record?')) {
    S.pays = S.pays.filter(p => p.id != e.target.dataset.pid);
    save();
    openDet(id);
  }

  if (action === 'addpay') {
    const payDate = prompt('Payment date (YYYY-MM-DD)', today());
    if (!payDate || !/^\d{4}-\d{2}-\d{2}$/.test(payDate)) return;
    const amountVal = parseFloat(prompt('Amount', sub.amount));
    if (!(amountVal >= 0)) return;

    S.pays.push({
      id: S.id++, subId: id, date: payDate, amount: amountVal, cur: sub.currency,
      from: payDate, to: add(payDate, sub.billingCycle, 1, CYC), status: 'succeeded', notes: 'Manual entry'
    });

    save();
    openDet(id);
  }
};