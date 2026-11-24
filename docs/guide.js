(() => {
  'use strict';
  const checks = [...document.querySelectorAll('input[data-step]')];
  const panel = document.getElementById('progress-panel');
  const count = document.getElementById('progress-count');
  const progress = document.getElementById('progress-bar');
  const reset = document.getElementById('reset-progress');
  const storageNote = document.getElementById('storage-note');
  const storageKey = 'lulu-rebuild-progress-v1';

  if (location.protocol === 'file:') {
    for (const link of document.querySelectorAll('a[data-local]')) {
      link.href = link.dataset.local;
    }
  }

  let saved = [];
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(value)) saved = value;
  } catch {
    storageNote.hidden = false;
  }
  for (const check of checks) {
    check.checked = saved.includes(check.dataset.step);
    check.addEventListener('change', () => update(true));
  }
  reset.addEventListener('click', () => {
    for (const check of checks) check.checked = false;
    update(true);
  });

  progress.max = checks.length;
  update(false);
  panel.hidden = false;

  function update(persist) {
    const completed = checks.filter(check => check.checked).map(check => check.dataset.step);
    count.textContent = `${completed.length} / ${checks.length}`;
    progress.value = completed.length;
    reset.disabled = completed.length === 0;
    if (!persist) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(completed));
      storageNote.hidden = true;
    } catch {
      storageNote.hidden = false;
    }
  }
})();
