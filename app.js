// Generic app shell for an RNG-style daily game. Everything specific to one game (names, copy, art, facts) is in site.js.
import site from './site.js';
import { RULES, RULESET, TIERS, badgeTier, evaluatePool, randomIndex, dayKey, nextReset, weekStartKey, rollId, parseRollId, level, fmtPct, fmtNum, oneIn, shareText } from './engine.js';
import { TIER_RANK, buildAchievements, progressOf, valueOf, unlockedIds } from './achievements.js';
import CONFIG from './account-config.js';
import { createAccount } from './account.js';

const KEY = `${site.key}.${site.store ?? 'v1'}`; // bump site.store when a pool is replaced in place: saved rolls hold indexes into the old pool
const THEME_KEY = `${site.key}.theme`;
const app = document.getElementById('app');
const live = document.getElementById('live');
const RULE = Object.fromEntries(RULES.map((r) => [r.id, r]));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const tcls = (t) => `t-${t ? t.toLowerCase().replace(' ', '-') : 'none'}`;
const chip = (t) => `<span class="chip ${tcls(t)}">${t ?? 'Inactive'}</span>`;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const N = site.nouns;

// ---- accounts (optional): switched on in account-config.js once the backend is deployed; off, the site behaves as it always did ----
const guard = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* the session lasts this visit */ } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* nothing to remove */ } },
};
const acct = CONFIG.enabled ? createAccount({ url: CONFIG.url, key: CONFIG.key, fetch: (...a) => fetch(...a), storage: guard }) : null;
let who = null; // { email, handle } while signed in (handle is null until one is claimed)
async function loadWho() {
  if (!acct) return null;
  const s = await acct.session();
  if (!s) return (who = null);
  try { who = { email: s.user.email, handle: await acct.handle() }; } catch { who = { email: s.user.email, handle: null }; }
  return who;
}
let whoP = loadWho();
const resetWho = () => (whoP = loadWho());
const season = (pool) => `${pool.meta.version}.${RULESET}`; // scores only compare inside one pool version and ruleset
function paintNav() {
  const lb = document.getElementById('lb'), a = document.getElementById('acct');
  if (!acct || !lb || !a) return;
  lb.hidden = false; a.hidden = false;
  a.textContent = who ? (who.handle ?? 'Finish setup') : 'Sign in';
}

// ---- storage: every read and write is guarded; the page still works without it ----
let storageOk = true;
const loadS = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { rolls: {} }; } catch { return { rolls: {} }; } };
let S = loadS();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { storageOk = false; } };
try { localStorage.setItem(`${site.key}.probe`, '1'); localStorage.removeItem(`${site.key}.probe`); } catch { storageOk = false; }
const myRolls = () => Object.values(S.rolls).sort((a, b) => b.day.localeCompare(a.day));

// ---- clock: the day boundary comes from the server's Date header, not the device clock ----
let skew = 0;
const now = () => Date.now() + skew;
async function syncClock() {
  try {
    const r = await fetch(`index.html?t=${Date.now()}`, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(3000) });
    const t = Date.parse(r.headers.get('date'));
    if (t) skew = t + 1000 * (+r.headers.get('age') || 0) - Date.now(); // CDN responses report how old their Date is
  } catch { /* offline: fall back to the device clock */ }
}

// ---- pool ----
let poolP;
const breathe = () => new Promise((go) => setTimeout(go, 20)); // let the browser draw the loading message before a long synchronous step
async function download(r) { // streamed, so a multi-megabyte pool shows how much has arrived
  if (!r.body) return new Uint8Array(await r.arrayBuffer());
  const parts = [], reader = r.body.getReader();
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); got += value.length;
    const el = document.getElementById('loadmsg'), bar = document.getElementById('loadbar'), total = site.poolBytes || 0; // total (the file's size, if the site knows it) turns the bar from a spinner into a gauge
    if (el) el.textContent = `Loading the pool… ${(got / 1e6).toFixed(1)}${total ? ` of ${(total / 1e6).toFixed(1)}` : ''} MB`;
    if (bar && total) { bar.max = total; bar.value = Math.min(got, total); }
  }
  const buf = new Uint8Array(got);
  let at = 0;
  for (const p of parts) { buf.set(p, at); at += p.length; }
  return buf;
}
const getPool = () => (poolP ??= (async () => {
  if (site.expand) app.innerHTML = '<div class="loading" role="status"><progress id="loadbar" aria-label="Loading"></progress><p id="loadmsg">Loading the pool…</p></div>';
  const r = await fetch('data/pool-v1.json');
  if (!r.ok) throw new Error(`The pool could not be loaded (HTTP ${r.status}).`);
  const buf = await download(r);
  const msg = document.getElementById('loadmsg');
  if (msg) { msg.textContent = 'Scoring every record…'; await breathe(); }
  const raw = JSON.parse(new TextDecoder().decode(buf));
  const pool = evaluatePool(site.expand ? site.expand(raw) : raw);
  pool.sha = crypto.subtle ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join('') : 'unavailable (needs HTTPS)';
  return pool;
})().catch((e) => { poolP = null; throw e; }));

// ---- view helpers ----
function show(title, html) {
  document.title = title ? `${title} · ${site.name}` : site.pageTitle;
  app.innerHTML = html;
}
const h1 = (t) => `<h1 tabindex="-1">${t}</h1>`;
const notFound = (msg = 'That page does not exist.') => show('Not found', `${h1('Not found')}<p>${esc(msg)} <a href="#/">Back to the roll</a></p>`);
const inactiveWhy = (r, s) => (s.k ? '' : r.deferred ? `Not active: ${r.deferred}` : `No ${site.noun} in this pool matches, so it cannot be earned or ranked.`);

// A family's best badge is the card; the other badges it suppressed nest underneath as "earned, 0 RP added".
function groupAwards(roll) {
  const byFam = new Map();
  for (const a of roll.awards) {
    const f = RULE[a.id].family;
    if (!byFam.has(f)) byFam.set(f, []);
    byFam.get(f).push(a);
  }
  const groups = [...byFam.values()].map((list) => { list.sort((x, y) => y.rp - x.rp || y.nominal - x.nominal); return { main: list[0], subs: list.slice(1) }; });
  return groups.sort((a, b) => b.main.nominal - a.main.nominal || b.main.rp - a.main.rp); // best first, like the page reads
}
// Seconds between badge reveals. The list is laid out best first, but it appears from the bottom up: worst badge first, best last.
const STEP = (n) => Math.min(0.42, 3.2 / Math.max(1, n));
const revealMs = (n) => Math.round(((n - 1) * STEP(n) + 0.8) * 1000);

function bcard(g, i, n, m, roll, pool) {
  const a = g.main, r = RULE[a.id], s = pool.stats[a.id];
  const delay = ((n - 1 - i) * STEP(n)).toFixed(2);
  return `<div class="bcard ${tcls(s.tier)}" style="--d:${delay}s">
    <div class="bhead"><a class="bname" href="#/badges/${r.id}">${esc(r.name)}</a>${chip(s.tier)}${roll.fresh?.includes(a.id) ? '<span class="tag">New</span>' : ''}<span class="pts">+${fmtNum(a.rp)} RP</span></div>
    <p class="brule">${esc(r.rule)}</p>
    <p class="bnote">${esc(r.evidence(m, pool.meta.publishedAt))}. ${fmtNum(s.k)} of ${fmtNum(pool.n)} ${N} have it (${fmtPct(s.k, pool.n)}, about 1 in ${oneIn(s.k, pool.n)}).</p>
    ${g.subs.map((b) => { const rb = RULE[b.id], sb = pool.stats[b.id]; return `<div class="bsub"><span aria-hidden="true">└</span><a href="#/badges/${rb.id}">${esc(rb.name)}</a>${chip(sb.tier)}<em>earned, 0 RP added</em></div>`; }).join('')}
  </div>`;
}

function resultCard(roll, pool, cls = '', opts = {}) {
  const m = pool.members[roll.index];
  const head = site.header(m);
  const groups = groupAwards(roll), n = groups.length;
  const facts = [...site.facts(m), ['Data captured', pool.meta.capturedAt], ['Pool and rules', `${roll.pool}, ruleset ${roll.ruleset}`]];
  return `<article class="rv result ${tcls(roll.tier)} ${cls}" aria-labelledby="who">
    <div class="art" data-s="1">${site.art(m)}</div>
    <div class="hero" data-s="1"><h2 id="who">${esc(head.title)}</h2></div>
    <p class="sub" data-s="1">${esc(head.sub)}</p>
    <div class="tierline" data-s="2">${chip(roll.tier)}<span class="dot" aria-hidden="true">•</span><span class="toppct">Top ${fmtPct(roll.c, roll.n)} of ${fmtNum(roll.n)} ${N}</span></div>
    <div class="rppill" data-s="2"><span class="rp">${fmtNum(roll.rp)} RP</span></div>
    ${opts.lifetime != null ? `<p class="life" data-s="2"><b>${fmtNum(opts.lifetime)} RP</b><span>Your lifetime RP</span></p>` : ''}
    ${opts.slot ? '<div id="acts" class="actions" data-s="2"></div>' : ''}
    <details class="details" data-s="2"><summary>Details</summary><dl class="facts">${facts.map(([k, v, href]) => `<dt>${esc(k)}</dt><dd>${href ? `<a href="${esc(href)}" rel="noopener">${esc(v)}</a>` : esc(v)}</dd>`).join('')}</dl></details>
    <section class="breakdown" data-s="3"><h2>Badge breakdown</h2><p class="count">${roll.awards.length} badge${roll.awards.length === 1 ? '' : 's'} earned</p>
      <div class="bcards">${groups.map((g, i) => bcard(g, i, n, m, roll, pool)).join('')}</div></section>
  </article>`;
}

function actions(roll, next = false) {
  return `<div class="row"><button id="share" type="button">Share</button>${next ? '<span class="next">Next roll in <b id="cd"></b></span>' : ''}</div>
    <div class="row"><button id="copy" class="ghost" type="button">Copy text</button><a class="btn ghost" href="#/roll/${roll.id}">Result page</a></div><p id="msg" class="small muted" role="status"></p>`;
}
function wireActions(roll) {
  const url = location.origin + location.pathname + '#/roll/' + roll.id;
  const text = shareText(roll, url, site.name);
  const copy = async () => {
    const msg = document.getElementById('msg');
    try { await navigator.clipboard.writeText(text); msg.textContent = 'Copied to clipboard.'; } catch {
      msg.innerHTML = `Couldn't reach the clipboard. Select and copy this text:<textarea readonly rows="3">${esc(text)}</textarea>`;
      msg.querySelector('textarea').select();
    }
  };
  document.getElementById('copy').onclick = copy;
  document.getElementById('share').onclick = () => (navigator.share ? navigator.share({ title: site.name, text, url }).catch(() => {}) : copy());
}

// ---- achievements: derived from the player's rolls and the immutable pool ----
const getCat = (pool) => (pool.cat ??= buildAchievements(pool, RULES, site.shelves, site));
function newUnlocks(pool, roll) { // achievements this roll just unlocked
  const cat = getCat(pool);
  const was = unlockedIds(cat.list, progressOf(cat, Object.values(S.rolls).filter((r) => r.day !== roll.day)));
  const is = unlockedIds(cat.list, progressOf(cat, Object.values(S.rolls)));
  return cat.list.filter((a) => is.has(a.id) && !was.has(a.id));
}
function unlockList(items) {
  if (!items.length) return '';
  const shown = items.slice(0, 6);
  return `<section class="unlocks" aria-label="Achievements unlocked"><h2>Achievements unlocked (${items.length})</h2><ul class="plain">${shown.map((a, i) =>
    `<li style="--i:${i}"><b>${esc(a.name)}</b><span class="small muted">${esc(a.desc)}</span></li>`).join('')}</ul>
    <p class="small">${items.length > shown.length ? `and ${items.length - shown.length} more. ` : ''}<a href="#/achievements">See all achievements</a></p></section>`;
}

// ---- reveal flourishes: purely cosmetic, never run under reduced motion, and the roll is already saved ----
function countUp(el, end, active) {
  const t0 = performance.now();
  const step = (t) => {
    if (!active()) return;
    const k = Math.min(1, (t - t0) / 700);
    el.textContent = `${fmtNum(Math.round(end * (1 - (1 - k) ** 3)))} RP`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function flourish(card, tier) {
  const r = TIER_RANK[tier];
  if (r > 3) return;
  card.classList.add('fx');
  if (r > 2) return;
  const box = document.createElement('div');
  box.className = 'burst'; box.setAttribute('aria-hidden', 'true');
  for (let i = 0, n = 28 + (2 - r) * 16; i < n; i++) {
    const p = document.createElement('i'), a = Math.random() * 6.283, d = 90 + Math.random() * 170;
    p.style.cssText = `--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d - 60}px;--h:${Math.floor(Math.random() * 360)};--d:${Math.random() * 0.25}s`;
    box.append(p);
  }
  card.append(box);
  later(() => box.remove(), 2000);
}

// ---- timers: cleared on every navigation ----
let timers = [];
const later = (f, ms) => timers.push(setTimeout(f, ms));
const every = (f, ms) => timers.push(setInterval(f, ms));

const fmtCd = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)), p = (x) => String(x).padStart(2, '0'); return `${(s / 3600) | 0}H ${p(((s / 60) | 0) % 60)}M ${p(s % 60)}S`; };

function draw(pool, day) {
  const index = randomIndex(pool.n);
  const e = pool.evals[index];
  const seen = new Set(Object.values(S.rolls).flatMap((r) => r.awards.map((a) => a.id)));
  return { id: rollId('v1', day, index), day, pool: 'v1', ruleset: RULESET, index, at: new Date(now()).toISOString(),
    rp: e.rp, c: e.c, n: pool.n, tier: e.tier, awards: e.awards, fresh: e.awards.filter((a) => !seen.has(a.id)).map((a) => a.id) };
}

// A roll the server stored, in this app's roll format. The page re-scores the index with its own rules and refuses a mismatch,
// which means the page and the server disagree about the rules (a stale cached copy), so a wrong score is never shown.
function fromServer(r, pool) {
  const e = pool.evals[r.idx];
  if (!e || r.n !== pool.n || e.rp !== r.rp || e.tier !== r.tier || r.season !== season(pool)) throw new Error('This page is out of date. Reload it and try again.');
  const seen = new Set(Object.values(S.rolls).filter((x) => x.day !== r.day).flatMap((x) => x.awards.map((a) => a.id)));
  return { id: rollId('v1', r.day, r.idx), day: r.day, pool: 'v1', ruleset: RULESET, index: r.idx, at: r.rolled_at ?? r.rolledAt, rp: r.rp, c: r.c, n: r.n, tier: r.tier,
    awards: e.awards, fresh: e.awards.filter((a) => !seen.has(a.id)).map((a) => a.id), ranked: true };
}

// ---- views ----
async function home() {
  const pool = await getPool();
  show('', `<header id="head" class="pagehead">${h1(site.headline)}<p class="lede">${site.intro(pool.n)}</p></header>
    <p class="notice">${site.notice}</p>
    ${storageOk ? '' : '<p class="notice error">Your browser is blocking site storage, so today\'s roll can\'t be remembered after you leave this page.</p>'}
    <div id="act"></div><div id="res"></div><div id="unl"></div>`);
  const $ = (id) => document.getElementById(id);

  const showRoll = (roll, animate) => {
    const m = pool.members[roll.index];
    const fancy = animate && !reduced();
    const lifetime = Object.values(S.rolls).reduce((t, r) => t + r.rp, 0);
    $('head')?.classList.add('compact');
    $('res').innerHTML = (fancy ? '<p class="reel" id="reel" aria-hidden="true"></p>' : '') + resultCard(roll, pool, animate ? '' : 's1 s2 s3', { lifetime, slot: true });
    const card = $('res').querySelector('.rv');
    const resetAt = nextReset(now()); // fixed at render time: recomputing it each tick would always point at the next midnight
    $('act').innerHTML = animate && !reduced() ? '<button id="skip" type="button" class="ghost">Skip animation</button>' : '';
    const tick = () => {
      const left = resetAt - now(), cd = $('cd');
      if (left <= 0) route();
      else if (cd) { cd.textContent = fmtCd(left); cd.title = `Resets at ${new Date(resetAt).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`; }
    };
    tick(); every(tick, 1000);
    const unlocked = animate ? newUnlocks(pool, roll) : [];
    let counting = false;
    const done = () => {
      counting = false;
      $('skip')?.remove(); $('reel')?.remove();
      card.classList.add('s1', 's2', 's3');
      card.querySelector('.rp').textContent = `${fmtNum(roll.rp)} RP`;
      $('acts').innerHTML = actions(roll, true); $('unl').innerHTML = unlockList(unlocked); wireActions(roll); tick();
      if (animate) live.textContent = `Revealed ${site.header(m).title}: ${roll.tier}, ${fmtNum(roll.rp)} rarity points.${unlocked.length ? ` ${unlocked.length} achievement${unlocked.length === 1 ? '' : 's'} unlocked.` : ''}`;
    };
    if (!fancy) return done();
    // reel of random names, then the saved result lands: name, rarity with a count-up, badges one by one
    const spin = setInterval(() => { $('reel').textContent = site.label(pool.members[Math.floor(Math.random() * pool.n)]); }, 70);
    timers.push(spin);
    $('skip').onclick = () => { timers.forEach(clearTimeout); done(); every(tick, 1000); };
    later(() => { clearInterval(spin); $('reel').remove(); card.classList.add('s1'); }, 1100);
    later(() => { card.classList.add('s2'); counting = true; countUp(card.querySelector('.rp'), roll.rp, () => counting); flourish(card, roll.tier); }, 1800);
    later(() => card.classList.add('s3'), 2500);
    later(done, 2500 + revealMs(groupAwards(roll).length)); // the unlock list waits until the last badge has landed
  };

  await whoP;
  const ranked = !!who?.handle;
  const today = dayKey(now());
  let mine = S.rolls[today];
  if (ranked && !mine?.ranked) { // today's ranked roll may already exist on the server (another device, or a cleared browser)
    try { const r = await acct.todaysRoll(site.key, today); if (r) { mine = fromServer(r, pool); S.rolls[mine.day] = mine; save(); } } catch { /* offline or backend not ready: the roll button below still works */ }
  }
  if (mine && (mine.ranked || !ranked)) return showRoll(mine, false);
  const label = `Roll today's ${site.noun}${ranked ? ' (ranked)' : ''}`;
  $('act').innerHTML = `<button id="roll" type="button" class="primary">${label}</button>` + (ranked
    ? `<p class="small muted">One ranked roll per UTC day, drawn on the server, as <b>${esc(who.handle)}</b>.${mine ? ' It replaces the practice roll saved on this device.' : ''}</p>`
    : `<p class="small muted">One roll per UTC day. Refreshing the page never changes it.${acct ? ' This is a practice roll that stays in this browser; <a href="#/account">sign in</a> to roll for the leaderboards.' : ''}</p>`);
  $('roll').onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = 'Rolling…';
    try {
      if (ranked) {
        const out = await acct.ranked(site.key);
        const roll = fromServer(out.roll, pool);
        S.rolls[roll.day] = roll; save();
        return showRoll(roll, out.created);
      }
      await syncClock();
      S = loadS(); // another tab may have rolled meanwhile
      const day = dayKey(now());
      const existing = S.rolls[day];
      const roll = existing ?? draw(pool, day);
      S.rolls[day] = roll; save();
      showRoll(roll, !existing);
    } catch (err) {
      e.target.disabled = false; e.target.textContent = label;
      $('act').insertAdjacentHTML('beforeend', `<p class="notice error" role="alert">${esc(err.message)}</p>`);
    }
  };
}

async function rollPage(id) {
  const pool = await getPool();
  const p = parseRollId(id);
  if (!p || p.pool !== 'v1' || p.index >= pool.n) return notFound('That roll link is not valid.');
  const owned = S.rolls[p.day]?.id === id;
  const e = pool.evals[p.index];
  const roll = owned ? S.rolls[p.day] : { id, day: p.day, pool: 'v1', ruleset: RULESET, index: p.index, rp: e.rp, c: e.c, n: pool.n, tier: e.tier, awards: e.awards, fresh: [] };
  show(`Roll of ${p.day}`, `${h1(`Roll of ${p.day}`)}
    <p class="notice">${owned ? 'This is your roll.' : 'A shared roll. Rolls live in each player\'s browser in this prototype, so this page replays the draw named in the link but cannot prove it was a real daily roll.'}</p>
    ${resultCard(roll, pool, 's1 s2 s3', { lifetime: owned ? Object.values(S.rolls).reduce((t, r) => t + r.rp, 0) : null })}${actions(roll)}`);
  wireActions(roll);
}

async function mePage() {
  const pool = await getPool();
  const rolls = myRolls();
  const wk = weekStartKey(now());
  const earned = new Set(rolls.flatMap((r) => r.awards.map((a) => a.id)));
  const activeN = RULES.filter((r) => pool.stats[r.id].k).length;
  const best = rolls.reduce((b, r) => (!b || r.rp > b.rp ? r : b), null);
  const cat = getCat(pool);
  show('My rolls', `${h1('My rolls')}
    <div class="stats"><div><b>${rolls.length}</b>Rolls</div><div><b>${fmtNum(rolls.reduce((s, r) => s + r.rp, 0))}</b>Total RP</div>
      <div><b>${best ? fmtNum(best.rp) : '–'}</b>Best roll (RP)</div><div><b>${fmtNum(rolls.filter((r) => r.day >= wk).reduce((s, r) => s + r.rp, 0))}</b>RP this week (Mon-Sun UTC)</div>
      <div><b>${earned.size} / ${activeN}</b>Badges collected</div>
      <div><b>${fmtNum(unlockedIds(cat.list, progressOf(cat, rolls)).size)} / ${fmtNum(cat.list.length)}</b><a href="#/achievements">Achievements</a></div></div>
    ${rolls.length ? `<label>Sort <select id="sort"><option value="new">Newest</option><option value="old">Oldest</option><option value="rp">Most RP</option></select></label><div id="hist"></div>`
      : '<p>No rolls yet. <a href="#/">Make your first roll</a>.</p>'}
    <h2>Your data</h2>
    <p class="small muted">Saved only in this browser. Shared leaderboards, friends and sign-in need the server version.</p>
    <div class="row"><button id="export" type="button">Export as JSON</button><button id="wipe" type="button">Delete my data</button></div>`);
  const hist = document.getElementById('hist');
  const paint = () => {
    const mode = document.getElementById('sort').value;
    const rs = [...rolls].sort(mode === 'old' ? (a, b) => a.day.localeCompare(b.day) : mode === 'rp' ? (a, b) => b.rp - a.rp : () => 0);
    hist.innerHTML = `<table><thead><tr><th>Day</th><th>${esc(site.thing)}</th><th>Rarity</th><th class="n">RP</th></tr></thead><tbody>${rs.map((r) =>
      `<tr><td><a href="#/roll/${r.id}">${r.day}</a></td><td>${esc(site.label(pool.members[r.index]))}</td><td>${chip(r.tier)}</td><td class="n">${fmtNum(r.rp)}</td></tr>`).join('')}</tbody></table>`;
  };
  if (hist) { document.getElementById('sort').onchange = paint; paint(); }
  document.getElementById('export').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: site.key, exportedAt: new Date().toISOString(), rolls: S.rolls }, null, 2)], { type: 'application/json' }));
    a.download = `${site.key}-export.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  document.getElementById('wipe').onclick = () => {
    if (!confirm(`Delete everything ${site.name} stored in this browser? This also resets today's daily roll on this browser.`)) return;
    try { localStorage.removeItem(KEY); } catch { /* nothing to remove */ }
    S = { rolls: {} }; route();
  };
}

async function badgesPage() {
  const pool = await getPool();
  const fams = [...new Set(RULES.map((r) => r.family))];
  const count = (id) => myRolls().filter((r) => r.awards.some((a) => a.id === id)).length;
  show('Badges', `${h1('Badges')}
    <p class="muted">Each badge is a plain rule, counted across all ${fmtNum(pool.n)} ${N}. Odds describe this pool, not ${esc(site.worldNote)}.</p>
    <div class="filters"><label>Search <input id="q" type="search"></label>
      ${site.kindNames ? `<label>Kind <select id="kind"><option value="">All</option>${Object.entries(site.kindNames).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join('')}</select></label>` : ''}
      <label>Family <select id="fam"><option value="">All</option>${fams.map((f) => `<option>${esc(f)}</option>`).join('')}</select></label>
      <label>Rarity <select id="tier"><option value="">All</option>${TIERS.map((t) => `<option>${t}</option>`).join('')}<option value="-">Inactive</option></select></label></div>
    <p id="n" class="small muted" role="status"></p><ul class="plain bcards" id="list"></ul>`);
  const paint = () => {
    const q = document.getElementById('q').value.trim().toLowerCase(), fam = document.getElementById('fam').value, tier = document.getElementById('tier').value, kind = document.getElementById('kind')?.value;
    const rs = RULES.filter((r) => (!q || (r.name + ' ' + r.rule).toLowerCase().includes(q)) && (!fam || r.family === fam) && (!kind || r.kinds?.includes(kind))
      && (!tier || (tier === '-' ? !pool.stats[r.id].k : pool.stats[r.id].tier === tier)))
      .sort((a, b) => (pool.stats[b.id].k > 0) - (pool.stats[a.id].k > 0) || pool.stats[b.id].nominal - pool.stats[a.id].nominal);
    document.getElementById('n').textContent = `${rs.length} badge${rs.length === 1 ? '' : 's'}`;
    document.getElementById('list').innerHTML = rs.map((r) => {
      const s = pool.stats[r.id], c = count(r.id), lv = level(c);
      return `<li class="bcard ${tcls(s.tier)}"><div class="bhead"><a class="bname" href="#/badges/${r.id}">${esc(r.name)}</a>${chip(s.tier)}${s.k ? `<span class="pts">${fmtNum(s.nominal)} RP</span>` : ''}</div>
        <p class="brule">${esc(r.family)}: ${esc(r.rule)}</p>
        <p class="bnote">${s.k ? `${fmtNum(s.k)} of ${fmtNum(pool.n)} ${N} (${fmtPct(s.k, pool.n)}, about 1 in ${oneIn(s.k, pool.n)}).` : esc(inactiveWhy(r, s))}${c ? ` You: earned ${c}×, level ${lv.level}.` : ''}</p></li>`;
    }).join('');
  };
  ['q', 'fam', 'tier'].forEach((id) => document.getElementById(id).addEventListener('input', paint));
  document.getElementById('kind')?.addEventListener('input', (e) => { // a kind narrows the family list to its own families
    const keep = document.getElementById('fam').value, own = [...new Set(RULES.filter((r) => !e.target.value || r.kinds?.includes(e.target.value)).map((r) => r.family))];
    document.getElementById('fam').innerHTML = `<option value="">All</option>${own.map((f) => `<option${f === keep ? ' selected' : ''}>${esc(f)}</option>`).join('')}`;
    paint();
  });
  paint();
}

async function badgePage(id) {
  const r = RULE[id];
  if (!r) return notFound('No badge by that name.');
  const pool = await getPool();
  const s = pool.stats[id], v = pool.meta.publishedAt;
  const mine = myRolls().filter((x) => x.awards.some((a) => a.id === id));
  const lv = level(mine.length);
  const examples = r.deferred ? [] : pool.members.filter((m) => (!r.kinds || r.kinds.includes(m.kind)) && r.test(m, v)).slice(0, 6);
  show(r.name, `${h1(esc(r.name))}
    <p>${chip(s.tier)} <span class="muted">${esc(r.family)} family</span></p>
    <p><b>Rule:</b> ${esc(r.rule)}.</p>
    <p>${s.k ? `<b>${fmtNum(s.k)} of ${fmtNum(pool.n)}</b> ${N} in the pool have it: ${fmtPct(s.k, pool.n)}, about 1 in ${oneIn(s.k, pool.n)}. Worth <b>${fmtNum(s.nominal)} RP</b> (100 ÷ that probability), counted once per family.`
      : `This badge is inactive. ${esc(inactiveWhy(r, s))}`}</p>
    <h2>Your progress</h2>
    <p>${mine.length ? `Earned ${mine.length}×. Level ${lv.level}${lv.next ? `, ${mine.length} of ${lv.next} toward level ${lv.level + 1}` : ' (maximum)'}.` : 'Not earned yet. 0 of 1 toward level 1.'}</p>
    ${lv.next ? `<progress max="${lv.next}" value="${mine.length}" aria-label="Progress toward next level"></progress>` : ''}
    ${mine.length ? `<ul class="plain">${mine.map((x) => `<li><a href="#/roll/${x.id}">${x.day}</a>: ${esc(site.label(pool.members[x.index]))}, ${x.awards.find((a) => a.id === id).rp ? '+' + fmtNum(x.awards.find((a) => a.id === id).rp) : '0'} RP when rolled</li>`).join('')}</ul>` : ''}
    ${examples.length ? `<h2>Examples from the pool</h2><ul class="plain">${examples.map((m) => `<li>${esc(r.evidence(m, v))}</li>`).join('')}</ul>${s.k > examples.length ? `<p class="small muted">and ${s.k - examples.length} more.</p>` : ''}` : ''}
    <p><a href="#/badges">All badges</a></p>`);
}

async function poolPage() {
  const pool = await getPool();
  const { n, meta } = pool;
  const possible = new Set(Array.from({ length: n }, (_, i) => badgeTier(i + 1, n)));
  const bands = [['Mythic', 'under 0.001%'], ['Anomaly', '0.001% to 0.01%'], ['Epic', '0.01% to 0.1%'], ['Rare', '0.1% to 1%'], ['Uncommon', '1% to 10%'], ['Common', 'over 10%']];
  const tiers = [['Mythic', 'top 1% or better'], ['Anomaly', 'top 1% to 5%'], ['Epic', 'top 5% to 10%'], ['Rare', 'top 10% to 25%'], ['Uncommon', 'top 25% to 50%'], ['Common', 'top 50% to 99%'], ['Low Roll', 'bottom 1%']];
  show('Pool', `${h1(`The ${site.noun} pool`)}
    <p class="notice">${site.poolNotice}</p>
    <dl class="facts"><dt>Version</dt><dd>${esc(meta.version)} (ruleset ${RULESET})</dd><dt>Size</dt><dd>${fmtNum(n)} ${N}, drawn uniformly (1 in ${fmtNum(n)} each)</dd>
      <dt>Captured</dt><dd>${esc(meta.capturedAt)}</dd><dt>Provenance</dt><dd>${esc(meta.provenance)}</dd>
      ${meta.selection ? `<dt>Selection</dt><dd>${esc(meta.selection)}</dd>` : ''}
      <dt>SHA-256</dt><dd><code>${pool.sha}</code> of <code>data/pool-v1.json</code> as your browser fetched it</dd>
      <dt>RP per ${site.noun}</dt><dd>lowest ${fmtNum(pool.scores.min)}, median ${fmtNum(pool.scores.median)}, highest ${fmtNum(pool.scores.max)}</dd></dl>
    ${site.poolExtra(pool)}
    <h2>Field status</h2>
    <p class="small muted">Only fields marked known may satisfy a badge rule.</p>
    <table><tbody>${Object.entries(meta.fieldStatus).map(([f, s]) => `<tr><td>${esc(f)}</td><td>${esc(s)}</td></tr>`).join('')}</tbody></table>
    <h2>Badge rarity bands</h2>
    <table><thead><tr><th>Band</th><th>Odds</th><th>Possible here</th><th class="n">Active badges</th></tr></thead><tbody>${bands.map(([t, p]) =>
      `<tr><td>${chip(t)}</td><td>${p}</td><td>${possible.has(t) ? 'Yes' : 'No: needs a larger pool'}</td><td class="n">${RULES.filter((r) => pool.stats[r.id].tier === t).length}</td></tr>`).join('')}</tbody></table>
    <p class="small muted">With ${fmtNum(n)} ${N} the rarest possible badge is 1 in ${fmtNum(n)}, so bands beyond that are disabled rather than invented.</p>
    <h2>Roll rarity: where a total score falls in the pool</h2>
    <table><thead><tr><th>Tier</th><th>Place in pool</th><th class="n">${esc(site.nouns[0].toUpperCase() + site.nouns.slice(1))}</th></tr></thead><tbody>${tiers.map(([t, d]) =>
      `<tr><td>${chip(t)}</td><td>${d}</td><td class="n">${fmtNum(pool.tierCounts[t] || 0)}</td></tr>`).join('')}</tbody></table>
    <p class="small muted">Tied ${N} share a tier, so a tier can be empty when ties straddle its boundary.</p>`);
}

// ---- find: look any object up by name; it is a lookup in the pool, not a roll ----
let labelCache;
async function findPage() {
  const pool = await getPool();
  const labels = (labelCache ??= pool.members.map((m) => site.label(m).toLowerCase()));
  const kinds = site.kindNames ? Object.entries(site.kindNames) : [];
  show('Find', `${h1(`Find ${/^[aeiou]/i.test(site.noun) ? 'an' : 'a'} ${site.noun}`)}
    <p class="muted">Look up any of the ${fmtNum(pool.n)} ${N} in the pool to see its badges and odds. This is a lookup, not a roll.</p>
    <div class="filters"><label>Name <input id="fq" type="search" autocomplete="off" placeholder="${esc(site.findHint ?? 'a name')}"></label>
      ${kinds.length ? `<label>Kind <select id="fk"><option value="">All</option>${kinds.map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join('')}</select></label>` : ''}</div>
    <p id="fn" class="small muted" role="status"></p><ul class="plain" id="fl"></ul>
    <p><a id="fr" href="#/object/${randomIndex(pool.n)}">Show me a random one</a></p>`);
  const paint = () => {
    const words = document.getElementById('fq').value.trim().toLowerCase().split(/\s+/).filter(Boolean), kind = document.getElementById('fk')?.value;
    const hits = [];
    if (words.length || kind) for (let i = 0; i < labels.length && hits.length < 3000; i++) if (words.every((w) => labels[i].includes(w)) && (!kind || pool.members[i].kind === kind)) hits.push(i);
    const rank = (i) => { const l = labels[i], w = words[0] ?? ''; return !w ? 2 : l.split(/[^\p{L}\p{N}]+/u).includes(w) ? 0 : l.startsWith(w) ? 1 : 2; }; // a whole word first, then a prefix, then anywhere
    hits.sort((a, b) => rank(a) - rank(b) || a - b);
    document.getElementById('fn').textContent = words.length || kind ? `${hits.length >= 3000 ? 'Over 3,000' : fmtNum(hits.length)} match${hits.length === 1 ? '' : 'es'}${hits.length > 60 ? ', showing the first 60' : ''}` : 'Type a name, or pick a kind to browse.';
    document.getElementById('fl').innerHTML = hits.slice(0, 60).map((i) => { const m = pool.members[i], e = pool.evals[i];
      return `<li class="card"><div class="bhead"><a href="#/object/${i}"><strong>${esc(site.label(m))}</strong></a>${chip(e.tier)}</div>${m.kind && site.kindNames ? `<p class="small muted">${esc(site.kindNames[m.kind])} · ${fmtNum(e.rp)} RP</p>` : `<p class="small muted">${fmtNum(e.rp)} RP</p>`}</li>`; }).join('');
  };
  ['fq', 'fk'].forEach((id) => document.getElementById(id)?.addEventListener('input', paint));
  paint();
}

async function objectPage(i) {
  const pool = await getPool(), index = Number(i);
  if (!/^\d+$/.test(i ?? '') || index >= pool.n) return notFound('No such object.');
  const e = pool.evals[index], mine = myRolls().filter((r) => r.index === index);
  const roll = { id: '', day: '', pool: 'v1', ruleset: RULESET, index, rp: e.rp, c: e.c, n: pool.n, tier: e.tier, awards: e.awards, fresh: [] };
  show(site.label(pool.members[index]), `${h1('Lookup')}
    <p class="notice">This is a lookup in the pool, not a roll. ${mine.length ? `You rolled it on ${mine.map((r) => esc(r.day)).join(', ')}.` : 'You have not rolled it.'} <a href="#/find">Find another</a></p>
    ${resultCard(roll, pool, 's1 s2 s3')}`);
}

async function achievementsPage() {
  const pool = await getPool();
  const cat = getCat(pool);
  const st = progressOf(cat, myRolls());
  const rows = cat.list.map((a) => ({ a, v: valueOf(a, st) }));
  const got = rows.filter((r) => r.v >= r.a.goal).length;
  const groups = [...new Set(rows.map((r) => r.a.group))];
  show('Achievements', `${h1('Achievements')}
    <p><b>${fmtNum(got)}</b> of <b>${fmtNum(rows.length)}</b> unlocked. They are worked out from your saved rolls and the pool, and they scale with it: a pool of ${fmtNum(pool.n)} ${N} gives ${fmtNum(rows.length)} achievements, with discovery, point and shelf goals sized to the pool. One roll a day makes most of these long-term goals.</p>
    <progress max="${rows.length}" value="${got}" aria-label="Achievements unlocked"></progress>
    <div class="filters"><label>Search <input id="aq" type="search"></label>
      <label>Group <select id="ag"><option value="">All</option>${groups.map((g) => `<option>${esc(g)}</option>`).join('')}</select></label>
      <label>Show <select id="as"><option value="">All</option><option value="todo">In progress</option><option value="done">Unlocked</option><option value="new">Not started</option></select></label></div>
    <p id="acount" class="small muted" role="status"></p><ul class="plain" id="alist"></ul><div class="row"><button id="amore" type="button" hidden>Show more</button></div>`);
  let limit = 60;
  const paint = () => {
    const q = document.getElementById('aq').value.trim().toLowerCase(), g = document.getElementById('ag').value, s = document.getElementById('as').value;
    const rs = rows.filter(({ a, v }) => (!q || (a.name + ' ' + a.desc).toLowerCase().includes(q)) && (!g || a.group === g)
      && (!s || (s === 'done' ? v >= a.goal : s === 'todo' ? v > 0 && v < a.goal : v === 0)));
    document.getElementById('acount').textContent = `${fmtNum(rs.length)} achievement${rs.length === 1 ? '' : 's'}`;
    document.getElementById('alist').innerHTML = rs.slice(0, limit).map(({ a, v }) => {
      const ok = v >= a.goal, shown = Math.min(v, a.goal);
      return `<li class="card ach${ok ? ' got' : ''}"><div class="bh"><strong>${esc(a.name)}</strong><span class="chip ${ok ? 't-uncommon' : 't-none'}">${ok ? 'Unlocked' : `${fmtNum(shown)} / ${fmtNum(a.goal)}`}</span></div>
        <p class="small muted">${esc(a.group)}: ${esc(a.desc)}</p><progress max="${a.goal}" value="${shown}" aria-label="Progress"></progress></li>`;
    }).join('');
    document.getElementById('amore').hidden = rs.length <= limit;
  };
  ['aq', 'ag', 'as'].forEach((id) => document.getElementById(id).addEventListener('input', () => { limit = 60; paint(); }));
  document.getElementById('amore').onclick = () => { limit += 120; paint(); };
  paint();
}

function aboutPage() {
  show('About', `${h1(`About ${site.name}`)}
    <h2>How it works</h2>
    <p>Roll once per UTC day. The game picks one ${site.noun} from the pool at random, checks it against every badge rule, and adds up rarity points (RP). A badge's weight is 100 ÷ the share of the pool that has it, so rarer properties are worth more. When badges in one family overlap, you collect all of them but only the highest counts toward RP.</p>
    <h2>What the numbers mean</h2>
    <ul><li><b>Badge odds</b>: how many of the pool's ${N} have that property.</li>
      <li><b>Roll rarity</b>: where your total RP falls among all ${N} in the pool ("Top 18%"). It describes game rarity, not quality or worth.</li>
      <li><b>Daily rank</b>: how you compare with other players today. ${acct ? 'Signed-in players are ranked on the <a href="#/leaderboard">leaderboard</a>.' : 'This needs the server version and is not shown yet.'}</li></ul>
    <h2>Fairness</h2>
    <p>Your browser draws a secure random number and rejects values that would favor some ${N} (no modulo bias). Every ${site.noun} has the same chance, nobody is boosted, and repeats across days are expected. There is no server, so the draw can't be audited by anyone else and the pool checksum on the Pool page only proves which file was used.</p>
    ${site.aboutData}
    <h2>Limits of this prototype</h2>
    <ul><li>Everything is saved in your browser. Clearing site data erases your history and resets today's roll. The day boundary uses the website's clock when reachable.</li>
      <li>Shared links replay the draw named in the link; they can't prove a roll really happened.</li>
      <li>${acct ? 'Accounts and leaderboards are on (see Privacy). Not built yet: friends, hearts, poems, shelves and the Discord Activity.' : 'Not built yet, because they need a server: sign-in, ranked daily limit, leaderboards, friends, hearts, poems, shelves and the Discord Activity.'}</li></ul>
    <h2>Privacy</h2>
    <p>${acct
      ? `Accounts are optional. Without one there are no cookies, analytics or tracking, and your rolls stay in this browser's local storage (export or delete them on <a href="#/me">My rolls</a>). If you sign in, a Supabase database project stores your email, a public handle and the rolls you make while signed in (the day, which ${site.noun}, its score and badges). Your email is never shown to others; only your handle and scores are public. A sign-in token is kept in this browser's local storage (not a cookie) and is shared by all these games. To delete your account and everything linked to it, open an issue on the project page. The site is hosted on GitHub Pages, which may log requests under GitHub's own privacy policy; account requests go to Supabase under its privacy policy. You must be 13 or older to make an account.`
      : `No accounts, cookies, analytics or tracking. Your rolls stay in this browser's local storage, and you can export or delete them on <a href="#/me">My rolls</a>. The site is hosted on GitHub Pages, which may log requests under GitHub's own privacy policy.`}</p>
    <h2>Terms</h2>
    <p>${esc(site.name)} is a free, unofficial fan prototype provided as is. ${site.terms}</p>
    ${site.repo ? `<h2>Feedback</h2><p>Found a problem or have an idea? <a href="${site.repo}/issues">Open an issue on GitHub</a>.</p>` : ''}`);
}

// ---- account and leaderboards (only reachable when enabled) ----
async function accountPage() {
  if (!acct) return notFound('Accounts are not switched on for this site yet.');
  await whoP;
  const say = (t, bad = true) => { const m = document.getElementById('msg'); if (m) { m.textContent = t; m.className = bad ? 'notice error' : 'small muted'; } };
  const busy = (form, on) => form.querySelectorAll('button, input').forEach((x) => { x.disabled = on; });
  if (who) {
    show('Account', `${h1('Account')}<div class="card stack">
      <p>Signed in as <b>${esc(who.email)}</b>${who.handle ? `, handle <b>${esc(who.handle)}</b>` : ''}.</p>
      <form id="hf" class="stack"><label>${who.handle ? 'Change your handle' : 'Choose a public handle'}<input id="h" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" autocomplete="off" spellcheck="false" value="${esc(who.handle ?? '')}"></label>
        <p class="small muted">3 to 20 letters, digits or underscores. It is shown on the leaderboards. The first change is free, then one every 30 days.</p><button class="primary" type="submit">${who.handle ? 'Change handle' : 'Claim handle'}</button></form>
      <p id="msg" role="status" class="small"></p>
      <p><button id="out" type="button" class="ghost">Sign out</button></p>
      <p class="small muted">Your email stays private. Only your handle and scores are public. To delete your account and its rolls, open an issue on the project page.</p></div>`);
    document.getElementById('hf').onsubmit = async (ev) => {
      ev.preventDefault();
      busy(ev.target, true);
      try { await acct.claimHandle(document.getElementById('h').value); await resetWho(); route(); } catch (err) { say(err.message); busy(ev.target, false); }
    };
    document.getElementById('out').onclick = async () => { await acct.signOut(); await resetWho(); route(); };
    return;
  }
  show('Account', `${h1('Sign in')}<div class="card stack">
    <p>Sign in with your email to roll for the leaderboards. There is no password: we email you a code. Without an account you can still play; your rolls just stay in this browser and are not ranked.</p>
    <form id="ef" class="stack"><label>Email<input id="em" type="email" required autocomplete="email" inputmode="email"></label><button class="primary" type="submit">Send me a code</button></form>
    <form id="cf" class="stack" hidden><label>The code from the email<input id="cd" required autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]{6,8}" maxlength="8"></label><button class="primary" type="submit">Sign in</button></form>
    <p id="msg" role="status" class="small"></p></div>`);
  const ef = document.getElementById('ef'), cf = document.getElementById('cf');
  ef.onsubmit = async (ev) => {
    ev.preventDefault();
    busy(ef, true);
    try { await acct.sendCode(document.getElementById('em').value); ef.hidden = true; cf.hidden = false; document.getElementById('cd').focus(); say('Code sent. It can take a minute; check your spam folder.', false); }
    catch (err) { say(err.message); busy(ef, false); }
  };
  cf.onsubmit = async (ev) => {
    ev.preventDefault();
    busy(cf, true);
    try { await acct.verify(document.getElementById('em').value, document.getElementById('cd').value); await resetWho(); route(); }
    catch (err) { say(err.message); busy(cf, false); }
  };
}

async function leaderboardPage(tab = 'today') {
  if (!acct) return notFound('Leaderboards are not switched on for this site yet.');
  const pool = await getPool();
  await whoP;
  const day = dayKey(now()), ssn = season(pool);
  const tabs = [['today', 'Today'], ['best', 'Best roll ever'], ['badges', 'Most badges']];
  if (!tabs.some(([k]) => k === tab)) return notFound('That leaderboard does not exist.');
  const blurb = { today: `Rolls of ${day} (UTC), highest rarity points first.`, best: 'The highest-scoring single roll each player has ever made.', badges: 'How many different badges each player has earned.' }[tab];
  show('Leaderboard', `${h1('Leaderboard')}
    <nav class="tabs" aria-label="Leaderboards">${tabs.map(([k, l]) => `<a href="#/leaderboard${k === 'today' ? '' : '/' + k}"${k === tab ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
    <p class="small muted">${blurb} Only signed-in players appear, and only rolls drawn on the server count. Equal scores share a place.</p>
    <div id="board" aria-live="polite">Loading…</div><p id="you" class="small"></p>`);
  const board = document.getElementById('board');
  try {
    const rows = tab === 'best' ? await acct.best(site.key, ssn) : tab === 'badges' ? await acct.badges(site.key, ssn) : await acct.daily(site.key, day);
    const head = { today: ['Place', 'Player', 'Rolled', 'RP'], best: ['Place', 'Player', 'Best roll (RP)'], badges: ['Place', 'Player', 'Badges', 'Rolls'] }[tab];
    const cell = (r) => ({
      today: [r.place, r.handle, pool.members[r.idx] ? site.label(pool.members[r.idx]) : '', fmtNum(r.rp)],
      best: [r.place, r.handle, fmtNum(r.best_rp)],
      badges: [r.place, r.handle, fmtNum(r.badges), fmtNum(r.rolls)],
    }[tab]);
    const edge = (i, n) => (i === 0 || i === n - 1 ? ' class="n"' : '');
    board.innerHTML = rows.length
      ? `<table class="board"><thead><tr>${head.map((x, i) => `<th${edge(i, head.length)}>${x}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr${who?.handle && r.handle === who.handle ? ' class="me"' : ''}>${cell(r).map((c, i, a) => `<td${edge(i, a.length)}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : '<p>Nobody is on this board yet. Sign in and roll to be first.</p>';
    if (who?.handle) {
      const st = await acct.standing(site.key, day, ssn).catch(() => null);
      const place = st && { today: st.daily_place, best: st.best_place, badges: st.badges_place }[tab];
      document.getElementById('you').textContent = place ? `Your place: ${place}.` : 'You are not on this board yet.';
    }
  } catch (err) {
    board.innerHTML = `<p class="notice error" role="alert">The leaderboard is not available right now (${esc(err.message)}).</p>`;
  }
}

// ---- router ----
const routes = { '': home, roll: rollPage, badges: (id) => (id ? badgePage(id) : badgesPage()), achievements: achievementsPage, find: findPage, object: objectPage, me: mePage, pool: poolPage, about: aboutPage, account: accountPage, leaderboard: leaderboardPage };
let first = true;
async function route() {
  timers.forEach(clearTimeout); timers = [];
  await whoP;
  paintNav();
  const [name, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  document.querySelectorAll('header nav a').forEach((a) => (a.hash.replace(/^#\/?/, '') === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  try {
    await (routes[name] ?? notFound)(...rest.map(decodeURIComponent));
  } catch (e) {
    show('Problem', `${h1('Something went wrong')}<div class="card error"><p>${esc(e.message)}</p>
      <p>A roll is saved in this browser the moment it is drawn, so reloading never costs or changes it.</p><button id="reload" type="button">Reload</button></div>`);
    document.getElementById('reload').onclick = () => location.reload();
  }
  if (!first) { app.querySelector('h1')?.focus(); scrollTo(0, 0); }
  first = false;
}

// ---- theme ----
const themeBtn = document.getElementById('theme');
const theme = () => document.documentElement.dataset.theme || 'auto';
const paintTheme = () => { themeBtn.textContent = 'Theme: ' + theme(); };
themeBtn.onclick = () => {
  const next = ['auto', 'light', 'dark'][(['auto', 'light', 'dark'].indexOf(theme()) + 1) % 3];
  if (next === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = next;
  try { next === 'auto' ? localStorage.removeItem(THEME_KEY) : localStorage.setItem(THEME_KEY, next); } catch { /* theme still applies for this visit */ }
  paintTheme();
};
paintTheme();
if (site.repo) document.getElementById('repo').innerHTML = `<a href="${site.repo}">Source on GitHub</a>`;

addEventListener('hashchange', route);
syncClock().then(route);
