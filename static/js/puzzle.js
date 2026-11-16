(() => {
  'use strict';
  const DAY = 86400000;
  const PROGRESS_KEY = 'ev-puzzle:progress:v1';
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
  // A UTC calendar day matches the shared puzzle schedule, including 12/8-hour tiers.
  // Browser-local progress is convenience tracking, not secure contest validation.
  function trackProgress(value, now, correct = false) {
    const today = Math.floor(now / DAY);
    if (!Number.isSafeInteger(today) || today < 0) return null;
    const raw = value && typeof value === 'object' ? value : {};
    const integer = (n) => Number.isSafeInteger(n) && n >= 0;
    const progress = {
      version: 1,
      visits: integer(raw.visits) ? Math.min(raw.visits, 1000000) : 0,
      lastVisitDay: integer(raw.lastVisitDay) ? raw.lastVisitDay : null,
      streak: integer(raw.streak) ? Math.min(raw.streak, 1000000) : 0,
      lastCorrectDay: integer(raw.lastCorrectDay) ? raw.lastCorrectDay : null,
      earned: raw.earned === true
    };
    if (progress.lastCorrectDay === null || today - progress.lastCorrectDay > 1) progress.streak = 0;
    if (progress.lastVisitDay === null || today > progress.lastVisitDay) {
      progress.visits += 1;
      progress.lastVisitDay = today;
    }
    if (correct && (progress.lastCorrectDay === null || today > progress.lastCorrectDay)) {
      progress.streak = today - progress.lastCorrectDay === 1 && progress.lastCorrectDay !== null
        ? progress.streak + 1 : 1;
      progress.lastCorrectDay = today;
      if (progress.streak >= 5) progress.earned = true;
    }
    return progress;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { pool, schedule, matches, trackProgress, RETRY };
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
  let progressMemory = null, storageAvailable = true;
  let current = null, key = '', state = { attempts: 0, solved: false }, timer;
  function updateProgress(correct = false) {
    if (document.hidden && !correct) return;
    let saved = progressMemory;
    try { saved = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || saved; }
    catch (_) { storageAvailable = false; }
    const progress = trackProgress(saved, Date.now(), correct);
    progressMemory = progress;
    try {
      const serialized = JSON.stringify(progress);
      if (localStorage.getItem(PROGRESS_KEY) !== serialized) localStorage.setItem(PROGRESS_KEY, serialized);
      storageAvailable = true;
    } catch (_) { storageAvailable = false; }
    const text = (id, value) => { if (get(id).textContent !== value) get(id).textContent = value; };
    get('progress').hidden = false;
    text('visits', `Days visited: ${progress.visits}. Each UTC day counts once.`);
    text('streak', `Correct-answer streak: ${Math.min(progress.streak, 5)} of 5 consecutive days.${progress.streak > 5 ? ` ${progress.streak} days running!` : ''}`);
    get('meter').value = Math.min(progress.streak, 5);
    text('progress-note', storageAvailable
      ? 'Unlimited tries. Answer correctly at least once each UTC day. A missed correct-answer day resets the streak. Progress stays in this browser; clearing site data or changing devices starts fresh.'
      : 'Unlimited tries. Browser storage is unavailable, so progress may be lost when you close or reload this page. Enable site storage to save your five-day streak.');
    get('claim').hidden = !progress.earned;
    get('reward-link').hidden = !progress.earned;
  }
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
      feedback.textContent = "Oh wow! Congratulations, you are truly a smart EV Owner, comeback tomorrow for a little tougher one, let's see if you can get that one too ";
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
      const reward = document.createElement('span');
      reward.className = 'ep-reward';
      const label = document.createElement('strong');
      label.textContent = 'Good news: ';
      reward.append(label, 'Only for smart EV owners, you will earn The 3 EV Insurance Mistakes guide for $0 if you answer our puzzles correctly for 5 consecutive days.');
      feedback.appendChild(reward);
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
    updateProgress(state.solved);
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
    updateProgress(state.solved);
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
    if (event.key === PROGRESS_KEY || event.key === key || event.key === null) {
      if (event.key === null || (event.key === PROGRESS_KEY && event.newValue === null)) progressMemory = null;
      updateProgress();
    }
  });
  const dialog = get('dialog');
  get('zoom').addEventListener('click', (event) => {
    if (typeof dialog.showModal !== 'function') return;
    event.preventDefault(); dialog.showModal();
  });
  get('close').addEventListener('click', () => dialog.close());
})();
