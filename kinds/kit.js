// Tools shared by the per-kind modules (asteroid.js, comet.js, ...): guards for raw values, formatting, and a small rule builder
// that writes each badge's fixtures with the badge, so a rule and its tests can never drift apart.
export const norm = (s) => s.normalize('NFKC').toLowerCase();
export const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
export const pos = (x) => (num(x) !== null && x > 0 ? x : null); // zero or negative is "unknown" for sizes and distances, never a real value
export const nonneg = (x) => (num(x) !== null && x >= 0 ? x : null);
export const whole = (x) => (Number.isInteger(x) && x >= 0 ? x : null);
export const year = (x) => (Number.isInteger(x) && x >= 1000 && x <= 3000 ? x : null);
export const text = (x) => (typeof x === 'string' && x.trim() ? x.trim() : null);
export const chars = (s) => Array.from(s);
export const sig = (n) => Number(n.toPrecision(4)).toLocaleString('en');
export const fmt = (n) => n.toLocaleString('en');
export const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
export const rng = (seed) => { let h = seed >>> 0; return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296); };
export const band = (x, cuts) => cuts.find(([max]) => x < max)[1];
export const unknown = 'not in the catalog';

const just = (v) => v - Math.max(Math.abs(v) * 1e-6, 1e-9); // a value just below v, still inside any range that ends at v

// kit(kind, base, guards): base is a raw record that earns nothing; guards names the numeric fields that treat 0 as unknown ('pos').
// Every builder takes `opt.raw(v)` when the tested field is derived from raw fields (it maps a wanted value to raw overrides) and
// `opt.fuzzy` so boundary fixtures sit 0.1% either side of the threshold instead of exactly on it (derived values carry rounding).
export function kit(kind, base, guards = {}) {
  const rules = [], cases = [];
  const add = (name, family, rule, test, evidence, probes) => {
    const id = `${kind}-${slug(name)}`;
    rules.push({ id, name, family, rule, kinds: [kind], test, evidence });
    for (const [o, want] of probes) cases.push([id, { ...base, kind, ...o }, want]);
  };
  const unit = (u) => (u ? ` ${u}` : '');
  const shown = (field, label, u) => (m) => `${m.lab} has ${label} ${sig(m[field])}${unit(u)}`;
  const probes = (field, opt = {}) => {
    const raw = opt.raw ?? ((v) => ({ [field]: v }));
    const at = (v, want) => [raw(v), want];
    return { at, junk: [at(null, false), at('5', false), ...(guards[field] === 'pos' && !opt.raw ? [at(0, false)] : [])] };
  };
  const edge = (v, opt, dir) => (opt.fuzzy ? (dir > 0 ? v * 1.001 : v * 0.999) : v);
  return {
    rules, cases, add,
    ge(name, family, field, v, label, u, opt = {}) {
      const p = probes(field, opt);
      add(name, family, `${cap(label)} of ${fmt(v)}${unit(u)} or more`, (m) => m[field] !== null && m[field] >= v, shown(field, label, u),
        [p.at(edge(v, opt, 1), true), p.at(opt.fuzzy ? v * 0.999 : just(v), false), ...p.junk]);
    },
    lt(name, family, field, v, label, u, opt = {}) {
      const p = probes(field, opt);
      add(name, family, `${cap(label)} under ${fmt(v)}${unit(u)}`, (m) => m[field] !== null && m[field] < v, shown(field, label, u),
        [p.at(opt.fuzzy ? v * 0.999 : just(v), true), p.at(edge(v, opt, 1), false), ...p.junk]);
    },
    range(name, family, field, lo, hi, label, u, opt = {}) {
      const p = probes(field, opt);
      add(name, family, `${cap(label)} of ${fmt(lo)}${unit(u)} or more but under ${fmt(hi)}${unit(u)}`, (m) => m[field] !== null && m[field] >= lo && m[field] < hi, shown(field, label, u),
        [p.at(edge(lo, opt, 1), true), p.at(opt.fuzzy ? lo * 0.999 : just(lo), false), p.at(opt.fuzzy ? hi * 0.999 : just(hi), true), p.at(edge(hi, opt, 1), false), ...p.junk]);
    },
    // equality on a prepared string field; rawField is the raw record's name for it when the two differ
    is(name, family, field, value, rule, ev, rawField = field) {
      add(name, family, rule, (m) => m[field] === value, ev ?? ((m) => `${m.lab}: ${rule.toLowerCase()}`),
        [[{ [rawField]: value }, true], [{ [rawField]: 'ZZZ' }, false], [{ [rawField]: null }, false], [{ [rawField]: undefined }, false]]);
    },
    when: add,
  };
}

export { just };
