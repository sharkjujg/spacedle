// Exoplanets: rules, record preparation and presentation. Source: NASA Exoplanet Archive (Planetary Systems Composite Parameters).
import { kit, norm, num, pos, nonneg, whole, text, sig, fmt, esc, hash, rng, band, unknown } from './kit.js';

const BASE = { kind: 'exoplanet', id: 'Test b', host: 'Test', year: null, method: null, facility: null, period: null, radius: null, mass: null, eqt: null, sma: null, ecc: null, insol: null, dist: null, pnum: null, snum: null };

export function prep(raw) {
  const id = text(raw.id) ?? 'Unnamed planet';
  return {
    ...raw, kind: 'exoplanet', id, lab: id, host: text(raw.host), n: norm(id), year: Number.isInteger(raw.year) && raw.year >= 1980 && raw.year <= 3000 ? raw.year : null,
    method: text(raw.method), facility: text(raw.facility), period: pos(raw.period), radius: pos(raw.radius), mass: pos(raw.mass), eqt: pos(raw.eqt), sma: pos(raw.sma), ecc: nonneg(raw.ecc),
    insol: nonneg(raw.insol), dist: pos(raw.dist), pnum: whole(raw.pnum), snum: whole(raw.snum),
    letter: /^[a-z]$/.test(id.split(' ').pop()) ? id.split(' ').pop() : null,
  };
}

const k = kit('exoplanet', BASE, { period: 'pos', radius: 'pos', mass: 'pos', eqt: 'pos', sma: 'pos', dist: 'pos' });
const RE = 'radius', EA = 'Earth radii';
k.when('Exoplanet', 'Kind', 'Is a confirmed exoplanet', () => true, (m) => `${m.lab} is a confirmed exoplanet`, [[{}, true]]);
// size classes: a planet is in exactly one
k.lt('Sub-Earth', 'Exoplanet size class', RE, 0.8, 'radius', EA);
k.range('Earth-Sized', 'Exoplanet size class', RE, 0.8, 1.25, 'radius', EA);
k.range('Super-Earth', 'Exoplanet size class', RE, 1.25, 2, 'radius', EA);
k.range('Mini-Neptune', 'Exoplanet size class', RE, 2, 3.5, 'radius', EA);
k.range('Neptune-Sized', 'Exoplanet size class', RE, 3.5, 6, 'radius', EA);
k.range('Saturn-Sized', 'Exoplanet size class', RE, 6, 10, 'radius', EA);
k.range('Jupiter-Sized', 'Exoplanet size class', RE, 10, 15, 'radius', EA);
k.ge('Puffy Giant', 'Exoplanet size class', RE, 15, 'radius', EA);
k.lt('Tiny World', 'Exoplanet smallest', RE, 0.5, 'radius', EA);
k.ge('Mega Giant', 'Exoplanet largest', RE, 20, 'radius', EA);
// mass (Earth masses)
k.lt('Featherweight World', 'Exoplanet light', 'mass', 0.5, 'mass', 'Earth masses');
k.ge('Super-Jupiter', 'Exoplanet heavy', 'mass', 1000, 'mass', 'Earth masses');
k.ge('Brown-Dwarf Border', 'Exoplanet heavy', 'mass', 4000, 'mass', 'Earth masses');
k.range('Earth Mass Club', 'Exoplanet Earth-like mass', 'mass', 0.8, 1.25, 'mass', 'Earth masses');
// temperature (equilibrium, kelvin)
k.lt('Frozen World', 'Exoplanet cold', 'eqt', 150, 'equilibrium temperature', 'K');
k.lt('Cold World', 'Exoplanet cold', 'eqt', 273, 'equilibrium temperature', 'K');
k.range('Temperate Zone', 'Exoplanet temperate', 'eqt', 200, 300, 'equilibrium temperature', 'K');
k.ge('Scorcher', 'Exoplanet heat', 'eqt', 1000, 'equilibrium temperature', 'K');
k.ge('Lava World', 'Exoplanet heat', 'eqt', 1500, 'equilibrium temperature', 'K');
k.ge('Ultra-Hot', 'Exoplanet heat', 'eqt', 2200, 'equilibrium temperature', 'K');
// starlight (Earth = 1)
k.range('Habitable-Zone Light', 'Exoplanet starlight', 'insol', 0.25, 1.5, 'starlight received', '× Earth');
k.ge('Blasted by Light', 'Exoplanet strong light', 'insol', 1000, 'starlight received', '× Earth');
k.lt('Twilight World', 'Exoplanet dim light', 'insol', 0.01, 'starlight received', '× Earth');
// orbit
k.lt('Day-Long Year', 'Exoplanet quick year', 'period', 1, 'orbital period', 'days');
k.lt('Blink-of-an-Eye Year', 'Exoplanet quick year', 'period', 0.5, 'orbital period', 'days');
k.ge('Earth-Length Year', 'Exoplanet long year', 'period', 365, 'orbital period', 'days');
k.ge('Decade-Long Year', 'Exoplanet long year', 'period', 3652, 'orbital period', 'days');
k.ge('Century-Long Year', 'Exoplanet long year', 'period', 36525, 'orbital period', 'days');
k.lt('Hugging Its Star', 'Exoplanet close orbit', 'sma', 0.05, 'orbital distance', 'au');
k.ge('Wide Orbit', 'Exoplanet far orbit', 'sma', 10, 'orbital distance', 'au');
k.ge('Distant Wanderer', 'Exoplanet far orbit', 'sma', 100, 'orbital distance', 'au');
k.ge('Eccentric Orbit', 'Exoplanet eccentricity', 'ecc', 0.5, 'orbital eccentricity', '');
k.ge('Extreme Eccentricity', 'Exoplanet eccentricity', 'ecc', 0.8, 'orbital eccentricity', '');
// distance from Earth (parsecs; 1 pc = 3.26 light-years)
k.lt('Next Door', 'Exoplanet nearby', 'dist', 10, 'distance from Earth', 'parsecs');
k.lt('In the Neighborhood', 'Exoplanet nearby', 'dist', 30, 'distance from Earth', 'parsecs');
k.ge('Across the Galaxy', 'Exoplanet faraway', 'dist', 3000, 'distance from Earth', 'parsecs');
k.ge('Galactic Reach', 'Exoplanet faraway', 'dist', 7000, 'distance from Earth', 'parsecs');
// how it was found
const METHODS = [['Transit', 'Transit Find'], ['Radial Velocity', 'Wobble Find'], ['Microlensing', 'Lens Find'], ['Imaging', 'Direct Image'], ['Transit Timing Variations', 'Transit-Timing Find'],
  ['Eclipse Timing Variations', 'Eclipse-Timing Find'], ['Orbital Brightness Modulation', 'Glow-Curve Find'], ['Pulsar Timing', 'Pulsar-Timing Find'], ['Astrometry', 'Astrometry Find'],
  ['Pulsation Timing Variations', 'Pulsation-Timing Find'], ['Disk Kinematics', 'Disk-Motion Find']];
for (const [method, nm] of METHODS) {
  k.when(nm, 'Exoplanet discovery method', `Discovered by the ${method} method`, (m) => m.method === method, (m) => `${m.lab} was found by ${method.toLowerCase()}`,
    [[{ method }, true], [{ method: 'Other' }, false], [{ method: null }, false]]);
}
const FACILITIES = [['Kepler', 'Kepler Find'], ['Transiting Exoplanet Survey Satellite (TESS)', 'TESS Find'], ['K2', 'K2 Find'], ['La Silla Observatory', 'La Silla Find'], ['W. M. Keck Observatory', 'Keck Find'],
  ['KMTNet', 'KMTNet Find'], ['SuperWASP', 'SuperWASP Find'], ['OGLE', 'OGLE Find'], ['HATSouth', 'HATSouth Find'], ['HATNet', 'HATNet Find']];
for (const [facility, nm] of FACILITIES) {
  k.when(nm, 'Exoplanet discovery facility', `Discovered by ${facility}`, (m) => m.facility === facility, (m) => `${m.lab} was found by ${facility}`, [[{ facility }, true], [{ facility: 'Elsewhere' }, false], [{ facility: null }, false]]);
}
const yr = (m) => `${m.lab} was discovered in ${m.year}`;
k.when('Pioneer Planet', 'Exoplanet discovery era', 'Discovered in 1999 or earlier', (m) => m.year !== null && m.year <= 1999, yr, [[{ year: 1999 }, true], [{ year: 2000 }, false], [{ year: null }, false], [{ year: 0 }, false]]);
k.when('Early Find', 'Exoplanet discovery era', 'Discovered from 2000 to 2008', (m) => m.year !== null && m.year >= 2000 && m.year <= 2008, yr, [[{ year: 2000 }, true], [{ year: 2008 }, true], [{ year: 1999 }, false], [{ year: 2009 }, false]]);
k.when('Kepler Years', 'Exoplanet discovery era', 'Discovered from 2009 to 2017', (m) => m.year !== null && m.year >= 2009 && m.year <= 2017, yr, [[{ year: 2009 }, true], [{ year: 2017 }, true], [{ year: 2008 }, false], [{ year: 2018 }, false]]);
k.when('Modern Find', 'Exoplanet discovery era', 'Discovered from 2018 to 2025', (m) => m.year !== null && m.year >= 2018 && m.year <= 2025, yr, [[{ year: 2018 }, true], [{ year: 2025 }, true], [{ year: 2017 }, false], [{ year: 2026 }, false]]);
k.when('Discovered This Year', 'Exoplanet recency', 'Discovered in the year the pool was captured', (m, poolDate) => m.year !== null && m.year === Number(String(poolDate).slice(0, 4)), yr, [[{ year: 2026 }, true], [{ year: 2025 }, false], [{ year: null }, false]]);
// its system
const sys = (m) => `${m.lab} is one of ${m.pnum} known planet${m.pnum === 1 ? '' : 's'} around ${m.host}`;
k.when('Solo Planet', 'Exoplanet system size', 'The only known planet in its system', (m) => m.pnum === 1, sys, [[{ pnum: 1 }, true], [{ pnum: 2 }, false], [{ pnum: null }, false]]);
k.when('Crowded System', 'Exoplanet system size', 'Part of a system with 4 or more known planets', (m) => m.pnum !== null && m.pnum >= 4, sys, [[{ pnum: 4 }, true], [{ pnum: 3 }, false], [{ pnum: null }, false]]);
k.when('Full House', 'Exoplanet system size', 'Part of a system with 6 or more known planets', (m) => m.pnum !== null && m.pnum >= 6, sys, [[{ pnum: 6 }, true], [{ pnum: 5 }, false], [{ pnum: null }, false]]);
k.when('Seven Wonders', 'Exoplanet system size', 'Part of a system with 7 or more known planets', (m) => m.pnum !== null && m.pnum >= 7, sys, [[{ pnum: 7 }, true], [{ pnum: 6 }, false], [{ pnum: null }, false]]);
const stars = (m) => `${m.lab} orbits in a system of ${m.snum} stars`;
k.when('Double Sun', 'Exoplanet star count', 'Its system has 2 or more stars', (m) => m.snum !== null && m.snum >= 2, stars, [[{ snum: 2 }, true], [{ snum: 1 }, false], [{ snum: null }, false]]);
k.when('Triple Sun', 'Exoplanet star count', 'Its system has 3 or more stars', (m) => m.snum !== null && m.snum >= 3, stars, [[{ snum: 3 }, true], [{ snum: 2 }, false], [{ snum: null }, false]]);
// catalog the name comes from
for (const [nm, label, re] of [['Kepler Catalog', 'Kepler-', /^kepler-\d/], ['K2 Catalog', 'K2-', /^k2-\d/], ['TOI Catalog', 'TOI-', /^toi-\d/], ['HD Catalog', 'HD ', /^hd \d/], ['Hipparcos Catalog', 'HIP ', /^hip \d/],
  ['Gliese Catalog', 'GJ or Gliese', /^(gj|gliese) \d/], ['WASP Catalog', 'WASP-', /^wasp-\d/], ['HAT Catalog', 'HAT-P-', /^hat-p-\d/], ['KELT Catalog', 'KELT-', /^kelt-\d/], ['OGLE Catalog', 'OGLE-', /^ogle-/],
  ['CoRoT Catalog', 'CoRoT-', /^corot-\d/], ['Flamsteed Name', 'a Flamsteed number plus constellation, like 51 Peg', /^\d+ [a-z]{3} [a-z]$/]]) {
  const sample = label.endsWith(' ') ? `${label}12` : label.endsWith('-') ? `${label}12` : label.includes('Flamsteed') ? '51 Peg' : label === 'GJ or Gliese' ? 'GJ 12' : `${label}12`;
  k.when(nm, 'Exoplanet name catalog', `Its name starts with ${label}`, (m) => re.test(m.n), (m) => `${m.lab} follows the ${nm.replace(' Catalog', '').replace(' Name', '')} naming pattern`,
    [[{ id: `${sample} b` }, true], [{ id: 'Plain Name b' }, false], [{ id: null }, false]]);
}
k.when('Late Letter', 'Exoplanet planet letter', 'The planet letter is e or later (the fifth planet or beyond)', (m) => m.letter !== null && m.letter >= 'e', (m) => `${m.lab} carries the letter ${m.letter}`, [[{ id: 'Star e' }, true], [{ id: 'Star d' }, false], [{ id: 'Star' }, false], [{ id: 'Star 1' }, false]]);

export const rules = k.rules, cases = k.cases;

const SIZE = [[0.8, 'sub-Earth'], [1.25, 'Earth-sized'], [2, 'super-Earth'], [3.5, 'mini-Neptune'], [6, 'Neptune-sized'], [10, 'Saturn-sized'], [15, 'Jupiter-sized'], [Infinity, 'puffy giant']];
const sizeName = (m) => (m.radius ? band(m.radius, SIZE) : null);
const color = (m) => { // cold planets are blue-white, temperate ones teal-green, hot ones orange to red
  const t = m.eqt ?? 400;
  return t < 150 ? 215 : t < 273 ? 195 : t < 320 ? 150 : t < 700 ? 80 : t < 1200 ? 38 : t < 2000 ? 22 : 8;
};
export const view = {
  label: (m) => m.lab,
  sub: (m) => [sizeName(m), m.host ? `orbits ${m.host}` : null].filter(Boolean).join(' · ') || 'confirmed planet',
  facts: (m) => [
    ['Kind', 'Exoplanet (confirmed)'], ['Host star', m.host ?? unknown], ['Discovered', m.year !== null ? `${m.year}${m.method ? ` by ${m.method.toLowerCase()}` : ''}${m.facility ? ` at ${m.facility}` : ''}` : unknown],
    ['Radius', m.radius ? `${sig(m.radius)} × Earth (${sig(m.radius * 0.0892)} × Jupiter)` : unknown], ['Mass', m.mass ? `${sig(m.mass)} × Earth (${sig(m.mass / 317.8)} × Jupiter)` : unknown],
    ['Orbital period', m.period ? `${sig(m.period)} days (${sig(m.period / 365.25)} years)` : unknown], ['Orbital distance', m.sma ? `${sig(m.sma)} au` : unknown],
    ['Orbital eccentricity', m.ecc !== null ? String(m.ecc) : unknown], ['Equilibrium temperature', m.eqt ? `${sig(m.eqt)} K (${sig(m.eqt - 273.15)} °C)` : unknown],
    ['Starlight received', m.insol !== null ? `${sig(m.insol)} × Earth` : unknown], ['Distance from Earth', m.dist ? `${sig(m.dist)} parsecs (${sig(m.dist * 3.2616)} light-years)` : unknown],
    ['Planets and stars in the system', m.pnum !== null && m.snum !== null ? `${m.pnum} planet${m.pnum === 1 ? '' : 's'}, ${m.snum} star${m.snum === 1 ? '' : 's'}` : unknown],
    ['Source', 'NASA Exoplanet Archive', `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(m.id)}`],
  ],
  shelves: (m) => [
    ...(sizeName(m) ? [['Exoplanet size', `${sizeName(m)[0].toUpperCase()}${sizeName(m).slice(1)} planets`]] : []),
    ...(m.method ? [['Exoplanet method', `Planets found by ${m.method.toLowerCase()}`]] : []),
    ...(m.year !== null ? [['Exoplanet discovery', `Planets discovered in the ${Math.floor(m.year / 10) * 10}s`]] : []),
    ...(m.facility && ['Kepler', 'K2', 'Transiting Exoplanet Survey Satellite (TESS)'].includes(m.facility) ? [['Exoplanet survey', `Planets found by ${m.facility.replace(' (TESS)', '').replace('Transiting Exoplanet Survey Satellite', 'TESS')}`]] : []),
    ...(m.eqt ? [['Exoplanet climate', 'Planets ' + band(m.eqt, [[150, 'colder than 150 K'], [273, 'at 150 to 273 K'], [400, 'at 273 to 400 K'], [1000, 'at 400 to 1,000 K'], [Infinity, 'hotter than 1,000 K']])]] : []),
    ...(m.dist ? [['Exoplanet distance', 'Planets ' + band(m.dist, [[10, 'within 10 parsecs'], [100, '10 to 100 parsecs away'], [1000, '100 to 1,000 parsecs away'], [Infinity, 'over 1,000 parsecs away']])]] : []),
    ...(m.pnum !== null ? [['Exoplanet system', m.pnum === 1 ? 'Planets alone in their system' : m.pnum < 4 ? 'Planets in systems of 2 to 3' : 'Planets in systems of 4 or more']] : []),
  ],
  art(m) { // original planet: size from radius, color from temperature, bands on gas giants. Never affects scoring; not a photograph.
    const h = hash(m.id), rnd = rng(h), hue = color(m), giant = (m.radius ?? 2) >= 6;
    const r = 11 + 25 * Math.min(1, Math.log10(1 + (m.radius ?? 2)) / Math.log10(21));
    const bands = giant ? Array.from({ length: 6 }, (_, j) => `<rect x="${50 - r}" y="${(50 - r + (j + rnd() * 0.6) * (2 * r / 6)).toFixed(1)}" width="${2 * r}" height="${(2 * r / 14).toFixed(1)}" fill="hsl(${hue + (j % 2 ? 12 : -8)} 50% ${40 + rnd() * 14}%)" opacity=".5"/>`).join('') : '';
    const ring = giant && h % 3 === 0 ? `<ellipse cx="50" cy="50" rx="${(r * 1.7).toFixed(1)}" ry="${(r * 0.35).toFixed(1)}" fill="none" stroke="hsl(${hue} 40% 70%)" stroke-width="1.6" opacity=".6" transform="rotate(-14 50 50)"/>` : '';
    const stars = Array.from({ length: 26 }, () => `<circle cx="${(rnd() * 100).toFixed(1)}" cy="${(rnd() * 100).toFixed(1)}" r="${(0.25 + rnd() * 0.5).toFixed(2)}"/>`).join('');
    return `<svg class="avatar" viewBox="0 0 100 100" role="img" aria-label="Generated picture of an exoplanet. Not a photograph.">
      <defs><radialGradient id="pl${h}" cx=".34" cy=".3" r=".9"><stop offset="0" stop-color="hsl(${hue} 65% 68%)"/><stop offset=".55" stop-color="hsl(${hue} 55% 38%)"/><stop offset="1" stop-color="hsl(${hue} 60% 10%)"/></radialGradient>
      <radialGradient id="gl${h}"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
      <clipPath id="cl${h}"><circle cx="50" cy="50" r="${r.toFixed(1)}"/></clipPath></defs>
      <rect width="100" height="100" rx="8" fill="#070a16"/><g fill="#fff" opacity=".7">${stars}</g><circle cx="94" cy="6" r="30" fill="url(#gl${h})"/>
      <circle cx="50" cy="50" r="${(r + 2.4).toFixed(1)}" fill="hsl(${hue} 70% 55%)" opacity=".18"/><circle cx="50" cy="50" r="${r.toFixed(1)}" fill="url(#pl${h})"/><g clip-path="url(#cl${h})">${bands}</g>${ring}
      <text x="50" y="95" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5.5" letter-spacing=".6" fill="#8791b8">GENERATED IMAGE</text></svg>`;
  },
};
export default { kind: 'exoplanet', name: 'Exoplanets', one: 'exoplanet', prep, rules, cases, view };
