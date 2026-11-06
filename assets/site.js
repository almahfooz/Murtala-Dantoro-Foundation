'use strict';

document.documentElement.classList.add('js-enabled');

function setupMenu() {
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.getElementById('site-nav');
  if (!menu || !navigation) return;

  function setOpen(open, restoreFocus = false) {
    navigation.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (restoreFocus) menu.focus();
  }

  menu.addEventListener('click', () => setOpen(menu.getAttribute('aria-expanded') === 'false'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigation.classList.contains('is-open')) setOpen(false, true);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.nav-bar') && navigation.classList.contains('is-open')) setOpen(false);
  });
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
  const largeScreen = window.matchMedia('(min-width: 901px)');
  largeScreen.addEventListener('change', event => { if (event.matches) setOpen(false); });
}

function setupHero() {
  const photo = document.getElementById('hero-photo');
  if (!photo) return;
  const slides = Array.from(document.querySelectorAll('#hero-slides li'), item => item.dataset);
  const place = document.getElementById('hero-place');
  const title = document.getElementById('hero-caption');
  const number = document.getElementById('slide-current');
  let current = 0;
  function show(step) {
    current = (current + step + slides.length) % slides.length;
    const slide = slides[current];
    photo.src = slide.image;
    photo.alt = slide.alt;
    place.textContent = slide.location;
    title.textContent = slide.title;
    number.textContent = String(current + 1).padStart(2, '0');
  }
  document.querySelectorAll('[data-slide-step]').forEach(button => {
    button.addEventListener('click', () => show(Number(button.dataset.slideStep)));
  });
}

function setupGallery() {
  const gallery = document.querySelector('.field-grid');
  if (!gallery) return;
  const items = Array.from(gallery.querySelectorAll('.gallery-item'));
  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const count = document.getElementById('gallery-count');
  const dialog = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-image');
  const title = document.getElementById('lightbox-title');
  const position = document.getElementById('lightbox-count');
  const closeButton = document.getElementById('lightbox-close');
  const arrows = Array.from(document.querySelectorAll('[data-light-step]'));
  let current = 0;
  let visible = [];
  let opener;

  function applyFilter(filter, updateAddress) {
    if (!filters.some(button => button.dataset.filter === filter)) filter = 'All';
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    items.forEach(item => { item.hidden = filter !== 'All' && item.dataset.category !== filter; });
    visible = items.filter(item => !item.hidden).map(item => item.querySelector('a'));
    count.textContent = visible.length + (visible.length === 1 ? ' photograph' : ' photographs');
    if (updateAddress && location.protocol !== 'file:') {
      const url = new URL(location.href);
      if (filter === 'All') url.searchParams.delete('filter');
      else url.searchParams.set('filter', filter);
      history.replaceState(null, '', url);
    }
  }

  filters.forEach(button => button.addEventListener('click', () => applyFilter(button.dataset.filter, true)));
  applyFilter(new URLSearchParams(location.search).get('filter') || 'All', false);
  window.addEventListener('popstate', () => applyFilter(new URLSearchParams(location.search).get('filter') || 'All', false));
  if (!dialog || typeof dialog.showModal !== 'function') return;

  function show(index) {
    current = (index + visible.length) % visible.length;
    const link = visible[current];
    img.src = link.href;
    img.alt = link.dataset.alt;
    title.textContent = link.dataset.caption;
    position.textContent = 'Photograph ' + (current + 1) + ' of ' + visible.length;
    arrows.forEach(button => { button.disabled = visible.length < 2; });
  }

  gallery.addEventListener('click', event => {
    const link = event.target.closest('.gallery-open');
    if (!link || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    opener = link;
    show(visible.indexOf(link));
    dialog.showModal();
    document.body.classList.add('dialog-open');
    closeButton.focus();
  });
  arrows.forEach(button => {
    button.addEventListener('click', () => show(current + Number(button.dataset.lightStep)));
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (opener) opener.focus({preventScroll: true});
  });
}

function setupCopy() {
  const status = document.getElementById('copy-status');
  if (!status) return;
  const buttons = Array.from(document.querySelectorAll('[data-copy]'));
  buttons.forEach(button => {
    button.addEventListener('click', async () => {
      const value = button.dataset.copy;
      function copyUsingSelection() {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(button.parentElement.querySelector('strong'));
        selection.removeAllRanges();
        selection.addRange(range);
        const success = document.execCommand('copy');
        if (success) selection.removeAllRanges();
        return success;
      }
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(value);
      } catch {
        let copied = false;
        try { copied = copyUsingSelection(); } catch { /* Manual selection remains available. */ }
        if (!copied) {
          button.querySelector('span').textContent = 'Select number';
          status.textContent = 'Select the account number and use your device’s copy command.';
          return;
        }
      }
      buttons.forEach(other => { other.querySelector('span').textContent = other === button ? 'Copied' : 'Copy'; });
      status.textContent = 'Account number ending in ' + value.slice(-4) + ' copied.';
    });
  });
}

function setupContact() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const subject = document.getElementById('contact-subject');
  const submitButton = document.getElementById('contact-submit');
  const status = document.getElementById('form-status');
  const emailLink = document.getElementById('email-instead');
  const topic = new URLSearchParams(location.search).get('topic');
  if (topic && Array.from(subject.options).some(option => option.value === topic)) subject.value = topic;

  function updateEmailDraft() {
    const fields = new FormData(form);
    const body = String(fields.get('message') || '') + '\n\n' + String(fields.get('name') || '') + '\n' + String(fields.get('email') || '');
    emailLink.href = 'mailto:info@murtaladantorofoundation.org.ng?subject='
      + encodeURIComponent(fields.get('subject') || 'Foundation enquiry') + '&body=' + encodeURIComponent(body.trim());
  }
  updateEmailDraft();
  form.addEventListener('input', updateEmailDraft);
  form.addEventListener('change', updateEmailDraft);
  emailLink.addEventListener('click', updateEmailDraft);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitButton.disabled || !form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    if (data.botcheck) return;
    status.dataset.state = 'pending';
    status.textContent = 'Sending your enquiry…';
    submitButton.disabled = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(form.action, {
        method: 'POST', headers: {'Content-Type':'application/json', Accept:'application/json'},
        body: JSON.stringify(data), signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error('Delivery unconfirmed');
      status.dataset.state = 'success';
      status.textContent = 'Thank you. Your enquiry has been submitted to the foundation.';
      form.reset();
      updateEmailDraft();
    } catch {
      status.dataset.state = 'error';
      status.textContent = 'Delivery could not be confirmed. Your message is still here. Use “Email us directly” below to send it from your email app.';
      updateEmailDraft();
    } finally {
      clearTimeout(timeout);
      submitButton.disabled = false;
    }
  });
}

setupMenu();
setupHero();
setupGallery();
setupCopy();
setupContact();
