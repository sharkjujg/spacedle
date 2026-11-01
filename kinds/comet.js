// Comets: rules, record preparation and presentation. Source: NASA/JPL Small-Body Database.
import { kit, norm, num, pos, nonneg, text, sig, fmt, hash, rng, band, unknown } from './kit.js';

const BASE = { kind: 'comet', id: '999P', name: 'Test Comet', prefix: null, number: null, class: null, e: null, q: null, i: null, a: null, moid: null, mag: null, first: null, last: null, arc: null, obs: null, cond: null };
const CLASSES = new Set(['PAR', 'HYP', 'COM', 'JFc', 'JFC', 'HTC', 'ETc', 'CTc']);
export const CLASS = { PAR: 'Parabolic', HYP: 'Hyperbolic', COM: 'Long-period', JFc: 'Jupiter-family', JFC: 'Jupiter-family', HTC: 'Halley-type', ETc: 'Encke-type', CTc: 'Chiron-type' };
const PREFIX = { P: 'Periodic', C: 'Non-periodic', D: 'Defunct' };
const SURVEYS = [['SOHO', /\bsoho\b/], ['Pan-STARRS', /pan-?starrs/], ['LINEAR', /\blinear\b/], ['ATLAS', /\batlas\b/], ['Lemmon', /\blemmon\b/], ['McNaught', /\bmcnaught\b/], ['Catalina', /\bcatalina\b/],
  ['NEAT', /\bneat\b/], ['Spacewatch', /\bspacewatch\b/], ['NEOWISE', /\bneowise\b/], ['LONEOS', /\bloneos\b/], ['Hubble', /\bhubble\b/]];
const survey = (m) => (SURVEYS.find(([, re]) => re.test(m.n ?? '')) ?? [null, null])[0] ?? 'Other credit';

export function prep(raw) {
  const name = text(raw.name);
  // The discoverer credit: the part after the slash of a numbered comet ("Schwassmann-Wachmann"), else the last parenthesis ("Hale-Bopp").
  const credit = name ? ((/^\d+[PD](-[A-Z]+)?\/(.+)$/.exec(name) || [])[2] ?? (/\(([^)]+)\)\s*$/.exec(name) || [])[1] ?? null) : null;
  const e = nonneg(raw.e), a = pos(raw.a), bound = a !== null && e !== null && e < 1;
  return {
    ...raw, kind: 'comet', n: name ? norm(name) : null, credit: credit ? norm(credit) : null, name, lab: name ?? text(raw.id) ?? 'Unnamed comet',
    fragment: typeof raw.id === 'string' ? /^\d+[PD]-[A-Z]+$/.test(raw.id) : null, // JPL ids a fragment as 73P-B while its name reads 73P/Schwassmann-Wachmann 3-B
    cls: CLASSES.has(raw.class) ? raw.class : null, prefix: ['P', 'C', 'D'].includes(raw.prefix) ? raw.prefix : null,
    number: Number.isInteger(raw.number) && raw.number > 0 ? raw.number : null,
    e, q: pos(raw.q), i: nonneg(raw.i), a, ad: bound ? a * (1 + e) : null, period: bound ? a ** 1.5 : null, moid: nonneg(raw.moid), mag: num(raw.mag),
    first: Number.isInteger(raw.first) && raw.first >= 1000 && raw.first <= 3000 ? raw.first : null, arc: nonneg(raw.arc), obs: Number.isInteger(raw.obs) && raw.obs >= 0 ? raw.obs : null,
    cond: Number.isInteger(raw.cond) && raw.cond >= 0 && raw.cond <= 9 ? raw.cond : null,
  };
}

const k = kit('comet', BASE, { q: 'pos', a: 'pos' });
const au = 'au', fz = (to) => ({ fuzzy: true, raw: (v) => (v === null || typeof v === 'string' ? { a: v } : to(v)) });
const ELL = (v) => ({ a: v ** (2 / 3), e: 0.5 }); // an ellipse whose period is v years
const peri = (m) => `${m.lab} comes within ${sig(m.q)} au of the Sun at perihelion`;
k.when('Comet', 'Kind', 'Is a comet', () => true, (m) => `${m.lab} is a comet`, [[{}, true]]);

for (const [code, nm, what, also] of [['PAR', 'Parabolic Orbit', 'a parabolic fit (eccentricity of exactly 1)'], ['HYP', 'Hyperbolic Orbit', 'an unbound, hyperbolic orbit'], ['COM', 'Long-Period Orbit', 'a long-period comet'],
  ['JFc', 'Jupiter Family', 'Jupiter-family', 'JFC'], ['HTC', 'Halley Type', 'Halley-type'], ['ETc', 'Encke Type', 'Encke-type'], ['CTc', 'Chiron Type', 'Chiron-type']]) {
  const codes = also ? [code, also] : [code];
  k.when(nm, 'Comet orbit class', `JPL orbit class ${codes.join(' or ')}: ${what}`, (m) => m.cls !== null && codes.includes(m.cls), (m) => `${m.lab} has JPL orbit class ${m.cls}: ${what}`,
    [[{ class: code }, true], ...(also ? [[{ class: also }, true]] : []), [{ class: 'ZZZ' }, false], [{ class: null }, false]]);
}
k.when('Periodic Comet', 'Comet prefix', 'Designation prefix P: a periodic comet', (m) => m.prefix === 'P', (m) => `${m.lab} carries the periodic prefix P`, [[{ prefix: 'P' }, true], [{ prefix: 'C' }, false], [{ prefix: null }, false]]);
k.when('Defunct Comet', 'Comet prefix', 'Designation prefix D: a comet that has disappeared or broken up', (m) => m.prefix === 'D', (m) => `${m.lab} carries the defunct prefix D`, [[{ prefix: 'D' }, true], [{ prefix: 'P' }, false], [{ prefix: null }, false]]);
const cn = (m) => `${m.lab} is comet number ${m.number}`;
k.when('Numbered Comet', 'Comet numbering', 'A periodic comet with a permanent number', (m) => m.number !== null, cn, [[{ number: 1 }, true], [{ number: 0 }, false], [{ number: null }, false], [{ number: '5' }, false]]);
k.when('Early Number', 'Comet numbering', 'Comet number 20 or lower', (m) => m.number !== null && m.number <= 20, cn, [[{ number: 20 }, true], [{ number: 21 }, false], [{ number: null }, false]]);
k.when('Round Comet Number', 'Comet number pattern', 'Comet number that is a whole multiple of 10', (m) => m.number !== null && m.number % 10 === 0, cn, [[{ number: 30 }, true], [{ number: 31 }, false], [{ number: null }, false]]);

k.lt('Sungrazer', 'Comet perihelion', 'q', 0.05, 'perihelion distance', au);
k.ge('Far Perihelion', 'Comet far perihelion', 'q', 3, 'perihelion distance', au);
k.ge('Perihelion Past Jupiter', 'Comet far perihelion', 'q', 5.2, 'perihelion distance', au);
k.ge('Extreme Perihelion', 'Comet far perihelion', 'q', 10, 'perihelion distance', au);
k.when('Retrograde Orbit', 'Comet direction', 'Inclination over 90 degrees (orbits against the planets)', (m) => m.i !== null && m.i > 90, (m) => `${m.lab} has an orbital inclination of ${m.i}°`, [[{ i: 90.5 }, true], [{ i: 90 }, false], [{ i: 89 }, false], [{ i: null }, false]]);
k.when('Polar Orbit', 'Comet polar', 'Inclination from 80 through 100 degrees', (m) => m.i !== null && m.i >= 80 && m.i <= 100, (m) => `${m.lab} has an orbital inclination of ${m.i}°`, [[{ i: 80 }, true], [{ i: 100 }, true], [{ i: 79 }, false], [{ i: 101 }, false], [{ i: null }, false]]);
k.ge('Steeply Retrograde', 'Comet direction', 'i', 150, 'inclination', '°');
k.lt('Shallow Orbit', 'Comet flatness', 'i', 10, 'inclination', '°');
k.lt('Ecliptic Hugger', 'Comet flatness', 'i', 5, 'inclination', '°');
k.lt('Low Eccentricity', 'Comet roundness', 'e', 0.5, 'eccentricity', '');
k.lt('Near Circular', 'Comet roundness', 'e', 0.3, 'eccentricity', '');
k.lt('Short Period', 'Comet quick orbit', 'period', 20, 'orbital period', 'years', fz(ELL));
k.lt('Speedy Orbiter', 'Comet quick orbit', 'period', 6, 'orbital period', 'years', fz(ELL));
k.ge('Millennium Orbit', 'Comet long orbit', 'period', 1000, 'orbital period', 'years', fz(ELL));
k.ge('Ten Millennia', 'Comet long orbit', 'period', 10000, 'orbital period', 'years', fz(ELL));
k.ge('Hundred Millennia', 'Comet long orbit', 'period', 100000, 'orbital period', 'years', fz(ELL));
k.lt('Naked-Eye Bright', 'Comet brightness', 'mag', 5, 'total magnitude', '');
k.lt('Binocular Bright', 'Comet brightness', 'mag', 8, 'total magnitude', '');
k.ge('Faint Comet', 'Comet faintness', 'mag', 15, 'total magnitude', '');
k.ge('Very Faint', 'Comet faintness', 'mag', 18, 'total magnitude', '');
k.lt('Earth Close', 'Comet Earth distance', 'moid', 0.05, 'closest approach to Earth\'s orbit', au);
k.lt('Earth Skimmer', 'Comet Earth distance', 'moid', 0.01, 'closest approach to Earth\'s orbit', au);
k.ge('Kuiper Reach', 'Comet aphelion', 'ad', 30, 'aphelion distance', au, fz((v) => ({ a: v / 1.5, e: 0.5 })));
k.ge('Oort Reach', 'Comet aphelion', 'ad', 100, 'aphelion distance', au, fz((v) => ({ a: v / 1.5, e: 0.5 })));
for (const [nm, re, label] of [['SOHO Find', 'soho', 'SOHO'], ['Pan-STARRS Find', 'pan-?starrs', 'Pan-STARRS'], ['LINEAR Find', 'linear', 'LINEAR'], ['ATLAS Find', 'atlas', 'ATLAS'], ['Lemmon Find', 'lemmon', 'Lemmon'],
  ['McNaught Find', 'mcnaught', 'McNaught'], ['Catalina Find', 'catalina', 'Catalina'], ['NEAT Find', 'neat', 'NEAT'], ['Spacewatch Find', 'spacewatch', 'Spacewatch'], ['NEOWISE Find', 'neowise', 'NEOWISE'],
  ['LONEOS Find', 'loneos', 'LONEOS'], ['Hubble Find', 'hubble', 'Hubble']]) {
  const rx = new RegExp(`\\b${re}\\b`);
  k.when(nm, 'Comet discoverer', `Credit contains ${label}`, (m) => m.n !== null && rx.test(m.n), (m) => `"${m.name}" is credited to ${label}`,
    [[{ name: `C/2020 X1 (${label})` }, true], [{ name: 'C/2020 X1 (Someone)' }, false], [{ name: null }, false]]);
}
k.when('Two Discoverers', 'Comet credit line', 'The credit joins two or more names with a hyphen', (m) => m.credit !== null && m.credit.includes('-'), (m) => `"${m.name}" is credited to ${m.credit}`,
  [[{ name: '8P/Tuttle-Giacobini-Kresak' }, true], [{ name: '2P/Encke' }, false], [{ name: null }, false]]);
k.when('Split Comet', 'Comet fragment', 'The designation names a fragment of a split comet (73P-B and the like)', (m) => m.fragment === true, (m) => `"${m.name}" is a fragment`, [[{ id: '73P-B' }, true], [{ id: '73P' }, false], [{ id: null }, false]]);
k.when('One-Night Wonder', 'Comet brief watch', 'Observed over one day or less', (m) => m.arc !== null && m.arc <= 1, (m) => `${m.lab} was observed over ${fmt(Math.round(m.arc))} day${Math.round(m.arc) === 1 ? '' : 's'}`, [[{ arc: 1 }, true], [{ arc: 0 }, true], [{ arc: 1.5 }, false], [{ arc: null }, false]]);
k.ge('Long Observed', 'Comet watch time', 'arc', 3650, 'observation arc', 'days');
k.ge('Century Arc', 'Comet watch time', 'arc', 36525, 'observation arc', 'days');
k.when('Barely Observed', 'Comet few observations', '5 or fewer observations in the orbit fit', (m) => m.obs !== null && m.obs <= 5, (m) => `${m.lab} has ${fmt(m.obs)} observations in its orbit fit`, [[{ obs: 5 }, true], [{ obs: 6 }, false], [{ obs: null }, false]]);
k.ge('Heavily Followed', 'Comet observations', 'obs', 1000, 'observations in its orbit fit', '');
k.ge('Observation Giant', 'Comet observations', 'obs', 3000, 'observations in its orbit fit', '');
const seen = (m) => `${m.lab} was first observed in ${m.first}`;
k.when('Ancient Sighting', 'Comet first sighting', 'First observed in 1900 or earlier', (m) => m.first !== null && m.first <= 1900, seen, [[{ first: 1900 }, true], [{ first: 1901 }, false], [{ first: null }, false], [{ first: 0 }, false]]);
k.when('Newly Spotted', 'Comet first sighting', 'First observed in 2024 or later', (m) => m.first !== null && m.first >= 2024, seen, [[{ first: 2024 }, true], [{ first: 2023 }, false], [{ first: null }, false]]);
k.when('Spotted This Year', 'Comet recency', 'First observed in the year the pool was captured', (m, poolDate) => m.first !== null && m.first === Number(String(poolDate).slice(0, 4)), seen, [[{ first: 2026 }, true], [{ first: 2025 }, false], [{ first: null }, false]]);
k.when('Best Orbit', 'Comet orbit quality', 'Orbit condition code 0 (the best-determined orbits)', (m) => m.cond === 0, (m) => `${m.lab} has orbit condition code ${m.cond}`, [[{ cond: 0 }, true], [{ cond: 1 }, false], [{ cond: null }, false]]);
k.when('Wobbly Orbit', 'Comet orbit doubt', 'Orbit condition code 7 to 9 (poorly determined)', (m) => m.cond !== null && m.cond >= 7, (m) => `${m.lab} has orbit condition code ${m.cond}`, [[{ cond: 7 }, true], [{ cond: 6 }, false], [{ cond: null }, false]]);

export const rules = k.rules, cases = k.cases;

const years = (days) => (days >= 730 ? `${fmt(Math.round(days / 365.25))} years` : `${fmt(Math.round(days))} day${Math.round(days) === 1 ? '' : 's'}`);
export const view = {
  label: (m) => m.lab,
  sub: (m) => `${(CLASS[m.cls] ?? 'unclassified').toLowerCase()} orbit · ${(PREFIX[m.prefix] ?? 'comet').toLowerCase()}`,
  facts: (m) => [
    ['Kind', 'Comet'], ['Designation', m.id], ['Orbit class', m.cls ? `${CLASS[m.cls]} (JPL class ${m.cls})` : unknown], ['Type', PREFIX[m.prefix] ?? unknown],
    ['Perihelion', m.q !== null ? `${sig(m.q)} au` : unknown], ['Aphelion', m.ad !== null ? `${sig(m.ad)} au` : m.e !== null && m.e >= 1 ? 'none (open orbit)' : unknown],
    ['Eccentricity', m.e !== null ? String(m.e) : unknown], ['Inclination', m.i !== null ? `${m.i}°${m.i > 90 ? ' (retrograde)' : ''}` : unknown],
    ['Orbital period', m.period !== null ? `${sig(m.period)} years` : m.e !== null && m.e >= 1 ? 'none (open orbit)' : unknown],
    ['Closest approach to Earth\'s orbit', m.moid !== null ? `${sig(m.moid)} au` : unknown], ['Total magnitude', m.mag !== null ? String(m.mag) : unknown],
    ['First observed', m.first !== null ? String(m.first) : unknown], ['Observation arc', m.arc !== null ? years(m.arc) : unknown],
    ['Observations in the orbit fit', m.obs !== null ? fmt(m.obs) : unknown], ['Orbit condition (0 best, 9 worst)', m.cond !== null ? String(m.cond) : unknown],
    ['Source', 'NASA/JPL Small-Body Database', `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(m.id)}`],
  ],
  shelves: (m) => [
    ...(m.cls ? [['Comet orbit class', `${CLASS[m.cls]} comets`]] : []), ['Comet discoverer', `Comets credited to ${survey(m) === 'Other credit' ? 'other discoverers' : survey(m)}`],
    ...(m.i !== null ? [['Comet direction', m.i > 90 ? 'Retrograde comets' : 'Prograde comets']] : []),
    ...(m.q !== null ? [['Comet perihelion', 'Comets ' + band(m.q, [[0.05, 'with perihelion under 0.05 au (sungrazers)'], [0.5, 'with perihelion 0.05 to 0.5 au'], [1, 'with perihelion 0.5 to 1 au'], [2, 'with perihelion 1 to 2 au'], [3, 'with perihelion 2 to 3 au'], [Infinity, 'with perihelion 3 au or more']])]] : []),
    ...(m.i !== null ? [['Comet tilt', 'Comets ' + band(m.i, [[10, 'tilted under 10°'], [45, 'tilted 10° to 45°'], [90, 'tilted 45° to 90°'], [135, 'tilted 90° to 135°'], [Infinity, 'tilted 135° or more']])]] : []),
    ...(m.period !== null ? [['Comet period', 'Comets ' + band(m.period, [[10, 'orbiting in under 10 years'], [100, 'orbiting in 10 to 100 years'], [1000, 'orbiting in 100 to 1,000 years'], [Infinity, 'orbiting in over 1,000 years']])]] : []),
    ...(m.mag !== null ? [['Comet brightness', 'Comets ' + band(m.mag, [[8, 'of magnitude 8 or brighter'], [12, 'of magnitude 8 to 12'], [16, 'of magnitude 12 to 16'], [Infinity, 'fainter than magnitude 16']])]] : []),
    ...(m.first !== null ? [['Comet discovery', `Comets first seen in the ${Math.floor(m.first / 10) * 10}s`]] : []),
  ],
  art(m) { // original comet: the tail is longer the closer perihelion is and wider the brighter the comet is; it never affects scoring
    const h = hash(m.id), hue = 200 + (h % 110), q = m.q ?? 1;
    const len = 24 + 46 * Math.max(0, Math.min(1, (3 - q) / 3));
    const wide = 4 + 8 * (m.mag === null ? 0.3 : Math.max(0, Math.min(1, (18 - m.mag) / 18)));
    const x = 26, y = 70, ex = x + len, ey = y - len * 0.62, rnd = rng(h);
    const stars = Array.from({ length: 24 }, () => `<circle cx="${(4 + rnd() * 92).toFixed(1)}" cy="${(4 + rnd() * 70).toFixed(1)}" r="${(0.4 + rnd() * 0.7).toFixed(2)}" fill="#fff" opacity="${(0.35 + rnd() * 0.6).toFixed(2)}"/>`).join('');
    return `<svg class="avatar" viewBox="0 0 100 100" role="img" aria-label="Generated comet picture. Not a photograph.">
      <defs><linearGradient id="tail${h}" x1="${x}" y1="${y}" x2="${ex}" y2="${ey}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="hsl(${hue} 90% 85%)" stop-opacity=".95"/><stop offset="1" stop-color="hsl(${hue} 80% 60%)" stop-opacity="0"/></linearGradient>
      <radialGradient id="sun${h}"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient></defs>
      <rect width="100" height="100" rx="8" fill="hsl(${(hue + 200) % 360} 45% 8%)"/>${stars}
      <circle cx="6" cy="92" r="18" fill="url(#sun${h})"/>
      <path d="M${x} ${y - wide / 2} L${ex} ${ey - wide * 1.4} L${ex + wide} ${ey + wide * 0.4} L${x} ${y + wide / 2} Z" fill="url(#tail${h})"/>
      <path d="M${x} ${y} Q${x + len * 0.5} ${y - len * 0.2} ${ex + 6} ${ey - 10}" stroke="hsl(${hue} 100% 75%)" stroke-width=".8" fill="none" opacity=".5"/>
      <circle cx="${x}" cy="${y}" r="3.2" fill="#fff"/><circle cx="${x}" cy="${y}" r="6" fill="hsl(${hue} 90% 80%)" opacity=".35"/>
      <text x="50" y="96" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5" letter-spacing=".6" fill="#8e9ab0">GENERATED COMET</text></svg>`;
  },
};
export default { kind: 'comet', name: 'Comets', one: 'comet', prep, rules, cases, view };
