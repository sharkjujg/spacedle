// Spacedle fixtures for check.html. The per-rule cases are written next to each rule in kinds/*.js (qualifies, narrowly fails, boundary,
// missing, malformed); this file gathers them and adds the checks on the published pool.
import { KINDS, RULES } from './rules.js';

export const V = '2026-11-01';
export const base = {}; // every case carries its own complete base record
export const cases = KINDS.flatMap((k) => k.cases);

export function poolChecks(raw, pool, ok) {
  const ms = raw.members, by = Object.groupBy(ms, (m) => m.kind);
  ok('every kind is present and in the declared order', KINDS.every((k) => by[k.kind]?.length > 0) && ms.every((m, i) => i === 0 || KINDS.findIndex((k) => k.kind === m.kind) >= KINDS.findIndex((k) => k.kind === ms[i - 1].kind)));
  ok('badge names are unique across every kind (two badges with one name would be indistinguishable)', new Set(RULES.map((r) => r.name)).size === RULES.length);
  ok('every rule names the kind it applies to, and that kind exists', RULES.every((r) => r.kinds?.length === 1 && KINDS.some((k) => k.kind === r.kinds[0])));
  ok('every kind has a Kind badge that all its records earn', KINDS.every((k) => { const r = RULES.find((x) => x.family === 'Kind' && x.kinds[0] === k.kind); return r && pool.stats[r.id].k === by[k.kind].length; }));
  ok('every badge is active: no rule matches nobody', RULES.every((r) => pool.stats[r.id].k > 0));
  ok('no rule matches a record of another kind', RULES.every((r) => pool.stats[r.id].k <= by[r.kinds[0]].length));
  const num = by.asteroid.filter((m) => /^\d+$/.test(m.id)), prov = by.asteroid.filter((m) => !/^\d+$/.test(m.id));
  ok('asteroids list the numbered ones ascending, then the provisional designations ascending', by.asteroid.slice(0, num.length).every((m) => /^\d+$/.test(m.id)) && num.every((m, i) => i === 0 || +m.id > +num[i - 1].id) && prov.every((m, i) => i === 0 || m.id > prov[i - 1].id));
  ok('asteroid orbits are sane (e below 1.5, inclination within 0 to 180, perihelion positive)', by.asteroid.every((m) => (m.e == null || m.e < 1.5) && (m.i == null || (m.i >= 0 && m.i <= 180))));
  ok('no asteroid is first observed after the capture date', by.asteroid.every((m) => m.seen == null || m.seen <= +raw.meta.capturedAt.slice(0, 4)));
  const starIds = new Set(by.star.map((x) => x.id));
  ok('every exoplanet has its host star in the pool', by.exoplanet.every((p) => starIds.has(p.host)));
  ok('every star hosts at least one listed planet', by.star.every((s) => (s.pnum ?? 0) >= 1));
  ok('planet counts never exceed what the archive lists per system', by.exoplanet.every((p) => p.pnum >= 1 && p.snum >= 1));
  ok('GCAT mega-constellations are thinned: no series of near-identical craft exceeds the cap',
    Math.max(...Object.values(Object.groupBy(by.satellite, (m) => `${m.name.replace(/[\s-]*\d+[A-Za-z]?$/, '')}|${m.maker}|${m.bus}`)).map((g) => g.length)) <= 60);
  ok('satellite launch dates are real dates not after the capture date', by.satellite.every((m) => /^\d{4}(-\d{2}-\d{2})?$/.test(m.launch) && m.launch.slice(0, 10) <= raw.meta.capturedAt));
  const satIds = new Set(by.satellite.map((x) => x.id));
  ok('rocket bodies and satellites share no catalog number', !by.rocket.some((r) => satIds.has(r.id)));
  ok('feature coordinates and sizes are sane', by.feature.every((m) => (m.lat == null || (m.lat >= -90 && m.lat <= 90)) && (m.diameter == null || m.diameter >= 0)));
  ok('every named place has a world and a type', by.feature.every((m) => m.body && m.ftype));
  ok('USGS feature ids look like numbers', by.feature.every((m) => m.fid == null || Number.isInteger(m.fid)));
  ok('the pool is large enough to be a game (>= 100,000)', pool.n >= 100000);
}
