(() => {
  'use strict';
  const DAY = 86400000;
  const RETRY = 'oh wow! That was cool and almost correct, try again this ones';
  const normalize = (value) => String(value).normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  function pool(items) {
    const ids = new Set(), images = new Set();
    return (Array.isArray(items) ? items : []).filter((p) => {
      if (!p || p.enabled !== true || !p.id || !p.image || !p.prompt ||
          !Array.isArray(p.answers) || !p.answers.length ||
          !p.answers.every((a) => typeof a === 'string' && a.trim()) ||
          !['text', 'position'].includes(p.mode) || ids.has(p.id) || images.has(p.image)) return false;
      ids.add(p.id); images.add(p.image); return true;
    });
  }
  function schedule(items, epoch, now) {
    const count = items.length;
    if (!count || !Number.isFinite(epoch) || !Number.isFinite(now)) return null;
    const frequency = count >= 90 ? 3 : count >= 60 ? 2 : 1;
    const period = DAY / frequency;
    const slot = Math.max(0, Math.floor((now - epoch) / period));
    return { puzzle: items[slot % count], frequency, slot,
      start: epoch + slot * period, next: epoch + (slot + 1) * period };
  }
  function matches(puzzle, value) {
    if (!String(value).trim()) return false;
    if (puzzle.mode === 'position') {
      const numbers = String(value).match(/[+-]?\d+/g);
      return !!numbers && numbers.length === 2 &&
        puzzle.answers.includes(numbers.map((n) => String(Number(n))).join(','));
    }
    const answer = normalize(value);
    return !!answer && puzzle.answers.some((expected) => normalize(expected) === answer);
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { pool, schedule, matches, RETRY };
  if (typeof document === 'undefined') return;
  const root = document.getElementById('eh-puzzle'), data = document.getElementById('ep-data');
  if (!root || !data) return;
  let config;
  try { config = JSON.parse(data.textContent); } catch (_) { return; }
  const items = pool(config.items), epoch = Date.parse(config.epoch);
  if (!items.length || !Number.isFinite(epoch)) return;
  const get = (id) => document.getElementById('ep-' + id);
  const form = get('form'), input = get('answer'), feedback = get('feedback');
  const memory = Object.create(null);
  let current = null, key = '', state = { attempts: 0, solved: false }, timer;
  function load(storageKey) {
    let value = memory[storageKey];
    try { value = JSON.parse(localStorage.getItem(storageKey)) || value; } catch (_) { /* optional storage */ }
    return { attempts: Number.isSafeInteger(value?.attempts) && value.attempts >= 0
      ? Math.min(value.attempts, 100000) : 0, solved: value?.solved === true };
  }
  function save() {
    memory[key] = { ...state };
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) { /* in-memory fallback */ }
  }
  function showState() {
    input.disabled = state.solved;
    get('submit').disabled = state.solved;
    get('explanation').hidden = !state.solved;
    get('explanation').textContent = state.solved ? current.puzzle.explanation : '';
    get('attempts').textContent = state.attempts
      ? `${state.solved ? 'Solved in' : 'Attempts:'} ${state.attempts}${state.solved ? (state.attempts === 1 ? ' try.' : ' tries.') : ''}` : '';
    if (state.solved) {
      feedback.textContent = 'Congratulations! ';
      // Draw the flower so it also renders on devices without emoji fonts.
      const ns = 'http://www.w3.org/2000/svg';
      const flower = document.createElementNS(ns, 'svg');
      flower.setAttribute('viewBox', '0 0 24 24');
      flower.setAttribute('class', 'ep-flower');
      flower.setAttribute('aria-hidden', 'true');
      for (const angle of [0, 72, 144, 216, 288]) {
        const petal = document.createElementNS(ns, 'circle');
        for (const [attribute, value] of Object.entries({ cx: 12, cy: 5.5, r: 4.5,
          fill: '#f3a5c1', transform: `rotate(${angle} 12 12)` })) petal.setAttribute(attribute, value);
        flower.appendChild(petal);
      }
      const centre = document.createElementNS(ns, 'circle');
      for (const [attribute, value] of Object.entries({ cx: 12, cy: 12, r: 3.8, fill: '#f3c64e' })) centre.setAttribute(attribute, value);
      flower.appendChild(centre);
      feedback.appendChild(flower);
      feedback.dataset.state = 'correct';
    }
  }
  function render() {
    current = schedule(items, epoch, Date.now());
    const nextKey = `ev-puzzle:v1:${current.puzzle.id}:${current.start}`;
    if (nextKey !== key) {
      key = nextKey;
      state = load(key);
      const p = current.puzzle;
      get('image').src = p.image;
      get('image').alt = p.alt;
      get('image').width = p.width; get('image').height = p.height;
      get('zoom').href = p.image;
      get('large').src = p.image; get('large').alt = p.alt;
      get('question').textContent = p.prompt;
      get('help').textContent = p.help;
      input.placeholder = p.placeholder;
      input.value = '';
      input.setAttribute('aria-invalid', 'false');
      feedback.textContent = ''; delete feedback.dataset.state;
      showState();
    }
    get('schedule').textContent = current.frequency === 1 ? 'A fresh puzzle every 24 hours.'
      : current.frequency === 2 ? 'A fresh puzzle every 12 hours.' : 'A fresh puzzle every 8 hours.';
    const date = new Date(current.next);
    const time = document.createElement('time');
    time.dateTime = date.toISOString();
    time.textContent = date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
    get('next').replaceChildren('Next puzzle: ', time, ' · time shown for your device.');
    clearTimeout(timer);
    timer = setTimeout(render, Math.max(100, Math.min(current.next - Date.now() + 30, 60000)));
  }
  form.hidden = false;
  render();
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const previous = key;
    render();
    if (previous !== key) {
      feedback.textContent = 'A new puzzle has arrived. Try the one above.';
      input.focus(); return;
    }
    if (state.solved) return;
    if (!input.value.trim()) {
      feedback.textContent = 'Enter an answer first.';
      input.focus(); return;
    }
    state.attempts += 1;
    state.solved = matches(current.puzzle, input.value);
    save();
    if (!state.solved) {
      feedback.textContent = RETRY;
      feedback.dataset.state = 'retry';
      input.setAttribute('aria-invalid', 'true');
      input.focus(); input.select();
    } else input.setAttribute('aria-invalid', 'false');
    showState();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  window.addEventListener('pageshow', render);
  window.addEventListener('storage', (event) => {
    if (event.key === key) { state = load(key); showState(); }
  });
  const dialog = get('dialog');
  get('zoom').addEventListener('click', (event) => {
    if (typeof dialog.showModal !== 'function') return;
    event.preventDefault(); dialog.showModal();
  });
  get('close').addEventListener('click', () => dialog.close());
})();
