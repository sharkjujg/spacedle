// Deep-sky objects (galaxies, clusters, nebulae, and the odd star) that carry a New General Catalogue number: rules, preparation and presentation.
// Source: Wikidata (CC0), which copies these facts from astronomical catalogs.
import { kit, norm, num, pos, whole, text, sig, fmt, hash, rng, band, unknown } from './kit.js';

const BASE = { kind: 'deepsky', id: 'NGC 1', name: null, ngc: 1, messier: null, type: null, mag: null, con: null, dist: null, disc: null, year: null, z: null, q: null };
const CONSTELLATIONS = ['Andromeda', 'Antlia', 'Apus', 'Aquarius', 'Aquila', 'Ara', 'Aries', 'Auriga', 'Boötes', 'Caelum', 'Camelopardalis', 'Cancer', 'Canes Venatici', 'Canis Major', 'Canis Minor', 'Capricornus', 'Carina', 'Cassiopeia', 'Centaurus',
  'Cepheus', 'Cetus', 'Chamaeleon', 'Circinus', 'Columba', 'Coma Berenices', 'Corona Australis', 'Corona Borealis', 'Corvus', 'Crater', 'Crux', 'Cygnus', 'Delphinus', 'Dorado', 'Draco', 'Equuleus', 'Eridanus', 'Fornax', 'Gemini', 'Grus', 'Hercules',
  'Horologium', 'Hydra', 'Hydrus', 'Indus', 'Lacerta', 'Leo', 'Leo Minor', 'Lepus', 'Libra', 'Lupus', 'Lynx', 'Lyra', 'Mensa', 'Microscopium', 'Monoceros', 'Musca', 'Norma', 'Octans', 'Ophiuchus', 'Orion', 'Pavo', 'Pegasus', 'Perseus', 'Phoenix',
  'Pictor', 'Pisces', 'Piscis Austrinus', 'Puppis', 'Pyxis', 'Reticulum', 'Sagitta', 'Sagittarius', 'Scorpius', 'Sculptor', 'Scutum', 'Serpens', 'Sextans', 'Taurus', 'Telescopium', 'Triangulum', 'Triangulum Australe', 'Tucana', 'Ursa Major', 'Ursa Minor',
  'Vela', 'Virgo', 'Volans', 'Vulpecula'];
const CLASSES = [ // [badge name, family member test on the Wikidata type, description, a type that matches]
  ['Spiral Galaxy', /spiral/, 'a spiral galaxy (barred, flocculent, grand-design and the like included)', 'barred spiral galaxy'], ['Lenticular Galaxy', /lenticular/, 'a lenticular galaxy: a disc without spiral arms', 'lenticular galaxy'],
  ['Elliptical Galaxy', /^elliptical/, 'an elliptical galaxy', 'elliptical galaxy'], ['Active Galaxy', /seyfert|radio galaxy|blazar|quasar|active galactic|low-ionization/, 'a galaxy with an active core: Seyfert, radio galaxy, blazar, quasar or LINER', 'Seyfert 2 galaxy'],
  ['Colliding Galaxies', /interacting/, 'interacting galaxies', 'interacting galaxy'], ['Cluster Monarch', /brightest cluster/, 'the brightest galaxy of its cluster', 'brightest cluster galaxy'], ['Edge-On Galaxy', /edge-on/, 'a galaxy seen edge-on', 'edge-on galaxy'],
  ['Ghostly Galaxy', /low-surface/, 'a low-surface-brightness galaxy', 'low-surface-brightness galaxy'], ['Irregular Galaxy', /irregular/, 'an irregular galaxy', 'irregular galaxy'], ['Emission-Line Galaxy', /emission-line galaxy|starburst/, 'an emission-line or starburst galaxy', 'emission-line galaxy'],
  ['Galaxy Group', /galaxy group/, 'a group of galaxies', 'galaxy group'], ['Plain Galaxy', /^galaxy$/, 'a galaxy with no finer type on record', 'galaxy'],
  ['Open Cluster', /^open cluster/, 'an open star cluster', 'open cluster'], ['Loose Star Cluster', /^star cluster/, 'a star cluster of unspecified kind', 'star cluster'], ['Globular Cluster', /globular/, 'a globular cluster', 'globular cluster'],
  ['Stellar Association', /association/, 'a stellar association', 'stellar association'], ['Asterism', /asterism/, 'an asterism: a pattern of stars with no physical link', 'asterism'],
  ['Planetary Nebula', /planetary nebula/, 'a planetary nebula', 'planetary nebula'], ['Glowing Gas Cloud', /emission nebula|h ii region/, 'an emission nebula or H II region', 'emission nebula'], ['Reflection Nebula', /reflection nebula/, 'a reflection nebula', 'reflection nebula'],
  ['Supernova Remnant', /supernova remnant/, 'a supernova remnant', 'supernova remnant'], ['Unsorted Nebula', /^nebula$/, 'a nebula with no finer type on record', 'nebula'],
  ['Stellar Pair', /double star|binary star|pair of stars|multiple star/, 'a double, binary or multiple star', 'double star'], ['Lone Star', /^star$/, 'a single star', 'star'],
  ['Mystery Object', /unknown astronomical|^astronomical object$/, 'a catalogued object of unknown nature', 'unknown astronomical object'], ['Instrument Source', /source$/, 'an object known as a radio, infrared or hydrogen source', 'infrared source']];
const DISCOVERERS = [['William Herschel', 'Herschel the Elder Find', 'William Herschel'], ['John Frederick William Herschel', 'John Herschel Find', 'John Herschel'], ['Albert Marth', 'Marth Find', 'Albert Marth'], ['Lewis A. Swift', 'Swift Find', 'Lewis Swift'],
  ['Édouard Stephan', 'Stephan Find', 'Édouard Stephan'], ["Heinrich Louis d'Arrest", "d'Arrest Find", "Heinrich d'Arrest"], ['Francis Preserved Leavenworth', 'Leavenworth Find', 'Francis Leavenworth'], ['James Dunlop', 'Dunlop Find', 'James Dunlop'],
  ['William Parsons, 3rd Earl of Rosse', 'Rosse Find', 'the 3rd Earl of Rosse'], ['Wilhelm Tempel', 'Tempel Find', 'Wilhelm Tempel'], ['Charles Messier', 'Messier Find', 'Charles Messier'], ['Pierre Méchain', 'Méchain Find', 'Pierre Méchain'],
  ['Edward Emerson Barnard', 'Barnard Find', 'Edward Barnard'], ['Nicolas Louis de Lacaille', 'Lacaille Find', 'Nicolas Louis de Lacaille'], ['Caroline Herschel', 'Caroline Herschel Find', 'Caroline Herschel']];

export function prep(raw) {
  const ngc = whole(raw.ngc), name = text(raw.name), messier = whole(raw.messier);
  return {
    ...raw, kind: 'deepsky', id: text(raw.id) ?? `NGC ${ngc}`, ngc, messier: messier || null, name, n: name ? norm(name) : null, lab: name ? `${name} (NGC ${ngc})` : `NGC ${ngc}`, type: text(raw.type), t: text(raw.type) ? text(raw.type).toLowerCase() : null,
    mag: num(raw.mag), con: text(raw.con), dist: pos(raw.dist), disc: text(raw.disc), year: Number.isInteger(raw.year) && raw.year >= 100 && raw.year <= 2100 ? raw.year : null, z: num(raw.z), q: whole(raw.q),
  };
}

const k = kit('deepsky', BASE, { ngc: 'pos', dist: 'pos' });
k.when('Deep-Sky Object', 'Kind', 'Is a deep-sky object with an NGC number', () => true, (m) => `${m.lab} is in the New General Catalogue`, [[{}, true]]);
for (const [nm, re, what, sample] of CLASSES) k.when(nm, 'Deep-sky class', `Its Wikidata type says it is ${what}`, (m) => m.t !== null && re.test(m.t), (m) => `${m.lab} is typed "${m.type}"`, [[{ type: sample }, true], [{ type: 'ZZZ' }, false], [{ type: null }, false]]);
k.lt('Naked-Eye Wonder', 'Deep-sky brightness', 'mag', 6.5, 'apparent magnitude', '');
k.lt('Binocular Target', 'Deep-sky brightness', 'mag', 9, 'apparent magnitude', '');
k.lt('Backyard-Scope Target', 'Deep-sky brightness', 'mag', 11, 'apparent magnitude', '');
k.ge('Faint Fuzzy', 'Deep-sky faintness', 'mag', 14, 'apparent magnitude', '');
k.ge('Deep-Field Dweller', 'Deep-sky faintness', 'mag', 16, 'apparent magnitude', '');
k.lt('Galactic Backyard', 'Deep-sky nearby', 'dist', 100000, 'distance', 'light-years');
k.lt('Local Group Member', 'Deep-sky nearby', 'dist', 5000000, 'distance', 'light-years');
k.ge('Hundred-Million Club', 'Deep-sky faraway', 'dist', 100000000, 'distance', 'light-years');
k.ge('Half-Billion Club', 'Deep-sky faraway', 'dist', 500000000, 'distance', 'light-years');
k.ge('Seven-Hundred-Million Club', 'Deep-sky faraway', 'dist', 700000000, 'distance', 'light-years');
k.when('Heading Our Way', 'Deep-sky blueshift', 'Redshift below zero: moving toward us', (m) => m.z !== null && m.z < 0, (m) => `${m.lab} has redshift ${sig(m.z)}`, [[{ z: -0.001 }, true], [{ z: 0 }, false], [{ z: 0.01 }, false], [{ z: null }, false], [{ z: '1' }, false]]);
k.ge('Far Flung', 'Deep-sky redshift', 'z', 0.05, 'redshift', '');
k.ge('Deep Redshift', 'Deep-sky redshift', 'z', 0.1, 'redshift', '');
k.ge('Quasar Range', 'Deep-sky redshift', 'z', 0.5, 'redshift', '');
for (const con of CONSTELLATIONS) k.is(`${con} Field`, 'Deep-sky constellation', 'con', con, `In the constellation ${con}`, (m) => `${m.lab} lies in ${con}`);
for (const [who, nm, label] of DISCOVERERS) k.is(nm, 'Deep-sky discoverer', 'disc', who, `Discovered by ${label}`, (m) => `${m.lab} was found by ${label}`);
const yr = (m) => `${m.lab} was first recorded in ${m.year}`;
k.when('Early Telescope Find', 'Deep-sky era', 'First recorded before 1700', (m) => m.year !== null && m.year < 1700, yr, [[{ year: 1699 }, true], [{ year: 1700 }, false], [{ year: null }, false], [{ year: 0 }, false]]);
k.when('Herschel-Era Find', 'Deep-sky era', 'First recorded from 1700 to 1799', (m) => m.year !== null && m.year >= 1700 && m.year <= 1799, yr, [[{ year: 1700 }, true], [{ year: 1799 }, true], [{ year: 1699 }, false], [{ year: 1800 }, false]]);
k.when('Victorian Find', 'Deep-sky era', 'First recorded from 1800 to 1899', (m) => m.year !== null && m.year >= 1800 && m.year <= 1899, yr, [[{ year: 1800 }, true], [{ year: 1899 }, true], [{ year: 1799 }, false], [{ year: 1900 }, false]]);
k.when('Twentieth-Century Find', 'Deep-sky era', 'First recorded in 1900 or later', (m) => m.year !== null && m.year >= 1900, yr, [[{ year: 1900 }, true], [{ year: 1899 }, false], [{ year: null }, false]]);
const nn = (m) => `${m.lab} is NGC ${fmt(m.ngc)}`;
k.when('First Hundred NGC', 'Deep-sky number', 'NGC number 100 or lower', (m) => m.ngc !== null && m.ngc <= 100, nn, [[{ ngc: 100 }, true], [{ ngc: 101 }, false], [{ ngc: null }, false], [{ ngc: 0 }, true]]);
k.when('Four-Digit NGC', 'Deep-sky number', 'NGC number from 1,000 to 9,999', (m) => m.ngc !== null && m.ngc >= 1000, nn, [[{ ngc: 1000 }, true], [{ ngc: 999 }, false], [{ ngc: null }, false]]);
k.when('Thousand NGC', 'Deep-sky number pattern', 'NGC number is a whole multiple of 1,000', (m) => m.ngc !== null && m.ngc >= 1000 && m.ngc % 1000 === 0, nn, [[{ ngc: 3000 }, true], [{ ngc: 3001 }, false], [{ ngc: 0 }, false], [{ ngc: null }, false]]);
k.when('Mirror NGC', 'Deep-sky number pattern', 'NGC number (3+ digits) reads the same backwards', (m) => m.ngc !== null && String(m.ngc).length >= 3 && String(m.ngc) === [...String(m.ngc)].reverse().join(''), nn, [[{ ngc: 1331 }, true], [{ ngc: 1234 }, false], [{ ngc: 11 }, false], [{ ngc: 202 }, true]]);
k.when('Messier Object', 'Deep-sky famous', 'Also in Messier\'s catalog of showpiece objects', (m) => m.messier !== null, (m) => `${m.lab} is Messier ${m.messier}`, [[{ messier: 31 }, true], [{ messier: 0 }, false], [{ messier: null }, false], [{ messier: '31' }, false]]);
k.when('Named Wonder', 'Deep-sky named', 'Has a common name, not just a catalog number', (m) => m.name !== null, (m) => `${m.lab} has the name "${m.name}"`, [[{ name: 'Crab Nebula' }, true], [{ name: null }, false], [{ name: '  ' }, false]]);

export const rules = k.rules, cases = k.cases;

const GROUP = (m) => (m.t === null ? null : /galaxy|quasar|blazar|seyfert|low-ionization/.test(m.t) ? 'galaxy' : /cluster|association|asterism/.test(m.t) ? 'cluster' : /nebula|remnant|h ii/.test(m.t) ? 'nebula' : /star|pair/.test(m.t) ? 'star' : 'other');
const GROUPS = { galaxy: 'Galaxies', cluster: 'Star clusters', nebula: 'Nebulae', star: 'Stars and star pairs', other: 'Other objects' };
const dist = (ly) => (ly >= 1e6 ? `${sig(ly / 1e6)} million light-years` : `${fmt(Math.round(ly))} light-years`);
export const view = {
  label: (m) => m.lab,
  sub: (m) => [m.type ?? 'object of unknown type', m.con ? `in ${m.con}` : null].filter(Boolean).join(' · '),
  facts: (m) => [
    ['Kind', 'Deep-sky object (NGC catalog)'], ['NGC number', m.ngc !== null ? String(m.ngc) : unknown], ['Messier number', m.messier !== null ? String(m.messier) : 'none'], ['Common name', m.name ?? 'none'],
    ['Type', m.type ?? unknown], ['Constellation', m.con ?? unknown], ['Apparent magnitude', m.mag !== null ? String(m.mag) : unknown], ['Distance from Earth', m.dist ? dist(m.dist) : unknown],
    ['Redshift', m.z !== null ? String(m.z) : unknown], ['Discovered by', m.disc ?? unknown], ['First recorded', m.year !== null ? String(m.year) : unknown],
    ['Source', 'Wikidata (CC0)', m.q !== null ? `https://www.wikidata.org/wiki/Q${m.q}` : 'https://www.wikidata.org/'],
  ],
  shelves: (m) => [
    ...(GROUP(m) ? [['Deep-sky group', `${GROUPS[GROUP(m)]} in the NGC catalog`]] : []),
    ...(m.con ? [['Deep-sky constellation', `Deep-sky objects in ${m.con}`]] : []),
    ...(m.mag !== null ? [['Deep-sky brightness', 'Deep-sky objects ' + band(m.mag, [[6.5, 'visible to the naked eye (magnitude under 6.5)'], [10, 'of magnitude 6.5 to 10'], [13, 'of magnitude 10 to 13'], [Infinity, 'fainter than magnitude 13']])]] : []),
    ...(m.dist ? [['Deep-sky distance', 'Deep-sky objects ' + band(m.dist, [[1e5, 'inside our galaxy'], [5e6, 'in the Local Group'], [1e8, 'between 5 and 100 million light-years away'], [Infinity, 'over 100 million light-years away']])]] : []),
    ...(m.disc ? [['Deep-sky discoverer', `Deep-sky objects found by ${m.disc}`]] : []),
    ...(m.year !== null ? [['Deep-sky era', `Deep-sky objects first recorded in the ${Math.floor(m.year / 10) * 10}s`]] : []),
  ],
  art(m) { // original picture: a spiral, a glowing ellipse, a cluster of stars or a gas cloud, by type. Never affects scoring; not a photograph.
    const h = hash(m.id), rnd = rng(h), g = GROUP(m), hue = 200 + (h % 120), t = m.t ?? '';
    const stars = Array.from({ length: 30 }, () => `<circle cx="${(rnd() * 100).toFixed(1)}" cy="${(rnd() * 100).toFixed(1)}" r="${(0.25 + rnd() * 0.55).toFixed(2)}"/>`).join('');
    const glow = (r, a) => `<radialGradient id="g${h}"><stop offset="0" stop-color="hsl(${hue} 90% 88%)" stop-opacity="${a}"/><stop offset=".45" stop-color="hsl(${hue} 80% 60%)" stop-opacity="${a * 0.45}"/><stop offset="1" stop-color="hsl(${hue} 80% 40%)" stop-opacity="0"/></radialGradient>`;
    const tilt = -40 + rnd() * 80, squash = 0.35 + rnd() * 0.5;
    let body;
    if (g === 'galaxy' && /spiral|seyfert|active|quasar|blazar|low-ion|interacting|emission|galaxy$/.test(t) && !/lenticular|elliptical|edge-on/.test(t)) {
      const arms = Array.from({ length: 2 }, (_, a) => `<path d="${Array.from({ length: 38 }, (_, j) => { const th = a * Math.PI + j * 0.24, r = 3 + j * 0.95; return `${j ? 'L' : 'M'}${(50 + r * Math.cos(th)).toFixed(1)} ${(50 + r * Math.sin(th)).toFixed(1)}`; }).join('')}" fill="none" stroke="hsl(${hue} 85% 78%)" stroke-width="3.2" stroke-linecap="round" opacity=".55"/>`).join('');
      body = `<defs>${glow(30, 0.9)}</defs><g transform="rotate(${tilt.toFixed(0)} 50 50) translate(50 50) scale(1 ${squash.toFixed(2)}) translate(-50 -50)"><circle cx="50" cy="50" r="32" fill="url(#g${h})"/>${arms}<circle cx="50" cy="50" r="5" fill="#fff6d8"/></g>`;
    } else if (g === 'galaxy') {
      body = `<defs>${glow(30, 0.95)}</defs><g transform="rotate(${tilt.toFixed(0)} 50 50) translate(50 50) scale(1 ${(/edge-on/.test(t) ? 0.22 : /lenticular/.test(t) ? 0.4 : 0.7).toFixed(2)}) translate(-50 -50)"><circle cx="50" cy="50" r="34" fill="url(#g${h})"/><circle cx="50" cy="50" r="6" fill="#fff6d8"/></g>`;
    } else if (g === 'cluster') {
      body = Array.from({ length: /globular/.test(t) ? 90 : 46 }, () => { const a = rnd() * 6.283, r = /globular/.test(t) ? Math.abs(rnd() + rnd() - 1) * 17 : rnd() * 27; return `<circle cx="${(50 + r * Math.cos(a)).toFixed(1)}" cy="${(46 + r * Math.sin(a)).toFixed(1)}" r="${(0.5 + rnd() * 1.1).toFixed(2)}" fill="hsl(${40 + rnd() * 200} 80% ${75 + rnd() * 20}%)"/>`; }).join('');
    } else if (g === 'nebula') {
      const ring = /planetary/.test(t);
      body = `<defs>${glow(30, 0.9)}</defs>` + (ring ? `<circle cx="50" cy="46" r="17" fill="none" stroke="hsl(${hue} 85% 65%)" stroke-width="7" opacity=".6"/><circle cx="50" cy="46" r="2.6" fill="#fff"/>`
        : Array.from({ length: 7 }, () => `<circle cx="${(30 + rnd() * 40).toFixed(1)}" cy="${(28 + rnd() * 36).toFixed(1)}" r="${(10 + rnd() * 16).toFixed(1)}" fill="hsl(${hue + rnd() * 60 - 30} 80% 55%)" opacity=".28"/>`).join('') + `<circle cx="50" cy="46" r="20" fill="url(#g${h})" opacity=".7"/>`);
    } else body = `<defs>${glow(24, 0.9)}</defs><circle cx="50" cy="46" r="22" fill="url(#g${h})"/><circle cx="50" cy="46" r="2.6" fill="#fff"/>${[0, 90].map((a) => `<line x1="${50 - 18}" y1="46" x2="${50 + 18}" y2="46" stroke="#fff" stroke-opacity=".5" stroke-width=".5" transform="rotate(${a} 50 46)"/>`).join('')}`;
    return `<svg class="avatar" viewBox="0 0 100 100" role="img" aria-label="Generated picture of a deep-sky object. Not a photograph.">
      <rect width="100" height="100" rx="8" fill="#04060f"/><g fill="#fff" opacity=".75">${stars}</g>${body}
      <text x="50" y="95" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5.5" letter-spacing=".6" fill="#8791b8">GENERATED IMAGE</text></svg>`;
  },
};
export default { kind: 'deepsky', name: 'Deep-sky objects', one: 'deep-sky object', prep, rules, cases, view };
