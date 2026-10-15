/* A tiny in-browser SQL engine, just enough to query the career data.
   SELECT [DISTINCT] cols FROM t [WHERE ..] [GROUP BY col] [ORDER BY col [DESC]] [LIMIT n]
   Aggregates: COUNT(*), COUNT(col), SUM, AVG, MIN, MAX. Operators: = != <> < > <= >= LIKE IN AND OR NOT */

const MiniSQL = (() => {
  const KEYWORDS = new Set(['select', 'distinct', 'from', 'where', 'group', 'by', 'order', 'limit', 'asc', 'desc', 'as', 'and', 'or', 'not', 'like', 'in', 'is', 'null']);
  const AGGS = new Set(['count', 'sum', 'avg', 'min', 'max']);

  function tokenize(sql) {
    const out = [];
    const re = /\s*(?:(--[^\n]*)|('(?:[^']|'')*')|(\d+(?:\.\d+)?)|([A-Za-z_][\w]*)|(<=|>=|<>|!=|[=<>(),*;]))/y;
    let pos = 0;
    sql = sql.trim();
    while (pos < sql.length) {
      re.lastIndex = pos;
      const m = re.exec(sql);
      if (!m) throw new Error(`Unexpected character "${sql[pos]}" near position ${pos + 1}`);
      pos = re.lastIndex;
      if (m[1]) continue;
      if (m[2] !== undefined) out.push({ t: 'str', v: m[2].slice(1, -1).replace(/''/g, "'") });
      else if (m[3] !== undefined) out.push({ t: 'num', v: parseFloat(m[3]) });
      else if (m[4] !== undefined) {
        const low = m[4].toLowerCase();
        out.push(KEYWORDS.has(low) ? { t: 'kw', v: low } : { t: 'id', v: m[4] });
      } else out.push({ t: 'op', v: m[5] });
      while (pos < sql.length && /\s/.test(sql[pos])) pos++;
    }
    return out;
  }

  function parse(tokens) {
    let i = 0;
    const peek = () => tokens[i];
    const isKw = (v) => peek() && peek().t === 'kw' && peek().v === v;
    const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
    const eatKw = (v) => { if (isKw(v)) { i++; return true; } return false; };
    const eatOp = (v) => { if (isOp(v)) { i++; return true; } return false; };
    const expectKw = (v) => { if (!eatKw(v)) throw new Error(`Expected ${v.toUpperCase()}${peek() ? ` but found "${peek().v}"` : ' but the query ended'}`); };
    const expectOp = (v) => { if (!eatOp(v)) throw new Error(`Expected "${v}"${peek() ? ` but found "${peek().v}"` : ' but the query ended'}`); };
    const ident = () => {
      const t = peek();
      if (!t || t.t !== 'id') throw new Error(`Expected a name${t ? ` but found "${t.v}"` : ''}`);
      i++;
      return t.v;
    };

    expectKw('select');
    const q = { distinct: false, cols: [], from: null, where: null, groupBy: null, orderBy: [], limit: null };
    q.distinct = eatKw('distinct');

    do {
      if (eatOp('*')) { q.cols.push({ star: true }); continue; }
      const t = peek();
      if (t && t.t === 'id' && AGGS.has(t.v.toLowerCase()) && tokens[i + 1] && tokens[i + 1].v === '(') {
        const fn = t.v.toLowerCase();
        i += 2;
        let arg = '*';
        if (!eatOp('*')) arg = ident();
        expectOp(')');
        const col = { agg: fn, arg, label: `${fn}(${arg})` };
        if (eatKw('as')) col.label = ident();
        q.cols.push(col);
      } else {
        const name = ident();
        const col = { name, label: name };
        if (eatKw('as')) col.label = ident();
        q.cols.push(col);
      }
    } while (eatOp(','));

    expectKw('from');
    q.from = ident();

    if (eatKw('where')) q.where = parseOr();
    if (eatKw('group')) { expectKw('by'); q.groupBy = ident(); }
    if (eatKw('order')) {
      expectKw('by');
      do {
        const name = ident();
        let desc = false;
        if (eatKw('desc')) desc = true; else eatKw('asc');
        q.orderBy.push({ name, desc });
      } while (eatOp(','));
    }
    if (eatKw('limit')) {
      const t = peek();
      if (!t || t.t !== 'num') throw new Error('LIMIT needs a number');
      i++;
      q.limit = t.v;
    }
    eatOp(';');
    if (i < tokens.length) throw new Error(`Unexpected "${tokens[i].v}"`);
    return q;

    function parseOr() {
      let left = parseAnd();
      while (eatKw('or')) { const right = parseAnd(); const l = left; left = (r, g) => l(r, g) || right(r, g); }
      return left;
    }
    function parseAnd() {
      let left = parseNot();
      while (eatKw('and')) { const right = parseNot(); const l = left; left = (r, g) => l(r, g) && right(r, g); }
      return left;
    }
    function parseNot() {
      if (eatKw('not')) { const inner = parseNot(); return (r, g) => !inner(r, g); }
      return parsePred();
    }
    function operand() {
      const t = peek();
      if (!t) throw new Error('Expected a value');
      i++;
      if (t.t === 'num' || t.t === 'str') return () => t.v;
      if (t.t === 'id') return (r, get) => get(r, t.v);
      throw new Error(`Unexpected "${t.v}"`);
    }
    function parsePred() {
      if (eatOp('(')) { const inner = parseOr(); expectOp(')'); return inner; }
      const a = operand();
      if (eatKw('is')) {
        const neg = eatKw('not');
        expectKw('null');
        return (r, get) => ((a(r, get) == null) !== neg);
      }
      let neg = eatKw('not');
      if (eatKw('like')) {
        const b = operand();
        return (r, get) => {
          const pat = String(b(r, get)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
          return new RegExp(`^${pat}$`, 'i').test(String(a(r, get))) !== neg;
        };
      }
      if (eatKw('in')) {
        expectOp('(');
        const list = [];
        do { list.push(operand()); } while (eatOp(','));
        expectOp(')');
        return (r, get) => list.some((f) => cmp(a(r, get), f(r, get)) === 0) !== neg;
      }
      const t = peek();
      if (!t || t.t !== 'op' || !['=', '!=', '<>', '<', '>', '<=', '>='].includes(t.v)) throw new Error(`Expected a comparison (=, <, >, LIKE, IN) after "${tokens[i - 1].v}"`);
      i++;
      const b = operand();
      return (r, get) => {
        const c = cmp(a(r, get), b(r, get));
        switch (t.v) {
          case '=': return c === 0;
          case '!=': case '<>': return c !== 0;
          case '<': return c < 0;
          case '>': return c > 0;
          case '<=': return c <= 0;
          default: return c >= 0;
        }
      };
    }
  }

  function cmp(a, b) {
    if (a == null || b == null) return a == b ? 0 : NaN;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).toLowerCase().localeCompare(String(b).toLowerCase());
  }

  function run(sql, db) {
    const q = parse(tokenize(sql));
    const tableName = Object.keys(db).find((k) => k.toLowerCase() === q.from.toLowerCase());
    if (!tableName) throw new Error(`No table called "${q.from}". Available: ${Object.keys(db).join(', ')}`);
    const table = db[tableName];
    const colNames = table.columns;
    const resolve = (name) => {
      const c = colNames.find((x) => x.toLowerCase() === name.toLowerCase());
      if (!c) throw new Error(`No column "${name}" in ${tableName}. Columns: ${colNames.join(', ')}`);
      return c;
    };
    const get = (row, name) => row[resolve(name)];

    let rows = table.rows;
    if (q.where) rows = rows.filter((r) => q.where(r, get));

    const hasAgg = q.cols.some((c) => c.agg);
    let out; let headers;

    if (hasAgg || q.groupBy) {
      const groupCol = q.groupBy ? resolve(q.groupBy) : null;
      const groups = new Map();
      rows.forEach((r) => {
        const k = groupCol ? r[groupCol] : '_all';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(r);
      });
      if (!groups.size && !groupCol) groups.set('_all', []);
      headers = q.cols.map((c) => {
        if (c.star) throw new Error('Cannot use * together with GROUP BY or aggregates');
        if (!c.agg && (!groupCol || resolve(c.name) !== groupCol)) throw new Error(`"${c.name}" must be in GROUP BY or inside an aggregate`);
        return c.label;
      });
      out = [...groups.entries()].map(([, g]) => q.cols.map((c) => {
        if (!c.agg) return g[0][resolve(c.name)];
        if (c.agg === 'count') return c.arg === '*' ? g.length : g.filter((r) => r[resolve(c.arg)] != null).length;
        const vals = g.map((r) => r[resolve(c.arg)]).filter((v) => v != null);
        if (c.agg === 'min' || c.agg === 'max') {
          if (!vals.length) return null;
          return vals.reduce((a, b) => ((c.agg === 'min' ? cmp(b, a) < 0 : cmp(b, a) > 0) ? b : a));
        }
        const nums = vals.filter((v) => typeof v === 'number');
        if (!nums.length) throw new Error(`${c.agg.toUpperCase()}(${c.arg}) needs a numeric column`);
        const s = nums.reduce((a, b) => a + b, 0);
        return c.agg === 'sum' ? s : Math.round((s / nums.length) * 100) / 100;
      }));
    } else {
      const picked = [];
      q.cols.forEach((c) => {
        if (c.star) colNames.forEach((n) => picked.push({ name: n, label: n }));
        else picked.push({ name: resolve(c.name), label: c.label });
      });
      headers = picked.map((p) => p.label);
      out = rows.map((r) => picked.map((p) => r[p.name]));
      // ORDER BY may refer to a column that is not selected, so sort the source rows first
      if (q.orderBy.length) {
        const idx = rows.map((_, n) => n);
        idx.sort((x, y) => {
          for (const o of q.orderBy) {
            const c = resolve(o.name);
            const d = cmp(rows[x][c], rows[y][c]);
            if (d) return o.desc ? -d : d;
          }
          return 0;
        });
        out = idx.map((n) => out[n]);
        q.orderBy = [];
      }
    }

    if (q.orderBy.length) {
      const keys = q.orderBy.map((o) => {
        const k = headers.findIndex((h) => h.toLowerCase() === o.name.toLowerCase());
        if (k < 0) throw new Error(`Cannot ORDER BY "${o.name}" here. Use one of: ${headers.join(', ')}`);
        return { k, desc: o.desc };
      });
      out.sort((x, y) => {
        for (const { k, desc } of keys) {
          const d = cmp(x[k], y[k]);
          if (d) return desc ? -d : d;
        }
        return 0;
      });
    }
    if (q.distinct) {
      const seen = new Set();
      out = out.filter((r) => { const k = JSON.stringify(r); if (seen.has(k)) return false; seen.add(k); return true; });
    }
    if (q.limit != null) out = out.slice(0, q.limit);
    return { headers, rows: out, table: tableName };
  }

  return { run };
})();
