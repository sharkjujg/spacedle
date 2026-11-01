// Asteroids: rules, record preparation and presentation. Source: NASA/JPL Small-Body Database.
import { kit, norm, num, pos, nonneg, whole, text, chars, sig, fmt, esc, hash, rng, band, unknown, cap } from './kit.js';

const BASE = { kind: 'asteroid', id: '999999', name: null, diameter: null, H: null, albedo: null, spin: null, a: null, e: null, i: null, moid: null, class: null, flags: null, sats: null, spec: null, seen: null, arc: null, obs: null, cond: null, GM: null };
export const CLASS = { MBA: 'Main-belt asteroid', OMB: 'Outer main-belt asteroid', IMB: 'Inner main-belt asteroid', MCA: 'Mars-crosser', APO: 'Apollo (near-Earth)', AMO: 'Amor (near-Earth)', ATE: 'Aten (near-Earth)',
  IEO: 'Atira (inside Earth\'s orbit)', TJN: 'Jupiter trojan', CEN: 'Centaur', TNO: 'Trans-Neptunian object', HYA: 'Hyperbolic asteroid', AST: 'Asteroid' };
const COMPLEX = { S: 'S-type (stony)', C: 'C-type (carbonaceous)', X: 'X-type', V: 'V-type (Vesta-like)', D: 'D-type (dark, primitive)', L: 'L-type', K: 'K-type', A: 'A-type (olivine)', T: 'T-type', Q: 'Q-type', O: 'O-type', R: 'R-type' };
const complexOf = (spec) => { const c = spec ? spec[0].toUpperCase() : null; return c === 'B' || c === 'F' || c === 'G' ? 'C' : c === 'M' || c === 'E' || c === 'P' ? 'X' : c; };

export function prep(raw) {
  const id = text(raw.id), name = text(raw.name), number = /^[0-9]+$/.test(id ?? '') ? +id : null;
  const a = pos(raw.a), e = nonneg(raw.e), flags = whole(raw.flags) ?? 0;
  const bound = a !== null && e !== null && e < 1;
  return {
    ...raw, kind: 'asteroid', id, name, number, n: name ? norm(name) : null,
    lab: number !== null ? (name ? `(${number}) ${name}` : `(${number})`) : (name ?? id),
    diameter: pos(raw.diameter), H: num(raw.H), albedo: pos(raw.albedo), spin: pos(raw.spin), a, e, i: nonneg(raw.i), moid: nonneg(raw.moid),
    cls: typeof raw.class === 'string' ? raw.class.toUpperCase() : null, neo: (flags & 1) === 1, pha: (flags & 2) === 2, sats: whole(raw.sats),
    spec: text(raw.spec), cx: complexOf(text(raw.spec)), seen: Number.isInteger(raw.seen) && raw.seen > 1500 && raw.seen < 2100 ? raw.seen : null,
    arc: nonneg(raw.arc), obs: pos(raw.obs), cond: whole(raw.cond) !== null && raw.cond <= 9 ? raw.cond : null, GM: pos(raw.GM),
    q: bound ? a * (1 - e) : null, Q: bound ? a * (1 + e) : null, period: bound ? a ** 1.5 : null,
  };
}

const k = kit('asteroid', BASE, { diameter: 'pos', albedo: 'pos', spin: 'pos', a: 'pos', obs: 'pos', GM: 'pos' });
const d = 'diameter', km = 'km', au = 'au';
const lbl = (m) => m.lab;
k.when('Asteroid', 'Kind', 'Is an asteroid', () => true, (m) => `${m.lab} is an asteroid`, [[{}, true]]);

// size
k.ge('Ten-Kilometer Club', 'Asteroid size', d, 10, 'diameter', km);
k.ge('Hefty', 'Asteroid size', d, 50, 'diameter', km);
k.ge('Giant', 'Asteroid size', d, 200, 'diameter', km);
k.ge('Dwarf-Planet Scale', 'Asteroid size', d, 500, 'diameter', km);
k.lt('Small Fry', 'Asteroid smallness', d, 2, 'diameter', km);
k.lt('Pebble', 'Asteroid smallness', d, 0.5, 'diameter', km);
k.lt('Boulder', 'Asteroid smallness', d, 0.1, 'diameter', km);
k.lt('Cosmic Gravel', 'Asteroid smallness', d, 0.02, 'diameter', km);
// brightness (absolute magnitude H: brighter is bigger or shinier, and a smaller number)
k.lt('Bright Rock', 'Asteroid brightness', 'H', 10, 'absolute magnitude (H)', '');
k.lt('Floodlight', 'Asteroid brightness', 'H', 6.5, 'absolute magnitude (H)', '');
k.ge('Faint Speck', 'Asteroid faintness', 'H', 25, 'absolute magnitude (H)', '');
k.ge('Dust Mote', 'Asteroid faintness', 'H', 28, 'absolute magnitude (H)', '');
k.ge('Barely There', 'Asteroid faintness', 'H', 31, 'absolute magnitude (H)', '');
// reflectivity
k.lt('Dark Side', 'Asteroid darkness', 'albedo', 0.1, 'albedo (reflectivity)', '');
k.lt('Coal Dark', 'Asteroid darkness', 'albedo', 0.04, 'albedo (reflectivity)', '');
k.lt('Pitch Black', 'Asteroid darkness', 'albedo', 0.025, 'albedo (reflectivity)', '');
k.ge('Pale', 'Asteroid shine', 'albedo', 0.25, 'albedo (reflectivity)', '');
k.ge('Shiny', 'Asteroid shine', 'albedo', 0.35, 'albedo (reflectivity)', '');
k.ge('Mirror Bright', 'Asteroid shine', 'albedo', 0.5, 'albedo (reflectivity)', '');
// spin
k.lt('Quick Turn', 'Asteroid fast spin', 'spin', 8, 'rotation period', 'hours');
k.lt('Speed Spinner', 'Asteroid fast spin', 'spin', 2.2, 'rotation period', 'hours');
k.lt('Blur', 'Asteroid fast spin', 'spin', 0.5, 'rotation period', 'hours');
k.ge('Slow Spinner', 'Asteroid slow spin', 'spin', 100, 'rotation period', 'hours');
k.ge('Lazy Day', 'Asteroid slow spin', 'spin', 500, 'rotation period', 'hours');
// orbit size
k.lt('Inner Orbit', 'Asteroid inner orbit', 'a', 1.5, 'semi-major axis', au);
k.lt('Inside Earth\'s Orbit', 'Asteroid inner orbit', 'a', 1, 'semi-major axis', au);
k.lt('Venus Territory', 'Asteroid inner orbit', 'a', 0.8, 'semi-major axis', au);
k.range('Main-Belt Dweller', 'Asteroid home turf', 'a', 2.1, 3.3, 'semi-major axis', au);
k.ge('Beyond Jupiter', 'Asteroid far orbit', 'a', 5.5, 'semi-major axis', au);
k.ge('Edge of the System', 'Asteroid far orbit', 'a', 30, 'semi-major axis', au);
k.ge('Deep Frontier', 'Asteroid far orbit', 'a', 100, 'semi-major axis', au);
k.ge('Scattered Far', 'Asteroid far orbit', 'a', 300, 'semi-major axis', au);
// orbit shape
k.lt('Round Orbit', 'Asteroid roundness', 'e', 0.1, 'eccentricity', '');
k.lt('Nearly Circular', 'Asteroid roundness', 'e', 0.03, 'eccentricity', '');
k.ge('Elongated Orbit', 'Asteroid eccentricity', 'e', 0.4, 'eccentricity', '');
k.ge('Wild Orbit', 'Asteroid eccentricity', 'e', 0.7, 'eccentricity', '');
k.ge('Comet-Like Orbit', 'Asteroid eccentricity', 'e', 0.9, 'eccentricity', '');
k.lt('Flat Orbit', 'Asteroid flatness', 'i', 5, 'inclination', '°');
k.ge('Tilted', 'Asteroid tilt', 'i', 25, 'inclination', '°');
k.ge('Steep Tilt', 'Asteroid tilt', 'i', 60, 'inclination', '°');
k.ge('Backwards Orbit', 'Asteroid tilt', 'i', 90, 'inclination', '°');
// perihelion / aphelion (derived from the semi-major axis and eccentricity of a bound orbit)
const fz = (get) => ({ fuzzy: true, raw: get });
k.lt('Sun Skimmer', 'Asteroid perihelion', 'q', 0.3, 'perihelion distance', au, fz((v) => (v === null || typeof v === 'string' ? { a: v } : { a: v / 0.5, e: 0.5 })));
k.lt('Sungrazing Path', 'Asteroid perihelion', 'q', 0.1, 'perihelion distance', au, fz((v) => (v === null || typeof v === 'string' ? { a: v } : { a: v / 0.5, e: 0.5 })));
k.ge('Distant Perihelion', 'Asteroid perihelion', 'q', 30, 'perihelion distance', au, fz((v) => (v === null || typeof v === 'string' ? { a: v } : { a: v / 0.5, e: 0.5 })));
k.lt('Short Year', 'Asteroid year', 'period', 1, 'orbital period (from the semi-major axis)', 'years', fz((v) => (v === null || typeof v === 'string' ? { a: v } : { a: v ** (2 / 3), e: 0.1 })));
k.ge('Long Year', 'Asteroid year', 'period', 100, 'orbital period (from the semi-major axis)', 'years', fz((v) => (v === null || typeof v === 'string' ? { a: v } : { a: v ** (2 / 3), e: 0.1 })));
k.ge('Thousand-Year Orbit', 'Asteroid year', 'period', 1000, 'orbital period (from the semi-major axis)', 'years', fz((v) => (v === null || typeof v === 'string' ? { a: v } : { a: v ** (2 / 3), e: 0.1 })));
k.ge('Ten-Thousand-Year Orbit', 'Asteroid year', 'period', 10000, 'orbital period (from the semi-major axis)', 'years', fz((v) => (v === null || typeof v === 'string' ? { a: v } : { a: v ** (2 / 3), e: 0.1 })));
// Earth approach (minimum orbit intersection distance)
k.lt('Near Miss', 'Asteroid Earth approach', 'moid', 0.2, 'closest approach to Earth\'s orbit', au);
k.lt('Close Neighbor', 'Asteroid Earth approach', 'moid', 0.05, 'closest approach to Earth\'s orbit', au);
k.lt('Earth Grazer', 'Asteroid Earth approach', 'moid', 0.01, 'closest approach to Earth\'s orbit', au);
k.lt('Orbit Twin', 'Asteroid Earth approach', 'moid', 0.001, 'closest approach to Earth\'s orbit', au);
k.ge('Far From Home', 'Asteroid distance', 'moid', 30, 'closest approach to Earth\'s orbit', au);
// Earth watch flags
k.when('Near-Earth', 'Asteroid Earth watch', 'Flagged as a near-Earth object', (m) => m.neo, (m) => `${m.lab} is a near-Earth object`, [[{ flags: 1 }, true], [{ flags: 3 }, true], [{ flags: 2 }, false], [{ flags: null }, false], [{ flags: 'x' }, false]]);
k.when('Potentially Hazardous', 'Asteroid Earth watch', 'Flagged as a potentially hazardous asteroid (a size and close-approach category, not a prediction of impact)', (m) => m.pha, (m) => `${m.lab} is flagged potentially hazardous`,
  [[{ flags: 3 }, true], [{ flags: 2 }, true], [{ flags: 1 }, false], [{ flags: null }, false]]);
// dynamical class: an asteroid has exactly one
for (const [code, nm] of [['MBA', 'Main-Belt Asteroid'], ['IMB', 'Inner Main-Belt'], ['OMB', 'Outer Main-Belt'], ['MCA', 'Mars-Crosser'], ['APO', 'Apollo'], ['AMO', 'Amor'], ['ATE', 'Aten'], ['IEO', 'Atira'],
  ['TJN', 'Jupiter Trojan'], ['CEN', 'Centaur'], ['TNO', 'Trans-Neptunian'], ['HYA', 'Unbound Orbit'], ['AST', 'Unclassified Rock']]) {
  k.is(nm, 'Asteroid class', 'cls', code, code === 'HYA' ? 'Dynamical class HYA: an unbound, hyperbolic orbit (the one asteroid so classed is the interstellar visitor 1I/ʻOumuamua)' : `Dynamical class ${code}: ${CLASS[code]}`, (m) => `${m.lab} is classed ${code} (${CLASS[code]})`, 'class');
}
// taxonomy (from spectra; only a couple of thousand asteroids have one)
for (const [c, nm] of [['S', 'Stony Type'], ['C', 'Carbon Type'], ['X', 'Metal-Mix Type'], ['V', 'Vestoid'], ['D', 'Primitive Type'], ['L', 'Leftover Type'], ['K', 'Kilo Type'], ['A', 'Olivine Type'], ['T', 'Troilite Type'], ['Q', 'Fresh-Surface Type'], ['O', 'Oxford Type'], ['R', 'Rosy Type']]) {
  k.when(nm, 'Asteroid spectrum', `Spectral type in the ${c} complex (${COMPLEX[c]})`, (m) => m.cx === c, (m) => `${m.lab} has spectral type ${m.spec}`, [[{ spec: c }, true], [{ spec: c + 'x' }, true], [{ spec: c === 'S' ? 'C' : 'S' }, false], [{ spec: null }, false], [{ spec: '' }, false]]);
}
// companions and mass
k.when('Binary Asteroid', 'Asteroid companions', 'Has at least one known moon', (m) => m.sats !== null && m.sats >= 1, (m) => `${m.lab} has ${m.sats} known moon${m.sats === 1 ? '' : 's'}`, [[{ sats: 1 }, true], [{ sats: 0 }, false], [{ sats: null }, false], [{ sats: '1' }, false]]);
k.when('Triple System', 'Asteroid companions', 'Has two or more known moons', (m) => m.sats !== null && m.sats >= 2, (m) => `${m.lab} has ${m.sats} known moons`, [[{ sats: 2 }, true], [{ sats: 1 }, false], [{ sats: null }, false]]);
k.when('Weighed', 'Asteroid mass', 'Has a measured mass (gravitational parameter GM)', (m) => m.GM !== null, (m) => `${m.lab} has a measured GM of ${sig(m.GM)} km³/s²`, [[{ GM: 0.5 }, true], [{ GM: 0 }, false], [{ GM: null }, false], [{ GM: '5' }, false]]);
// how well it is known
k.ge('Veteran Orbit', 'Asteroid watch time', 'arc', 3652, 'observation arc', 'days');
k.ge('Century Watch', 'Asteroid watch time', 'arc', 36525, 'observation arc', 'days');
k.lt('Fleeting Visitor', 'Asteroid brief watch', 'arc', 10, 'observation arc', 'days');
k.lt('One-Night Stand', 'Asteroid brief watch', 'arc', 1, 'observation arc', 'days');
k.ge('Well Observed', 'Asteroid observations', 'obs', 1000, 'observations in its orbit fit', '');
k.ge('Heavily Observed', 'Asteroid observations', 'obs', 5000, 'observations in its orbit fit', '');
k.lt('Barely Seen', 'Asteroid few observations', 'obs', 10, 'observations in its orbit fit', '');
k.when('Rock-Solid Orbit', 'Asteroid orbit certainty', 'Orbit uncertainty code 0 (the best-determined orbits)', (m) => m.cond === 0, (m) => `${m.lab} has orbit uncertainty code ${m.cond}`, [[{ cond: 0 }, true], [{ cond: 1 }, false], [{ cond: null }, false], [{ cond: '0' }, false]]);
k.when('Shaky Orbit', 'Asteroid orbit doubt', 'Orbit uncertainty code 7 to 9 (poorly determined)', (m) => m.cond !== null && m.cond >= 7, (m) => `${m.lab} has orbit uncertainty code ${m.cond}`, [[{ cond: 7 }, true], [{ cond: 9 }, true], [{ cond: 6 }, false], [{ cond: null }, false], [{ cond: 10 }, false]]);
// era of first observation
const era = (name, family, rule, test, probes) => k.when(name, family, rule, test, (m) => `${m.lab} was first observed in ${m.seen}`, probes);
era('Historic Find', 'Asteroid era', 'First observed before 1900', (m) => m.seen !== null && m.seen < 1900, [[{ seen: 1899 }, true], [{ seen: 1900 }, false], [{ seen: null }, false], [{ seen: 0 }, false], [{ seen: '1850' }, false]]);
era('Twentieth Century', 'Asteroid era', 'First observed from 1900 to 1999', (m) => m.seen !== null && m.seen >= 1900 && m.seen <= 1999, [[{ seen: 1900 }, true], [{ seen: 1999 }, true], [{ seen: 1899 }, false], [{ seen: 2000 }, false], [{ seen: null }, false]]);
era('New Millennium', 'Asteroid era', 'First observed from 2000 to 2019', (m) => m.seen !== null && m.seen >= 2000 && m.seen <= 2019, [[{ seen: 2000 }, true], [{ seen: 2019 }, true], [{ seen: 1999 }, false], [{ seen: 2020 }, false], [{ seen: null }, false]]);
era('Fresh Find', 'Asteroid era', 'First observed in 2020 or later', (m) => m.seen !== null && m.seen >= 2020, [[{ seen: 2020 }, true], [{ seen: 2026 }, true], [{ seen: 2019 }, false], [{ seen: null }, false], [{ seen: 3000 }, false]]);
k.when('Found This Year', 'Asteroid recency', 'First observed in the year the pool was captured', (m, poolDate) => m.seen !== null && m.seen === Number(String(poolDate).slice(0, 4)), (m) => `${m.lab} was first observed in ${m.seen}`,
  [[{ seen: 2026 }, true], [{ seen: 2025 }, false], [{ seen: null }, false]]);
// numbers and names
const nn = (m) => `Asteroid number ${fmt(m.number)}`;
k.when('First Hundred', 'Asteroid number', 'Asteroid number 100 or lower', (m) => m.number !== null && m.number <= 100, nn, [[{ id: '100' }, true], [{ id: '101' }, false], [{ id: '2015 TH144' }, false], [{ id: '0' }, true]]);
k.when('Five-Digit Number', 'Asteroid number', 'Asteroid number from 10,000 to 99,999', (m) => m.number !== null && m.number >= 10000 && m.number <= 99999, nn, [[{ id: '10000' }, true], [{ id: '99999' }, true], [{ id: '9999' }, false], [{ id: '100000' }, false], [{ id: '2015 TH144' }, false]]);
k.when('Six-Digit Number', 'Asteroid number', 'Asteroid number of 100,000 or more', (m) => m.number !== null && m.number >= 100000, nn, [[{ id: '100000' }, true], [{ id: '99999' }, false], [{ id: '2015 TH144' }, false]]);
k.when('Round Number', 'Asteroid number pattern', 'Asteroid number is a whole multiple of 1,000', (m) => m.number !== null && m.number >= 1000 && m.number % 1000 === 0, nn, [[{ id: '4000' }, true], [{ id: '4001' }, false], [{ id: '0' }, false], [{ id: '2015 TH144' }, false]]);
k.when('Mirror Number', 'Asteroid number pattern', 'Asteroid number (3+ digits) reads the same backwards', (m) => m.number !== null && String(m.number).length >= 3 && String(m.number) === [...String(m.number)].reverse().join(''), nn,
  [[{ id: '12321' }, true], [{ id: '12345' }, false], [{ id: '11' }, false], [{ id: '101' }, true], [{ id: '2015 TH144' }, false]]);
const nl = (m) => `"${m.name}" has ${chars(m.name).length} characters`;
k.when('Short Name', 'Asteroid name length', 'Has a name of 4 characters or fewer', (m) => m.n !== null && chars(m.n).length <= 4, nl, [[{ name: 'Ida' }, true], [{ name: 'Hebe' }, true], [{ name: 'Juno5' }, false], [{ name: null }, false], [{ name: '   ' }, false]]);
k.when('Long Name', 'Asteroid name length', 'Has a name of 14 characters or more', (m) => m.n !== null && chars(m.n).length >= 14, nl, [[{ name: 'abcdefghijklmn' }, true], [{ name: 'abcdefghijklm' }, false], [{ name: null }, false]]);
k.when('Two Words', 'Asteroid name form', 'Has a name that contains a space', (m) => m.n !== null && /\s/.test(m.n), (m) => `"${m.name}" is more than one word`, [[{ name: 'Mount Wilson' }, true], [{ name: 'Ceres' }, false], [{ name: null }, false]]);
k.when('Vowel Start', 'Asteroid name start', 'Has a name that starts with A, E, I, O or U', (m) => m.n !== null && /^[aeiou]/.test(m.n), (m) => `"${m.name}" starts with a vowel`, [[{ name: 'Eros' }, true], [{ name: 'Ceres' }, false], [{ name: null }, false]]);
k.when('Named Rock', 'Asteroid naming', 'Has an official name', (m) => m.n !== null, (m) => `${m.lab} is named "${m.name}"`, [[{ name: 'Ceres' }, true], [{ name: null }, false], [{ name: '' }, false]]);
k.when('Provisional Only', 'Asteroid naming', 'Has no name, only a number or provisional designation', (m) => m.n === null, (m) => `${m.lab} has no name yet`, [[{ name: null }, true], [{ name: 'Ceres' }, false]]);

export const rules = k.rules, cases = k.cases;

// ---- presentation ----
const KIND_NAME = 'Asteroid';
export const view = {
  label: (m) => m.lab,
  sub: (m) => `${CLASS[m.cls] ?? 'unclassified'}${m.diameter ? ` · ${sig(m.diameter)} km across` : ''}`,
  facts: (m) => [
    ['Kind', KIND_NAME], ['Designation', m.number !== null ? `(${m.number})${m.name ? ' ' + m.name : ''}` : (m.id ?? '')], ['Class', CLASS[m.cls] ?? unknown],
    ['Diameter', m.diameter ? `${sig(m.diameter)} km (${sig(m.diameter * 0.621371)} miles)` : unknown], ['Absolute magnitude (H)', m.H !== null ? String(m.H) : unknown],
    ['Reflectivity (albedo)', m.albedo ? String(m.albedo) : unknown], ['Rotation period', m.spin ? `${sig(m.spin)} hours` : unknown],
    ['Spectral type', m.spec ?? unknown], ['Moons', m.sats ? String(m.sats) : 'none known'],
    ['Distance from the Sun (semi-major axis)', m.a ? `${sig(m.a)} au` : unknown], ['Orbital period', m.period ? `${sig(m.period)} years` : unknown],
    ['Perihelion and aphelion', m.q !== null ? `${sig(m.q)} and ${sig(m.Q)} au` : unknown], ['Eccentricity and tilt', m.e !== null && m.i !== null ? `${sig(m.e)} and ${sig(m.i)}°` : unknown],
    ['Closest approach to Earth\'s orbit', m.moid !== null ? `${sig(m.moid)} au` : unknown], ['Near-Earth / potentially hazardous', `${m.neo ? 'Yes' : 'No'} / ${m.pha ? 'Yes' : 'No'}`],
    ['First observed', m.seen !== null ? String(m.seen) : unknown], ['Observations', m.obs ? `${fmt(m.obs)} over ${m.arc !== null ? fmt(Math.round(m.arc)) + ' days' : 'an unknown span'}` : unknown],
    ['Orbit uncertainty (0 best, 9 worst)', m.cond !== null ? String(m.cond) : unknown], ['Mass (GM)', m.GM ? `${sig(m.GM)} km³/s²` : unknown],
    ['Source', 'NASA/JPL Small-Body Database', `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(m.id)}`],
  ],
  shelves: (m) => [
    ['Asteroid class', `${CLASS[m.cls] ?? 'Asteroid'}s`],
    ...(m.diameter ? [['Asteroid size', 'Asteroids ' + band(m.diameter, [[0.5, 'under 0.5 km across'], [2, '0.5 to 2 km across'], [10, '2 to 10 km across'], [50, '10 to 50 km across'], [200, '50 to 200 km across'], [Infinity, '200 km or more across']])]] : []),
    ...(m.a ? [['Asteroid orbit', 'Asteroids ' + band(m.a, [[1.5, 'inside 1.5 au'], [2.5, 'at 1.5 to 2.5 au'], [3.2, 'in the main belt (2.5 to 3.2 au)'], [5.5, 'at 3.2 to 5.5 au'], [30, 'beyond Jupiter (5.5 to 30 au)'], [Infinity, 'beyond Neptune (30 au and out)']])]] : []),
    ...(m.i !== null ? [['Asteroid tilt', 'Asteroids ' + band(m.i, [[5, 'tilted under 5°'], [15, 'tilted 5° to 15°'], [30, 'tilted 15° to 30°'], [Infinity, 'tilted 30° or more']])]] : []),
    ...(m.spin ? [['Asteroid spin', 'Asteroids ' + band(m.spin, [[4, 'turning in under 4 hours'], [8, 'turning in 4 to 8 hours'], [24, 'turning in 8 to 24 hours'], [Infinity, 'turning slower than 24 hours']])]] : []),
    ...(m.albedo ? [['Asteroid reflectivity', 'Asteroids ' + band(m.albedo, [[0.06, 'darker than 0.06'], [0.15, 'reflecting 0.06 to 0.15'], [Infinity, 'brighter than 0.15']])]] : []),
    ...(m.cx ? [['Asteroid spectrum', `${COMPLEX[m.cx] ?? m.cx + '-type'} asteroids`]] : []),
    ...(m.seen !== null ? [['Asteroid discovery', `Asteroids first seen in the ${Math.floor(m.seen / 10) * 10}s`]] : []),
    ...(m.n ? [['Asteroid initial', `Asteroids named with ${m.name.trim()[0].toUpperCase()}`]] : []),
    ...(m.number !== null ? [['Asteroid number range', 'Asteroids numbered ' + band(m.number, [[1000, '1 to 999'], [10000, '1,000 to 9,999'], [100000, '10,000 to 99,999'], [Infinity, '100,000 and up']])]] : [['Asteroid number range', 'Asteroids without a number yet']]),
  ],
  art(m) { // original asteroid: lumpy outline, shade from reflectivity, size from diameter (or from brightness when unmeasured). Never affects scoring; not a photograph.
    const rnd = rng(hash(m.id));
    const dia = m.diameter ?? (m.H !== null ? 1329 / Math.sqrt(0.15) * 10 ** (-m.H / 5) : 1);
    const r = 12 + 24 * Math.min(1, Math.log10(1 + dia) / Math.log10(941)), bright = m.albedo ? Math.min(0.5, m.albedo) / 0.5 : 0.25;
    const hue = { S: 28, C: 215, X: 40, V: 12, D: 350, L: 60, K: 90, A: 18, T: 0, Q: 140 }[m.cx] ?? 28, sat = m.cx ? 24 : 14;
    const lobes = 14 + Math.floor(rnd() * 8), elong = 0.8 + rnd() * 0.4;
    const pts = Array.from({ length: lobes }, (_, j) => { const a = (j / lobes) * Math.PI * 2, rr = r * (0.8 + rnd() * 0.32); return `${(50 + rr * Math.cos(a) * elong).toFixed(1)},${(50 + rr * Math.sin(a) / elong).toFixed(1)}`; }).join(' ');
    const light = Math.round(24 + bright * 46);
    const craters = Array.from({ length: 6 }, () => `<circle cx="${(50 + (rnd() - 0.5) * r * 1.1).toFixed(1)}" cy="${(50 + (rnd() - 0.5) * r * 1.0).toFixed(1)}" r="${(1.2 + rnd() * r * 0.15).toFixed(1)}" fill="hsl(${hue} ${sat}% ${light - 9}%)" opacity=".8"/>`).join('');
    const stars = Array.from({ length: 26 }, () => `<circle cx="${(rnd() * 100).toFixed(1)}" cy="${(rnd() * 100).toFixed(1)}" r="${(0.25 + rnd() * 0.55).toFixed(2)}"/>`).join('');
    return `<svg class="avatar" viewBox="0 0 100 100" role="img" aria-label="Generated picture of an asteroid. Not a photograph.">
      <rect width="100" height="100" rx="8" fill="#080b18"/><g fill="#fff" opacity=".7">${stars}</g>
      <polygon points="${pts}" fill="hsl(${hue} ${sat}% ${light}%)" stroke="hsl(${hue} ${sat - 4}% ${light + 14}%)" stroke-width=".8" stroke-linejoin="round"/>${craters}
      <text x="50" y="95" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5.5" letter-spacing=".6" fill="#8791b8">GENERATED IMAGE</text></svg>`;
  },
};
export default { kind: 'asteroid', name: 'Asteroids', one: 'asteroid', prep, rules, cases, view };
