// Satellites and other cataloged payloads: rules, record preparation and presentation. Source: GCAT, Jonathan C. McDowell (planet4589.org/space/gcat, CC BY 4.0).
import { kit, norm, num, pos, nonneg, text, sig, fmt, hash, rng, band, unknown } from './kit.js';

const BASE = { kind: 'satellite', id: 'S99999', name: 'Test Sat', piece: null, launch: null, decay: null, status: null, state: null, owner: null, maker: null, bus: null, mass: null, dmass: null, length: null, diam: null, span: null, shape: null, perigee: null, apogee: null, inc: null, orbit: null };
export const STATUS = { O: 'still in orbit', R: 'reentered and burned up', L: 'landed', DK: 'docked', N: 'renamed or changed owner', AR: 'reentered while attached to something', DSO: 'in deep space', D: 'deorbited on purpose', AO: 'attached in orbit', GRP: 'grappled by a robot arm',
  TFR: 'transferred', E: 'exploded', DSA: 'attached, in deep space', ATT: 'attached to another object', OX: 'probably in orbit but lost', C: 'collided' };
export const ORBIT = { 'LLEO/I': 'lower low-Earth orbit, inclined', 'LLEO/S': 'lower low-Earth orbit, Sun-synchronous', 'LLEO/P': 'lower low-Earth orbit, polar', 'LLEO/E': 'lower low-Earth orbit, equatorial', 'LLEO/R': 'lower low-Earth orbit, retrograde',
  'LEO/I': 'upper low-Earth orbit, inclined', 'LEO/S': 'upper low-Earth orbit, Sun-synchronous', 'LEO/P': 'upper low-Earth orbit, polar', 'LEO/E': 'upper low-Earth orbit, equatorial', 'LEO/R': 'upper low-Earth orbit, retrograde', MEO: 'medium Earth orbit',
  HEO: 'highly elliptical orbit', 'HEO/M': 'Molniya orbit', GTO: 'geosynchronous transfer orbit', 'GEO/S': 'geostationary orbit', 'GEO/I': 'inclined geosynchronous orbit', 'GEO/D': 'drifting geosynchronous orbit', 'GEO/ID': 'inclined drifting geosynchronous orbit',
  'GEO/T': 'synchronous orbit', 'GEO/NS': 'near-synchronous orbit', VHEO: 'very high Earth orbit', DSO: 'deep-space orbit', CLO: 'cislunar orbit', EEO: 'Earth-escape orbit', HCO: 'heliocentric orbit', PCO: 'orbit around another world', SSE: 'solar-system escape', SO: 'suborbital', TA: 'trans-atmospheric' };
const STATIONS = /^(salyut(-\d)?|skylab orbital workshop|mir|zarya|unity|zvezda|destiny|poisk|tiangong \d|tianhe|nauka|wentian|mengtian|harmony|tranquility|columbus|kibo|cupola)$/;
export const NATIONS = ['USA', 'USSR', 'China', 'Russia', 'Japan', 'UK', 'France', 'Germany', 'India', 'Italy', 'Canada', 'Luxembourg', 'South Korea', 'ESA'];

export const dateParts = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? ''); return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null; };
export function prep(raw) {
  const name = text(raw.name) ?? 'Unnamed object', dp = dateParts(raw.launch), ly = dp ? dp.y : /^\d{4}$/.test(raw.launch ?? '') ? +raw.launch : null;
  const pieceM = /^(\d{4})-\d{3}([A-Z]{1,2})$/.exec(raw.piece ?? '');
  return {
    ...raw, kind: 'satellite', name, lab: name, n: norm(name), launch: text(raw.launch), ly, day: dp ? `${String(dp.mo).padStart(2, '0')}-${String(dp.d).padStart(2, '0')}` : null,
    weekday: dp ? new Date(Date.UTC(dp.y, dp.mo - 1, dp.d)).getUTCDay() : null, decay: Number.isInteger(raw.decay) && raw.decay >= 1950 ? raw.decay : null,
    status: text(raw.status), state: text(raw.state), owner: text(raw.owner), maker: text(raw.maker), bus: text(raw.bus), orbit: text(raw.orbit), shape: text(raw.shape),
    mass: pos(raw.mass), dmass: pos(raw.dmass), length: pos(raw.length), diam: pos(raw.diam), span: pos(raw.span), perigee: pos(raw.perigee), apogee: pos(raw.apogee), inc: nonneg(raw.inc),
    rider: pieceM ? pieceM[2] !== 'A' : null,
  };
}
export const life = (m, poolDate) => (m.ly === null ? null : m.decay !== null ? m.decay - m.ly : m.status === 'O' ? Number(String(poolDate).slice(0, 4)) - m.ly : null);

const k = kit('satellite', BASE, { mass: 'pos', length: 'pos', span: 'pos', perigee: 'pos', apogee: 'pos' });
k.when('Satellite', 'Kind', 'Is a cataloged payload (satellite, probe, capsule or station)', () => true, (m) => `${m.lab} is a cataloged payload`, [[{}, true]]);
for (const nation of NATIONS) {
  const nm = { USA: 'American Launch', USSR: 'Soviet Launch', China: 'Chinese Launch', Russia: 'Russian Launch', Japan: 'Japanese Launch', UK: 'British Launch', France: 'French Launch', Germany: 'German Launch', India: 'Indian Launch', Italy: 'Italian Launch',
    Canada: 'Canadian Launch', Luxembourg: 'Luxembourg Launch', 'South Korea': 'South Korean Launch', ESA: 'European Space Agency Launch' }[nation];
  k.is(nm, 'Satellite nation', 'state', nation, `Responsible state: ${nation}`, (m) => `${m.lab} belongs to ${nation}`);
}
for (const [code, nm] of [['O', 'Still in Orbit'], ['R', 'Burned Up'], ['L', 'Soft Landed'], ['DK', 'Docked'], ['DSO', 'Deep-Space Wanderer'], ['D', 'Deliberate Deorbit'], ['E', 'Broke Apart'], ['AO', 'Attached in Orbit'],
  ['GRP', 'Grappled'], ['AR', 'Rode Down Attached'], ['TFR', 'Moved Inside']]) {
  k.is(nm, 'Satellite fate', 'status', code, `Status ${code}: ${STATUS[code]}`, (m) => `${m.lab} has GCAT status ${code} (${STATUS[code]})`);
}
const orb = (re, what) => (m) => m.orbit !== null && re.test(m.orbit);
const orbitRule = (name, family, re, rule, sample, other) => k.when(name, family, rule, orb(re), (m) => `${m.lab} is in orbit class ${m.orbit}`, [[{ orbit: sample }, true], [{ orbit: other }, false], [{ orbit: null }, false]]);
orbitRule('Lower Low-Earth Orbit', 'Satellite altitude', /^LLEO/, 'Orbit class LLEO: height 80 to 600 km', 'LLEO/I', 'GEO/S');
orbitRule('Upper Low-Earth Orbit', 'Satellite altitude', /^LEO/, 'Orbit class LEO: height 600 to 2,000 km', 'LEO/I', 'LLEO/I');
orbitRule('Mid-Earth Orbit', 'Satellite altitude', /^MEO$/, 'Orbit class MEO: period 2 to 23 hours, low eccentricity (navigation-satellite altitude)', 'MEO', 'LEO/I');
orbitRule('Highly Elliptical', 'Satellite altitude', /^HEO/, 'Orbit class HEO: a very stretched orbit, period 4 to 23 hours', 'HEO', 'MEO');
orbitRule('Geosynchronous', 'Satellite altitude', /^GEO/, 'Orbit class GEO: a day-long orbit about 36,000 km up', 'GEO/D', 'MEO');
orbitRule('Transfer Orbit', 'Satellite altitude', /^GTO$/, 'Orbit class GTO: a geosynchronous transfer orbit', 'GTO', 'MEO');
orbitRule('Beyond Geosynchronous', 'Satellite altitude', /^(VHEO|DSO)$/, 'Orbit class VHEO or DSO: higher than a geosynchronous orbit', 'VHEO', 'MEO');
orbitRule('Cislunar', 'Satellite altitude', /^CLO$/, 'Orbit class CLO: out toward the Moon', 'CLO', 'MEO');
orbitRule('Earth Escape', 'Satellite altitude', /^(EEO|HCO|SSE)$/, 'Orbit class EEO, HCO or SSE: left Earth\'s orbit', 'EEO', 'MEO');
orbitRule('Sun-Synchronous', 'Satellite orbit plane', /^L?LEO\/S$/, 'A low-Earth orbit tuned to cross the equator at the same local time (class ending /S)', 'LEO/S', 'LEO/I');
orbitRule('Pole-to-Pole Orbit', 'Satellite orbit plane', /^L?LEO\/P$/, 'A low-Earth orbit over the poles (class ending /P)', 'LLEO/P', 'LEO/I');
orbitRule('Retrograde Low Orbit', 'Satellite orbit plane', /^L?LEO\/R$/, 'A low-Earth orbit against Earth\'s spin (class ending /R)', 'LEO/R', 'LEO/I');
orbitRule('Equatorial Low Orbit', 'Satellite orbit plane', /^L?LEO\/E$/, 'A low-Earth orbit over the equator (class ending /E)', 'LLEO/E', 'LEO/I');
orbitRule('Molniya Orbit', 'Satellite orbit plane', /^HEO\/M$/, 'Orbit class HEO/M: the 12-hour Molniya orbit', 'HEO/M', 'HEO');
orbitRule('Geostationary', 'Satellite orbit plane', /^GEO\/S$/, 'Orbit class GEO/S: hovering over one spot on the equator', 'GEO/S', 'GEO/D');
orbitRule('Inclined Geosynchronous', 'Satellite orbit plane', /^GEO\/(I|SI|ID)$/, 'A geosynchronous orbit tilted 3 to 25 degrees', 'GEO/I', 'GEO/S');
// mass class: a payload with a known mass is in exactly one
const M = 'mass', kg = 'kg';
k.lt('Pocket Satellite', 'Satellite mass class', M, 1, 'launch mass', kg);
k.range('Microsat', 'Satellite mass class', M, 1, 100, 'launch mass', kg);
k.range('Midsize Craft', 'Satellite mass class', M, 100, 1000, 'launch mass', kg);
k.range('Heavy Craft', 'Satellite mass class', M, 1000, 5000, 'launch mass', kg);
k.range('Super Heavy Craft', 'Satellite mass class', M, 5000, 20000, 'launch mass', kg);
k.ge('Colossus', 'Satellite mass class', M, 20000, 'launch mass', kg);
k.ge('Long Craft', 'Satellite length', 'length', 10, 'length', 'm');
k.ge('Wide Wingspan', 'Satellite span', 'span', 30, 'span', 'm');
k.lt('Atmosphere Skimmer', 'Satellite low perigee', 'perigee', 250, 'lowest altitude (perigee)', 'km');
k.ge('Deep Apogee', 'Satellite far apogee', 'apogee', 100000, 'highest altitude (apogee)', 'km');
k.ge('Lunar Reach', 'Satellite far apogee', 'apogee', 384400, 'highest altitude (apogee)', 'km');
k.ge('Million-Kilometer Reach', 'Satellite far apogee', 'apogee', 1000000, 'highest altitude (apogee)', 'km');
k.lt('Equatorial Plane', 'Satellite inclination', 'inc', 1, 'inclination', '°');
k.range('Space Station Plane', 'Satellite inclination', 'inc', 51.5, 51.8, 'inclination', '°');
k.ge('Retrograde Plane', 'Satellite inclination', 'inc', 100, 'inclination', '°');
const ly = (m) => `${m.lab} launched in ${m.ly}`;
k.when('Sputnik Era', 'Satellite era', 'Launched from 1957 to 1969', (m) => m.ly !== null && m.ly >= 1957 && m.ly <= 1969, ly, [[{ launch: '1957-10-04' }, true], [{ launch: '1969-12-31' }, true], [{ launch: '1970-01-01' }, false], [{ launch: null }, false], [{ launch: 'soon' }, false]]);
k.when('Cold War Launch', 'Satellite era', 'Launched from 1970 to 1989', (m) => m.ly !== null && m.ly >= 1970 && m.ly <= 1989, ly, [[{ launch: '1970-01-01' }, true], [{ launch: '1989-12-31' }, true], [{ launch: '1969-12-31' }, false], [{ launch: '1990-01-01' }, false]]);
k.when('Post-Soviet Launch', 'Satellite era', 'Launched from 1990 to 1999', (m) => m.ly !== null && m.ly >= 1990 && m.ly <= 1999, ly, [[{ launch: '1990-01-01' }, true], [{ launch: '1999-12-31' }, true], [{ launch: '1989-12-31' }, false], [{ launch: '2000-01-01' }, false]]);
k.when('Early 2000s Launch', 'Satellite era', 'Launched from 2000 to 2009', (m) => m.ly !== null && m.ly >= 2000 && m.ly <= 2009, ly, [[{ launch: '2000-01-01' }, true], [{ launch: '2009-12-31' }, true], [{ launch: '1999-12-31' }, false], [{ launch: '2010-01-01' }, false]]);
k.when('Smallsat Decade', 'Satellite era', 'Launched from 2010 to 2019', (m) => m.ly !== null && m.ly >= 2010 && m.ly <= 2019, ly, [[{ launch: '2010-01-01' }, true], [{ launch: '2019-12-31' }, true], [{ launch: '2009-12-31' }, false], [{ launch: '2020-01-01' }, false]]);
k.when('Megaconstellation Age', 'Satellite era', 'Launched in 2020 or later', (m) => m.ly !== null && m.ly >= 2020, ly, [[{ launch: '2020-01-01' }, true], [{ launch: '2026-06-01' }, true], [{ launch: '2019-12-31' }, false], [{ launch: null }, false]]);
k.when('Launched This Year', 'Satellite recency', 'Launched in the year the pool was captured', (m, poolDate) => m.ly !== null && m.ly === Number(String(poolDate).slice(0, 4)), ly, [[{ launch: '2026-02-01' }, true], [{ launch: '2025-02-01' }, false], [{ launch: null }, false]]);
k.when('First Year of Spaceflight', 'Satellite pioneer', 'Launched in 1957, the first year of the Space Age', (m) => m.ly === 1957, ly, [[{ launch: '1957-10-04' }, true], [{ launch: '1958-01-31' }, false], [{ launch: null }, false]]);
const dayRule = (name, md, label) => k.when(name, 'Satellite calendar', `Launched on ${label}`, (m) => m.day === md, (m) => `${m.lab} launched on ${m.launch}`, [[{ launch: `2001-${md}` }, true], [{ launch: '2001-06-17' }, false], [{ launch: '2001' }, false], [{ launch: null }, false]]);
dayRule('Leap-Day Launch', '02-29', 'February 29');
dayRule('New Year Launch', '01-01', 'January 1');
dayRule('Christmas Launch', '12-25', 'December 25');
dayRule('Halloween Launch', '10-31', 'October 31');
dayRule('April Fools Launch', '04-01', 'April 1');
dayRule('Pi Day Launch', '03-14', 'March 14');
k.when('Friday-the-13th Launch', 'Satellite calendar', 'Launched on a Friday the 13th', (m) => m.weekday === 5 && m.day !== null && m.day.endsWith('-13'), (m) => `${m.lab} launched on ${m.launch}`,
  [[{ launch: '2021-08-13' }, true], [{ launch: '2021-08-12' }, false], [{ launch: '2021-09-13' }, false], [{ launch: null }, false]]);
k.when('Rideshare Passenger', 'Satellite ride', 'Launched as a secondary payload (piece letter B or later)', (m) => m.rider === true, (m) => `${m.lab} is piece ${m.piece}`, [[{ piece: '2020-001B' }, true], [{ piece: '2020-001AB' }, true], [{ piece: '2020-001A' }, false], [{ piece: '1959 IOT 2' }, false], [{ piece: null }, false]]);
k.when('Veteran Satellite', 'Satellite longevity', 'In flight for 20 years or more (to its end or to today)', (m, d) => { const l = life(m, d); return l !== null && l >= 20; }, (m, d) => `${m.lab} has flown ${life(m, d)} years`,
  [[{ launch: '1990-01-01', status: 'O' }, true], [{ launch: '2020-01-01', status: 'O' }, false], [{ launch: '1990-01-01', decay: 2012, status: 'R' }, true], [{ launch: '1990-01-01', decay: 2009, status: 'R' }, false], [{ launch: '1990-01-01', status: 'R' }, false], [{ launch: null, status: 'O' }, false]]);
k.when('Half-Century Orbit', 'Satellite longevity', 'In flight for 50 years or more (to its end or to today)', (m, d) => { const l = life(m, d); return l !== null && l >= 50; }, (m, d) => `${m.lab} has flown ${life(m, d)} years`,
  [[{ launch: '1970-01-01', status: 'O' }, true], [{ launch: '1990-01-01', status: 'O' }, false], [{ launch: '1960-01-01', decay: 2012, status: 'R' }, true], [{ launch: '1960-01-01', decay: 2009, status: 'R' }, false]]);
k.when('Same-Year Splashdown', 'Satellite brevity', 'Ended in the same calendar year it launched', (m) => m.ly !== null && m.decay !== null && m.decay <= m.ly, (m) => `${m.lab} launched and ended in ${m.ly}`,
  [[{ launch: '2000-03-01', decay: 2000 }, true], [{ launch: '2000-03-01', decay: 2001 }, false], [{ launch: '2000-03-01', decay: null }, false], [{ launch: null, decay: 2000 }, false]]);
k.when('CubeSat', 'Satellite platform', 'Built on a CubeSat bus', (m) => m.bus !== null && /^cubesat/i.test(m.bus), (m) => `${m.lab} uses the ${m.bus} bus`, [[{ bus: 'Cubesat 3U' }, true], [{ bus: 'Box' }, false], [{ bus: null }, false]]);
k.when('Space Station Module', 'Satellite landmark', 'A space station or station module (Salyut, Skylab, Mir, ISS and Tiangong parts)', (m) => STATIONS.test(m.n), (m) => `${m.lab} is part of a space station`, [[{ name: 'Mir' }, true], [{ name: 'Tianhe' }, true], [{ name: 'Mirror Sat' }, false]]);
const shape = (name, re, what, yes) => k.when(name, 'Satellite body shape', `Body shape starts with ${what}`, (m) => m.shape !== null && re.test(m.shape), (m) => `${m.lab} is described as "${m.shape}"`, [[{ shape: yes }, true], [{ shape: 'Irregular blob' }, false], [{ shape: null }, false]]);
shape('Sphere Body', /^sphere/i, 'Sphere', 'Sphere + Ant'); shape('Box Body', /^box/i, 'Box', 'Box + 2 Pan'); shape('Cylinder Body', /^cyl/i, 'Cyl', 'Cyl + Ant'); shape('Cone Body', /^cone/i, 'Cone', 'Cone'); shape('Polyhedron Body', /^(poly|oct|hex)/i, 'Poly, Oct or Hex', 'Oct');
for (const [nm, re, label, sample] of [['Kosmos Series', /^kosmos/, 'Kosmos', 'Kosmos 12'], ['Molniya Series', /^molniya/, 'Molniya', 'Molniya-1'], ['Progress Freighter', /^progress/, 'Progress', 'Progress M-12'], ['Soyuz Craft', /^soyuz/, 'Soyuz', 'Soyuz TMA-1'],
  ['Iridium Series', /^iridium/, 'Iridium', 'Iridium 12'], ['Flock Series', /^flock/, 'Flock', 'Flock 4s'], ['Beidou Series', /^beidou/, 'Beidou', 'Beidou 12'], ['Starlink Sample', /^starlink/, 'Starlink', 'Starlink-12']]) {
  k.when(nm, 'Satellite series', `Name starts with ${label}`, (m) => re.test(m.n), (m) => `${m.lab} belongs to the ${label} series`, [[{ name: sample }, true], [{ name: 'Plain Name' }, false]]);
}
for (const [nm, re, label, sample] of [['Hughes Built', /^hughes/i, 'Hughes', 'Hughes'], ['Lockheed Built', /lmsc|lockheed/i, 'Lockheed (LMSC)', 'LMSC'], ['Planet Built', /^planet/i, 'Planet', 'Planet Labs'], ['Spire Built', /^spire/i, 'Spire', 'Spire/Glasgow'],
  ['Loral Built', /loral/i, 'Loral', 'SS/Loral'], ['TRW Built', /^trw/i, 'TRW', 'TRW'], ['Thales Built', /^thales/i, 'Thales', 'Thales Alenia Space'], ['Boeing Built', /^boeing/i, 'Boeing', 'Boeing/ES'],
  ['RCA Built', /^rca/i, 'RCA', 'RCA/East Windsor'], ['NRL Built', /^nrl$/i, 'NRL', 'NRL'], ['SpaceX Built', /^spacex/i, 'SpaceX', 'SpaceX/Seattle'], ['Airbus Built', /^airbus/i, 'Airbus', 'Airbus/Toulouse']]) {
  k.when(nm, 'Satellite maker', `Manufacturer is ${label}`, (m) => m.maker !== null && re.test(m.maker), (m) => `${m.lab} was built by ${m.maker}`, [[{ maker: sample }, true], [{ maker: 'Someone Else' }, false], [{ maker: null }, false]]);
}
k.when('Short Callsign', 'Satellite name length', 'Name of 4 characters or fewer', (m) => m.n.length <= 4, (m) => `"${m.name}" has ${m.name.length} characters`, [[{ name: 'Mir' }, true], [{ name: 'Mir 2' }, false]]);
k.when('Wordy Satellite', 'Satellite name length', 'Name of 25 characters or more', (m) => m.n.length >= 25, (m) => `"${m.name}" has ${m.name.length} characters`, [[{ name: 'x'.repeat(25) }, true], [{ name: 'x'.repeat(24) }, false]]);

export const rules = k.rules, cases = k.cases;

const when = (m) => (m.launch ? (m.launch.length === 10 ? m.launch : m.launch) : unknown);
export const view = {
  label: (m) => m.lab,
  sub: (m) => `${m.piece ? `${m.piece} · ` : ''}${m.state ?? 'unknown state'}${m.ly !== null ? ` · launched ${m.ly}` : ''}`,
  facts: (m) => [
    ['Kind', 'Satellite or other payload'], ['Catalog number', m.id], ['Designation', m.piece ?? unknown], ['Launched', when(m)], ['Status', m.status ? `${m.status}${STATUS[m.status] ? `: ${STATUS[m.status]}` : ''}` : unknown],
    ['Ended', m.decay !== null ? String(m.decay) : m.status === 'O' ? 'still up there' : unknown], ['State', m.state ?? unknown], ['Owner', m.owner ?? unknown], ['Manufacturer', m.maker ?? unknown], ['Bus', m.bus ?? unknown],
    ['Launch mass', m.mass ? `${sig(m.mass)} kg (${sig(m.mass * 2.20462)} lb)` : unknown], ['Dry mass', m.dmass ? `${sig(m.dmass)} kg` : unknown], ['Length, diameter, span', [m.length, m.diam, m.span].some(Boolean) ? [m.length, m.diam, m.span].map((x) => (x ? `${sig(x)} m` : 'unknown')).join(', ') : unknown],
    ['Shape', m.shape ?? unknown], ['Orbit', m.orbit ? `${m.orbit}${ORBIT[m.orbit] ? ` (${ORBIT[m.orbit]})` : ''}` : unknown], ['Perigee and apogee', m.perigee && m.apogee ? `${fmt(Math.round(m.perigee))} and ${fmt(Math.round(m.apogee))} km` : unknown],
    ['Inclination', m.inc !== null ? `${sig(m.inc)}°` : unknown],
    ['Source', 'GCAT by Jonathan McDowell (CC BY 4.0)', 'https://planet4589.org/space/gcat/'],
  ],
  shelves: (m) => [
    ...(m.state ? [['Satellite nation', `Payloads from ${m.state}`]] : []),
    ...(m.ly !== null ? [['Satellite launch decade', `Payloads launched in the ${Math.floor(m.ly / 10) * 10}s`]] : []),
    ...(m.status && STATUS[m.status] ? [['Satellite fate', `Payloads that are ${STATUS[m.status]}`]] : []),
    ...(m.orbit && ORBIT[m.orbit] ? [['Satellite orbit', `Payloads in ${ORBIT[m.orbit]}`]] : []),
    ...(m.mass ? [['Satellite mass', 'Payloads ' + band(m.mass, [[1, 'under 1 kg'], [100, 'of 1 to 100 kg'], [1000, 'of 100 to 1,000 kg'], [5000, 'of 1 to 5 tonnes'], [Infinity, 'of 5 tonnes or more']])]] : []),
    ...(m.bus && /^cubesat/i.test(m.bus) ? [['Satellite platform', 'CubeSats']] : []),
    ...(m.shape ? [['Satellite shape', `Payloads with a ${m.shape.split(/[ +]/)[0].toLowerCase()}-based body`]] : []),
  ],
  art(m) { // original spacecraft: a body with solar panels, sized by mass, older craft shown as simple spheres. Never affects scoring; not a photograph.
    const h = hash(m.id), rnd = rng(h), size = 9 + 14 * Math.min(1, Math.log10(1 + (m.mass ?? 100)) / Math.log10(20000)), hue = 200 + (h % 100);
    const sphere = m.shape && /^sphere/i.test(m.shape), cyl = m.shape && /^cyl/i.test(m.shape), cube = m.bus && /^cubesat/i.test(m.bus), tilt = -22 + rnd() * 10;
    const stars = Array.from({ length: 24 }, () => `<circle cx="${(rnd() * 100).toFixed(1)}" cy="${(rnd() * 100).toFixed(1)}" r="${(0.25 + rnd() * 0.5).toFixed(2)}"/>`).join('');
    const w = cube ? size * 0.8 : size, body = sphere ? `<circle cx="50" cy="48" r="${(size * 0.8).toFixed(1)}" fill="hsl(${hue} 8% 70%)" stroke="#e8ecff" stroke-width=".6"/><g stroke="#e8ecff" stroke-width=".7">${[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y]) => `<line x1="50" y1="48" x2="${(50 + x * size * 1.6).toFixed(1)}" y2="${(48 + y * size * 1.4).toFixed(1)}"/>`).join('')}</g>`
      : cyl ? `<rect x="${(50 - size * 0.55).toFixed(1)}" y="${(48 - size).toFixed(1)}" width="${(size * 1.1).toFixed(1)}" height="${(size * 2).toFixed(1)}" rx="${(size * 0.3).toFixed(1)}" fill="hsl(${hue} 8% 72%)" stroke="#e8ecff" stroke-width=".6"/>`
      : `<rect x="${(50 - w * 0.6).toFixed(1)}" y="${(48 - w * 0.6).toFixed(1)}" width="${(w * 1.2).toFixed(1)}" height="${(w * 1.2).toFixed(1)}" rx="1.2" fill="hsl(${hue} 10% 74%)" stroke="#e8ecff" stroke-width=".6"/>`;
    const panel = (side) => `<g transform="translate(50 48) rotate(${tilt}) scale(${side} 1)"><rect x="${(w * 0.65).toFixed(1)}" y="-4.5" width="${(14 + size).toFixed(1)}" height="9" fill="hsl(${hue + 20} 70% 22%)" stroke="#9fb4ff" stroke-width=".5"/><path d="M${(w * 0.65 + (14 + size) / 3).toFixed(1)} -4.5v9M${(w * 0.65 + 2 * (14 + size) / 3).toFixed(1)} -4.5v9" stroke="#9fb4ff" stroke-width=".35"/></g>`;
    return `<svg class="avatar" viewBox="0 0 100 100" role="img" aria-label="Generated picture of a spacecraft. Not a photograph.">
      <rect width="100" height="100" rx="8" fill="#070a16"/><g fill="#fff" opacity=".7">${stars}</g>
      <circle cx="82" cy="102" r="34" fill="hsl(${hue} 55% 30%)"/><circle cx="82" cy="102" r="34" fill="none" stroke="hsl(${hue} 80% 70%)" stroke-opacity=".5" stroke-width="1"/>
      ${sphere || cyl || cube ? '' : panel(1) + panel(-1)}${body}${cube ? panel(1) + panel(-1) : ''}
      <text x="50" y="95" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5.5" letter-spacing=".6" fill="#8791b8">GENERATED IMAGE</text></svg>`;
  },
};
export default { kind: 'satellite', name: 'Satellites', one: 'satellite', prep, rules, cases, view };
