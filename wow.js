/* WOW LAYER: themed boot sequence, entrance choreography, tilt photo, command palette, cinematic guided tour.
   Purely additive. If anything here throws, the workbook underneath keeps working. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const root = document.documentElement;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const safe = (fn) => (...a) => { try { return fn(...a); } catch (e) { console.warn('[wow]', e); } };

  const PBY = Object.fromEntries(PILLARS.map((p) => [p.id, p]));

  /* ───────── Reveal choreography ───────── */
  const reveal = safe((sheet) => {
    if (reduce || !sheet) return;
    $$('.obj, .kpi, .ticker', sheet).forEach((e, i) => {
      e.style.setProperty('--d', `${Math.min(i, 14) * 70}ms`);
      e.classList.remove('rv'); void e.offsetWidth; e.classList.add('rv');
      setTimeout(() => e.classList.remove('rv'), 1900);
    });
  });
  const enterHooks = {};
  $$('.sheet').forEach((sh) => new MutationObserver(() => { if (!sh.hidden) { reveal(sh); enterHooks[sh.dataset.sheet] && enterHooks[sh.dataset.sheet](sh); } }).observe(sh, { attributes: true, attributeFilter: ['hidden'] }));
  const countUp = (scope) => {
    if (reduce || !scope) return;
    $$('b[data-val]', scope).forEach((b) => {
      const v = +b.dataset.val, pre = b.dataset.pre || '', suf = b.dataset.suf || '', t0 = performance.now();
      const tick = (t) => { const p = Math.min(1, (t - t0) / 1100); b.textContent = `${pre}${Math.round(v * (1 - Math.pow(1 - p, 3)))}${suf}`; if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  };

  /* ───────── Hero: split name, tilting photo ───────── */
  const heroInit = safe(() => {
    const h2 = $('.hero-text h2');
    if (h2 && !h2.classList.contains('split')) {
      const txt = h2.textContent; h2.setAttribute('aria-label', txt); h2.textContent = '';
      [...txt].forEach((c, i) => { const s = document.createElement('span'); s.className = 'ch' + (c === ' ' ? ' sp' : ''); s.setAttribute('aria-hidden', 'true'); s.style.setProperty('--i', i); s.textContent = c === ' ' ? ' ' : c; h2.appendChild(s); });
      h2.classList.add('split');
      if (reduce) h2.classList.add('in');
    }
    const frame = $('.photo-frame');
    if (frame && !$('.glare', frame)) {
      frame.insertAdjacentHTML('beforeend', '<span class="glare"></span>');
      const hero = $('.hero');
      if (fine && !reduce) {
        hero.addEventListener('pointermove', (e) => {
          const r = frame.getBoundingClientRect();
          const x = (e.clientX - (r.left + r.width / 2)) / (r.width * 1.4), y = (e.clientY - (r.top + r.height / 2)) / (r.height * 1.4);
          const cl = (v) => clamp(v, -.5, .5);
          frame.style.transform = `perspective(700px) rotateY(${cl(x) * 18}deg) rotateX(${-cl(y) * 18}deg) scale(1.03)`;
          frame.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`); frame.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`);
        });
        hero.addEventListener('pointerleave', () => { frame.style.transform = ''; });
      }
      let clicks = 0, ct;
      frame.addEventListener('click', () => { clicks++; clearTimeout(ct); ct = setTimeout(() => { clicks = 0; }, 600); if (clicks >= 3) { clicks = 0; confetti(); } });
    }
  });
  const playHero = () => { const h2 = $('.hero-text h2.split'); if (h2) requestAnimationFrame(() => requestAnimationFrame(() => h2.classList.add('in'))); };

  /* ───────── Skill ticker ───────── */
  const tickerInit = safe(() => {
    if ($('.ticker') || typeof SKILLS === 'undefined') return;
    const names = SKILLS.filter((c) => c.cat !== 'Soft Skills').flatMap((c) => c.items);
    const set = names.map((n) => `<span>${n.replace(/&/g, '&amp;')}</span>`).join('');
    const t = document.createElement('div');
    t.className = 'ticker'; t.setAttribute('aria-hidden', 'true');
    t.innerHTML = `<div class="ticker-track">${set}${set}</div>`;
    $('#kpis').before(t);
  });

  /* ───────── Confetti (spreadsheet cells) ───────── */
  function confetti() {
    if (reduce) return;
    const cv = document.createElement('canvas'); cv.id = 'tcv'; document.body.appendChild(cv);
    const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = ['#107c41', '#3ccf7e', '#2563eb', '#c2410c', '#f5c542', '#ffffff'];
    const P = Array.from({ length: 170 }, () => ({ x: W / 2 + (Math.random() - .5) * 180, y: H * .62, vx: (Math.random() - .5) * 15, vy: -Math.random() * 17 - 6, w: 10 + Math.random() * 14, h: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - .5) * .35, c: cols[(Math.random() * cols.length) | 0] }));
    const t0 = performance.now();
    (function step(now) {
      const t = now - t0; ctx.clearRect(0, 0, W, H);
      P.forEach((p) => { p.vy += .42; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t / 3200); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
      if (t < 3300) requestAnimationFrame(step); else cv.remove();
    })(t0);
  }
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']; let kp = 0;
  document.addEventListener('keydown', (e) => { kp = e.key === KONAMI[kp] ? kp + 1 : (e.key === KONAMI[0] ? 1 : 0); if (kp === KONAMI.length) { kp = 0; confetti(); } });

  /* ───────── Navigation helpers ───────── */
  const go = (id) => { const t = $(`.tab[data-id="${id}"]`); if (t) t.click(); };
  const askData = (q) => {
    go('sql');
    setTimeout(() => { const i = $('#askInput'); if (!i) return; i.value = q; $('#askForm').requestSubmit ? $('#askForm').requestSubmit() : $('#askForm').dispatchEvent(new Event('submit', { cancelable: true })); }, 80);
  };
  function toast(msg) { const s = $('.status .ready'); if (!s) return; s.textContent = msg; setTimeout(() => { s.textContent = 'Ready'; }, 1800); }

  /* ───────── Command palette (Ctrl/Cmd + K) ───────── */
  const palInit = safe(() => {
    const pal = document.createElement('div'); pal.id = 'pal'; pal.setAttribute('role', 'dialog'); pal.setAttribute('aria-modal', 'true'); pal.setAttribute('aria-label', 'Command palette');
    pal.innerHTML = `<div class="pal-card"><div class="pal-in"><span class="fx">fx</span><input id="palIn" type="text" placeholder="Tell me what you want to do, or ask my data a question…" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div><div class="pal-list" id="palList" role="listbox"></div><div class="pal-ft"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> run</span><span>Type any question to query my data</span></div></div>`;
    document.body.appendChild(pal);
    const input = $('#palIn'), list = $('#palList');
    const ASK = ['What did Harsh achieve at Trivas?', 'Does he know Tableau?', 'What is his biggest achievement?', 'Which skills does he use for A/B testing?'];
    const base = [
      { g: 'Go to', ic: '▦', t: 'Summary', h: 'Alt+1', run: () => go('summary') },
      { g: 'Go to', ic: '▤', t: 'Experience', h: 'Alt+2', run: () => go('experience') },
      { g: 'Go to', ic: '◈', t: 'Skills', h: 'Alt+3', run: () => go('skills') },
      { g: 'Go to', ic: '⌘', t: 'SQL: ask my data', h: 'Alt+4', run: () => go('sql') },
      { g: 'Go to', ic: '✉', t: 'Contact', h: 'Alt+5', run: () => go('contact') },
      { g: 'Do', ic: '▶', t: 'Play the guided tour', h: '1 min', run: () => tour() },
      { g: 'Do', ic: '⬇', t: 'Download the portfolio as an Excel workbook', run: () => $('#shareBtn').click() },
      { g: 'Do', ic: '📄', t: 'Open my resume (PDF)', run: () => window.open($('#resumeBtn').href, '_blank', 'noopener') },
      { g: 'Do', ic: '☾', t: 'Switch light / dark mode', run: () => $('#themeBtn').click() },
      { g: 'Do', ic: '⧉', t: 'Copy my email address', run: () => { navigator.clipboard?.writeText(PROFILE.email); toast('Email copied'); } },
      { g: 'Do', ic: '✦', t: 'Surprise me', run: () => confetti() },
      ...ASK.map((q) => ({ g: 'Ask my data', ic: '?', t: q, run: () => askData(q) })),
    ];
    let items = [], idx = 0;
    const render = () => {
      const q = input.value.trim().toLowerCase(), toks = q.split(/\s+/).filter(Boolean);
      items = base.filter((i) => toks.every((t) => (i.g + ' ' + i.t).toLowerCase().includes(t)));
      if (q) items.push({ g: 'Ask my data', ic: '?', t: `Ask: “${input.value.trim()}”`, run: () => askData(input.value.trim()), free: true });
      idx = Math.min(idx, items.length - 1);
      let lastG = '';
      list.innerHTML = items.length ? items.map((it, n) => {
        const head = it.g !== lastG ? `<div class="pal-g">${it.g}</div>` : ''; lastG = it.g;
        return `${head}<button class="pal-it" type="button" role="option" data-n="${n}" aria-selected="${n === idx}"><span class="ic">${it.ic}</span><span>${it.t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>${it.h ? `<span class="hint">${it.h}</span>` : ''}</button>`;
      }).join('') : '<div class="pal-empty">No matches</div>';
      $('.pal-it[aria-selected="true"]', list)?.scrollIntoView({ block: 'nearest' });
    };
    const open = () => { pal.classList.add('open'); input.value = ''; idx = 0; render(); setTimeout(() => input.focus(), 10); };
    const close = () => { pal.classList.remove('open'); };
    const run = (n) => { const it = items[n]; if (!it) return; close(); setTimeout(() => it.run(), 60); };
    input.addEventListener('input', () => { idx = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(items.length - 1, idx + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(idx); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    list.addEventListener('click', (e) => { const b = e.target.closest('.pal-it'); if (b) run(+b.dataset.n); });
    list.addEventListener('pointermove', (e) => { const b = e.target.closest('.pal-it'); if (b && +b.dataset.n !== idx) { idx = +b.dataset.n; $$('.pal-it', list).forEach((x, i) => x.setAttribute('aria-selected', String(i === idx))); } });
    pal.addEventListener('mousedown', (e) => { if (e.target === pal) close(); });
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.classList.contains('open') ? close() : open(); }
      else if (e.key === '/' && !typing && !pal.classList.contains('open')) { e.preventDefault(); open(); }
    });
    window.__openPalette = open;
  });

  /* ───────── Title-bar buttons ───────── */
  const barInit = safe(() => {
    const right = $('.tb-right'); if (!right || $('#tourBtn')) return;
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    right.insertAdjacentHTML('afterbegin', `
      <button class="tbtn" id="cmdBtn" type="button" data-tip="Search anything or ask my data (${mac ? '⌘' : 'Ctrl'}+K)"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>Search</span><kbd>${mac ? '⌘' : 'Ctrl'} K</kbd></button>
      <button class="tbtn pulse" id="tourBtn" type="button" data-tip="Sit back: a guided, cinematic tour of this workbook"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg><span>Take the tour</span></button>`);
    $('#cmdBtn').addEventListener('click', () => window.__openPalette && window.__openPalette());
    $('#tourBtn').addEventListener('click', () => tour());
    setTimeout(() => $('#tourBtn')?.classList.remove('pulse'), 12000);
  });

  /* ═══════════ Cinematic guided tour ═══════════
     A virtual camera (zoom + pan on .app), spotlight, callouts and a ghost cursor drive the real site,
     while big on-screen statements say what each part proves. */
  let touring = false;
  const ghostSvg = '<svg viewBox="0 0 28 28" width="28" height="28"><path d="M4 2l17 10-7.4 1.8L10 21z" fill="#fff" stroke="#0b1f15" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  async function tour() {
    if (touring) return; touring = true;
    const app = $('.app');
    const ctl = { rej: new Set() };
    const M = innerWidth <= 760;                       // phone: no camera, scroll + spotlight instead
    const wait = (ms) => new Promise((res, rej) => { const id = setTimeout(() => { ctl.rej.delete(f); res(); }, ms * (M ? 0.68 : 0.88)); const f = () => { clearTimeout(id); rej(new Error('stop')); }; ctl.rej.add(f); });
    const halt = (e) => { if (!e.isTrusted) return; if (e.type === 'keydown' && !['Escape', ' '].includes(e.key)) return; ctl.rej.forEach((f) => f()); };
    const EVS = ['pointerdown', 'keydown', 'wheel'];
    EVS.forEach((ev) => addEventListener(ev, halt, true));
    root.classList.add('touring');

    const mk = (tagName, id, html, cls) => { const e = document.createElement(tagName); if (id) e.id = id; if (cls) e.className = cls; if (html) e.innerHTML = html; document.body.appendChild(e); return e; };
    const ghost = mk('div', 'ghost', ghostSvg), st = mk('div', 'tstate'), bars = mk('div', 'tbars', '<i></i><i></i>'), vig = mk('div', 'tvig'),
      spotEl = mk('div', 'spot'), title = mk('div', 'ttitle'), tagEl = mk('div', null, '', 'ttag');
    const TOTAL = 7; let flips = 0;
    const W = () => innerWidth, H = () => innerHeight, B = () => (M ? 0 : innerHeight * 0.03);

    /* camera: screen = translate(tx,ty) * scale(z) * app. The app always fills the space between the letterbox bars, so nothing is ever cut off. */
    const cam = { z: 1, tx: 0, ty: 0 };
    if (!M) app.classList.add('cam');
    const base = () => { const z = (H() - 2 * B()) / H(); return { z, tx: (W() - z * W()) / 2, ty: B() }; };
    const camSet = (z, tx, ty, dur = 1400) => {
      if (M) return;
      Object.assign(cam, { z, tx, ty });
      app.style.transition = `transform ${dur}ms cubic-bezier(.65,0,.25,1)`;
      app.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
    };
    const camReset = (dur = 1200) => { const b = base(); camSet(b.z, b.tx, b.ty, dur); };
    const camTo = (el, o = {}) => {
      if (!el) return;
      if (M) { const sh = el.closest('.sheet'); if (sh) { const r = el.getBoundingClientRect(), sr = sh.getBoundingClientRect(); sh.scrollTo({ top: sh.scrollTop + r.top - sr.top - 6, behavior: 'smooth' }); } return; }
      const { fit = .85, max = 1.7, dx = 0, dy = 0, dur = 1500, z } = o;
      const b = base(), r = el.getBoundingClientRect();
      const cx = (r.left + r.width / 2 - cam.tx) / cam.z, cy = (r.top + r.height / 2 - cam.ty) / cam.z, w = r.width / cam.z, h = r.height / cam.z;
      const availH = (H() - 2 * B()) * .62;               // keep the lower third free for the statement
      const zz = z != null ? z : clamp(Math.min((W() * fit) / w, (availH * fit) / h), b.z, max);
      const fx = W() / 2, fy = B() + (H() - 2 * B()) * .40;
      const txMin = zz * W() >= W() ? W() - zz * W() : (W() - zz * W()) / 2, txMax = zz * W() >= W() ? 0 : txMin;
      camSet(zz, clamp(fx - zz * cx + dx, txMin, txMax), clamp(fy - zz * cy + dy, H() - B() - zz * H(), B()), dur);
    };
    const scrollIn = async (el, band = .18) => {
      const sh = el && el.closest('.sheet'); if (!sh) return;
      const r = el.getBoundingClientRect(), s = sh.getBoundingClientRect();
      if (r.top < s.top + 10 || r.top > s.bottom - 160) { sh.scrollTo({ top: sh.scrollTop + (r.top - s.top - s.height * band) / cam.z, behavior: 'smooth' }); await wait(750); }
    };
    const scrollForce = async (el, band = .04) => {
      const sh = el && el.closest('.sheet'); if (!sh) return;
      const r = el.getBoundingClientRect(), s = sh.getBoundingClientRect();
      sh.scrollTo({ top: sh.scrollTop + (r.top - s.top - s.height * band) / cam.z, behavior: 'smooth' }); await wait(850);
    };
    const spot = (el, pad = 10) => { if (!el) return; const r = el.getBoundingClientRect(); Object.assign(spotEl.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' }); spotEl.classList.add('on'); };
    const spotOff = () => spotEl.classList.remove('on');
    const tag = (el, text, below = false) => {
      const r = el.getBoundingClientRect(); tagEl.textContent = text; tagEl.classList.toggle('below', below);
      tagEl.style.left = clamp(r.left + r.width / 2, 110, W() - 110) + 'px'; tagEl.style.top = (below ? r.bottom + 16 : r.top - 52) + 'px'; tagEl.classList.add('on');
    };
    const tagOff = () => tagEl.classList.remove('on');

    /* the big statement */
    const words = (h) => { let i = 0; return h.replace(/<em>([^<]+)<\/em>|([^\s<]+)/g, (m, e, w) => (e ? e.split(' ').map((x) => `<span class="w em" style="--i:${i++}">${x}</span>`).join(' ') : `<span class="w" style="--i:${i++}">${w}</span>`)); };
    const say = (kicker, headline, step, pid) => {
      st.classList.remove('on'); void st.offsetWidth;
      st.style.setProperty('--ph', pid ? PBY[pid].hue : 150);
      st.innerHTML = `<div class="tk"><i></i>${kicker}<span class="tdots">${Array.from({ length: TOTAL }, (_, i) => `<b class="${i < step - 1 ? 'd' : i === step - 1 ? 'c' : ''}"></b>`).join('')}</span></div><div class="th">${words(headline)}</div><small>click anywhere to stop</small>`;
      st.classList.add('on');
    };

    /* the ghost cursor */
    let gx = W() * .5, gy = H() * .6;
    const place = (x, y) => { gx = x; gy = y; ghost.style.transform = `translate(${x - 4}px, ${y - 2}px)`; };
    const ptr = async (el, fx = .5, fy = .5) => { if (!el) return; if (M) { spot(el, 5); await wait(850); spotOff(); return; } const r = el.getBoundingClientRect(); ghost.classList.add('on'); place(r.left + r.width * fx, r.top + r.height * fy); await wait(1000); };
    const click = async (el, real = true) => {
      if (M) { if (real && el) el.click(); await wait(250); return; }
      const d = document.createElement('i'); d.className = 'tripple'; d.style.left = gx + 'px'; d.style.top = gy + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 700);
      if (real && el) el.click(); await wait(250);
    };
    const type = async (input, text, ev) => { input.focus(); input.value = ''; for (const ch of text) { input.value += ch; if (ev) input.dispatchEvent(new Event('input')); await wait(42); } };
    const closeInsp = async () => { $('#inspClose')?.click(); await wait(250); };
    const topify = (...els) => els.forEach((e) => { try { e.setAttribute('popover', 'manual'); e.hidePopover?.(); e.showPopover?.(); } catch (e2) { /* old browser */ } });
    const showTitle = (k, h, p, end) => { title.className = end ? 'end' : ''; title.innerHTML = `<div class="k">${k}</div><h2>${h}</h2><p>${p}</p>`; requestAnimationFrame(() => title.classList.add('on')); };
    const hideTitle = () => title.classList.remove('on');
    const tab = (id) => $(`.tab[data-id="${id}"]`);

    place(gx, gy);
    try {
      /* ── Opening: push in on the hero, title card, pull back to reveal the workbook ── */
      go('summary'); await closeInsp(); $('.sheet:not([hidden])')?.scrollTo(0, 0); await wait(300);
      if (!M) { bars.classList.add('on'); vig.classList.add('on'); }
      camTo($('.hero'), { z: 1.9, dur: 0 });
      showTitle('A guided tour', 'Harsh Kumar', 'Analytical &nbsp;·&nbsp; Product &nbsp;·&nbsp; Data');
      await wait(3000); hideTitle(); await wait(500);
      camReset(2400); say('Overview', 'A product analyst who is <em>analytical</em>, <em>product-minded</em> and <em>data-fluent</em>.', 1); await wait(3600);

      /* ── 1 · Results ── */
      say('Results', 'Numbers you can <em>click</em> and verify.', 1);
      camTo($('#kpis'), { fit: .96, max: 1.5, dur: 1600 }); await wait(1700);
      const k = $('.kpi'); await ptr(k, .3, .4); spot(k, 8); tag(k, 'Click any number'); await wait(900); await click(k);
      tagOff(); spotOff(); say('Results', 'Every result links back to <em>the work behind it</em>.', 1);
      camTo($('#inspector'), { fit: .92, max: 1.5, dur: 1500 }); await wait(3300);
      await closeInsp(); say('Impact', 'Ranked by <em>impact</em>, not by job title.', 1); camReset(1000); await wait(1000);
      await scrollIn($('#chart'), .12); camTo($('#chart'), { fit: .92, max: 1.35, dur: 1500 }); await wait(3200);
      const g = $('.g-bar'); if (g) { await scrollIn(g, .25); camTo($('#gantt'), { fit: .92, max: 1.4, dur: 1500 }); say('Growth', 'From intern to <em>team lead</em> in under three years.', 1); await wait(3000); }

      /* ── 2 · Experience, through the three pillars ── */
      camReset(1100); say('Experience', `Three roles. <em>${BULLETS.length}</em> measurable results.`, 2); await wait(900);
      const tabE = tab('experience'); await ptr(tabE); await click(tabE); await wait(900);
      const lensBar = $('.lens'); if (lensBar) {
        camTo(lensBar, { fit: .95, max: 1.4, dur: 1500, dy: 60 }); say('Experience', 'Filter my work by <em>pillar</em>.', 2); await wait(1900);
        const scenes = [['analytical', 'Analytical', 'I design <em>A/B tests</em> that lifted conversion <em>+15%</em>.'], ['product', 'Product', 'I brief stakeholders in <em>80+</em> business reviews.'], ['data', 'Data', 'I model <em>15+</em> sources so insight arrives <em>50% faster</em>.']];
        for (const [pid, name, line] of scenes) {
          const chip = $(`.lc[data-p="${pid}"]`); await ptr(chip); await click(chip); say(name, line, 2, pid); await wait(500);
          const hit = $('#expBody tr.phit'); if (hit) { await scrollIn(hit, .2); camTo(hit, { fit: .9, max: 1.25, dur: 1400 }); }
          await wait(3000);
        }
        const all = $('.lc[data-p="all"]'); camReset(900); await wait(800); await ptr(all); await click(all); await wait(500);
      }

      /* ── 3 · Skills: the three pillars ── */
      camReset(900); await wait(600);
      say('Skills', '<em>Analytical.</em> <em>Product.</em> <em>Data.</em> All three, with proof.', 3);
      const tabS = tab('skills'); await ptr(tabS); await click(tabS); await wait(900);
      const venn = $('.venn-card'); if (venn) { camTo(venn, { fit: .9, max: 1.5, dur: 1500 }); await wait(2600); }
      const pillSay = { analytical: 'I find what is <em>true</em>.', product: 'I turn insight into <em>decisions</em>.', data: 'I make every number <em>trustworthy</em>.' };
      for (const pid of ['analytical', 'product', 'data']) {
        const t = $(`.ptabs .lc[data-p="${pid}"]`); camReset(900); await wait(700); await ptr(t); await click(t);
        const panel = $(`#skillGrid .pillar[data-p="${pid}"]`); camTo(panel, { fit: .97, max: 1.2, dur: 1400 }); say(PBY[pid].name, pillSay[pid], 3, pid); await wait(2600);
        if (pid === 'analytical') { const chip = $('.proof button', panel); await ptr(chip); tag(chip, 'Click for proof'); await wait(500); await click(chip); tagOff(); await wait(2400); await closeInsp(); }
        if (pid === 'product') { const pill = $('.pill[data-skill="Business Reviews (WBR/MBR)"]', panel); if (pill) { await ptr(pill); await click(pill); await wait(2400); await closeInsp(); } }
        if (pid === 'data') { spot(panel, 4); await wait(1800); spotOff(); }
      }
      camReset(1000); await wait(900);

      /* ── 4 · Search ── */
      say('Search', 'Find anything in <em>one keystroke</em>.', 4); ghost.classList.remove('on'); await wait(900);
      window.__openPalette && window.__openPalette(); await wait(800);
      const pin = $('#palIn');
      await type(pin, 'dark', true); await wait(1200);
      pin.value = ''; pin.dispatchEvent(new Event('input')); await type(pin, 'excel', true); await wait(1200);
      pin.value = ''; pin.dispatchEvent(new Event('input')); say('Search', '...or jump <em>straight to any sheet</em>.', 4); await type(pin, 'sql', true); await wait(1000);
      pin.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait(1200);

      /* ── 5 · SQL ── */
      say('SQL', 'Ask my data in <em>plain English</em>.', 5);
      const inp = $('#askInput'); camTo($('.obj.query'), { fit: .94, max: 1.25, dur: 1500 }); await wait(1600);
      await ptr(inp, .2); await click(inp, false); await type(inp, 'What did Harsh achieve at Trivas?'); await wait(500);
      const sb = $('#askForm button[type="submit"]'); await ptr(sb); say('SQL', 'Question, SQL, answer: <em>in milliseconds</em>.', 5); await click(sb); await wait(1800);
      camReset(900); await wait(700); await scrollForce($('.results'), .03); say('SQL', 'Every answer comes with an <em>analyst\u2019s note</em>.', 5); await wait(3000);
      const row = $('#sqlOut tbody tr');
      if (row) { await ptr(row, .3, .5); say('SQL', 'Click any row for <em>the story behind it</em>.', 5); await click(row); camTo($('#inspector'), { fit: .92, max: 1.4, dur: 1400 }); await wait(3200); await closeInsp(); camReset(900); await wait(500); }
      const pbtn = $('.pilex button[data-q*="analytical"]');
      if (pbtn) { await scrollForce($('.obj.query'), .03); await wait(300); await ptr(pbtn); say('SQL', 'Or slice it by <em>pillar</em>.', 5, 'analytical'); await click(pbtn); await wait(2200); await scrollForce($('.results'), .03); await wait(3600); }
      camReset(1000); await wait(900);

      /* ── 6 · Export + theme ── */
      say('Export', 'Take it with you: a <em>real Excel workbook</em>.', 6);
      const share = $('#shareBtn'); camTo(share, { z: 1.7, dur: 1400 }); await wait(1500);
      await ptr(share); tag(share, 'Share', true); await wait(700); await click(share); tagOff(); camReset(500); await wait(900);
      topify(ghost, st); await ptr($('#dlXlsx')); await click(null, false); await wait(2000);
      $('#shareDlg')?.close(); await wait(700);
      say('Style', 'Light or <em>dark</em>. Your call.', 6);
      const th = $('#themeBtn'); await ptr(th); tag(th, 'Light / dark', true); await wait(500);
      flips++; await click(th); tagOff(); await wait(2600); flips++; await click(th); await wait(1600);

      /* ── 7 · Contact + end card ── */
      say('Contact', 'Let’s build something <em>together</em>.', 7);
      const tabC = tab('contact'); await ptr(tabC); await click(tabC); await wait(900);
      const hl = $('.hello'); if (hl) { camTo(hl, { fit: .92, max: 1.3, dur: 1500 }); await wait(2600); }
      camTo($('#composeForm'), { fit: .9, max: 1.3, dur: 1500 }); await wait(2200);
      ghost.classList.remove('on'); st.classList.remove('on'); bars.classList.remove('on'); vig.classList.remove('on'); camSet(1, 0, 0, 1400);
      showTitle('Thanks for watching', 'Let&rsquo;s talk.', 'harshvidyarthi312@gmail.com &nbsp;·&nbsp; linkedin.com/in/kumarharshh', true);
      confetti(); await wait(4200);
    } catch (e) { if (e.message !== 'stop') console.warn('[tour]', e); }

    /* ── clean up (also runs when the visitor interrupts) ── */
    EVS.forEach((ev) => removeEventListener(ev, halt, true));
    ctl.rej.clear();
    $('#shareDlg')?.open && $('#shareDlg').close(); $('#inspClose')?.click();
    if (flips % 2) $('#themeBtn')?.click();
    [st, ghost, bars, vig, spotEl, tagEl, title].forEach((e) => e.classList.remove('on'));
    camSet(1, 0, 0, 900);
    await sleep(1000);
    app.classList.remove('cam'); app.style.transform = ''; app.style.transition = '';
    root.classList.remove('touring');
    [ghost, st, bars, vig, spotEl, title, tagEl].forEach((e) => { try { e.hidePopover?.(); } catch (e2) { /* ignore */ } e.remove(); });
    touring = false;
  }
  window.__tour = tour;

  /* ───────── Boot sequence (themed: reads the light/dark palette from CSS) ───────── */
  const boot = safe(async () => {
    const el = $('#boot');
    if (!el || !root.classList.contains('booting')) { playHero(); return; }
    const done = () => { try { sessionStorage.setItem('booted', '1'); } catch (e) { /* ignore */ } };
    const cv = $('#bootCv'), ctx = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }; size();
    const cs = getComputedStyle(root), tok = (v) => cs.getPropertyValue(v).trim();
    const hex = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(','); };
    const C = { bg: tok('--bg'), grid: tok('--grid'), head: tok('--head'), headText: tok('--head-text'), muted: tok('--muted'), acc: hex(tok('--accent') || '#107c41') };
    const dark = root.dataset.theme === 'dark';
    const CW = 96, RH = 28, GUT = 46, HDR = 24, t0 = performance.now(); let stop = false;
    const SAMPLES = ['412', '0.05', '+15%', 'n=500K', 'SQL', 'p<.05', '1.2M', '=SUM()', '40%', 'A/B', 'LTV', '95% CI'];
    const draw = (now) => {
      if (stop) return; const t = (now - t0) / 1000, w = innerWidth, h = innerHeight;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
      const cols = Math.ceil((w - GUT) / CW), rows = Math.ceil((h - HDR) / RH);
      ctx.font = '11px "JetBrains Mono", monospace'; ctx.textBaseline = 'middle';
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = GUT + c * CW, y = HDR + r * RH;
        const d = (c * CW + r * RH * 1.6) / 1500, k = t * 1.15 - d;
        const hs = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453, rnd = hs - Math.floor(hs);
        if (k > 0) {
          const a = (k < .22 ? .34 : Math.max(0, .17 - (k - .22) * .09)) * (dark ? 1.15 : 1) * (.45 + rnd * .85);
          if (a > .01) { ctx.fillStyle = `rgba(${C.acc},${a})`; ctx.fillRect(x, y, CW, RH); }
          if (k > .3 && rnd > .62) { ctx.fillStyle = C.muted; ctx.globalAlpha = Math.min(1, (k - .3) * 1.4) * .85; ctx.fillText(SAMPLES[(rnd * 997 | 0) % SAMPLES.length], x + 10, y + RH / 2 + 1); ctx.globalAlpha = 1; }
        }
      }
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
      for (let c = 0; c <= cols; c++) { ctx.moveTo(GUT + c * CW + .5, HDR); ctx.lineTo(GUT + c * CW + .5, h); }
      for (let r = 0; r <= rows; r++) { ctx.moveTo(GUT, HDR + r * RH + .5); ctx.lineTo(w, HDR + r * RH + .5); }
      ctx.stroke();
      ctx.fillStyle = C.head; ctx.fillRect(0, 0, w, HDR); ctx.fillRect(0, 0, GUT, h);
      ctx.strokeStyle = C.grid; ctx.strokeRect(0, 0, w, HDR); ctx.strokeRect(0, 0, GUT, h);
      ctx.fillStyle = C.headText; ctx.textAlign = 'center';
      for (let c = 0; c < cols; c++) { let s = '', n = c + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } ctx.fillText(s, GUT + c * CW + CW / 2, HDR / 2 + 1); }
      for (let r = 0; r < rows; r++) ctx.fillText(String(r + 1), GUT / 2, HDR + r * RH + RH / 2 + 1);
      ctx.textAlign = 'left';
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    const lines = $$('.ln', el), bar = $('.boot-prog i', el);
    const nM = typeof METRICS !== 'undefined' ? METRICS.length : 20, nS = typeof SKILLS !== 'undefined' ? SKILLS.reduce((a, c) => a + c.items.length, 0) : 41;
    lines[0].innerHTML = '<b>▸</b> Opening <em>Harsh_Kumar_Portfolio.xlsx</em>';
    lines[1].innerHTML = `<b>▸</b> Loading 5 sheets · ${nM} results · ${nS} skills`;
    lines[2].innerHTML = '<b>▸</b> Calculating formulas <em>=COUNTA(Reviews[Session])</em>';
    lines[3].innerHTML = '<b>✓</b> Ready. Hello, I am <b>Harsh</b>.';
    let skipped = false; el.addEventListener('click', () => { skipped = true; });
    const wt = async (ms) => { const s = performance.now(); while (performance.now() - s < ms && !skipped) await sleep(30); };
    for (let i = 0; i < 4 && !skipped; i++) { lines[i].classList.add('on'); bar.style.width = `${(i + 1) * 25}%`; await wt(i === 3 ? 650 : 520); }
    el.classList.add('out'); await sleep(skipped ? 650 : 950);
    stop = true; root.classList.remove('booting'); el.remove(); done();
    reveal($('.sheet:not([hidden])')); playHero();
  });


  /* ═══════════ Per-tab signatures: everything is organised by the three pillars ═══════════ */
  const proofOf = (id) => {
    const m = METRICS.find((x) => x.id === id), k = KPIS.find((x) => x.m === id);
    const big = k ? `${k.prefix || (m.dir === 'down' && k.suffix === '%' ? '\u2212' : '')}${k.val}${k.suffix || ''}` : `${m.dir === 'up' ? '+' : m.dir === 'down' ? '−' : ''}${m.unit === '%' ? m.value + '%' : m.value + ' ' + m.unit}`;
    return { id, big, text: k && /WBR|customers|integrations/i.test(m.metric + ' ' + k.label) ? k.label : m.metric };
  };
  const openMetricById = (id) => { const el = $(`#sheet-summary [data-m="${id}"]`); if (el) el.click(); };

  /* Experience: view the same work through each pillar */
  const expInit = safe(() => {
    const tbl = $('#sheet-experience .table-obj'); if (!tbl || $('.lens', tbl) || !$('#expBody tr.sub')) return;
    const counts = {}; BULLETS.forEach((b) => { const p = PILLAR_BY_BULLET[b.id]; counts[p] = (counts[p] || 0) + 1; });
    $('.obj-head', tbl).insertAdjacentHTML('afterend', `<div class="lens" role="group" aria-label="View my work by pillar"><span class="lens-l">View by pillar</span><button class="lc on" data-p="all" type="button">All <b>${BULLETS.length}</b></button>${PILLARS.map((p) => `<button class="lc p-${p.id}" data-p="${p.id}" type="button" data-tip="${p.tag}"><i></i>${p.name} <b>${counts[p.id] || 0}</b></button>`).join('')}<span class="lens-n" id="lensNote"></span></div>`);
    $$('#expBody tr.sub').forEach((tr) => { const p = PILLAR_BY_BULLET[tr.dataset.b]; tr.dataset.p = p; const chips = $('.chips', tr); if (chips) chips.insertAdjacentHTML('afterbegin', `<span class="pbadge p-${p}"><i></i>${PBY[p].name}</span>`); });
    $$('#expBody tr.co').forEach((tr) => {
      const mine = BULLETS.filter((b) => b.co === tr.dataset.co), n = (p) => mine.filter((b) => PILLAR_BY_BULLET[b.id] === p).length;
      const cell = $('.role-c', tr); if (!cell) return;
      cell.insertAdjacentHTML('beforeend', `<div class="pmix" data-tip="Analytical ${n('analytical')} · Product ${n('product')} · Data ${n('data')}">${PILLARS.map((p) => (n(p.id) ? `<i class="p-${p.id}" style="flex:${n(p.id)}"></i>` : '')).join('')}</div>`);
    });
    const note = $('#lensNote');
    const apply = (p) => {
      $$('.lc', tbl).forEach((x) => x.classList.toggle('on', x.dataset.p === p));
      if (p !== 'all') $('#expandAll')?.click();
      let n = 0;
      $$('#expBody tr.sub').forEach((tr) => { const hit = tr.dataset.p === p; if (hit) n++; tr.classList.toggle('pdim', p !== 'all' && !hit); tr.classList.toggle('phit', p !== 'all' && hit); });
      note.textContent = p === 'all' ? '' : `${n} ${PBY[p].name.toLowerCase()} results. ${PBY[p].tag}.`;
    };
    tbl.addEventListener('click', (e) => { const c = e.target.closest('.lc'); if (c) apply(c.dataset.p); });
    window.__lens = apply;
  });

  /* Skills: one screen. Pick a pillar (tabs or the Venn) and see its proof and skills; education and certificates stay in view */
  const skillsInit = safe(() => {
    const host = $('#sheet-skills .objects'), layout = host && $('.skills-layout', host), grid = $('#skillGrid'), main = $('.skills-main', host);
    if (!host || !layout || !grid || !main || $('.sk-dash', host) || typeof PILLARS === 'undefined') return;
    const used = new Map($$('#skillGrid .pill').map((p) => [p.dataset.skill, +(p.querySelector('.n')?.textContent || 0)]));
    const GROUP = { 'Data Analytics': { analytical: 'Experimentation & statistics', product: 'Product metrics', data: 'Data quality' }, 'BI & Visualization': 'BI & visualization', 'Product & Business Analytics': 'Product & business', 'Soft Skills': 'Ways of working', 'Languages': 'Languages', 'Data Platforms': 'Platforms', 'Data Engineering': 'Engineering', 'APIs & Tools': 'APIs & tools' };
    const label = (p, cat) => (typeof GROUP[cat] === 'object' ? GROUP[cat][p] : GROUP[cat]);
    const ICON = {
      analytical: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6.5L4.6 19a1.6 1.6 0 001.4 2.4h12a1.6 1.6 0 001.4-2.4L14 9.5V3"/><path d="M7.5 15h9"/></svg>',
      product: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
      data: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
    };
    const stats = {};
    const panels = PILLARS.map((p) => {
      const groups = new Map();
      SKILLS.forEach((g) => g.items.forEach((sk) => { if (pillarOfSkill(sk, g.cat) !== p.id) return; const l = label(p.id, g.cat); (groups.get(l) || groups.set(l, []).get(l)).push({ sk, cat: g.cat }); }));
      const nSkills = [...groups.values()].reduce((a, x) => a + x.length, 0), nResults = BULLETS.filter((b) => PILLAR_BY_BULLET[b.id] === p.id).length;
      stats[p.id] = nSkills;
      const proof = p.proof.map(proofOf).map((x) => `<button type="button" data-m="${x.id}" data-tip="Click to see where this number comes from"><b>${x.big}</b><span>${x.text}</span></button>`).join('');
      const pills = [...groups].map(([l, arr]) => `<div><h5>${l}</h5><div class="pills">${arr.map(({ sk, cat }) => { const n = used.get(sk); return `<button type="button" class="pill${n ? ' used' : ''}" data-skill="${sk.replace(/"/g, '&quot;')}" data-cat="${cat}" data-tip="${n ? `Used in ${n} of my results. Click for details` : 'Click for details'}">${sk.replace(/&/g, '&amp;')}${n ? `<span class="n">${n}</span>` : ''}</button>`; }).join('')}</div></div>`).join('');
      return `<article class="pillar p-${p.id}" data-p="${p.id}" hidden data-formula='=FILTER(Skills, Skills[pillar]="${p.name}")'><header><span class="pi">${ICON[p.id]}</span><div><h4>${p.name}</h4><p class="tg">${p.tag}</p></div><div class="pbig"><b data-val="${nSkills}">${nSkills}</b><small>skills · ${nResults} results</small></div></header><p class="blurb">${p.blurb}</p><h5>Proof</h5><div class="proof">${proof}</div><div class="pgroups">${pills}</div></article>`;
    }).join('');
    grid.innerHTML = panels;
    main.insertAdjacentHTML('afterbegin', `<div class="ptabs" role="tablist" aria-label="Pillar">${PILLARS.map((p) => `<button class="lc p-${p.id}" type="button" role="tab" data-p="${p.id}"><i></i>${p.name} <b>${stats[p.id]}</b></button>`).join('')}</div>`);

    const circle = (p, cx, cy, i) => `<circle class="vc p-${p.id}" data-p="${p.id}" style="--i:${i}" cx="${cx}" cy="${cy}" r="80" fill="hsl(${p.hue} 62% 52% / .36)" stroke="hsl(${p.hue} 62% 42%)" stroke-width="1.6"/>`;
    const vennCard = document.createElement('div');
    vennCard.className = 'obj venn-card'; vennCard.dataset.formula = '=INTERSECT(Analytical, Product, Data)';
    vennCard.innerHTML = `<p class="eyebrow">Where I work</p><div class="venn"><svg viewBox="0 0 320 290" role="img" aria-label="Analytical, Product and Data overlap">${circle(PILLARS[0], 115, 108, 0)}${circle(PILLARS[1], 205, 108, 1)}${circle(PILLARS[2], 160, 186, 2)}<text x="80" y="76">Analytical</text><text x="240" y="76">Product</text><text x="160" y="258">Data</text><text x="160" y="140" class="vs">product</text><text x="160" y="153" class="vs">analyst</text></svg></div><p class="vhint">Pick a circle, or a tab, to see the proof.</p>`;
    const side = $('.side-stack', layout), dash = document.createElement('div'), left = document.createElement('div'), right = document.createElement('div');
    dash.className = 'sk-dash'; left.className = 'sk-left'; right.className = 'sk-right';
    left.append(vennCard, ...(side ? $$(':scope > .obj', side) : [])); right.append(main); dash.append(left, right);
    layout.replaceWith(dash);

    const venn = $('.venn', vennCard);
    const select = (pid) => {
      $$('.lc', main).forEach((x) => x.classList.toggle('on', x.dataset.p === pid));
      $$('.vc', vennCard).forEach((x) => x.classList.toggle('sel', x.dataset.p === pid));
      venn.classList.add('has-sel');
      $$('.pillar', grid).forEach((x) => { x.hidden = x.dataset.p !== pid; });
      countUp($(`.pillar[data-p="${pid}"]`, grid));
    };
    main.addEventListener('click', (e) => { const t = e.target.closest('.ptabs .lc'); if (t) select(t.dataset.p); });
    vennCard.addEventListener('click', (e) => { const t = e.target.closest('.vc'); if (t) select(t.dataset.p); });
    grid.addEventListener('click', (e) => { const b = e.target.closest('.proof button'); if (b) openMetricById(b.dataset.m); });
    select(PILLARS[0].id);
    window.__pillar = select;
    enterHooks.skills = (sh) => countUp($('.pillar:not([hidden])', sh));
  });

  /* SQL: pillar questions, a 4-step flow, a typed query, cascading rows, data bars, and an analyst's note */
  const sqlInit = safe(() => {
    const q = $('#sheet-sql .obj.query'); if (!q || $('.pipe', q)) return;
    q.insertAdjacentHTML('afterbegin', '<div class="pipe" aria-hidden="true"><span>1 · Question</span><i></i><span>2 · Translate to SQL</span><i></i><span>3 · Run</span><i></i><span>4 · Result</span></div>');
    const askEx = $('#askExamples');
    if (askEx) askEx.insertAdjacentHTML('afterend', `<div class="examples pilex"><span>By pillar:</span>${PILLARS.map((p) => `<button type="button" class="p-${p.id}" data-q="Show his ${p.name.toLowerCase()} results"><i></i>${p.name} results</button>`).join('')}</div>`);
    $('.pilex', q)?.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $('#askInput').value = b.dataset.q; $('#askForm').requestSubmit ? $('#askForm').requestSubmit() : $('#askForm').dispatchEvent(new Event('submit', { cancelable: true })); });
    const spans = $$('.pipe span', q), lines = $$('.pipe i', q);
    const setStep = (n) => { spans.forEach((s, i) => { s.classList.toggle('done', i < n); s.classList.toggle('on', i === n); }); lines.forEach((l, i) => l.classList.toggle('done', i < n)); };
    const ta = $('#sqlInput'), runBtn = $('#runSql');
    const typeSql = () => {
      const full = ta.value; if (!full || reduce) return;
      ta.value = ''; ta.classList.add('typing'); if (runBtn) runBtn.disabled = true;
      const step = Math.max(1, Math.ceil(full.length / 36)); let i = 0;
      const id = setInterval(() => { i += step; ta.value = full.slice(0, i); if (i >= full.length) { clearInterval(id); ta.value = full; ta.classList.remove('typing'); if (runBtn) runBtn.disabled = false; } }, 18);
    };
    let busy = false;
    document.addEventListener('submit', async (e) => {
      if (!e.target || e.target.id !== 'askForm' || e.__wow) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const fire = () => { const ev = new Event('submit', { bubbles: true, cancelable: true }); ev.__wow = true; e.target.dispatchEvent(ev); };
      if (reduce) { fire(); return; }
      if (busy) return; busy = true;
      setStep(0); await sleep(380); setStep(1); await sleep(560);
      fire();
      const ok = $('#askAnswer') && $('#askAnswer').hidden;
      if (ok) { setStep(2); typeSql(); await sleep(420); setStep(3); await sleep(900); setStep(4); } else setStep(-1);
      setTimeout(() => setStep(-1), 2600); busy = false;
    }, true);

    const out = $('#sqlOut');
    const fmtV = (v, u) => (u === '%' ? `${v}%` : u ? `${v.toLocaleString('en-US')} ${u}` : v.toLocaleString('en-US'));
    const insight = (heads, rows) => {
      const col = (n) => heads.indexOf(n), cell = (r, i) => (i < 0 ? '' : r.children[i + 1].textContent.trim());
      const n = rows.length; if (!n) return '';
      const bits = [`<b>${n}</b> row${n === 1 ? '' : 's'}`];
      const vi = col('value'), ui = col('unit'), mi = col('metric');
      if (vi >= 0) {
        const units = new Set(rows.map((r) => cell(r, ui))), nums = rows.map((r) => parseFloat(cell(r, vi).replace(/,/g, '')));
        const stat = (idxs, u, tag) => {
          const v = idxs.map((i) => nums[i]), top = idxs[v.indexOf(Math.max(...v))], avg = Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
          bits.push(`${tag}biggest <b>${fmtV(nums[top], u)}</b>${mi >= 0 ? ` (${cell(rows[top], mi)})` : ''}`, `average <b>${fmtV(avg, u)}</b>`);
        };
        if (units.size === 1 && n > 1) stat(nums.map((_, i) => i), [...units][0], '');
        else if (units.size > 1) { const idx = rows.map((r, i) => i).filter((i) => cell(rows[i], ui) === '%'); if (idx.length > 1) stat(idx, '%', `${idx.length} percentage results: `); }
      }
      const pi = col('pillar');
      if (pi >= 0) { const c = {}; rows.forEach((r) => { const k = cell(r, pi); c[k] = (c[k] || 0) + 1; }); bits.push(Object.entries(c).map(([k, v]) => `${k} <b>${v}</b>`).join(' · ')); }
      const ci = col('company');
      if (ci >= 0) { const k = new Set(rows.map((r) => cell(r, ci))).size; if (k > 1) bits.push(`across <b>${k}</b> companies`); }
      return `<span class="ik">Analyst’s note</span><span>${bits.join(' · ')}</span>`;
    };
    if (out) new MutationObserver(() => {
      $('.insight', out.parentElement)?.remove();
      const t = $('table', out); if (!t || t.dataset.wow) return; t.dataset.wow = '1';
      const rows = $$('tbody tr', t); rows.forEach((tr, i) => { tr.style.setProperty('--d', Math.min(i, 16) * 55 + 'ms'); tr.classList.add('cas'); });
      const heads = $$('thead th', t).slice(1).map((th) => th.textContent.trim());
      const pi = heads.indexOf('pillar');
      if (pi >= 0) rows.forEach((tr) => { const c = tr.children[pi + 1], name = c.textContent.trim(), id = (PILLARS.find((p) => p.name === name) || {}).id; if (id) c.innerHTML = `<span class="pbadge p-${id}"><i></i>${name}</span>`; });
      const html = insight(heads, rows);
      if (html) out.insertAdjacentHTML('beforebegin', `<div class="insight">${html}</div>`);
      const vi = heads.findIndex((h) => h === 'value' || h === 'months'); if (vi < 0) return;
      const ui = heads.indexOf('unit');
      if (ui >= 0 && new Set(rows.map((tr) => tr.children[ui + 1].textContent.trim())).size > 1) return;
      const cells = rows.map((tr) => tr.children[vi + 1]), nums = cells.map((c) => parseFloat(c.textContent.replace(/,/g, '')));
      const max = Math.max(...nums.filter((x) => !isNaN(x))); if (!(max > 0)) return;
      cells.forEach((c, i) => { if (isNaN(nums[i])) return; c.classList.add('bar-cell'); c.style.setProperty('--bar', Math.max(4, (nums[i] / max) * 100) + '%'); c.style.setProperty('--d', Math.min(i, 16) * 55 + 120 + 'ms'); });
    }).observe(out, { childList: true });
  });

  /* Contact: a hello banner, quick actions, and confetti when a message really goes out */
  const contactInit = safe(() => {
    const host = $('#sheet-contact .objects'), lay = host && $('.contact-layout', host);
    if (!host || !lay || $('.hello', host)) return;
    lay.insertAdjacentHTML('beforebegin', `<div class="obj hello" data-formula='=HELLO()'><div class="hello-l"><span class="live"><i></i>Replies within a day</span><h2>Let’s <em>talk</em>.</h2><p>Hiring for a data or product analytics role, or got a data problem worth solving? Say hello, I would love to hear it.</p></div><div class="hello-r"><a class="btn primary big" href="mailto:${PROFILE.email}">Email me <span class="arr">→</span></a><a class="btn big" href="${PROFILE.linkedin}" target="_blank" rel="noopener">LinkedIn <span class="arr">↗</span></a><a class="btn big" href="${PROFILE.resume}" target="_blank" rel="noopener">Resume <span class="arr">↓</span></a></div></div>`);
    const note = $('#sendNote');
    if (note) new MutationObserver(() => { if (note.classList.contains('ok') && !note.hidden) confetti(); }).observe(note, { attributes: true, attributeFilter: ['class', 'hidden'] });
  });


  /* ───────── Phone gate: a blurred, cheeky nudge toward desktop, then the site ───────── */
  const GATES = [
    ['Do you watch movies on mobile?', 'No? Then why scroll a spreadsheet on one 🍿', 'Try it on a desktop for the best experience.', 'Just kidding. Showing you now…'],
    ['This site has a ⌘K command palette.', 'Your thumb has no ⌘ key 😬', 'Desktop is where it really shines.', 'Kidding, mobile works too. Here you go…'],
    ['Plot twist: this portfolio is a spreadsheet.', 'Even Excel judges you for opening it on a phone 📱', 'A laptop would make it sing.', 'Relax, I optimised it. Showing you now…'],
  ];
  const gateInit = safe(async () => {
    if (innerWidth > 760 || $('#mgate')) return;
    try { if (sessionStorage.getItem('gated') && !/[?&]gate=1/.test(location.search)) return; sessionStorage.setItem('gated', '1'); } catch (e) { /* ignore */ }
    while ($('#boot') && root.classList.contains('booting')) await sleep(150);
    const L = GATES[Math.floor(Math.random() * GATES.length)];
    const g = document.createElement('div'); g.id = 'mgate'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-label', 'A note for phone visitors');
    g.innerHTML = '<div class="mg-card"><div class="mg-k">// heads up</div><div class="mg-l" aria-live="polite"></div><div class="mg-act"><button type="button" class="btn small" id="mgCopy">Copy desktop link</button><button type="button" class="btn small primary" id="mgGo">Show me anyway ▸</button></div></div>';
    document.body.appendChild(g); root.classList.add('gated');
    requestAnimationFrame(() => g.classList.add('on'));
    const out = $('.mg-l', g); let closed = false;
    const close = () => { if (closed) return; closed = true; g.classList.remove('on'); root.classList.remove('gated'); setTimeout(() => g.remove(), 700); };
    $('#mgGo', g).addEventListener('click', close);
    g.addEventListener('click', (e) => { if (e.target === g) close(); });
    $('#mgCopy', g).addEventListener('click', async (e) => { const b = e.currentTarget; try { await navigator.clipboard.writeText('https://portfolio-harshh.vercel.app/'); b.textContent = 'Copied. Open it on your laptop ✓'; } catch (err) { b.textContent = 'portfolio-harshh.vercel.app'; } });
    const line = async (t, last) => {
      const p = document.createElement('p'); if (last) p.className = 'last'; out.appendChild(p);
      for (let i = 1; i <= t.length && !closed; i++) { p.textContent = t.slice(0, i); await sleep(reduce ? 0 : 42); }
      await sleep(last ? 1600 : 2000);
    };
    for (let i = 0; i < L.length && !closed; i++) await line(L[i], i === L.length - 1);
    close();
  });

  /* Phones: after a query runs, bring the result into view so nothing is hidden below the fold */
  const mobileSql = safe(() => {
    const out = $('#sqlOut'); if (!out || innerWidth > 760) return;
    new MutationObserver(() => { if (root.classList.contains('touring') || root.classList.contains('gated')) return; setTimeout(() => { const r = $('#sheet-sql .results'); const sh = $('#sheet-sql'); if (r && sh && !sh.hidden) sh.scrollTo({ top: sh.scrollTop + r.getBoundingClientRect().top - sh.getBoundingClientRect().top - 8, behavior: 'smooth' }); }, 450); }).observe(out, { childList: true });
  });

  /* ───────── Init ───────── */
  const init = safe(() => {
    heroInit(); tickerInit(); barInit(); palInit(); expInit(); skillsInit(); sqlInit(); contactInit();
    if (!$('#boot') || !root.classList.contains('booting')) reveal($('.sheet:not([hidden])'));
    boot(); gateInit(); mobileSql();
    console.log('%cHello 👋 curious one. Try Ctrl/⌘+K, the tour button, triple-click my photo, or the Konami code.', 'font:600 13px sans-serif;color:#107c41');
  });
  init();
})();
