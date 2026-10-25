/* Plain-English → SQL, using rules (no AI model, no network).
   It understands questions about roles, achievements, skills, education, certificates and hobbies,
   and falls back to a keyword search across the data. translate() returns { sql, answer(result) } or null. */

const NL = (() => {
  const STOP = new Set(('a an the is are was were be been do does did done has have had can could would should will what whats which who whom whose when where why how ' +
    'harsh he his him her she they their you your i me my we our us of in on at to for from with by about as and or but if so than then that this these those there ' +
    'tell show give list all any some please explain describe find get say know really also just very much many more most data').split(' '));

  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const word = (q, w) => new RegExp(`(^|[^a-z0-9])${escRe(w)}([^a-z0-9]|$)`).test(q);
  const q1 = (s) => `'${s.replace(/'/g, "''")}'`;

  const DIR_DOWN = /\b(reduc\w*|cut\w*|decreas\w*|lower\w*|faster|shorter|slash\w*|drop\w*|fewer|less)\b/;
  const DIR_UP = /\b(increas\w*|lift\w*|boost\w*|grow\w*|grew|rais\w*|higher|improv\w*|gain\w*|uplift)\b/;
  const SUPER = /\b(biggest|best|highest|largest|top|greatest|strongest|most impressive|proudest)\b/;
  const ACHIEVE = /\b(achiev\w*|accomplish\w*|result\w*|impact\w*|metric\w*|percent\w*|number\w*|win|wins|deliver\w*|drove|driv\w*|built|improv\w*|reduc\w*|cut|increas\w*|lift\w*|boost\w*|conversion|retention|revenue|latency|accuracy|onboarding|ctr|click\w*|downtime|automat\w*)\b|%/;

  /* keyword → SQL condition on the achievements table */
  const TOPICS = [
    [/\ba\/b\b|\bab test\w*|experiment\w*/, "area = 'Experimentation'"],
    [/refund\w*/, "metric LIKE '%refund%'"],
    [/wingman/, "area = 'Wingman'"],
    [/ai analyst/, "area = 'AI Analyst'"],
    [/onboard\w*/, "metric LIKE '%onboarding%'"],
    [/retention|retain\w*/, "metric LIKE '%retention%'"],
    [/conversion\w*/, "metric LIKE '%conversion%'"],
    [/revenue|subscription\w*/, "metric LIKE '%revenue%'"],
    [/latency|refresh\w*/, "metric LIKE '%latency%'"],
    [/accura\w*/, "metric LIKE '%accuracy%'"],
    [/ctr|click\w*|recommend\w*/, "area = 'Recommendations'"],
    [/dashboard\w*|self.?serve/, "area = 'Dashboards'"],
    [/migrat\w*|downtime/, "area = 'Migration'"],
    [/automat\w*|manual/, "area = 'Automation'"],
    [/stakeholder\w*|wbr|mbr|present\w*/, "area = 'Stakeholders'"],
    [/on.?time|delivery/, "metric LIKE '%delivery%'"],
    [/roadmap/, "metric LIKE '%roadmap%'"],
    [/integration\w*|sources?\b/, "metric LIKE '%integration%'"],
    [/sub.?brand\w*/, "metric LIKE '%sub-brand%'"],
    [/merchant\w*/, "metric LIKE '%merchant%'"],
    [/customer\w*/, "metric LIKE '%customers%'"],
    [/session\w*/, "metric LIKE '%session%'"],
  ];

  const CATS = [
    [/\blanguages?\b|\bprogramming\b/, 'Languages'],
    [/\bplatforms?\b|\bcloud\b|\bwarehouse\w*/, 'Data Platforms'],
    [/\bbi\b|visuali[sz]\w*|\bdashboard tools?\b|\breporting tools?\b/, 'BI'],
    [/\bengineering\b|\bpipelines?\b|\betl\b/, 'Data Engineering'],
    [/\bproduct\b|\banalytics\b|\banalysis\b/, 'Analytics'],
    [/\bapis?\b|\bdev ?tools?\b/, 'APIs'],
    [/\bsoft skills?\b|\bcommunication\b|\bcollaborat\w*/, 'Soft'],
  ];

  function skillMatch(q, db) {
    const names = db.skills.rows.map((r) => r.skill);
    const alias = { git: 'git/github', github: 'git/github', 'power bi': 'power bi', powerbi: 'power bi', 'ab testing': 'a/b' };
    const hits = [];
    for (const n of names) {
      const base = n.toLowerCase().replace(/\s*\(.*\)/, '');
      if (word(q, base)) hits.push(base);
    }
    if (hits.length) return hits;
    for (const [a, b] of Object.entries(alias)) if (word(q, a)) return [b];
    for (const n of names) {          // single long words from multi-word skills, e.g. "redshift", "modeling"
      const toks = n.toLowerCase().replace(/[()]/g, '').split(/[\s,&]+/);
      if (toks.length > 1) for (const t of toks) if (t.length >= 6 && !STOP.has(t) && word(q, t)) hits.push(t);
    }
    return [...new Set(hits)];
  }

  function translate(raw, db) {
    const q = raw.toLowerCase().replace(/[?!,;:"]/g, ' ').replace(/\.(?!\w)/g, ' ').replace(/\s+/g, ' ').trim();
    if (!q) return null;

    const companies = db.roles.rows.map((r) => r.company).filter((c) => q.includes(c.toLowerCase().replace(/\.ai$/, '')));
    const compSql = companies.length === 1 ? `company = ${q1(companies[0])}` : companies.length > 1 ? `company IN (${companies.map(q1).join(', ')})` : '';
    const limit = (q.match(/\btop (\d+)\b/) || [])[1];
    const howMany = /\bhow many\b|\bnumber of\b|\bcount\b/.test(q);
    const asksSkills = /\bskills?\b|\btools?\b|\btech(nolog\w*)?\b|\bstack\b|\bsoftware\b|\bproficient\b|\bgood at\b|\bexpert\w*\b/.test(q);

    // ── education / certificates / hobbies ──
    if (/\b(educat\w*|degree|college|universit\w*|studied|study|cgpa|gpa|graduat\w*|b\.?tech|school)\b/.test(q))
      return { sql: 'SELECT * FROM education', answer: (r) => r.rows.length ? `${r.rows[0][0]} at ${r.rows[0][1]} (${r.rows[0][2]}–${r.rows[0][3]}, CGPA ${r.rows[0][4]}).` : null };
    if (/\b(certif\w*|courses?|credentials?|licen[sc]es?)\b/.test(q))
      return { sql: 'SELECT * FROM certificates', answer: (r) => `${r.rows.length} certificates, from ${[...new Set(r.rows.map((x) => x[1]))].join(', ')}.` };
    if (/\b(hobb\w*|free time|spare time|outside (of )?work|for fun|chess|snooker|interests?|off the clock)\b/.test(q))
      return { sql: 'SELECT * FROM hobbies', answer: (r) => `${r.rows.map((x) => x[0]).join(' and ')}. ${r.rows.map((x) => x[1]).join('. ')}.` };

    // ── the three pillars: Analytical / Product / Data ──
    const PIL = [[/\banalytical\b|\banalysis pillar\b/, 'Analytical'], [/\bproduct (skills?|side|pillar|results?|wins?|work|impact|achievements?)\b/, 'Product'], [/\bdata (skills?|pillar|side|results?|wins?|work|impact|achievements?)\b/, 'Data']];
    const pil = PIL.find(([re]) => re.test(q));
    if (pil) {
      const wantsResults = /\b(results?|wins?|achiev\w*|impact|numbers?|metrics?|proof|delivered?)\b/.test(q);
      if (wantsResults)
        return { sql: `SELECT company, area, metric, value, unit FROM achievements WHERE pillar = ${q1(pil[1])} ORDER BY value DESC`, answer: (r) => `${r.rows.length} ${pil[1].toLowerCase()} results, from ${[...new Set(r.rows.map((x) => x[0]))].join(', ')}.` };
      return { sql: `SELECT category, skill FROM skills WHERE pillar = ${q1(pil[1])}`, answer: (r) => `${r.rows.length} ${pil[1].toLowerCase()} skills, across ${new Set(r.rows.map((x) => x[0])).size} groups.` };
    }

    // ── skills ──
    const skillHits = skillMatch(q, db);
    if (skillHits.length && !(ACHIEVE.test(q) && companies.length)) {
      const cond = skillHits.map((s) => `skill LIKE ${q1(`%${s}%`)}`).join(' OR ');
      return {
        sql: `SELECT category, skill FROM skills WHERE ${cond}`,
        answer: (r) => (r.rows.length ? `Yes: ${r.rows.map((x) => `${x[1]} (${x[0]})`).join(', ')}.` : "That isn't on my skills list."),
      };
    }
    const cat = CATS.find(([re]) => re.test(q));
    if (cat && (asksSkills || !ACHIEVE.test(q))) {
      return { sql: `SELECT skill FROM skills WHERE category LIKE ${q1(`%${cat[1]}%`)}`, answer: (r) => `${r.rows.length} skills in that area: ${r.rows.map((x) => x[0]).join(', ')}.` };
    }
    if (asksSkills) {
      return howMany
        ? { sql: 'SELECT category, COUNT(*) AS skills FROM skills GROUP BY category', answer: (r) => `${r.rows.reduce((a, x) => a + x[1], 0)} skills across ${r.rows.length} categories.` }
        : { sql: 'SELECT category, skill FROM skills', answer: (r) => `${r.rows.length} skills across ${new Set(r.rows.map((x) => x[0])).size} categories.` };
    }

    // ── team size / leadership ──
    if (/\b(team|led|lead\w*|manag\w*|people|analysts)\b/.test(q) && !/\bcurrent\b/.test(q)) {
      const where = ['unit = \'people\'', compSql].filter(Boolean).join(' AND ');
      return { sql: `SELECT company, area, metric, value FROM achievements WHERE ${where}`, answer: (r) => (r.rows.length ? r.rows.map((x) => `${x[3]} people at ${x[0]}`).join('; ') + '.' : 'No team-size data for that.') };
    }

    // ── tenure / roles ──
    if (/\b(how long|years?|months?|tenure|experience)\b/.test(q) && !ACHIEVE.test(q) && !companies.length)
      return { sql: 'SELECT SUM(months) AS total_months FROM roles', answer: (r) => { const m = r.rows[0][0]; return `${m} months in total (${Math.floor(m / 12)} yrs ${m % 12} mo) across three roles.`; } };
    if (/\b(current\w*|now|present|today|latest|right now)\b/.test(q) && /\b(role|job|work\w*|compan\w*|employer|title|position|doing)\b/.test(q))
      return { sql: 'SELECT company, title, start_date FROM roles WHERE end_date IS NULL', answer: (r) => (r.rows.length ? `${r.rows[0][1]} at ${r.rows[0][0]} since ${r.rows[0][2]}.` : 'No current role found.') };
    const rolesIntent = /\b(where|compan\w*|employer\w*|career|roles?|jobs?|titles?|positions?|worked|work history|history|background|who is|introduc\w*|yourself|about)\b/.test(q);
    if (rolesIntent && !ACHIEVE.test(q) && !SUPER.test(q)) {
      const where = compSql ? ` WHERE ${compSql}` : '';
      return { sql: `SELECT company, title, start_date, end_date, months FROM roles${where} ORDER BY start_date DESC`, answer: (r) => `${r.rows.length} role${r.rows.length === 1 ? '' : 's'}, most recent first: ${r.rows.map((x) => `${x[1]} at ${x[0]}`).join('; ')}.` };
    }

    // ── achievements ──
    const topics = TOPICS.filter(([re]) => re.test(q)).map(([, c]) => c);
    const wantsDown = DIR_DOWN.test(q), wantsUp = DIR_UP.test(q) && !wantsDown;
    const superlative = SUPER.test(q);
    if (ACHIEVE.test(q) || topics.length || companies.length || superlative || howMany) {
      const conds = [];
      if (compSql) conds.push(compSql);
      if (wantsDown && !topics.length) conds.push("direction = 'down'");
      else if (wantsUp && !topics.length) conds.push("direction = 'up'");
      else if (superlative && !topics.length) conds.push("direction IN ('up', 'down')");
      if (topics.length) conds.push(topics.length > 1 ? `(${topics.join(' OR ')})` : topics[0]);
      const where = conds.length ? ` WHERE ${conds.join(' AND ')}` : '';

      if (/\b(average|avg|mean)\b/.test(q))
        return { sql: `SELECT AVG(value) AS avg_pct, COUNT(*) AS wins FROM achievements${where ? `${where} AND` : ' WHERE'} unit = '%'`, answer: (r) => `On average, ${r.rows[0][0]}% across ${r.rows[0][1]} percentage-based result${r.rows[0][1] === 1 ? '' : 's'}.` };
      if (howMany && !topics.length)
        return { sql: `SELECT COUNT(*) AS results FROM achievements${where}`, answer: (r) => `${r.rows[0][0]} measurable results${companies.length ? ' for that company' : ''}.` };

      const order = superlative || wantsUp || wantsDown ? ' ORDER BY value DESC' : '';
      const lim = ` LIMIT ${limit || (superlative ? 3 : 25)}`;
      return {
        sql: `SELECT company, area, metric, value, unit FROM achievements${where}${order}${lim}`,
        answer: (r) => {
          if (!r.rows.length) return null;
          const f = r.rows[0];
          const lead = `${f[0]}: ${f[2]}, ${f[3]}${f[4] === '%' ? '%' : ' ' + f[4]}`;
          return r.rows.length === 1 ? `${lead}.` : `${r.rows.length} results. ${superlative ? 'Biggest' : 'First'}: ${lead}.`;
        },
      };
    }

    // ── fallback: keyword search across the data ──
    const tokens = [...new Set(q.replace(/[^a-z0-9/+# -]/g, ' ').split(' ').filter((t) => t.length >= 3 && !STOP.has(t)))];
    for (const t of tokens) {
      const stem = t.length > 5 ? t.slice(0, -1) : t;
      const sql = `SELECT company, area, metric, value, unit FROM achievements WHERE metric LIKE ${q1(`%${stem}%`)} OR area LIKE ${q1(`%${stem}%`)}`;
      try { if (MiniSQL.run(sql, db).rows.length) return { sql, answer: (r) => `${r.rows.length} result${r.rows.length === 1 ? '' : 's'} mentioning "${t}".` }; } catch (e) { /* try next */ }
      const sk = `SELECT category, skill FROM skills WHERE skill LIKE ${q1(`%${stem}%`)}`;
      try { if (MiniSQL.run(sk, db).rows.length) return { sql: sk, answer: (r) => `Found ${r.rows.map((x) => x[1]).join(', ')} in my skills.` }; } catch (e) { /* try next */ }
    }
    // "Does he know Kubernetes?" with something we don't have: answer honestly instead of giving up
    if (/^(does|do|did|has|have|can|is|are)\b/.test(q) && tokens.length) {
      const t = tokens[tokens.length - 1];
      return { sql: `SELECT category, skill FROM skills WHERE skill LIKE ${q1(`%${t}%`)}`, answer: () => `No, "${t}" isn't on my skills list.` };
    }
    return null;
  }

  return { translate };
})();
