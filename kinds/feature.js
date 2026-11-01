// Named places on other worlds (craters, mountains, valleys...): rules, preparation and presentation. Source: USGS Gazetteer of Planetary Nomenclature (IAU-approved names).
import { kit, norm, num, pos, text, chars, sig, fmt, hash, rng, band, unknown } from './kit.js';

const BASE = { kind: 'feature', id: 'Moon/Test', body: 'Moon', name: 'Test', ftype: 'Crater', diameter: null, lat: null, year: null, eth: null, cont: null, origin: null, fid: null };
const lat = (x) => (num(x) !== null && x >= -90 && x <= 90 ? x : null);

export function prep(raw) {
  const name = text(raw.name) ?? 'Unnamed place', body = text(raw.body), origin = text(raw.origin);
  return {
    ...raw, kind: 'feature', name, body, ftype: text(raw.ftype), n: norm(name), lab: `${name} (${body ?? 'unknown world'})`, diameter: pos(raw.diameter), lat: lat(raw.lat),
    year: Number.isInteger(raw.year) && raw.year >= 1900 && raw.year <= 3000 ? raw.year : null, eth: text(raw.eth), cont: text(raw.cont), origin, o: origin ? origin.toLowerCase() : null, fid: Number.isInteger(raw.fid) ? raw.fid : null,
  };
}

const CLASS = { 'Rocky Planet Place': ['Mercury', 'Venus', 'Mars'], 'Giant-Planet Moon Place': ['Io', 'Europa', 'Ganymede', 'Callisto', 'Titan', 'Rhea', 'Dione', 'Enceladus', 'Iapetus', 'Tethys', 'Mimas', 'Ariel', 'Miranda', 'Titania', 'Umbriel', 'Oberon', 'Triton'],
  'Small Moon Place': ['Phobos', 'Deimos', 'Hyperion', 'Amalthea', 'Janus', 'Puck', 'Epimetheus', 'Thebe', 'Phoebe', 'Proteus'], 'Dwarf-World Place': ['Ceres', 'Pluto', 'Charon', 'Nix'],
  'Asteroid Place': ['Vesta', 'Eros', 'Lutetia', 'Bennu', 'Gaspra', 'Ida', 'Steins', 'Mathilde', 'Itokawa', 'Ryugu', 'Donaldjohanson', 'Dimorphos', 'Dinkinesh', 'Didymos', 'Dactyl'] };
const BODIES = ['Moon', 'Mars', 'Venus', 'Mercury', 'Titan', 'Io', 'Ganymede', 'Callisto', 'Ceres', 'Rhea', 'Europa', 'Vesta', 'Dione', 'Enceladus', 'Pluto', 'Iapetus', 'Triton', 'Tethys', 'Mimas', 'Eros', 'Lutetia', 'Bennu', 'Gaspra',
  'Ariel', 'Ida', 'Phoebe', 'Steins', 'Mathilde', 'Phobos', 'Miranda', 'Titania', 'Itokawa', 'Charon', 'Ryugu', 'Umbriel', 'Donaldjohanson', 'Dimorphos', 'Oberon', 'Dinkinesh', 'Hyperion', 'Amalthea', 'Janus', 'Puck', 'Dactyl', 'Deimos',
  'Didymos', 'Epimetheus', 'Nix', 'Proteus', 'Thebe'];
const TYPES = { 'Satellite Feature': ['Satellite Crater', 'a lettered crater named for a nearby one'], Crater: ['Crater', 'a bowl made by an impact'], Corona: ['Corona', 'an oval, ring-like volcanic structure'], Mons: ['Mountain', 'mons, a mountain'],
  Patera: ['Patera', 'an irregular volcanic crater'], Vallis: ['Valley', 'vallis, a valley'], Dorsum: ['Ridge', 'dorsum, a ridge'], 'Albedo Feature': ['Albedo Mark', 'a bright or dark patch seen from far away'], Fossa: ['Trench', 'fossa, a long narrow depression'],
  Chasma: ['Canyon', 'chasma, a deep steep-sided canyon'], Rupes: ['Scarp', 'rupes, a cliff'], Lacus: ['Lake', 'lacus, a "lake" (a small dark plain)'], Rima: ['Fissure', 'rima, a narrow crack or channel'], Tholus: ['Dome', 'tholus, a small dome-shaped mountain'],
  Regio: ['Region', 'regio, a large area of different brightness'], Planitia: ['Plain', 'planitia, a low plain'], Sulcus: ['Groove', 'sulcus, a set of parallel grooves'], Fluctus: ['Lava Flow', 'fluctus, a flow terrain'],
  'Astronaut-named features': ['Astronaut Landmark', 'a feature named at an Apollo landing site'], Linea: ['Streak', 'linea, a dark or bright line'], Catena: ['Crater Chain', 'catena, a chain of craters'], Tessera: ['Tile Terrain', 'tessera, tile-like terrain'],
  Facula: ['Bright Spot', 'facula, a bright spot'], Planum: ['Plateau', 'planum, a plateau'], Mensa: ['Mesa', 'mensa, a flat-topped table mountain'], Collis: ['Hill Cluster', 'collis, small hills'], Cavus: ['Hollow', 'cavus, an irregular steep-sided depression'],
  Sinus: ['Bay', 'sinus, a bay'], Chaos: ['Chaotic Terrain', 'chaos, a jumble of broken blocks'], Saxum: ['Boulder', 'saxum, a boulder or rock'], Labyrinthus: ['Labyrinth', 'labyrinthus, a maze of valleys'], Terra: ['Highland', 'terra, an extensive highland'],
  Mare: ['Sea', 'mare, a "sea" (a vast dark plain)'], Macula: ['Dark Spot', 'macula, a dark spot'], 'Eruptive center': ['Eruption Center', 'a place where material erupts'], Unda: ['Dune Field', 'unda, a field of dunes'], Labes: ['Landslide', 'labes, a landslide'],
  Scopulus: ['Lobate Scarp', 'scopulus, a lobed or irregular cliff'], Lacuna: ['Irregular Depression', 'lacuna, an irregular depression'], Insula: ['Island', 'insula, an island-like dark patch'], Flumen: ['River Channel', 'flumen, a channel that looks like a river'],
  'Large ringed feature': ['Ringed Basin', 'a large multi-ringed impact scar'], Palus: ['Marsh', 'palus, a "swamp"'], Promontorium: ['Cape', 'promontorium, a cape'], Farrum: ['Pancake Dome', 'farrum, a pancake-like structure'],
  Virga: ['Faint Streak', 'virga, a streak of color'], Statio: ['Landing Site', 'statio, a landing site'], Flexus: ['Cuspate Ridge', 'flexus, a low curved ridge'], Serpens: ['Serpent Ridge', 'serpens, a sinuous ridge'], Lingula: ['Tongue', 'lingula, an extension of a plateau'],
  Fretum: ['Strait', 'fretum, a strait'], Lobus: ['Lobe', 'lobus, a lobe-shaped feature'], Plume: ['Plume', 'a site where material blows out'], Collum: ['Neck', 'collum, a neck'], Vastitas: ['Wastes', 'vastitas, an extensive plain'],
  Oceanus: ['Ocean', 'oceanus, a very large dark area'], Arcus: ['Arc', 'arcus, an arc-shaped feature'] };
const CAREERS = [['Astronomer', 'astronom'], ['Mathematician', 'mathematic'], ['Physicist', 'physicist'], ['Poet', 'poet'], ['Writer', 'writer'], ['Painter', 'painter'], ['Composer', 'composer'], ['Geologist', 'geolog'], ['Explorer', 'explorer'],
  ['Philosopher', 'philosoph'], ['Chemist', 'chemist'], ['Engineer', 'engineer'], ['Geographer', 'geograph'], ['Cosmonaut', 'cosmonaut'], ['Sculptor', 'sculptor'], ['Architect', 'architect'], ['Biologist', 'biolog'], ['Meteorologist', 'meteorolog'],
  ['Navigator', 'navigator'], ['Inventor', 'inventor'], ['Singer', 'singer']];
const NAMESAKES = [['Germany', 'German Namesake'], ['Greek', 'Greek Myth Name'], ['France', 'French Namesake'], ['Great Britain', 'British Namesake'], ['American', 'American Namesake'], ['Italy', 'Italian Namesake'], ['Roman', 'Roman Myth Name'],
  ['Russia', 'Russian Namesake'], ['Soviet', 'Soviet Namesake'], ['Latin', 'Latin Word Name'], ['The Netherlands (Dutch)', 'Dutch Namesake'], ['Spain', 'Spanish Namesake'], ['Austria', 'Austrian Namesake'], ['Scotland', 'Scottish Namesake'],
  ['Egypt', 'Egyptian Name'], ['Japan', 'Japanese Namesake'], ['China', 'Chinese Namesake'], ['Denmark', 'Danish Namesake'], ['India', 'Indian Namesake'], ['Norse', 'Norse Myth Name'], ['Sweden', 'Swedish Namesake'], ['Poland', 'Polish Namesake'],
  ['Arabian', 'Arabian Name'], ['Celtic', 'Celtic Myth Name'], ['Australia', 'Australian Namesake'], ['Hebrew', 'Hebrew Name']];
const REGIONS = [['Europe', 'European Namesake'], ['Asia', 'Asian Namesake'], ['North America', 'North American Namesake'], ['Africa', 'African Namesake'], ['Oceania', 'Oceanian Namesake'], ['South and Central America', 'Latin American Namesake'], ['Antarctica', 'Antarctic Namesake']];

const k = kit('feature', BASE, { diameter: 'pos' });
k.when('Named Place', 'Kind', 'Is a place with an IAU-approved name on another world', () => true, (m) => `${m.lab} is an IAU-named place`, [[{}, true]]);
for (const b of BODIES) k.is(`${b} Place`, 'Place world', 'body', b, `Located on ${b}`, (m) => `${m.lab} is on ${b}`);
for (const [nm, list] of Object.entries(CLASS)) {
  k.when(nm, 'Place world class', `Located on ${list.slice(0, -1).join(', ')} or ${list.at(-1)}`, (m) => m.body !== null && list.includes(m.body), (m) => `${m.lab} is on ${m.body}`, [[{ body: list[0] }, true], [{ body: list.at(-1) }, true], [{ body: 'Moon' }, false], [{ body: null }, false]]);
}
for (const [t, [nm, gloss]] of Object.entries(TYPES)) k.is(`${nm} Landform`, 'Place landform', 'ftype', t, `Feature type ${t}: ${gloss}`, (m) => `${m.lab} is classed as ${t}`);
const D = 'diameter', km = 'km';
k.ge('Large Feature', 'Place size', D, 100, D, km); k.ge('Huge Feature', 'Place size', D, 500, D, km); k.ge('Giant Feature', 'Place size', D, 1000, D, km); k.ge('Planet-Scale Feature', 'Place size', D, 3000, D, km);
k.lt('Tiny Feature', 'Place smallness', D, 2, D, km); k.lt('Pinprick Feature', 'Place smallness', D, 0.5, D, km);
const la = (m) => `${m.lab} is at latitude ${sig(m.lat)}°`;
k.when('Northern Place', 'Place hemisphere', 'Center latitude north of the equator', (m) => m.lat !== null && m.lat > 0, la, [[{ lat: 10 }, true], [{ lat: 0 }, false], [{ lat: -10 }, false], [{ lat: null }, false], [{ lat: 95 }, false]]);
k.when('Southern Place', 'Place hemisphere', 'Center latitude south of the equator', (m) => m.lat !== null && m.lat < 0, la, [[{ lat: -10 }, true], [{ lat: 0 }, false], [{ lat: 10 }, false], [{ lat: null }, false], [{ lat: -95 }, false]]);
k.when('Polar Place', 'Place latitude band', 'Within 10° of a pole (latitude beyond 80° north or south)', (m) => m.lat !== null && Math.abs(m.lat) >= 80, la, [[{ lat: 80 }, true], [{ lat: -80 }, true], [{ lat: 79.9 }, false], [{ lat: null }, false]]);
k.when('Equatorial Place', 'Place latitude band', 'Within 5° of the equator', (m) => m.lat !== null && Math.abs(m.lat) < 5, la, [[{ lat: 4.9 }, true], [{ lat: -4.9 }, true], [{ lat: 5 }, false], [{ lat: null }, false]]);
const yr = (m) => `${m.lab} was named in ${m.year}`;
const era = (name, lo, hi, text) => k.when(name, 'Place naming era', text, (m) => m.year !== null && m.year >= lo && m.year <= hi, yr, [[{ year: lo }, true], [{ year: hi }, true], [{ year: lo - 1 }, false], [{ year: hi + 1 }, false], [{ year: null }, false]]);
era('Early Lunar Name', 1900, 1964, 'Named in 1964 or earlier'); era('Space Race Name', 1965, 1978, 'Named from 1965 to 1978'); era('Voyager-Era Name', 1979, 1989, 'Named from 1979 to 1989');
era('Magellan-Era Name', 1990, 1999, 'Named from 1990 to 1999'); era('Modern Name', 2000, 2014, 'Named from 2000 to 2014'); era('Recent Name', 2015, 2025, 'Named from 2015 to 2025');
k.when('Named This Year', 'Place newest name', 'Named in the year the pool was captured', (m, poolDate) => m.year !== null && m.year === Number(String(poolDate).slice(0, 4)), yr, [[{ year: 2026 }, true], [{ year: 2025 }, false], [{ year: null }, false]]);
const og = (name, family, re, rule, yes) => k.when(name, family, rule, (m) => m.o !== null && re.test(m.o), (m) => `${m.lab}: ${m.origin}`, [[{ origin: yes }, true], [{ origin: 'Something else entirely.' }, false], [{ origin: null }, false]]);
og('Named for a Person', 'Place name origin', /\(\d{3,4}-\d{3,4}\)/, 'Origin text gives a person\'s life years, like (1473-1543)', 'Nicolaus; Polish astronomer (1473-1543).');
og('Named for a Goddess', 'Place name origin', /goddess/, 'Origin text names a goddess', 'Roman goddess of the harvest.');
og('Named for a God', 'Place name origin', /\bgod\b/, 'Origin text names a god', 'Norse god of thunder.');
og('Named for a Hero', 'Place name origin', /\bhero/, 'Origin text names a hero or heroine', 'Greek hero of Troy.');
og('Named for a Town', 'Place name origin', /\b(town|village|city)\b/, 'Origin text names a town, village or city', 'Town in Russia.');
og('Named for a River', 'Place name origin', /\briver\b/, 'Origin text names a river', 'River in Spain.');
og('Named for a Spirit', 'Place name origin', /\bspirit/, 'Origin text names a spirit', 'Good spirit of the woods.');
og('Named for Royalty', 'Place name origin', /\b(king|queen|emperor|empress|princess|prince|pharaoh)\b/, 'Origin text names a king, queen, emperor or other royal', 'Queen of the Amazons.');
og('Named from a Nearby Crater', 'Place name origin', /nearby crater/, 'Origin text says it was named from a nearby crater', 'Named from nearby crater.');
og('Classical Albedo Name', 'Place name origin', /albedo feature name/, 'Origin text says it is a classical albedo feature name', 'Classical albedo feature name.');
og('Apollo Site', 'Place name origin', /astronaut|apollo/, 'Origin text mentions an astronaut or Apollo', 'Astronaut-named feature, Apollo 17 site.');
for (const [career, stem] of CAREERS) og(`${career} Namesake`, 'Place namesake career', new RegExp(stem), `Origin text says the namesake was a ${career.toLowerCase()}`, `Someone; French ${stem}al thing (1800-1900).`.replace(stem + 'al thing', stem + 'er'));
for (const [eth, nm] of NAMESAKES) k.is(nm, 'Place namesake origin', 'eth', eth, `Name origin: ${eth}`, (m) => `${m.lab}: name origin ${eth}`);
for (const [cont, nm] of REGIONS) k.is(nm, 'Place namesake region', 'cont', cont, `Name origin region: ${cont}`, (m) => `${m.lab}: name origin region ${cont}`);
const nl = (m) => `"${m.name}" has ${chars(m.name).length} characters`;
k.when('Short Place Name', 'Place name length', 'Name of 3 characters or fewer', (m) => chars(m.n).length <= 3, nl, [[{ name: 'Ara' }, true], [{ name: 'Arab' }, false]]);
k.when('Long Place Name', 'Place name length', 'Name of 20 characters or more', (m) => chars(m.n).length >= 20, nl, [[{ name: 'x'.repeat(20) }, true], [{ name: 'x'.repeat(19) }, false]]);
k.when('Two-Word Place', 'Place name form', 'Name contains a space', (m) => /\s/.test(m.n), (m) => `"${m.name}" is more than one word`, [[{ name: 'Mare Imbrium' }, true], [{ name: 'Tycho' }, false]]);
k.when('Letter-Marked Crater', 'Place name form', 'Name ends in a single capital letter (a lettered satellite crater)', (m) => /\s[A-Z]$/.test(m.name), (m) => `"${m.name}" is a lettered crater`, [[{ name: 'Marco Polo P' }, true], [{ name: 'Tycho' }, false], [{ name: 'Marco Polo PP' }, false]]);

export const rules = k.rules, cases = k.cases;

const TINT = (b) => (['Moon', 'Mercury', 'Phobos', 'Deimos', 'Vesta', 'Eros', 'Lutetia'].includes(b) ? [0, 4] : b === 'Mars' ? [18, 42] : b === 'Venus' ? [38, 50] : b === 'Io' ? [52, 46] : b === 'Titan' ? [32, 42] : ['Europa', 'Enceladus', 'Rhea', 'Dione', 'Tethys', 'Mimas', 'Iapetus', 'Ariel', 'Charon', 'Pluto', 'Triton', 'Ganymede', 'Callisto', 'Ceres'].includes(b) ? [205, 14] : [30, 10]);
const KIND_OF = (t) => (['Crater', 'Satellite Feature', 'Large ringed feature', 'Patera', 'Cavus', 'Corona'].includes(t) ? 'crater' : ['Mons', 'Tholus', 'Collis', 'Farrum', 'Planum', 'Mensa', 'Dorsum', 'Promontorium', 'Saxum'].includes(t) ? 'mountain'
  : ['Vallis', 'Chasma', 'Fossa', 'Rima', 'Catena', 'Sulcus', 'Rupes', 'Flumen', 'Linea', 'Labyrinthus', 'Virga', 'Flexus', 'Serpens'].includes(t) ? 'canyon' : ['Planitia', 'Mare', 'Lacus', 'Palus', 'Sinus', 'Terra', 'Regio', 'Vastitas', 'Oceanus', 'Lacuna', 'Fretum'].includes(t) ? 'plain' : 'spot');
export const view = {
  label: (m) => m.lab,
  sub: (m) => `${m.ftype ? (TYPES[m.ftype]?.[0] ?? m.ftype) : 'place'} on ${m.body ?? 'another world'}${m.diameter ? ` · ${sig(m.diameter)} km across` : ''}`,
  facts: (m) => [
    ['Kind', 'Named place on another world'], ['World', m.body ?? unknown], ['Feature type', m.ftype ? `${m.ftype}${TYPES[m.ftype] ? ` (${TYPES[m.ftype][1]})` : ''}` : unknown], ['Size', m.diameter ? `${sig(m.diameter)} km (${sig(m.diameter * 0.621371)} miles)` : unknown],
    ['Center latitude', m.lat !== null ? `${sig(Math.abs(m.lat))}° ${m.lat < 0 ? 'south' : m.lat > 0 ? 'north' : '(equator)'}` : unknown], ['Name approved', m.year !== null ? String(m.year) : unknown],
    ['Name origin', m.origin ?? unknown], ['Namesake', m.eth ? `${m.eth}${m.cont ? `, ${m.cont}` : ''}` : unknown],
    ['Source', 'USGS Gazetteer of Planetary Nomenclature', m.fid !== null ? `https://planetarynames.wr.usgs.gov/Feature/${m.fid}` : 'https://planetarynames.wr.usgs.gov/'],
  ],
  shelves: (m) => [
    ...(m.body ? [['Place world', `Places on ${m.body}`]] : []), ...(m.ftype ? [['Place landform', `${TYPES[m.ftype]?.[0] ?? m.ftype} landforms`]] : []),
    ...(m.diameter ? [['Place size', 'Places ' + band(m.diameter, [[2, 'under 2 km across'], [10, '2 to 10 km across'], [50, '10 to 50 km across'], [200, '50 to 200 km across'], [1000, '200 to 1,000 km across'], [Infinity, '1,000 km or more across']])]] : []),
    ...(m.year !== null ? [['Place naming', `Places named in the ${Math.floor(m.year / 10) * 10}s`]] : []), ...(m.cont ? [['Place namesake', `Places with ${m.cont} name origins`]] : []),
    ...(m.lat !== null ? [['Place latitude', m.lat >= 0 ? 'Places in the northern hemisphere' : 'Places in the southern hemisphere']] : []),
  ],
  art(m) { // original landscape: shape from the feature type, colour from the world, size from the diameter. Never affects scoring; not a photograph.
    const h = hash(m.id), rnd = rng(h), [hue, sat] = TINT(m.body ?? ''), shape = KIND_OF(m.ftype ?? ''), r = 10 + 22 * Math.min(1, Math.log10(1 + (m.diameter ?? 10)) / Math.log10(2000));
    const stars = Array.from({ length: 22 }, () => `<circle cx="${(rnd() * 100).toFixed(1)}" cy="${(rnd() * 46).toFixed(1)}" r="${(0.25 + rnd() * 0.5).toFixed(2)}"/>`).join('');
    const ground = `<rect y="58" width="100" height="42" fill="hsl(${hue} ${sat}% 30%)"/><path d="M0 58 Q25 ${(52 + rnd() * 5).toFixed(1)} 50 58 T100 58 V100 H0Z" fill="hsl(${hue} ${sat}% 26%)"/>`;
    let focus;
    if (shape === 'crater') focus = `<ellipse cx="50" cy="74" rx="${(r * 1.5).toFixed(1)}" ry="${(r * 0.55).toFixed(1)}" fill="hsl(${hue} ${sat}% 14%)" stroke="hsl(${hue} ${sat}% 52%)" stroke-width="1.6"/><ellipse cx="${(50 + r * 0.25).toFixed(1)}" cy="${(75 + r * 0.1).toFixed(1)}" rx="${(r * 0.9).toFixed(1)}" ry="${(r * 0.3).toFixed(1)}" fill="hsl(${hue} ${sat}% 21%)"/>${r > 20 ? `<path d="M46 74 l4 -9 l4 9z" fill="hsl(${hue} ${sat}% 44%)"/>` : ''}`;
    else if (shape === 'mountain') focus = `<path d="M${(50 - r * 1.6).toFixed(1)} 62 L50 ${(62 - r * 1.2).toFixed(1)} L${(50 + r * 1.6).toFixed(1)} 62Z" fill="hsl(${hue} ${sat}% 42%)"/><path d="M50 ${(62 - r * 1.2).toFixed(1)} L${(50 + r * 1.6).toFixed(1)} 62 L50 62Z" fill="hsl(${hue} ${sat}% 28%)"/>`;
    else if (shape === 'canyon') focus = `<path d="M${(8 + rnd() * 8).toFixed(1)} 68 Q35 ${(60 + rnd() * 8).toFixed(1)} 52 ${(70 + rnd() * 6).toFixed(1)} T92 ${(66 + rnd() * 8).toFixed(1)}" fill="none" stroke="hsl(${hue} ${sat}% 8%)" stroke-width="${(2 + r * 0.12).toFixed(1)}" stroke-linecap="round"/>`;
    else if (shape === 'plain') focus = Array.from({ length: 7 }, () => `<ellipse cx="${(8 + rnd() * 84).toFixed(1)}" cy="${(66 + rnd() * 28).toFixed(1)}" rx="${(1.5 + rnd() * 3).toFixed(1)}" ry="${(0.8 + rnd() * 1.4).toFixed(1)}" fill="hsl(${hue} ${sat}% 20%)"/>`).join('');
    else focus = `<ellipse cx="50" cy="76" rx="${(r * 1.1).toFixed(1)}" ry="${(r * 0.4).toFixed(1)}" fill="hsl(${hue} ${sat}% ${rnd() > 0.5 ? 46 : 14}%)" opacity=".85"/>`;
    return `<svg class="avatar" viewBox="0 0 100 100" role="img" aria-label="Generated picture of a landscape. Not a photograph.">
      <rect width="100" height="100" rx="8" fill="#05070f"/><g fill="#fff" opacity=".75">${stars}</g><circle cx="${(15 + rnd() * 70).toFixed(0)}" cy="${(14 + rnd() * 18).toFixed(0)}" r="${(4 + rnd() * 5).toFixed(1)}" fill="hsl(${hue + 20} 30% 80%)" opacity=".85"/>
      ${ground}${focus}<text x="50" y="95" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5.5" letter-spacing=".6" fill="#8791b8">GENERATED IMAGE</text></svg>`;
  },
};
export default { kind: 'feature', name: 'Named places', one: 'named place', prep, rules, cases, view };
