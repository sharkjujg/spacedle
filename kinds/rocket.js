// Rocket bodies (spent stages and boosters still catalogued): rules, preparation and presentation. Source: GCAT, Jonathan C. McDowell (CC BY 4.0).
import { kit, sig, fmt, hash, rng, unknown } from './kit.js';
import { prep as satPrep, life, STATUS, ORBIT } from './satellite.js';

const BASE = { kind: 'rocket', id: 'S99999', name: 'Test Stage', piece: null, launch: null, decay: null, status: null, state: null, owner: null, maker: null, mass: null, length: null, diam: null, perigee: null, apogee: null, inc: null, orbit: null };
export const prep = (raw) => ({ ...satPrep(raw), kind: 'rocket' });

const k = kit('rocket', BASE, { mass: 'pos', length: 'pos', diam: 'pos', perigee: 'pos', apogee: 'pos' });
k.when('Rocket Body', 'Kind', 'Is a catalogued rocket stage or booster', () => true, (m) => `${m.lab} is a catalogued rocket body`, [[{}, true]]);
for (const [state, nm] of [['USSR', 'Soviet Booster'], ['USA', 'American Booster'], ['Russia', 'Russian Booster'], ['China', 'Chinese Booster'], ['France', 'French Booster'], ['New Zealand', 'Kiwi Launch'], ['Japan', 'Japanese Booster'], ['India', 'Indian Booster']]) {
  k.is(nm, 'Rocket nation', 'state', state, `Responsible state: ${state}`, (m) => `${m.lab} belongs to ${state}`);
}
for (const [code, nm] of [['O', 'Still Circling'], ['R', 'Burned-Up Stage'], ['DSO', 'Deep-Space Stage'], ['D', 'Deorbited Stage'], ['E', 'Exploded Stage']]) {
  k.is(nm, 'Rocket fate', 'status', code, `Status ${code}: ${STATUS[code]}`, (m) => `${m.lab} has GCAT status ${code} (${STATUS[code]})`);
}
k.lt('Light Stage', 'Rocket light mass', 'mass', 100, 'mass', 'kg');
k.ge('Heavy Stage', 'Rocket heavy mass', 'mass', 10000, 'mass', 'kg');
k.ge('Super Stage', 'Rocket heavy mass', 'mass', 40000, 'mass', 'kg');
k.ge('Long Stage', 'Rocket length', 'length', 15, 'length', 'm');
k.ge('Wide Stage', 'Rocket width', 'diam', 4, 'diameter', 'm');
k.lt('Slim Stage', 'Rocket slimness', 'diam', 0.8, 'diameter', 'm');
const orbit = (name, family, re, rule, sample, other) => k.when(name, family, rule, (m) => m.orbit !== null && re.test(m.orbit), (m) => `${m.lab} is in orbit class ${m.orbit}${ORBIT[m.orbit] ? ` (${ORBIT[m.orbit]})` : ''}`, [[{ orbit: sample }, true], [{ orbit: other }, false], [{ orbit: null }, false]]);
orbit('Low Stage', 'Rocket orbit', /^L?LEO/, 'In low-Earth orbit (classes LLEO and LEO)', 'LLEO/I', 'GTO');
orbit('Transfer-Orbit Stage', 'Rocket orbit', /^GTO$/, 'In a geosynchronous transfer orbit (class GTO)', 'GTO', 'MEO');
orbit('Molniya Stage', 'Rocket orbit', /^HEO\/M$/, 'In a Molniya orbit (class HEO/M)', 'HEO/M', 'MEO');
orbit('Geosynchronous Stage', 'Rocket orbit', /^GEO/, 'In a geosynchronous orbit (class GEO)', 'GEO/D', 'MEO');
orbit('Escape Stage', 'Rocket orbit', /^(EEO|HCO|SSE|DSO|CLO|VHEO)$/, 'Left near-Earth space (classes EEO, HCO, SSE, DSO, CLO or VHEO)', 'EEO', 'MEO');
k.lt('Equatorial Launch', 'Rocket inclination', 'inc', 10, 'inclination', '°', {});
k.range('Polar Stage', 'Rocket inclination', 'inc', 85, 95, 'inclination', '°');
for (const [nm, re, label, sample] of [['Blok Upper Stage', /blok/, 'Blok', 'Blok-L'], ['Centaur Upper Stage', /centaur/, 'Centaur', 'Centaur AC'], ['Agena Stage', /agena/, 'Agena', 'Agena D'], ['Delta Stage', /^delta/, 'Delta', 'Delta'],
  ['Fregat or Briz Stage', /fregat|briz/, 'Fregat or Briz', 'Briz-M No. 12'], ['Ariane Stage', /ariane/, 'Ariane', 'Ariane H10'], ['Saturn Stage', /saturn/, 'Saturn', 'Saturn S-IVB'], ['Long March Stage', /^cz-|long march/, 'CZ- or Long March', 'CZ-3B Stage'],
  ['Electron Stage', /electron/, 'Electron', 'Electron Stage']]) {
  k.when(nm, 'Rocket family', `Name contains ${label}`, (m) => re.test(m.n), (m) => `"${m.name}" is a ${label} stage`, [[{ name: sample }, true], [{ name: 'Plain Name' }, false]]);
}
k.when('Pioneering Booster', 'Rocket era', 'Launched from 1957 to 1969', (m) => m.ly !== null && m.ly >= 1957 && m.ly <= 1969, (m) => `${m.lab} launched in ${m.ly}`, [[{ launch: '1957-10-04' }, true], [{ launch: '1969-12-31' }, true], [{ launch: '1970-01-01' }, false], [{ launch: null }, false]]);
k.when('Modern Booster', 'Rocket era', 'Launched in 2015 or later', (m) => m.ly !== null && m.ly >= 2015, (m) => `${m.lab} launched in ${m.ly}`, [[{ launch: '2015-01-01' }, true], [{ launch: '2014-12-31' }, false], [{ launch: null }, false]]);
k.when('Long-Lived Stage', 'Rocket longevity', 'In flight for 20 years or more (to its end or to today)', (m, d) => { const l = life(m, d); return l !== null && l >= 20; }, (m, d) => `${m.lab} has flown ${life(m, d)} years`,
  [[{ launch: '1990-01-01', status: 'O' }, true], [{ launch: '2020-01-01', status: 'O' }, false], [{ launch: '1990-01-01', decay: 2012, status: 'R' }, true], [{ launch: '1990-01-01', decay: 2009, status: 'R' }, false], [{ launch: null, status: 'O' }, false]]);

export const rules = k.rules, cases = k.cases;

export const view = {
  label: (m) => m.lab,
  sub: (m) => `${m.piece ? `${m.piece} · ` : ''}${m.state ?? 'unknown state'}${m.ly !== null ? ` · launched ${m.ly}` : ''}`,
  facts: (m) => [
    ['Kind', 'Rocket body (stage or booster)'], ['Catalog number', m.id], ['Designation', m.piece ?? unknown], ['Launched', m.launch ?? unknown], ['Status', m.status ? `${m.status}${STATUS[m.status] ? `: ${STATUS[m.status]}` : ''}` : unknown],
    ['Ended', m.decay !== null ? String(m.decay) : m.status === 'O' ? 'still up there' : unknown], ['State', m.state ?? unknown], ['Owner', m.owner ?? unknown], ['Manufacturer', m.maker ?? unknown],
    ['Mass', m.mass ? `${sig(m.mass)} kg (${sig(m.mass * 2.20462)} lb)` : unknown], ['Length and diameter', m.length || m.diam ? `${m.length ? sig(m.length) + ' m' : 'unknown'} by ${m.diam ? sig(m.diam) + ' m' : 'unknown'}` : unknown],
    ['Orbit', m.orbit ? `${m.orbit}${ORBIT[m.orbit] ? ` (${ORBIT[m.orbit]})` : ''}` : unknown], ['Perigee and apogee', m.perigee && m.apogee ? `${fmt(Math.round(m.perigee))} and ${fmt(Math.round(m.apogee))} km` : unknown],
    ['Inclination', m.inc !== null ? `${sig(m.inc)}°` : unknown], ['Source', 'GCAT by Jonathan McDowell (CC BY 4.0)', 'https://planet4589.org/space/gcat/'],
  ],
  shelves: (m) => [
    ...(m.state ? [['Rocket nation', `Rocket bodies from ${m.state}`]] : []),
    ...(m.ly !== null ? [['Rocket launch decade', `Rocket bodies launched in the ${Math.floor(m.ly / 10) * 10}s`]] : []),
    ...(m.status && STATUS[m.status] ? [['Rocket fate', `Rocket bodies that are ${STATUS[m.status]}`]] : []),
    ...(m.orbit && ORBIT[m.orbit] ? [['Rocket orbit', `Rocket bodies in ${ORBIT[m.orbit]}`]] : []),
  ],
  art(m) { // original rocket stage: a cylinder with a nozzle, tall for long stages. Never affects scoring; not a photograph.
    const h = hash(m.id), rnd = rng(h), len = 22 + 28 * Math.min(1, (m.length ?? 6) / 30), wid = 8 + 12 * Math.min(1, (m.diam ?? 2) / 6), hue = 18 + (h % 30);
    const top = 50 - len / 2 - 4, stars = Array.from({ length: 24 }, () => `<circle cx="${(rnd() * 100).toFixed(1)}" cy="${(rnd() * 100).toFixed(1)}" r="${(0.25 + rnd() * 0.5).toFixed(2)}"/>`).join('');
    return `<svg class="avatar" viewBox="0 0 100 100" role="img" aria-label="Generated picture of a rocket stage. Not a photograph.">
      <rect width="100" height="100" rx="8" fill="#070a16"/><g fill="#fff" opacity=".7">${stars}</g>
      <g transform="rotate(${(-28 + rnd() * 10).toFixed(1)} 50 50)"><rect x="${(50 - wid / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${wid.toFixed(1)}" height="${len.toFixed(1)}" rx="1.4" fill="hsl(${hue} 12% 72%)" stroke="#e8ecff" stroke-width=".6"/>
      <rect x="${(50 - wid / 2).toFixed(1)}" y="${(top + len * 0.3).toFixed(1)}" width="${wid.toFixed(1)}" height="2.4" fill="hsl(${hue} 70% 45%)"/><rect x="${(50 - wid / 2).toFixed(1)}" y="${(top + len * 0.62).toFixed(1)}" width="${wid.toFixed(1)}" height="1.2" fill="hsl(${hue} 70% 45%)"/>
      <path d="M${(50 - wid * 0.3).toFixed(1)} ${(top + len).toFixed(1)} L${(50 - wid * 0.5).toFixed(1)} ${(top + len + 7).toFixed(1)} L${(50 + wid * 0.5).toFixed(1)} ${(top + len + 7).toFixed(1)} L${(50 + wid * 0.3).toFixed(1)} ${(top + len).toFixed(1)} Z" fill="hsl(${hue} 10% 38%)" stroke="#e8ecff" stroke-width=".4"/></g>
      <text x="50" y="95" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5.5" letter-spacing=".6" fill="#8791b8">GENERATED IMAGE</text></svg>`;
  },
};
export default { kind: 'rocket', name: 'Rocket bodies', one: 'rocket body', prep, rules, cases, view };
