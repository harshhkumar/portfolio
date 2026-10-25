/* Workbook behaviour: sheets, grid selection, formula bar, inspector, and each sheet's content. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => matchMedia('(max-width: 760px)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b class="hl">$1</b>');
  const plain = (s) => s.replace(/\*\*/g, '');
  let usingKeyboard = false;
  document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') usingKeyboard = true; }, true);
  document.addEventListener('pointerdown', () => { usingKeyboard = false; }, true);
  const tipA = (t) => `data-tip="${esc(t)}"`;

  const COL = 96, ROW = 28;
  const SHEETS = [
    { id: 'summary', tip: 'Highlights, key results and career timeline',    name: 'Summary',      fx: '="Harsh Kumar | Data & Product Analyst"' },
    { id: 'experience', tip: 'Every role and result, grouped by company', name: 'Experience',   fx: '=GROUPBY(Roles[company], Achievements[*])' },
    { id: 'skills', tip: 'Skills, education and certificates',     name: 'Skills',       fx: '=FILTER(Skills, Skills[category]<>"")' },
    { id: 'sql', tip: 'Ask questions about my work in plain English or SQL',        name: 'SQL',          fx: '=RUN(SQL)' },
    { id: 'contact', tip: 'Email, links and a message form',    name: 'Contact',      fx: '=CONTACT("Harsh")' },
  ];

  /* ───────── Date helpers (everything about tenure is computed live) ───────── */
  const NOW = new Date();
  const ym = (s) => { const [y, m] = s.split('-').map(Number); return y * 12 + (m - 1); };
  const nowYm = NOW.getFullYear() * 12 + NOW.getMonth();
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtYm = (s) => { const [y, m] = s.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
  const period = (c) => `${fmtYm(c.start)} – ${c.end ? fmtYm(c.end) : 'Present'}`;
  const monthsOf = (c) => (c.end ? ym(c.end) : nowYm) - ym(c.start);
  const dur = (n) => { const y = Math.floor(n / 12), m = n % 12; return [y ? `${y} yr${y > 1 ? 's' : ''}` : '', m ? `${m} mo` : ''].filter(Boolean).join(' ') || '< 1 mo'; };
  const totalMonths = nowYm - Math.min(...Object.values(COMPANIES).map((c) => ym(c.start)));
  const sinceLabel = fmtYm(Object.values(COMPANIES).map((c) => c.start).sort()[0]);

  const PLUS = new Set(['m4', 'm6', 'm11', 'm12', 'm14', 'm19']);
  const byId = (arr, id) => arr.find((x) => x.id === id);
  const fmtMetric = (m, arrows = true) => {
    const plus = PLUS.has(m.id) ? '+' : '';
    if (m.unit[0] === '$') return `$${m.value}${m.unit.slice(1)}${plus}`;
    if (m.unit === '%') {
      if (m.dir === 'up') return `${arrows ? '▲ ' : ''}+${m.value}%`;
      if (m.dir === 'down') return `${arrows ? '▼ ' : ''}−${m.value}%`;
      return `${m.value}${plus}%`;
    }
    const v = m.value >= 1000 ? `${m.value / 1000}K` : m.value;
    return `${v}${plus} ${m.unit}`;
  };

  /* ───────── Formula bar ───────── */
  const fxText = $('#fxText');
  const nameBox = $('#nameBox');
  let fxTimer = 0;
  function setFormula(text) {
    clearInterval(fxTimer);
    text = text || '';
    if (reduceMotion || !text) { fxText.textContent = text; fxText.classList.remove('typing'); return; }
    let i = 0;
    fxText.classList.add('typing');
    fxTimer = setInterval(() => {
      i += 2;
      fxText.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(fxTimer); fxText.classList.remove('typing'); }
    }, 12);
  }
  const colName = (i) => { let s = ''; i++; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
  const cellRef = (c, r) => `${colName(c)}${r + 1}`;

  /* ───────── Sheets ───────── */
  const selection = $('#selection');
  let current = null;
  let sel = { c: 0, r: 0, w: 1, h: 1 };   // in cells
  let gridActive = false;
  const surfaces = new Map();

  function buildSurface(sheet) {
    const surface = $('.surface', sheet);
    const objects = $('.objects', surface);
    const corner = Object.assign(document.createElement('div'), { className: 'corner' });
    const colhead = Object.assign(document.createElement('div'), { className: 'colhead' });
    const rowhead = Object.assign(document.createElement('div'), { className: 'rowhead' });
    surface.prepend(rowhead); surface.prepend(colhead); surface.prepend(corner);
    // grid placement: corner (1,1) colhead (2,1) rowhead (1,2) objects (2,2)
    corner.style.cssText = 'grid-area:1/1';
    colhead.style.cssText = 'grid-area:1/2';
    rowhead.style.cssText = 'grid-area:2/1';
    objects.style.gridArea = '2/2';
    const info = { sheet, surface, objects, colhead, rowhead, cols: 0, rows: 0, extra: 12 };
    objects.style.setProperty('--extra', info.extra);
    const add = Object.assign(document.createElement('div'), { className: 'addrows' });
    add.innerHTML = '<button class="btn small" type="button">Add</button><input type="number" min="1" max="500" value="50" aria-label="Number of rows to add"><span>more rows at the bottom</span>';
    sheet.appendChild(add);
    $('button', add).addEventListener('click', () => {
      const n = Math.max(1, Math.min(500, parseInt($('input', add).value, 10) || 50));
      info.extra += n;
      objects.style.setProperty('--extra', info.extra);
      info.refresh();
    });
    surfaces.set(sheet.dataset.sheet, info);
    const refresh = () => {
      const cols = Math.ceil(Math.max(objects.scrollWidth, sheet.clientWidth) / COL) + 1;
      const rows = Math.ceil(objects.scrollHeight / ROW);
      if (cols !== info.cols) { colhead.innerHTML = Array.from({ length: cols }, (_, i) => `<span>${colName(i)}</span>`).join(''); info.cols = cols; }
      if (rows !== info.rows) { rowhead.innerHTML = Array.from({ length: rows }, (_, i) => `<span>${i + 1}</span>`).join(''); info.rows = rows; }
      markHeaders();
    };
    new ResizeObserver(refresh).observe(objects);
    info.refresh = refresh;
    return info;
  }

  function markHeaders() {
    if (!current) return;
    const s = surfaces.get(current);
    $$('.on', s.colhead).forEach((e) => e.classList.remove('on'));
    $$('.on', s.rowhead).forEach((e) => e.classList.remove('on'));
    for (let i = 0; i < sel.w; i++) s.colhead.children[sel.c + i]?.classList.add('on');
    for (let i = 0; i < sel.h; i++) s.rowhead.children[sel.r + i]?.classList.add('on');
  }

  function placeSelection(rect, formula) {
    const s = surfaces.get(current);
    if (isMobile()) { selection.hidden = true; }
    else {
      s.objects.appendChild(selection);
      selection.hidden = false;
      selection.style.left = `${rect.x - 1}px`;
      selection.style.top = `${rect.y - 1}px`;
      selection.style.width = `${rect.w + 2}px`;
      selection.style.height = `${rect.h + 2}px`;
    }
    sel = { c: Math.floor(rect.x / COL), r: Math.floor(rect.y / ROW), w: Math.max(1, Math.ceil(rect.w / COL)), h: Math.max(1, Math.ceil(rect.h / ROW)) };
    nameBox.textContent = cellRef(sel.c, sel.r);
    setFormula(formula);
    markHeaders();
  }

  function selectCell(c, r) {
    c = Math.max(0, c); r = Math.max(0, r);
    const s = surfaces.get(current);
    const rect = { x: c * COL, y: r * ROW, w: COL, h: ROW };
    // If the cell sits on an object, show that object's formula, like a real cell would.
    const box = s.objects.getBoundingClientRect();
    const hit = document.elementsFromPoint(box.left + rect.x + 6, box.top + rect.y + 6).find((e) => e.dataset?.formula && s.objects.contains(e));
    placeSelection(rect, hit ? hit.dataset.formula : '');
    selection.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function selectElement(el) {
    const s = surfaces.get(current);
    const box = s.objects.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    placeSelection({ x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }, el.dataset.formula || '');
  }

  function showSheet(id, { push = true } = {}) {
    const meta = SHEETS.find((s) => s.id === id) || SHEETS[0];
    id = meta.id;
    SHEETS.forEach((s) => { $(`#sheet-${s.id}`).hidden = s.id !== id; });
    $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.id === id)));
    current = id;
    closeInspector();
    const info = surfaces.get(id);
    info.refresh();
    $(`#sheet-${id}`).scrollTo(0, 0);
    gridActive = false;
    sel = { c: 0, r: 0, w: 1, h: 1 };
    info.objects.appendChild(selection);
    selection.hidden = true;
    nameBox.textContent = 'A1';
    setFormula(meta.fx);
    markHeaders();
    $('#sheetCount').textContent = `Sheet ${SHEETS.indexOf(meta) + 1} of ${SHEETS.length}`;
    document.title = id === 'summary' ? 'Harsh Kumar · Data & Product Analyst' : `${meta.name} · Harsh Kumar`;
    if (push) history.replaceState(null, '', `#${id}`);
    if (id === 'sql' && !sqlBooted) bootSql();
    if (id === 'summary') animateBars();
    const tab = $(`.tab[data-id="${id}"]`);
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function buildTabs() {
    $('#tabs').innerHTML = SHEETS.map((s, i) => `<button class="tab" role="tab" type="button" data-id="${s.id}" aria-selected="false" data-tip="${esc(s.tip)} (Alt+${i + 1})">${s.name}</button>`).join('');
    $('#tabs').addEventListener('click', (e) => { const t = e.target.closest('.tab'); if (t) showSheet(t.dataset.id); });
  }

  /* Clicking anywhere on the grid selects a cell or the object under the pointer */
  function onGridClick(e) {
    if (e.currentTarget !== surfaces.get(current).objects) return;   // this click just navigated away
    if (e.target.closest('a, input, textarea, select, label, video')) return;
    gridActive = true;
    const s = surfaces.get(current);
    const el = e.target.closest('[data-formula]');
    if (el && s.objects.contains(el)) { selectElement(el); return; }
    const box = s.objects.getBoundingClientRect();
    selectCell(Math.floor((e.clientX - box.left) / COL), Math.floor((e.clientY - box.top) / ROW));
  }

  document.addEventListener('keydown', (e) => {
    const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
    if (e.altKey && /^Digit[1-5]$/.test(e.code)) { e.preventDefault(); showSheet(SHEETS[+e.code.slice(5) - 1].id); return; }
    if (e.key === 'Escape') { if (!$('#inspector').hidden) closeInspector(); gridActive = false; return; }
    if (typing || !gridActive || e.metaKey || e.ctrlKey || e.altKey) return;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    selectCell(sel.c + d[0], sel.r + d[1]);
  });

  /* ───────── Inspector ───────── */
  const inspector = $('#inspector');
  let inspReturn = null;
  function closeInspector() { inspector.hidden = true; $$('.kpi.sel, .bar.sel, tr.sel, .pill.sel').forEach((e) => e.classList.remove('sel')); }
  $('#inspClose').addEventListener('click', () => { closeInspector(); inspReturn?.focus(); });

  function openMetric(mid, trigger) {
    const m = byId(METRICS, mid);
    const b = byId(BULLETS, m.b);
    const co = COMPANIES[m.co];
    inspReturn = trigger || null;
    $('#inspTitle').textContent = m.area;
    $('#inspBody').innerHTML = `
      <div class="insp-big">${esc(fmtMetric(m, false))}<small>${esc(m.metric)}</small></div>
      <p class="insp-meta"><b>${esc(co.name)}</b> · ${esc(co.title)}<br>${esc(period(co))} · ${esc(dur(monthsOf(co)))}</p>
      <p>${rich(b.text)}</p>
      <ul class="chips">${b.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="code">SELECT * FROM achievements WHERE id = '${m.id}';</div>
      <div class="hero-actions">
        <button class="btn primary small" type="button" data-see="${b.id}">Show in Experience</button>
        <button class="btn small" type="button" data-sqlid="${m.id}">Run this in SQL</button>
      </div>`;
    inspector.hidden = false;
    $('#inspBody').scrollTop = 0;
    if (usingKeyboard) $('#inspClose').focus({ preventScroll: true });
  }
  $('#inspBody').addEventListener('click', (e) => {
    const see = e.target.closest('[data-see]');
    const sq = e.target.closest('[data-sqlid]');
    const m = e.target.closest('[data-m]');
    const sqlb = e.target.closest('[data-sql]');
    const expc = e.target.closest('[data-exp-co]');
    if (see) jumpToBullet(see.dataset.see);
    if (sq) { showSheet('sql'); setSql(`SELECT * FROM achievements WHERE id = '${sq.dataset.sqlid}'`, true); }
    if (m) openMetric(m.dataset.m, inspReturn);
    if (sqlb) { showSheet('sql'); setSql(sqlb.dataset.sql, true); }
    if (expc) { showSheet('experience'); toggleGroup(expc.dataset.expCo, true); }
  });


  /* ───────── More inspector panes ───────── */
  function setInsp(title, html, trigger) {
    inspReturn = trigger || null;
    $('#inspTitle').textContent = title;
    $('#inspBody').innerHTML = html;
    inspector.hidden = false;
    $('#inspBody').scrollTop = 0;
    if (usingKeyboard) $('#inspClose').focus({ preventScroll: true });
  }
  const resultBtn = (m) => `<li><button type="button" data-m="${m.id}"><span><b>${esc(fmtMetric(m, false))}</b> ${esc(m.metric)}</span><small>${esc(m.area)}</small></button></li>`;
  const mentions = (text, base) => new RegExp(`(^|[^a-z0-9])${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text.toLowerCase());
  const sqlBtn = (label, sql) => `<button class="btn small" type="button" data-sql="${esc(sql)}">${label}</button>`;

  function openCompany(key, trigger) {
    const c = COMPANIES[key];
    const ms = METRICS.filter((m) => m.co === key);
    setInsp(c.name, `
      <div class="insp-big">${esc(dur(monthsOf(c)))}<small>${esc(c.title)}</small></div>
      <p class="insp-meta"><b>${esc(period(c))}</b>${c.end ? '' : ' · current role'}</p>
      <h4 class="insp-h">Measured results (${ms.length})</h4>
      <ul class="insp-list">${ms.map(resultBtn).join('')}</ul>
      <div class="hero-actions">
        <button class="btn primary small" type="button" data-exp-co="${key}">Open in Experience</button>
        ${sqlBtn('Run in SQL', `SELECT metric, value, unit FROM achievements WHERE company = '${c.name}'`)}
      </div>`, trigger);
  }

  function openBullet(id, trigger) {
    const b = byId(BULLETS, id);
    const c = COMPANIES[b.co];
    const ms = METRICS.filter((m) => m.b === id);
    setInsp(`${c.name} · ${c.title}`, `
      <p>${rich(b.text)}</p>
      <ul class="chips">${b.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <h4 class="insp-h">Numbers in this result</h4>
      <ul class="insp-list">${ms.map(resultBtn).join('')}</ul>
      <div class="hero-actions">${sqlBtn('Run in SQL', `SELECT metric, value, unit FROM achievements WHERE company = '${c.name}' AND area = '${ms[0].area}'`)}</div>`, trigger);
  }

  const SKILL_KEYS = {
    'cohort & funnel analysis': ['cohort', 'cohorts', 'funnel', 'funnels'],
    'etl pipelines': ['etl'],
    'data modeling': ['data modeling', 'data models', 'data model'],
    'multi-tenant architecture': ['multi-tenant'],
    'decision-tree modeling': ['decision tree', 'decision-tree'],
    'business reviews': ['wbr/mbr'],
    'attribution modeling': ['attribution'],
    'rest apis': ['api', 'apis'],
  };
  function evidenceFor(skill) {
    const base = skill.toLowerCase().replace(/\s*\(.*\)/, '');
    const keys = SKILL_KEYS[base] || [base];
    return BULLETS.filter((b) => keys.some((k) => b.tags.some((t) => mentions(t, k)) || mentions(plain(b.text), k)));
  }
  function openSkill(skill, cat, trigger) {
    const ev = evidenceFor(skill);
    const peers = SKILLS.find((g) => g.cat === cat).items.filter((i) => i !== skill);
    setInsp(skill, `
      <p class="insp-meta"><b>${esc(cat)}</b></p>
      <h4 class="insp-h">Where I used it</h4>
      ${ev.length ? `<ul class="insp-list">${ev.map((b) => `<li><button type="button" data-see="${b.id}"><span>${esc(plain(b.text).slice(0, 120))}…</span><small>${esc(COMPANIES[b.co].name)}</small></button></li>`).join('')}</ul>`
        : '<p class="insp-meta">Listed on my resume. None of my results is built around it specifically.</p>'}
      ${peers.length ? `<h4 class="insp-h">Also in ${esc(cat)}</h4><ul class="chips">${peers.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      <div class="hero-actions">${sqlBtn('Run in SQL', `SELECT category, skill FROM skills WHERE category = '${cat}'`)}</div>`, trigger);
  }

  function openTable(name, trigger) {
    const tb = DB[name];
    const sample = tb.rows.slice(0, 3);
    setInsp(name, `
      <p>${esc(TABLE_INFO[name])}</p>
      <h4 class="insp-h">Columns</h4>
      <table class="kv"><tbody>${tb.columns.map((c) => `<tr><th>${c}</th><td>${esc(COL_INFO[name][c] || '')}</td></tr>`).join('')}</tbody></table>
      <h4 class="insp-h">Sample rows</h4>
      <div class="mini-wrap"><table class="mini"><thead><tr>${tb.columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${sample.map((r) => `<tr>${tb.columns.map((c) => `<td>${r[c] == null ? 'NULL' : esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="hero-actions">${sqlBtn(`Show all ${tb.rows.length} rows`, `SELECT * FROM ${name}`)}</div>`, trigger);
  }

  function openRow(result, i, trigger) {
    const row = result.rows[i];
    const h = result.headers;
    const col = (n) => h.findIndex((x) => x.toLowerCase() === n);
    const ci = col('company'), mi = col('metric'), si = col('skill');
    if (ci >= 0 && mi >= 0) {
      const m = METRICS.find((x) => COMPANIES[x.co].name === row[ci] && x.metric === row[mi]);
      if (m) { openMetric(m.id, trigger); return; }
    }
    if (si >= 0) {
      const g = SKILLS.find((x) => x.items.includes(row[si]));
      if (g) { openSkill(row[si], g.cat, trigger); return; }
    }
    setInsp('Row details', `<table class="kv"><tbody>${h.map((x, k) => `<tr><th>${esc(x)}</th><td>${row[k] == null ? '<span class="null">NULL</span>' : esc(typeof row[k] === 'number' ? row[k].toLocaleString('en-US') : row[k])}</td></tr>`).join('')}</tbody></table>`, trigger);
  }

  /* ───────── Tooltips ───────── */
  const tipEl = Object.assign(document.createElement('div'), { className: 'tip' });
  tipEl.setAttribute('role', 'tooltip');
  document.body.appendChild(tipEl);
  let tipFor = null, tipTimer = 0;
  function showTip(el) {
    tipEl.textContent = el.dataset.tip;
    const r = el.getBoundingClientRect();
    tipEl.style.left = '0px'; tipEl.style.top = '0px';
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let x = r.left + r.width / 2 - w / 2;
    x = Math.max(8, Math.min(x, innerWidth - w - 8));
    let y = r.bottom + 8;
    if (y + h > innerHeight - 8) y = r.top - h - 8;
    tipEl.style.left = `${x}px`; tipEl.style.top = `${Math.max(8, y)}px`;
    tipEl.classList.add('on');
  }
  function hideTip() { clearTimeout(tipTimer); tipFor = null; tipEl.classList.remove('on'); }
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest?.('[data-tip]');
    if (el === tipFor) return;
    hideTip();
    if (el) { tipFor = el; tipTimer = setTimeout(() => showTip(el), 350); }
  });
  document.addEventListener('pointerdown', hideTip);
  document.addEventListener('focusin', (e) => { const el = e.target.closest?.('[data-tip]'); if (el && e.target.matches(':focus-visible')) { tipFor = el; showTip(el); } });
  document.addEventListener('focusout', hideTip);
  document.addEventListener('scroll', hideTip, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });

  /* ───────── Summary ───────── */
  const recordRows = () => [
      ['Name', PROFILE.name],
      ['Role', `Data Analyst, ${COMPANIES.trivas.name}`],
      ['Focus', 'Product & business analytics'],
      ['Toolkit', 'SQL · Python · dbt · Tableau · Snowflake'],
      ['Experience', `${dur(totalMonths)} (since ${sinceLabel})`],
      ['Leading', 'A 3-person analytics team'],
      ['Education', 'B.Tech CSE (Data Science & Analytics), DIT Dehradun, 2024'],
      ['Off the clock', 'Chess ♟ and snooker. Played open snooker tournaments across Bangalore and North India.'],
    ];

  function buildSummary() {
    const rec = recordRows();
    $('#recordBody').innerHTML = rec.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${esc(v)}</td></tr>`).join('');

    $('#kpis').innerHTML = KPIS.map((k, i) => `
      <button class="kpi" type="button" data-m="${k.m}" ${tipA('Click to see where this number comes from')} data-formula="${esc(k.formula)}" style="border-top-color: var(--${COMPANIES[byId(METRICS, k.m).co].color})">
        <span class="v" data-i="${i}">${esc((k.prefix || '') + k.val + (k.suffix || ''))}</span>
        <span class="l">${esc(k.label)}</span>
        <span class="n">${esc(k.note)}</span>
      </button>`).join('');
    if (!reduceMotion) $$('.kpi .v').forEach((el) => {
      const k = KPIS[+el.dataset.i];
      const t0 = performance.now(), dur_ = 900;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur_);
        el.textContent = `${k.prefix || ''}${Math.round(k.val * (1 - Math.pow(1 - p, 3)))}${k.suffix || ''}`;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    // Bar chart: every metric that is a percentage change
    const bars = METRICS.filter((m) => m.unit === '%' && (m.dir === 'up' || m.dir === 'down')).sort((a, b) => b.value - a.value);
    $('#chart').innerHTML = bars.map((m) => `
      <button class="bar" type="button" data-m="${m.id}" ${tipA(`${COMPANIES[m.co].name}: ${m.metric} ${m.dir === 'up' ? 'up' : 'down'} ${m.value}%. Click for the story`)} data-w="${m.value}" data-formula='=INDEX(Achievements[value], MATCH("${m.id}", Achievements[id], 0))' aria-label="${esc(m.metric)}, ${esc(fmtMetric(m))}, ${esc(COMPANIES[m.co].name)}">
        <span class="lab">${esc(m.metric)}<small>${esc(COMPANIES[m.co].name)} · ${m.dir === 'up' ? 'lift' : 'reduction'}</small></span>
        <span class="track"><span class="fillbar fill-${COMPANIES[m.co].color}"></span></span>
        <span class="val">${m.dir === 'up' ? '+' : '−'}${m.value}%</span>
      </button>`).join('');
    $('#legend').innerHTML = Object.values(COMPANIES).map((c) => `<li><i class="fill-${c.color}"></i>${esc(c.name)}</li>`).join('');

    // Timeline
    const start = Math.min(...Object.values(COMPANIES).map((c) => ym(c.start)));
    const span = nowYm + 1 - start;
    const years = [];
    for (let y = Math.ceil((start + 1) / 12); y * 12 <= nowYm; y++) years.push(y);
    const pct = (v) => ((v - start) / span) * 100;
    $('#gantt').innerHTML = `
      <div class="axis">${years.map((y) => `<span class="tick" style="left:${pct(y * 12)}%">${y}</span>`).join('')}</div>
      ${Object.entries(COMPANIES).map(([key, c]) => {
        const s = ym(c.start), e = c.end ? ym(c.end) : nowYm + 1;
        return `<div class="g-row"><button class="g-bar ${c.color}" type="button" data-co="${key}" data-formula='=DATEDIF("${c.start}", ${c.end ? `"${c.end}"` : 'TODAY()'}, "m")' ${tipA(`${c.name}: ${period(c)} (${dur(monthsOf(c))}). Click for details`)} style="left:${pct(s)}%;width:${pct(e) - pct(s)}%">${esc(c.name)}</button></div>`;
      }).join('')}
      <p class="g-note">Latest first: ${esc(COMPANIES.trivas.name)} · ${esc(dur(monthsOf(COMPANIES.trivas)))} and counting.</p>`;
    $('#tenureLine').textContent = `${dur(totalMonths)} across 3 teams, from intern to team lead.`;

    $('#kpis').addEventListener('click', (e) => { const k = e.target.closest('.kpi'); if (k) { closeInspector(); k.classList.add('sel'); openMetric(k.dataset.m, k); } });
    $('#chart').addEventListener('click', (e) => { const b = e.target.closest('.bar'); if (b) { closeInspector(); b.classList.add('sel'); openMetric(b.dataset.m, b); } });
    $('#gantt').addEventListener('click', (e) => { const g = e.target.closest('.g-bar'); if (g) { closeInspector(); openCompany(g.dataset.co, g); } });
    $$('[data-goto]').forEach((b) => b.addEventListener('click', () => showSheet(b.dataset.goto)));
  }

  function animateBars() {
    const max = 55;
    $$('#chart .bar').forEach((b, i) => {
      const f = $('.fillbar', b);
      if (reduceMotion) { f.style.width = `${(b.dataset.w / max) * 100}%`; return; }
      f.style.width = '0';
      setTimeout(() => { f.style.width = `${(b.dataset.w / max) * 100}%`; }, 80 + i * 60);
    });
  }

  /* ───────── Experience (grouped rows) ───────── */
  const HEADLINE = { trivas: 'm1', viome: 'm13', datagets: 'm17' };
  function buildExperience() {
    let n = 0;
    const rows = [];
    Object.entries(COMPANIES).forEach(([key, c]) => {
      const head = byId(METRICS, HEADLINE[key]);
      n++;
      rows.push(`<tr class="co" ${tipA('Click for a summary of this role')} data-co="${key}" data-rn="${n}" data-formula='=XLOOKUP("${c.name}", Roles[company], Roles[title])'>
        <td class="rn">${n}</td>
        <td class="gc"><button class="grp" type="button" aria-expanded="false" aria-label="Expand ${esc(c.name)}" ${tipA('Show or hide the work under this role')}>+</button></td>
        <td><span class="dot ${c.color}"></span>${esc(c.name)}<span class="sub-mobile muted" style="font-weight:400">${esc(c.title)} · ${esc(period(c))}</span></td>
        <td class="role-c">${esc(c.title)}</td>
        <td class="per-c">${esc(period(c))}<br><span class="muted" style="font-weight:400">${esc(dur(monthsOf(c)))}</span></td>
        <td class="kr ${head.dir}"><b>${esc(fmtMetric(head))}</b><small>${esc(head.metric)}</small></td>
      </tr>`);
      BULLETS.filter((b) => b.co === key).forEach((b) => {
        n++;
        const m = METRICS.find((x) => x.b === b.id && x.unit === '%') || METRICS.find((x) => x.b === b.id);
        rows.push(`<tr class="sub ${COMPANIES[key].color}" ${tipA('Click for the numbers in this result')} data-parent="${key}" data-b="${b.id}" data-rn="${n}" hidden data-formula='=XLOOKUP("${b.id}", Achievements[bullet], Achievements[metric])'>
          <td class="rn">${n}</td><td class="gc"></td>
          <td class="txt" colspan="3">${rich(b.text)}<div class="chips tags">${b.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div></td>
          <td class="kr ${m.dir}"><b>${esc(fmtMetric(m))}</b><small>${esc(m.metric)}</small></td>
        </tr>`);
      });
    });
    $('#expBody').innerHTML = rows.join('');
    // Excel shows numbers for hidden rows as gaps; keep that behaviour by leaving fixed numbers.
    $('#expBody').addEventListener('click', (e) => {
      const tr = e.target.closest('tr');
      if (!tr) return;
      if (e.target.closest('.grp')) { toggleGroup(tr.dataset.co); return; }
      closeInspector();
      tr.classList.add('sel');
      if (tr.classList.contains('co')) openCompany(tr.dataset.co, tr);
      else openBullet(tr.dataset.b, tr);
    });
    $('#expandAll').addEventListener('click', () => Object.keys(COMPANIES).forEach((k) => toggleGroup(k, true)));
    $('#collapseAll').addEventListener('click', () => Object.keys(COMPANIES).forEach((k) => toggleGroup(k, false)));
  }
  function toggleGroup(key, force) {
    const head = $(`tr.co[data-co="${key}"]`);
    const open = force ?? !head.classList.contains('open');
    head.classList.toggle('open', open);
    const g = $('.grp', head);
    g.textContent = open ? '−' : '+';
    g.setAttribute('aria-expanded', String(open));
    $$(`tr.sub[data-parent="${key}"]`).forEach((r) => { r.hidden = !open; });
  }
  function jumpToBullet(id) {
    const b = byId(BULLETS, id);
    showSheet('experience');
    toggleGroup(b.co, true);
    const row = $(`tr.sub[data-b="${id}"]`);
    requestAnimationFrame(() => {
      row.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash');
    });
  }

  /* ───────── Skills (auto-filter) ───────── */
  function buildSkills() {
    let cat = '';
    const evCount = new Map(SKILLS.flatMap((g) => g.items).map((k) => [k, evidenceFor(k).length]));
    const total = SKILLS.reduce((a, g) => a + g.items.length, 0);
    $('#skillCats').innerHTML = ['All', ...SKILLS.map((g) => g.cat)].map((c, i) => `<button type="button" class="catbtn" data-cat="${i ? esc(c) : ''}" aria-pressed="${i === 0}">${esc(c)}</button>`).join('');
    const render = () => {
      const q = $('#skillSearch').value.trim().toLowerCase();
      let shown = 0;
      const cards = SKILLS.filter((g) => !cat || g.cat === cat).map((g) => {
        const items = g.items.filter((i) => !q || i.toLowerCase().includes(q) || g.cat.toLowerCase().includes(q));
        shown += items.length;
        if (!items.length) return '';
        return `<section class="skill-card" data-formula='=FILTER(Skills, Skills[category]="${esc(g.cat)}")'>
          <h4>${esc(g.cat)}<span>${items.length}</span></h4>
          <div class="pills">${items.map((i) => {
            const n = evCount.get(i);
            return `<button type="button" class="pill${n ? ' used' : ''}" data-skill="${esc(i)}" data-cat="${esc(g.cat)}" ${tipA(n ? `Used in ${n} of my results. Click for details` : 'Click for details')}>${esc(i)}${n ? `<span class="n">${n}</span>` : ''}</button>`;
          }).join('')}</div>
        </section>`;
      }).join('');
      $('#skillGrid').innerHTML = cards || '<p class="muted">No skills match that filter.</p>';
      $('#skillCount').textContent = `${shown} of ${total} skills${cat || q ? ' (filtered)' : ''}`;
    };
    $('#skillGrid').addEventListener('click', (e) => {
      const p = e.target.closest('.pill');
      if (!p) return;
      closeInspector(); p.classList.add('sel');
      openSkill(p.dataset.skill, p.dataset.cat, p);
    });
    $('#skillCats').addEventListener('click', (e) => {
      const b = e.target.closest('.catbtn');
      if (!b) return;
      cat = b.dataset.cat;
      $$('.catbtn', $('#skillCats')).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      render();
    });
    $('#skillSearch').addEventListener('input', render);
    render();
    $('#eduBox').innerHTML = EDUCATION.map((e) => `<b>${esc(e.degree)}</b>${esc(e.institution)}<br><small>${e.start_year} – ${e.end_year} · CGPA ${e.cgpa}</small>`).join('');
    $('#certList').innerHTML = CERTIFICATES.map((c) => `<li><b>${esc(c.name)}</b><small>${esc(c.issuer)}</small></li>`).join('');
  }

  /* ───────── SQL console ───────── */
  let sqlBooted = false;
  const DB = (() => {
    const t = (columns, rows) => ({ columns, rows });
    return {
      roles: t(['company', 'title', 'start_date', 'end_date', 'months'], Object.values(COMPANIES).map((c) => ({ company: c.name, title: c.title, start_date: c.start, end_date: c.end, months: monthsOf(c) }))),
      achievements: t(['id', 'company', 'area', 'metric', 'value', 'unit', 'direction'], METRICS.map((m) => ({ id: m.id, company: COMPANIES[m.co].name, area: m.area, metric: m.metric, value: m.value, unit: m.unit, direction: m.dir }))),
      skills: t(['category', 'skill'], SKILLS.flatMap((g) => g.items.map((i) => ({ category: g.cat, skill: i })))),
      certificates: t(['name', 'issuer'], CERTIFICATES),
      education: t(['degree', 'institution', 'start_year', 'end_year', 'cgpa'], EDUCATION),
      hobbies: t(['hobby', 'note'], HOBBIES),
    };
  })();
  const TABLE_INFO = {
    roles: 'Where I have worked: one row per job.',
    achievements: 'Measured results from each role: one row per number.',
    skills: 'Tools and methods I use, grouped by category.',
    certificates: 'Courses and job simulations I completed.',
    education: 'My degree.',
    hobbies: 'What I do off the clock.',
  };
  const COL_INFO = {
    roles: { company: 'Employer', title: 'Job title', start_date: 'Start month (YYYY-MM)', end_date: 'End month. NULL means current role', months: 'Months in the role so far' },
    achievements: { id: 'Unique ID of the result', company: 'Employer', area: 'Kind of work', metric: 'What was measured', value: 'The number achieved', unit: 'Unit: %, people, sessions…', direction: 'up, down, held, level or count' },
    skills: { category: 'Skill group', skill: 'Tool or method' },
    certificates: { name: 'Certificate name', issuer: 'Who issued it' },
    education: { degree: 'Degree', institution: 'College', start_year: 'First year', end_year: 'Graduation year', cgpa: 'Cumulative grade point average' },
    hobbies: { hobby: 'Hobby', note: 'A bit more detail' },
  };
  let lastResult = null;
  const EXAMPLES = [
    ["Biggest cuts", "SELECT company, metric, value FROM achievements WHERE unit = '%' AND direction = 'down' ORDER BY value DESC"],
    ["Wins per company", "SELECT company, COUNT(*) AS wins, MAX(value) AS best_pct FROM achievements WHERE direction IN ('up', 'down') GROUP BY company"],
    ["Analytics skills", "SELECT skill FROM skills WHERE category LIKE '%Analytics%'"],
    ["Career", "SELECT company, title, months FROM roles ORDER BY start_date DESC"],
    ["Hobbies", "SELECT * FROM hobbies"],
  ];
  const sqlInput = $('#sqlInput');
  function bootSql() {
    sqlBooted = true;
    $('#schema').innerHTML = Object.entries(DB).map(([name, tb]) => `
      <div class="tbl"><div class="trow"><button class="tname" type="button" data-t="${name}" ${tipA(`Show all rows of ${name}`)}>${name}<small>${tb.rows.length}</small></button>
      <button class="info" type="button" data-info="${name}" aria-label="About the ${name} table" ${tipA('Describe this table')}>i</button></div>
      <p class="why">${esc(TABLE_INFO[name])}</p>
      <ul>${tb.columns.map((c) => `<li ${tipA(COL_INFO[name][c])}>${c}</li>`).join('')}</ul></div>`).join('');
    $('#schema').addEventListener('click', (e) => {
      const i = e.target.closest('.info');
      if (i) { closeInspector(); openTable(i.dataset.info, i); return; }
      const b = e.target.closest('.tname');
      if (b) setSql(`SELECT * FROM ${b.dataset.t}`, true);
    });
    $('#copySql').addEventListener('click', () => {
      navigator.clipboard?.writeText(sqlInput.value).then(() => flashStatus('SQL copied'), () => flashStatus('Copy failed'));
    });
    $('#sqlOut').addEventListener('click', (e) => {
      const tr = e.target.closest('tbody tr');
      if (!tr || !lastResult) return;
      closeInspector(); tr.classList.add('sel');
      openRow(lastResult, +tr.dataset.i, tr);
    });
    $('#examples').insertAdjacentHTML('beforeend', EXAMPLES.map(([l, q], i) => `<button type="button" data-q="${i}">${esc(l)}</button>`).join(''));
    $('#examples').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setSql(EXAMPLES[+b.dataset.q][1], true); });
    $('#runSql').addEventListener('click', runSql);
    sqlInput.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runSql(); } });
    bootAsk();
    setSql(EXAMPLES[0][1], true);
  }
  function setSql(q, run) { $('#askAnswer').hidden = true; sqlInput.value = q; if (run) runSql(); }
  function runSql() {
    const out = $('#sqlOut');
    let result = null;
    const t0 = performance.now();
    try {
      const r = MiniSQL.run(sqlInput.value, DB);
      result = r;
      lastResult = r;
      const info = COL_INFO[r.table] || {};
      const ms = (performance.now() - t0).toFixed(1);
      $('#sqlMeta').textContent = `${r.rows.length} row${r.rows.length === 1 ? '' : 's'} · ${ms} ms`;
      const cell = (v) => (v == null ? '<span class="null">NULL</span>' : typeof v === 'number' ? v.toLocaleString('en-US') : esc(v));
      out.innerHTML = r.rows.length
        ? `<table class="xl"><thead><tr><th class="rn"></th>${r.headers.map((h) => `<th ${info[h] ? tipA(info[h]) : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${r.rows.map((row, i) => `<tr data-i="${i}"><td class="rn">${i + 1}</td>${row.map((v) => `<td class="${typeof v === 'number' ? 'num' : ''}">${cell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
        : '<p class="muted" style="padding:12px 16px;margin:0">0 rows returned.</p>';
      setFormula(`=RUN("${sqlInput.value.replace(/\s+/g, ' ').trim().slice(0, 120)}")`);
    } catch (err) {
      lastResult = null;
      $('#sqlMeta').textContent = 'error';
      out.innerHTML = `<p class="sqlerr" role="alert">${esc(err.message)}</p>`;
    }
    return result;
  }

  /* Plain-English questions */
  const ASK_EXAMPLES = [
    'What did Harsh achieve at Trivas?',
    'Does he know Tableau?',
    'What is his biggest achievement?',
  ];
  function bootAsk() {
    $('#askExamples').insertAdjacentHTML('beforeend', ASK_EXAMPLES.map((q) => `<button type="button">${esc(q)}</button>`).join(''));
    $('#askExamples').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { $('#askInput').value = b.textContent; ask(b.textContent); } });
    $('#askForm').addEventListener('submit', (e) => { e.preventDefault(); ask($('#askInput').value); });
  }
  function ask(question) {
    const box = $('#askAnswer');
    const t = NL.translate(question, DB);
    if (!t) {
      box.hidden = false;
      box.className = 'answer miss';
      box.innerHTML = `<p class="a">I couldn't map that to my data.</p><p class="note">Try asking about my roles, results, skills, education, certificates or hobbies, or use one of the examples above.</p>`;
      return;
    }
    box.hidden = true;
    setSql(t.sql, true);
  }


  /* ───────── Contact ───────── */
  function buildContact() {
    const rows = [
      ['Email', `<a href="mailto:${PROFILE.email}">${PROFILE.email}</a><button class="copy" type="button" data-copy="${PROFILE.email}">Copy</button>`],
      ['Phone', `<a href="tel:${PROFILE.phone.replace(/[^+\d]/g, '')}">${PROFILE.phone}</a>`],
      ['LinkedIn', `<a href="${PROFILE.linkedin}" target="_blank" rel="noopener">in/kumarharshh</a>`],
      ['GitHub', `<a href="${PROFILE.github}" target="_blank" rel="noopener">harshhkumar</a>`],
      ['Kaggle', `<a href="${PROFILE.kaggle}" target="_blank" rel="noopener">okayharsh</a>`],
      ['Resume', `<a href="${PROFILE.resume}" target="_blank" rel="noopener">Harsh_Kumar_Resume.pdf</a>`],
    ];
    $('#contactBody').innerHTML = rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('');
    $('#contactBody').addEventListener('click', (e) => {
      const b = e.target.closest('[data-copy]');
      if (!b) return;
      navigator.clipboard?.writeText(b.dataset.copy).then(() => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 1500); }, () => {});
    });
    $('#composeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target, btn = $('#sendBtn'), note = $('#sendNote');
      const f = new FormData(form);
      const subject = f.get('subject') || 'Hello from your portfolio';
      const body = `Hi Harsh,\n\n${f.get('message')}\n\n${f.get('name')}`;
      const showNote = (html, ok) => { note.innerHTML = html; note.hidden = false; note.className = 'form-note ' + (ok ? 'ok' : 'err'); };
      btn.disabled = true; btn.textContent = 'Sending…';
      try {
        const res = await fetch(`https://formsubmit.co/ajax/${PROFILE.email}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name: f.get('name'), _subject: subject, message: f.get('message'), _template: 'table', _captcha: 'false' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === 'false' || data.success === false) throw new Error(data.message || 'send failed');
        showNote('Message sent. Thank you, I will get back to you soon.', true);
        form.reset(); $('#cSubject').value = 'Hello from your portfolio';
      } catch (err) {
        const gmail = `https://mail.google.com/mail/?view=cm&to=${PROFILE.email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const mailto = `mailto:${PROFILE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        showNote(`Could not send from here. <a href="${gmail}" target="_blank" rel="noopener">Open in Gmail</a> or <a href="${mailto}">use your mail app</a>, or write to ${PROFILE.email}.`, false);
      } finally {
        btn.disabled = false; btn.textContent = 'Send message';
      }
    });
  }

  /* ───────── Chrome: theme, share ───────── */
  const flashStatus = (msg) => {
    const el = $('.status .ready');
    el.textContent = msg;
    setTimeout(() => { el.textContent = 'Ready'; }, 1800);
  };
  $('#themeBtn').addEventListener('click', () => {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) { /* storage unavailable */ }
  });
  /* ───────── Share / export ───────── */
  /* The Excel workbook: a dashboard of pivot-style tables (live formulas), then the underlying sheets. */
  function buildWorkbook() {
    const A = DB.achievements.rows;
    const N = A.length + 1;                                  // last data row on the Results sheet
    const R = (col) => `Results!$${col}$2:$${col}$${N}`;
    const isChg = (r) => r.direction === 'up' || r.direction === 'down';
    const H = (arr) => arr.map((v) => ({ v, s: 'hdr' }));
    const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    const chgs = (list) => list.filter(isChg).map((r) => r.value);

    /* ── Results (source data) ── */
    const results = {
      name: 'Results', tab: 'FF2563EB', freeze: 1, widths: [8, 15, 20, 40, 12, 12, 12, 12],
      rows: [H(['id', 'company', 'area', 'metric', 'value', 'unit', 'direction', 'change_pct']),
        ...A.map((r) => [r.id, r.company, r.area, r.metric, r.value, r.unit, r.direction, isChg(r) ? r.value : null])],
    };

    /* ── Dashboard ── */
    const rows = [], merges = [], bars = [], meta = {};
    const put = (r, c, cell) => { (rows[r] = rows[r] || [])[c] = cell; };
    const section = (r, text, span) => { for (let c = 0; c < span; c++) put(r, c, { v: c ? null : text, s: 'sec' }); merges.push(`A${r + 1}:${colName(span - 1)}${r + 1}`); meta[r] = { ht: 24 }; };
    const hdr = (r, labels) => labels.forEach((l, c) => put(r, c, { v: l, s: 'hdr' }));
    let r = 0;

    put(r, 0, { v: PROFILE.name, s: 'title' }); merges.push('A1:D1'); meta[r] = { ht: 36 }; r++;
    put(r, 0, { v: `Data & Product Analyst  ·  ${PROFILE.email}  ·  ${PROFILE.linkedin.replace('https://www.', '')}`, s: 'sub' }); merges.push('A2:F2'); r += 2;

    section(r, 'Key results', 7); r++;
    KPIS.forEach((k, c) => {
      put(r, c, { v: `${k.prefix || ''}${k.val}${k.suffix || ''}`, s: 'kpiV' });
      put(r + 1, c, { v: k.label, s: 'kpiL' });
      put(r + 2, c, { v: k.note, s: 'kpiN' });
    });
    meta[r] = { ht: 38 }; meta[r + 1] = { ht: 32 }; meta[r + 2] = { ht: 40 };
    r += 4;

    /* Pivot: results by company */
    section(r, 'Results by company', 7); r++;
    hdr(r, ['Company', 'Role', 'Months', 'Results', 'Results in %', 'Avg % change', 'Biggest % change']); r++;
    const c0 = r;
    Object.values(COMPANIES).forEach((c) => {
      const mine = A.filter((x) => x.company === c.name);
      const row = r + 1;
      put(r, 0, { v: c.name, s: 'txt' });
      put(r, 1, { v: c.title, s: 'txt' });
      put(r, 2, { v: monthsOf(c), s: 'int' });
      put(r, 3, { v: mine.length, f: `COUNTIF(${R('B')},$A${row})`, s: 'int' });
      put(r, 4, { v: mine.filter((x) => x.unit === '%').length, f: `COUNTIFS(${R('B')},$A${row},${R('F')},"%")`, s: 'int' });
      put(r, 5, { v: avg(chgs(mine)), f: `IFERROR(AVERAGEIFS(${R('H')},${R('B')},$A${row}),0)`, s: 'pct1' });
      put(r, 6, { v: Math.max(0, ...chgs(mine)), f: `SUMPRODUCT(MAX((${R('B')}=$A${row})*${R('H')}))`, s: 'pct' });
      r++;
    });
    put(r, 0, { v: 'Grand total', s: 'tot' }); put(r, 1, { v: null, s: 'tot' });
    put(r, 2, { v: Object.values(COMPANIES).reduce((a, c) => a + monthsOf(c), 0), f: `SUM(C${c0 + 1}:C${r})`, s: 'totInt' });
    put(r, 3, { v: A.length, f: `SUM(D${c0 + 1}:D${r})`, s: 'totInt' });
    put(r, 4, { v: A.filter((x) => x.unit === '%').length, f: `SUM(E${c0 + 1}:E${r})`, s: 'totInt' });
    put(r, 5, { v: avg(chgs(A)), f: `AVERAGE(${R('H')})`, s: 'totPct1' });
    put(r, 6, { v: Math.max(...chgs(A)), f: `MAX(${R('H')})`, s: 'totPct1' });
    bars.push(`D${c0 + 1}:D${r}`, `F${c0 + 1}:F${r}`);
    r += 2;

    /* Impact scoreboard */
    section(r, 'Impact scoreboard (percent change)', 7); r++;
    hdr(r, ['Result', 'Company', 'Change (%)', 'Direction']); r++;
    const s0 = r;
    A.map((x, i) => ({ x, row: i + 2 })).filter(({ x }) => isChg(x)).sort((a, b) => b.x.value - a.x.value).forEach(({ x, row }) => {
      put(r, 0, { v: x.metric, f: `Results!D${row}`, s: 'txt' });
      put(r, 1, { v: x.company, f: `Results!B${row}`, s: 'txt' });
      put(r, 2, { v: x.value, f: `Results!H${row}`, s: 'pct' });
      put(r, 3, { v: x.direction === 'up' ? '▲ lift' : '▼ reduction', f: `IF(Results!G${row}="up","▲ lift","▼ reduction")`, s: 'txt' });
      r++;
    });
    bars.push(`C${s0 + 1}:C${r}`);
    r++;

    /* Pivot: results by area */
    section(r, 'Results by area', 7); r++;
    hdr(r, ['Area', 'Results', 'Avg % change', 'Biggest % change']); r++;
    const areas = [...new Set(A.map((x) => x.area))].map((a) => ({ a, n: A.filter((x) => x.area === a).length })).sort((p, q) => q.n - p.n || p.a.localeCompare(q.a));
    const a0 = r;
    areas.forEach(({ a, n }) => {
      const row = r + 1;
      const ch = chgs(A.filter((x) => x.area === a));
      put(r, 0, { v: a, s: 'txt' });
      put(r, 1, { v: n, f: `COUNTIF(${R('C')},$A${row})`, s: 'int' });
      if (ch.length) {
        put(r, 2, { v: avg(ch), f: `IFERROR(AVERAGEIFS(${R('H')},${R('C')},$A${row}),0)`, s: 'pct1' });
        put(r, 3, { v: Math.max(...ch), f: `SUMPRODUCT(MAX((${R('C')}=$A${row})*${R('H')}))`, s: 'pct' });
      } else { put(r, 2, { v: '-', s: 'txt' }); put(r, 3, { v: '-', s: 'txt' }); }
      r++;
    });
    put(r, 0, { v: 'Grand total', s: 'tot' });
    put(r, 1, { v: A.length, f: `SUM(B${a0 + 1}:B${r})`, s: 'totInt' });
    put(r, 2, { v: avg(chgs(A)), f: `AVERAGE(${R('H')})`, s: 'totPct1' });
    put(r, 3, { v: Math.max(...chgs(A)), f: `MAX(${R('H')})`, s: 'totPct1' });
    bars.push(`B${a0 + 1}:B${r}`);
    r += 2;

    /* Pivot: skills by category */
    const flat = SKILLS.flatMap((g) => g.items.map((i) => [g.cat, i, evidenceFor(i).length]));
    const K = flat.length + 1;
    section(r, 'Skills by category', 7); r++;
    hdr(r, ['Category', 'Skills', 'Used in results']); r++;
    const k0 = r;
    SKILLS.forEach((g) => {
      const row = r + 1;
      put(r, 0, { v: g.cat, s: 'txt' });
      put(r, 1, { v: g.items.length, f: `COUNTIF(Skills!$A$2:$A$${K},$A${row})`, s: 'int' });
      put(r, 2, { v: flat.filter((x) => x[0] === g.cat).reduce((a, x) => a + x[2], 0), f: `SUMIF(Skills!$A$2:$A$${K},$A${row},Skills!$C$2:$C$${K})`, s: 'int' });
      r++;
    });
    put(r, 0, { v: 'Grand total', s: 'tot' });
    put(r, 1, { v: flat.length, f: `SUM(B${k0 + 1}:B${r})`, s: 'totInt' });
    put(r, 2, { v: flat.reduce((a, x) => a + x[2], 0), f: `SUM(C${k0 + 1}:C${r})`, s: 'totInt' });
    bars.push(`B${k0 + 1}:B${r}`, `C${k0 + 1}:C${r}`);

    const dashboard = { name: 'Dashboard', tab: 'FF107C41', grid: false, widths: [38, 24, 22, 22, 22, 22, 22], rows, merges, bars, meta };

    /* ── Experience: grouped rows, like the + buttons on the site ── */
    const exRows = [H(['Company / Work', 'Role', 'Period', 'Key result', 'Tags'])];
    const exMeta = { 0: { ht: 22 } };
    Object.entries(COMPANIES).forEach(([key, c]) => {
      const head = byId(METRICS, HEADLINE[key]);
      exRows.push([{ v: c.name, s: 'co' }, { v: c.title, s: 'co' }, { v: `${period(c)}  (${dur(monthsOf(c))})`, s: 'co' }, { v: `${fmtMetric(head, false)} ${head.metric}`, s: 'co' }, { v: null, s: 'co' }]);
      BULLETS.filter((b) => b.co === key).forEach((b) => {
        const m = METRICS.find((x) => x.b === b.id && x.unit === '%') || METRICS.find((x) => x.b === b.id);
        exRows.push([{ v: plain(b.text), s: 'wrapInd' }, null, null, { v: `${fmtMetric(m, false)} ${m.metric}`, s: 'wrap' }, { v: b.tags.join(', '), s: 'wrap' }]);
        exMeta[exRows.length - 1] = { level: 1 };
      });
    });
    const experience = { name: 'Experience', freeze: 1, outline: true, widths: [92, 24, 30, 36, 40], rows: exRows, meta: exMeta };

    const skills = { name: 'Skills', freeze: 1, tab: 'FF2563EB', widths: [30, 36, 20], rows: [H(['Category', 'Skill', 'Results that used it']), ...flat] };
    const education = { name: 'Education', freeze: 1, widths: [14, 70, 44, 26], rows: [H(['Type', 'Name', 'Institution / Issuer', 'Years / Notes']),
      ...EDUCATION.map((e) => ['Education', e.degree, e.institution, `${e.start_year} - ${e.end_year}, CGPA ${e.cgpa}`]),
      ...CERTIFICATES.map((c) => ['Certificate', c.name, c.issuer, ''])] };
    const contact = { name: 'Contact', freeze: 1, widths: [14, 52], rows: [H(['Channel', 'Value']), ['Email', PROFILE.email], ['Phone', PROFILE.phone], ['LinkedIn', PROFILE.linkedin], ['GitHub', PROFILE.github], ['Kaggle', PROFILE.kaggle]] };

    return [dashboard, experience, results, skills, education, contact];
  }

  const dlg = $('#shareDlg');
  $('#shareBtn').addEventListener('click', () => {
    $('#linkWhat').textContent = `${location.origin === 'null' ? '' : location.origin}${location.pathname}#${current}`;
    dlg.showModal();
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  $('#dlXlsx').addEventListener('click', () => {
    Exporter.download(Exporter.xlsx(buildWorkbook()), 'Harsh_Kumar_Portfolio.xlsx');
    dlg.close(); flashStatus('Workbook downloaded');
  });
  $('#dlLink').addEventListener('click', () => {
    navigator.clipboard?.writeText(location.href).then(() => flashStatus('Link copied'), () => flashStatus('Copy failed'));
    dlg.close();
  });

  /* ───────── Boot ───────── */
  buildTabs();
  $$('.sheet').forEach(buildSurface);
  buildSummary();
  buildExperience();
  buildSkills();
  buildContact();
  $$('.objects').forEach((o) => o.addEventListener('click', onGridClick));
  document.addEventListener('click', (e) => { if (!e.target.closest('.sheets, .tabs')) gridActive = false; });
  window.addEventListener('hashchange', () => showSheet(location.hash.slice(1), { push: false }));
  showSheet(location.hash.slice(1) || 'summary', { push: false });
  document.documentElement.classList.remove('pending');
})();
