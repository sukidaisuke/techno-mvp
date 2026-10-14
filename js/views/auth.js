'use strict';

import { $, toast } from '../core/utils.js';
import { getUsers, saveUsers } from '../core/store.js';

export const initAuth = (onSuccess) => {
  const switchAuthMode = mode => {
    const isSignin = mode === 'signin';
    $('#tabSignin')?.classList.toggle('active', isSignin);
    $('#tabSignup')?.classList.toggle('active', !isSignin);
    $('#loginForm').hidden = !isSignin;
    $('#signupForm').hidden = isSignin;
    $('#demoBadge').hidden = !isSignin;
    $('#loginErr').hidden = true;
    $('#signupErr').hidden = true;
  };

  $('#tabSignin')?.addEventListener('click', () => switchAuthMode('signin'));
  $('#tabSignup')?.addEventListener('click', () => switchAuthMode('signup'));

  $('#linkToSignup')?.addEventListener('click', e => { e.preventDefault(); switchAuthMode('signup'); });
  $('#linkToSignin')?.addEventListener('click', e => { e.preventDefault(); switchAuthMode('signin'); });

  const bindPwToggle = (btnId, inputId, eyeId) => {
    $(btnId)?.addEventListener('click', () => {
      const input = $(inputId);
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      $(eyeId).innerHTML = isPw
        ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
        : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    });
  };

  bindPwToggle('#pwToggle', '#passwordInput', '#eyeIcon');
  bindPwToggle('#regPwToggle', '#regPasswordInput', '#regEyeIcon');

  $('#demoBadge')?.addEventListener('click', () => {
    const el = $('#loginForm').elements;
    el.u.value = 'admin';
    el.p.value = 'admin';
    toast('Credentials auto-filled');
  });

  $('#loginForm').onsubmit = e => {
    e.preventDefault();
    const el = e.target.elements;
    const username = el.u.value.trim();
    const password = el.p.value;
    const users = getUsers();

    if (users[username] && users[username] === password) {
      sessionStorage.setItem('rb-auth', username);
      el.p.value = '';
      $('#loginErr').hidden = true;
      onSuccess();
    } else {
      $('#loginErrMsg').textContent = 'Invalid username or password';
      $('#loginErr').hidden = false;
    }
  };

  $('#signupForm').onsubmit = e => {
    e.preventDefault();
    const el = e.target.elements;
    const username = el.regUser.value.trim();
    const password = el.regPass.value;
    const confirmPassword = el.regConfirmPass.value;
    const users = getUsers();

    if (users[username]) {
      $('#signupErrMsg').textContent = 'Username is already taken';
      $('#signupErr').hidden = false;
      return;
    }

    if (password !== confirmPassword) {
      $('#signupErrMsg').textContent = 'Passwords do not match';
      $('#signupErr').hidden = false;
      return;
    }

    users[username] = password;
    saveUsers(users);

    sessionStorage.setItem('rb-auth', username);
    $('#signupErr').hidden = true;
    toast('Account created successfully!');
    onSuccess();
  };
};