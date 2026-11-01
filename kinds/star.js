// Stars that host known exoplanets: rules, record preparation and presentation. Source: NASA Exoplanet Archive (stellar columns).
import { kit, norm, num, pos, nonneg, whole, text, sig, fmt, hash, rng, band, unknown } from './kit.js';

const BASE = { kind: 'star', id: 'Test', year: null, pnum: null, snum: null, sptype: null, teff: null, rad: null, smass: null, met: null, age: null, vmag: null, kmag: null, dist: null, ra: null, dec: null };
const within = (x, lo, hi) => (num(x) !== null && x >= lo && x <= hi ? x : null);

export function prep(raw) {
  const id = text(raw.id) ?? 'Unnamed star';
  return {
    ...raw, kind: 'star', id, lab: id, n: norm(id), year: Number.isInteger(raw.year) && raw.year >= 1980 ? raw.year : null, pnum: whole(raw.pnum), snum: whole(raw.snum), sptype: text(raw.sptype),
    teff: pos(raw.teff), rad: pos(raw.rad), smass: pos(raw.smass), met: within(raw.met, -4, 2), age: pos(raw.age), vmag: within(raw.vmag, -3, 35), kmag: within(raw.kmag, -5, 35), dist: pos(raw.dist),
    ra: within(raw.ra, 0, 360), dec: within(raw.dec, -90, 90),
  };
}

const k = kit('star', BASE, { teff: 'pos', rad: 'pos', smass: 'pos', age: 'pos', dist: 'pos' });
k.when('Host Star', 'Kind', 'Is a star with at least one confirmed planet', () => true, (m) => `${m.lab} hosts ${m.pnum ?? 'at least one'} known planet${m.pnum === 1 ? '' : 's'}`, [[{}, true]]);
// colour class by surface temperature: a star with a known temperature is in exactly one
const T = 'surface temperature', Kel = 'K';
k.ge('Blue Star', 'Star colour', 'teff', 10000, T, Kel);
k.range('White Star', 'Star colour', 'teff', 7500, 10000, T, Kel);
k.range('Yellow-White Star', 'Star colour', 'teff', 6000, 7500, T, Kel);
k.range('Sun-Like Star', 'Star colour', 'teff', 5200, 6000, T, Kel);
k.range('Orange Star', 'Star colour', 'teff', 3700, 5200, T, Kel);
k.range('Red Dwarf', 'Star colour', 'teff', 2400, 3700, T, Kel);
k.lt('Failed-Star Host', 'Star colour', 'teff', 2400, T, Kel);
k.ge('Scorching Star', 'Star extreme heat', 'teff', 30000, T, Kel);
k.when('Sun Twin', 'Star solar twin', 'Within about 3% of the Sun in temperature, radius and mass', (m) => m.teff !== null && m.rad !== null && m.smass !== null && Math.abs(m.teff / 5772 - 1) <= 0.03 && Math.abs(m.rad - 1) <= 0.03 && Math.abs(m.smass - 1) <= 0.03,
  (m) => `${m.lab}: ${sig(m.teff)} K, ${sig(m.rad)} solar radii, ${sig(m.smass)} solar masses`,
  [[{ teff: 5772, rad: 1, smass: 1 }, true], [{ teff: 5772, rad: 1.1, smass: 1 }, false], [{ teff: 6200, rad: 1, smass: 1 }, false], [{ teff: 5772, rad: 1, smass: null }, false], [{ teff: null, rad: 1, smass: 1 }, false]]);
k.ge('Giant Star', 'Star size', 'rad', 3, 'radius', 'solar radii');
k.ge('Bloated Giant', 'Star size', 'rad', 10, 'radius', 'solar radii');
k.ge('Colossal Star', 'Star size', 'rad', 30, 'radius', 'solar radii');
k.lt('Small Star', 'Star smallness', 'rad', 0.3, 'radius', 'solar radii');
k.lt('Tiny Star', 'Star smallness', 'rad', 0.15, 'radius', 'solar radii');
k.ge('Heavyweight Star', 'Star weight', 'smass', 2, 'mass', 'solar masses');
k.ge('Massive Star', 'Star weight', 'smass', 3.5, 'mass', 'solar masses');
k.lt('Lightweight Star', 'Star lightness', 'smass', 0.2, 'mass', 'solar masses');
k.lt('Featherweight Star', 'Star lightness', 'smass', 0.1, 'mass', 'solar masses');
k.ge('Metal-Rich', 'Star metals', 'met', 0.3, 'metallicity [Fe/H]', '');
k.lt('Metal-Poor', 'Star metal poverty', 'met', -0.5, 'metallicity [Fe/H]', '');
k.lt('Ancient Metal-Poor', 'Star metal poverty', 'met', -1, 'metallicity [Fe/H]', '');
k.ge('Old Soul', 'Star age', 'age', 10, 'age', 'billion years');
k.lt('Young Star', 'Star youth', 'age', 1, 'age', 'billion years');
k.lt('Newborn Star', 'Star youth', 'age', 0.05, 'age', 'billion years');
k.lt('Naked-Eye Star', 'Star brightness', 'vmag', 6.5, 'apparent magnitude (V)', '');
k.lt('Bright Star', 'Star brightness', 'vmag', 4.5, 'apparent magnitude (V)', '');
k.ge('Dim Star', 'Star faintness', 'vmag', 15, 'apparent magnitude (V)', '');
k.ge('Barely Visible', 'Star faintness', 'vmag', 18, 'apparent magnitude (V)', '');
k.lt('Next-Door Star', 'Star nearby', 'dist', 10, 'distance', 'parsecs');
k.lt('Nearby Star', 'Star nearby', 'dist', 25, 'distance', 'parsecs');
k.ge('Distant Star', 'Star faraway', 'dist', 1000, 'distance', 'parsecs');
k.ge('Edge of Reach', 'Star faraway', 'dist', 5000, 'distance', 'parsecs');
const np = (m) => `${m.lab} hosts ${m.pnum} known planets`;
k.when('Multi-Planet Host', 'Star planet count', 'Hosts 2 or more known planets', (m) => m.pnum !== null && m.pnum >= 2, np, [[{ pnum: 2 }, true], [{ pnum: 1 }, false], [{ pnum: null }, false]]);
k.when('Busy Host', 'Star planet count', 'Hosts 4 or more known planets', (m) => m.pnum !== null && m.pnum >= 4, np, [[{ pnum: 4 }, true], [{ pnum: 3 }, false], [{ pnum: null }, false]]);
k.when('Seven-Planet Host', 'Star planet count', 'Hosts 7 or more known planets', (m) => m.pnum !== null && m.pnum >= 7, np, [[{ pnum: 7 }, true], [{ pnum: 6 }, false], [{ pnum: null }, false]]);
k.when('Binary Host', 'Star companions', 'Part of a system with 2 or more stars', (m) => m.snum !== null && m.snum >= 2, (m) => `${m.lab} is in a system of ${m.snum} stars`, [[{ snum: 2 }, true], [{ snum: 1 }, false], [{ snum: null }, false]]);
k.when('Triple Host', 'Star companions', 'Part of a system with 3 or more stars', (m) => m.snum !== null && m.snum >= 3, (m) => `${m.lab} is in a system of ${m.snum} stars`, [[{ snum: 3 }, true], [{ snum: 2 }, false], [{ snum: null }, false]]);
k.when('Northern Sky', 'Star sky half', 'Located in the northern half of the sky (declination above 0°)', (m) => m.dec !== null && m.dec > 0, (m) => `${m.lab} has declination ${sig(m.dec)}°`, [[{ dec: 10 }, true], [{ dec: 0 }, false], [{ dec: -10 }, false], [{ dec: null }, false], [{ dec: 95 }, false]]);
k.when('Southern Sky', 'Star sky half', 'Located in the southern half of the sky (declination below 0°)', (m) => m.dec !== null && m.dec < 0, (m) => `${m.lab} has declination ${sig(m.dec)}°`, [[{ dec: -10 }, true], [{ dec: 0 }, false], [{ dec: 10 }, false], [{ dec: null }, false], [{ dec: -95 }, false]]);
k.when('Near a Celestial Pole', 'Star near the pole', 'Within 10° of a celestial pole (declination beyond 80° north or south)', (m) => m.dec !== null && Math.abs(m.dec) >= 80, (m) => `${m.lab} has declination ${sig(m.dec)}°`, [[{ dec: 80 }, true], [{ dec: -80 }, true], [{ dec: 79 }, false], [{ dec: null }, false]]);
const first = (m) => `${m.lab}'s first planet was found in ${m.year}`;
k.when('Early Host', 'Star first planet', 'Its first planet was found in 2005 or earlier', (m) => m.year !== null && m.year <= 2005, first, [[{ year: 2005 }, true], [{ year: 2006 }, false], [{ year: null }, false]]);
k.when('Host Found This Year', 'Star first planet', 'Its first planet was found in the year the pool was captured', (m, poolDate) => m.year !== null && m.year === Number(String(poolDate).slice(0, 4)), first, [[{ year: 2026 }, true], [{ year: 2025 }, false], [{ year: null }, false]]);
// luminosity class from the catalogued spectral type, where there is one
k.when('Giant Class', 'Star luminosity class', 'Spectral type carries luminosity class III (a giant)', (m) => m.sptype !== null && /\bIII\b/.test(m.sptype), (m) => `${m.lab} has spectral type ${m.sptype}`, [[{ sptype: 'K0 III' }, true], [{ sptype: 'K0 V' }, false], [{ sptype: null }, false]]);
k.when('Subgiant Class', 'Star luminosity class', 'Spectral type carries luminosity class IV (a subgiant)', (m) => m.sptype !== null && /\bIV\b/.test(m.sptype), (m) => `${m.lab} has spectral type ${m.sptype}`, [[{ sptype: 'G0 IV' }, true], [{ sptype: 'G0 V' }, false], [{ sptype: null }, false]]);
k.when('Dwarf Class', 'Star luminosity class', 'Spectral type carries luminosity class V (a main-sequence dwarf)', (m) => m.sptype !== null && /\bV\b/.test(m.sptype), (m) => `${m.lab} has spectral type ${m.sptype}`, [[{ sptype: 'G2 V' }, true], [{ sptype: 'G2 III' }, false], [{ sptype: null }, false]]);
k.when('White Dwarf', 'Star remnant', 'Spectral type is a white dwarf (starts with D or WD)', (m) => m.sptype !== null && /^(D[A-Z]?|WD)/.test(m.sptype), (m) => `${m.lab} has spectral type ${m.sptype}`, [[{ sptype: 'DC' }, true], [{ sptype: 'WD' }, true], [{ sptype: 'G2 V' }, false], [{ sptype: null }, false]]);
k.when('Brown-Dwarf Class', 'Star remnant', 'Spectral type L, T or Y (a brown dwarf)', (m) => m.sptype !== null && /^[LTY]\d/.test(m.sptype), (m) => `${m.lab} has spectral type ${m.sptype}`, [[{ sptype: 'L4.5 V' }, true], [{ sptype: 'T8.5' }, true], [{ sptype: 'G2 V' }, false], [{ sptype: null }, false]]);
// the catalogue its name comes from
for (const [nm, label, re, sample] of [['Kepler Host', 'Kepler-', /^kepler-\d/, 'Kepler-12'], ['K2 Host', 'K2-', /^k2-\d/, 'K2-12'], ['TOI Host', 'TOI-', /^toi-\d/, 'TOI-12'], ['HD Host', 'HD ', /^hd \d/, 'HD 12'],
  ['Hipparcos Host', 'HIP ', /^hip \d/, 'HIP 12'], ['Gliese Host', 'GJ or Gliese', /^(gj|gliese) \d/, 'GJ 12'], ['WASP Host', 'WASP-', /^wasp-\d/, 'WASP-12'], ['HAT Host', 'HAT-P-', /^hat-p-\d/, 'HAT-P-12'],
  ['TESS Input Host', 'TIC ', /^tic \d/, 'TIC 12'], ['Microlensing Host', 'KMT-, OGLE- or MOA-', /^(kmt|ogle|moa)-/, 'OGLE-12'], ['2MASS Host', '2MASS', /^2mass/, '2MASS J12'], ['Flamsteed Host', 'a Flamsteed number plus constellation, like 51 Peg', /^\d+ [a-z]{3}( [a-z])?$/, '51 Peg']]) {
  k.when(nm, 'Star name catalog', `Its name starts with ${label}`, (m) => re.test(m.n), (m) => `${m.lab} follows the ${nm.replace(' Host', '')} naming pattern`, [[{ id: sample }, true], [{ id: 'Plain Name' }, false], [{ id: null }, false]]);
}

export const rules = k.rules, cases = k.cases;

const CLASS = (m) => (m.teff === null ? null : m.teff >= 10000 ? 'Blue' : m.teff >= 7500 ? 'White' : m.teff >= 6000 ? 'Yellow-white' : m.teff >= 5200 ? 'Sun-like' : m.teff >= 3700 ? 'Orange' : m.teff >= 2400 ? 'Red dwarf' : 'Cool brown-dwarf-class');
const rgb = (t) => { // rough black-body colour from temperature, for the drawing only
  const x = Math.min(40000, Math.max(1500, t)) / 100;
  const r = x <= 66 ? 255 : 329.7 * (x - 60) ** -0.1332, g = x <= 66 ? 99.47 * Math.log(x) - 161.1 : 288.1 * (x - 60) ** -0.0755, b = x >= 66 ? 255 : x <= 19 ? 0 : 138.5 * Math.log(x - 10) - 305;
  return [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))));
};
export const view = {
  label: (m) => m.lab,
  sub: (m) => `${CLASS(m) ? `${CLASS(m).toLowerCase()} · ` : ''}${m.pnum ?? 'at least one'} known planet${m.pnum === 1 ? '' : 's'}`,
  facts: (m) => [
    ['Kind', 'Star with confirmed planets'], ['Known planets', m.pnum !== null ? String(m.pnum) : unknown], ['Stars in the system', m.snum !== null ? String(m.snum) : unknown], ['Spectral type', m.sptype ?? unknown],
    ['Surface temperature', m.teff ? `${sig(m.teff)} K` : unknown], ['Radius', m.rad ? `${sig(m.rad)} × Sun` : unknown], ['Mass', m.smass ? `${sig(m.smass)} × Sun` : unknown],
    ['Metallicity [Fe/H]', m.met !== null ? String(m.met) : unknown], ['Age', m.age ? `${sig(m.age)} billion years` : unknown], ['Brightness (V magnitude)', m.vmag !== null ? String(m.vmag) : unknown],
    ['Distance from Earth', m.dist ? `${sig(m.dist)} parsecs (${sig(m.dist * 3.2616)} light-years)` : unknown],
    ['Sky position', m.ra !== null && m.dec !== null ? `right ascension ${m.ra}°, declination ${m.dec}°` : unknown], ['First planet found', m.year !== null ? String(m.year) : unknown],
    ['Source', 'NASA Exoplanet Archive', `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(m.id)}`],
  ],
  shelves: (m) => [
    ...(CLASS(m) ? [['Star colour', `${CLASS(m)} stars`]] : []),
    ...(m.rad ? [['Star size', 'Stars ' + band(m.rad, [[0.3, 'under 0.3 solar radii'], [0.8, 'of 0.3 to 0.8 solar radii'], [1.3, 'of 0.8 to 1.3 solar radii'], [3, 'of 1.3 to 3 solar radii'], [Infinity, 'of 3 solar radii or more']])]] : []),
    ...(m.dist ? [['Star distance', 'Stars ' + band(m.dist, [[10, 'within 10 parsecs'], [100, '10 to 100 parsecs away'], [1000, '100 to 1,000 parsecs away'], [Infinity, 'over 1,000 parsecs away']])]] : []),
    ...(m.pnum !== null ? [['Star planet count', m.pnum === 1 ? 'Stars with one known planet' : m.pnum < 4 ? 'Stars with 2 to 3 known planets' : 'Stars with 4 or more known planets']] : []),
    ...(m.dec !== null ? [['Star sky', m.dec >= 0 ? 'Stars in the northern sky' : 'Stars in the southern sky']] : []),
    ...(m.year !== null ? [['Star first planet', `Stars whose first planet came in the ${Math.floor(m.year / 10) * 10}s`]] : []),
  ],
  art(m) { // original star: colour from temperature, size from radius, planets as dots on orbits. Never affects scoring; not a photograph.
    const h = hash(m.id), rnd = rng(h), [r, g, b] = rgb(m.teff ?? 5772), c = `rgb(${r},${g},${b})`;
    const R = 8 + 20 * Math.min(1, Math.log10(1 + (m.rad ?? 1)) / Math.log10(30)), n = Math.min(8, m.pnum ?? 1);
    const orbits = Array.from({ length: n }, (_, j) => { const rr = R + 10 + j * 5, a = rnd() * 6.283; return `<circle cx="50" cy="46" r="${rr}" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width=".4"/><circle cx="${(50 + rr * Math.cos(a)).toFixed(1)}" cy="${(46 + rr * Math.sin(a)).toFixed(1)}" r="${(1 + rnd() * 1.1).toFixed(1)}" fill="#cfd6ff"/>`; }).join('');
    const rays = Array.from({ length: 12 }, (_, j) => { const a = (j / 12) * 6.283 + rnd() * 0.2; return `<line x1="${(50 + R * Math.cos(a)).toFixed(1)}" y1="${(46 + R * Math.sin(a)).toFixed(1)}" x2="${(50 + (R + 5 + rnd() * 6) * Math.cos(a)).toFixed(1)}" y2="${(46 + (R + 5 + rnd() * 6) * Math.sin(a)).toFixed(1)}" stroke="${c}" stroke-opacity=".5" stroke-width=".7"/>`; }).join('');
    const stars = Array.from({ length: 24 }, () => `<circle cx="${(rnd() * 100).toFixed(1)}" cy="${(rnd() * 100).toFixed(1)}" r="${(0.25 + rnd() * 0.5).toFixed(2)}"/>`).join('');
    return `<svg class="avatar" viewBox="0 0 100 100" role="img" aria-label="Generated picture of a star with its planets. Not a photograph.">
      <defs><radialGradient id="st${h}"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>
      <rect width="100" height="100" rx="8" fill="#070a16"/><g fill="#fff" opacity=".7">${stars}</g>${orbits}${rays}
      <circle cx="50" cy="46" r="${(R * 1.9).toFixed(1)}" fill="url(#st${h})" opacity=".55"/><circle cx="50" cy="46" r="${R.toFixed(1)}" fill="${c}"/><circle cx="${(50 - R * 0.25).toFixed(1)}" cy="${(46 - R * 0.25).toFixed(1)}" r="${(R * 0.55).toFixed(1)}" fill="#fff" opacity=".35"/>
      <text x="50" y="95" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5.5" letter-spacing=".6" fill="#8791b8">GENERATED IMAGE</text></svg>`;
  },
};
export default { kind: 'star', name: 'Host stars', one: 'host star', prep, rules, cases, view };
