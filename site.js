// Everything specific to Spacedle: names, copy, and the glue to the per-kind modules (kinds/*.js). app.js is generic.
import { KIND } from './rules.js';
import { esc, fmt } from './kinds/kit.js';

const view = (m) => KIND[m.kind].view;
const tally = (pool, get) => { const c = new Map(); for (const m of pool.members) { const v = get(m); if (v) c.set(v, (c.get(v) || 0) + 1); } return [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); };
const table = (title, rows, head = 'Objects') => `<table><thead><tr><th>${esc(title)}</th><th class="n">${head}</th></tr></thead><tbody>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${fmt(v)}</td></tr>`).join('')}</tbody></table>`;

export default {
  key: 'spacedle',
  name: 'Spacedle',
  pageTitle: 'Spacedle: a daily game of everything in space',
  noun: 'object', nouns: 'objects', thing: 'Object',
  worldNote: 'everything in space',
  repo: 'https://github.com/sharkjujg/spacedle',
  headline: 'Discover something in space. Once a day.',
  intro: (n) => `Roll once to meet one real thing in space, drawn from a pool of <b>${fmt(n)}</b>: asteroids, comets, exoplanets and their stars, satellites, rocket bodies and named places on other worlds. Every object has the same 1-in-${fmt(n)} chance, famous or obscure. Badges explain what is unusual about it, and rarer badges earn more rarity points (RP). The daily limit resets at 00:00 UTC.`,
  notice: 'Prototype: every object and measurement is real (NASA/JPL, the NASA Exoplanet Archive, GCAT and the USGS/IAU gazetteer), but there are no photos or accounts yet, and your results are saved only in this browser. <a href="#/about">What that means</a>',
  minShelf: 3,
  poolBytes: 15679560, // the pool file's size, for the loading gauge only
  findHint: 'Ceres, Halley, Kepler-22, Tycho, Apollo…',
  // The pool is compact: each member is a row [kind code, ...fields] and meta.kinds says which fields a kind has. Expanding gives plain records.
  expand({ meta, members }) {
    const kinds = meta.kinds;
    return { meta, members: members.map((row) => { const k = kinds[row[0]], o = { kind: k.kind }; for (let i = 0; i < k.fields.length; i++) o[k.fields[i]] = row[i + 1] ?? null; return o; }) };
  },
  header: (m) => ({ title: view(m).label(m), sub: `${KIND[m.kind].one[0].toUpperCase()}${KIND[m.kind].one.slice(1)} · ${view(m).sub(m)}` }),
  kindNames: Object.fromEntries(Object.values(KIND).map((k) => [k.kind, k.name])),
  label: (m) => view(m).label(m),
  shelves: (m) => [['Kind', `${KIND[m.kind].name}`], ...view(m).shelves(m)],
  facts: (m) => view(m).facts(m),
  art: (m) => view(m).art(m),
  poolNotice: 'Every record comes from a public scientific catalog, as a snapshot: asteroids and comets from the NASA/JPL Small-Body Database, exoplanets and their host stars from the NASA Exoplanet Archive, satellites and rocket bodies from GCAT, and named places from the USGS/IAU Gazetteer of Planetary Nomenclature. A value a catalog lacks is shown as unknown and never earns a badge. The pool is simply what the catalogs hold, so asteroids are the majority and near-identical craft from huge constellations are thinned; the odds describe this pool, not the universe.',
  poolExtra(pool) {
    const kinds = tally(pool, (m) => KIND[m.kind].name);
    return `<h2>What is in the pool</h2><p class="small muted">Disclosed because a badge is only rare relative to this mix.</p>
      ${table('Kind', kinds)}
      ${table('Asteroid classes', tally(pool, (m) => m.kind === 'asteroid' && view(m).sub(m).split(' · ')[0]).slice(0, 9), 'Asteroids')}
      ${table('Exoplanet discovery methods', tally(pool, (m) => m.kind === 'exoplanet' && m.method), 'Planets')}
      ${table('Payloads by state', tally(pool, (m) => m.kind === 'satellite' && m.state).slice(0, 10), 'Payloads')}
      ${table('Named places by world', tally(pool, (m) => m.kind === 'feature' && m.body).slice(0, 12), 'Places')}`;
  },
  aboutData: `<h2>Where the data comes from</h2>
    <p><b>Asteroids and comets</b> come from the NASA/JPL <a href="https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html">Small-Body Database</a> (data courtesy of NASA/JPL-Caltech): every named asteroid, every near-Earth asteroid, trans-Neptunian object and Centaur, and every comet with an orbit. Sizes, brightness, reflectivity, spin and spectral type are known for only some of them; orbits are fits that improve with new observations. "Potentially hazardous" is a size and close-approach category, not a prediction that anything will hit Earth. "First observed" is the earliest observation in the orbit record, which can be a later re-identification, so it is not always the discovery date.</p>
    <p><b>Exoplanets and host stars</b> come from the <a href="https://exoplanetarchive.ipac.caltech.edu/">NASA Exoplanet Archive</a> (Planetary Systems Composite Parameters table), which is operated by the California Institute of Technology under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program. Planet masses and radii can be estimates; equilibrium temperature assumes a planet that reflects like Earth and is not a measured surface temperature.</p>
    <p><b>Satellites and rocket bodies</b> come from GCAT, the General Catalog of Artificial Space Objects, by <a href="https://planet4589.org/space/gcat/">Jonathan C. McDowell</a> (licensed CC BY 4.0; McDowell, Jonathan C., 2020, <i>General Catalog of Artificial Space Objects</i>, Release 1.8.8). Debris fragments and mission-related pieces are left out. A few constellations are enormous (Starlink alone is over 12,000 payloads), so any series of more than 60 near-identical craft (same name stem, maker and bus) is thinned to 25 spread evenly through its launch history; the pool page and the selection note give the exact counts. GCAT status "O" means a payload is still in orbit, which does not mean it still works.</p>
    <p><b>Named places</b> come from the USGS <a href="https://planetarynames.wr.usgs.gov/">Gazetteer of Planetary Nomenclature</a>, which publishes the names approved by the International Astronomical Union's Working Group for Planetary System Nomenclature. Only a feature's name, type, size, latitude, approval year and name origin are used; longitude is left out because bodies differ on which way it counts. The artwork is a generated drawing, not a photograph.</p>`,
  terms: 'It is not affiliated with, sponsored or endorsed by NASA, JPL, Caltech, the USGS, the IAU, Jonathan McDowell or any space agency or company. Any errors in the snapshot or in the badges are this prototype\'s. Badges describe catalog measurements, not scientific importance or danger.',
};
