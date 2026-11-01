# Spacedle

A daily game of everything in space: roll once per UTC day, draw one real object from a pool of **136,980** (asteroids, comets, exoplanets and their stars, satellites, rocket bodies, named places on other worlds, and galaxies, clusters and nebulae), and see which of **811 badges** make it unusual. A sibling of CinemaRNG, BrickRNG, AsteroidRNG, CometRNG, ExoRNG and the other games on the same engine, but with one pool built from five public catalogs and Wikidata.

**This is a prototype.** Every object and measurement is a snapshot of a public scientific catalog (taken 2026-11-01). There is no backend, so results live in the player's browser. No photographs are used; the pictures are generated drawings, labelled as such. Unofficial fan project, not affiliated with or endorsed by NASA, JPL, Caltech, the USGS, the IAU, Jonathan McDowell or any space agency or company.

## What is in the pool

| Kind | Records | Source |
| --- | ---: | --- |
| Asteroids | 78,561 | NASA/JPL Small-Body Database: every named asteroid, every near-Earth asteroid, trans-Neptunian object and Centaur |
| Comets | 4,083 | NASA/JPL Small-Body Database: every comet with an orbit (the same snapshot CometRNG uses) |
| Exoplanets | 6,451 | NASA Exoplanet Archive, Planetary Systems Composite Parameters |
| Host stars | 4,847 | the same archive: the stars those planets orbit |
| Satellites | 13,206 | GCAT (Jonathan C. McDowell): cataloged payloads, with huge series thinned (below) |
| Rocket bodies | 6,079 | GCAT: cataloged rocket stages and boosters, thinned the same way |
| Named places | 16,124 | USGS Gazetteer of Planetary Nomenclature: IAU-approved names on 50 bodies |
| Deep-sky objects | 7,629 | Wikidata (CC0): every item with a New General Catalogue (NGC) number, 96 of them also Messier objects; type, brightness, constellation, distance, redshift, discoverer and discovery year |

Not in the pool, on purpose: debris fragments and components (GCAT types D and C), the roughly 1.3 million unnamed, non-near-Earth asteroids, the Index Catalogue (IC) deep-sky objects (Wikidata has no IC property), the planets and moons themselves (Wikidata lists only a handful of them under the type that would select them; the places on them are in), the meteorite catalog (its reuse terms could not be confirmed), and `CelesTrak`'s satellite list (same reason).

**Thinning.** Starlink alone is over 12,000 payloads, which would have made one constellation a fifth of the pool. Any series of more than 60 near-identical craft (same name stem, same manufacturer, same bus) is thinned to 25, spread evenly through its launch history: 14,646 payloads and 212 rocket bodies are left out, and the selection note on the Pool page says so. Every other record is in.

**Every object has the same chance** (1 in 136,980). The kinds are not equally common, because the catalogs are not: asteroids are 57% of the pool, so an exoplanet or a named place on Io is a rarer *kind* of draw, and a badge for it is worth more.

## Data and licences

- **NASA/JPL Small-Body Database** (asteroids, comets): public NASA data served without a key through the SBDB query API, credited "Data courtesy of NASA/JPL-Caltech". JPL's copyright page could not be read when this was built; if NASA or JPL states terms that do not allow this use, replace the asteroid and comet rows in `data/pool-v1.json` and nothing else changes.
- **NASA Exoplanet Archive**: "This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program."
- **GCAT** is released under **CC BY 4.0**. Citation: McDowell, Jonathan C., 2020. *General Catalog of Artificial Space Objects*, Release 1.8.8, <https://planet4589.org/space/gcat>. Short form: "data from GCAT (J. McDowell, planet4589.org/space/gcat)". Records were filtered and thinned; the values are unchanged.
- **Wikidata** structured data is CC0. The deep-sky facts in it were copied from astronomical catalogs and papers, so a value can be missing or differ from the primary source.
- **USGS Gazetteer of Planetary Nomenclature**: names approved by the IAU Working Group for Planetary System Nomenclature, published by the USGS Astrogeology Science Center. Only a feature's name, type, size, latitude, approval year and name origin are used. Longitude is left out because bodies differ on which way it counts, and the table does not say which.

A value a catalog lacks is stored as `null`, shown as "not in the catalog", and never earns a badge. Derived values (orbital period and perihelion from the semi-major axis and eccentricity, aphelion, the host star's colour class) are computed in `kinds/*.js` and labelled as derived.

## What is built

| Area | Status |
| --- | --- |
| Daily roll, unbiased secure draw (rejection sampling), one per UTC day, retry-safe | Done, browser-local (the day comes from the host's `Date` header, not the device clock) |
| 811 badge rules in 180 families, RP = 100 / p, rarity tiers, tie rules | Done; every rule's fixtures are written next to the rule, and `check.html` fails if any badge matches nobody, any record earns none, or two badges share a name |
| Animated reveal, badges appearing worst to best, reduced-motion aware, night-sky theme with a light option | Done |
| 6,022 achievements derived from your rolls, goals scaled to the pool | Done (`achievements.js`) |
| Find any of the 136,980 objects by name and see its badges and odds (a lookup, not a roll) | Done (`#/find`) |
| Badge catalog with kind and family filters, badge pages, levels, history, export, delete, pool page | Done |
| Sign-in, ranked limit, leaderboards, friends | Needs a server. The accounts client is present but switched off (`account-config.js`). The roll function would need a lazy variant for this pool: see Server below |

## Run it

No build step.

```
python -m http.server 8783
```

Open <http://localhost:8783>. The first visit downloads the pool (16.6 MB, about 4 MB gzipped) and scores every record in the browser, about 2 seconds on a laptop; a progress message shows while it loads. Open `/check.html` for the self-check; its title becomes `PASS` or `FAIL n` (about 3,300 checks).

## How it is organised

- `engine.js`, `achievements.js`, `app.js`, `account*.js`, `style.css` are the shared RNG-game files. Changes here for this game: rules may name the `kinds` they apply to (so a hundred-thousand-record pool scores in about a second), awards are computed on demand, achievement shelf keys are shared strings, the pool downloads with a progress message, and `site.expand` unpacks a compact pool.
- `rules.js` joins `kinds/asteroid.js`, `comet.js`, `exoplanet.js`, `star.js`, `satellite.js`, `rocket.js`, `feature.js` and `deepsky.js`. Each kind file holds its badge rules **and their fixtures** (built with the small helpers in `kinds/kit.js`, which write the boundary, missing and malformed cases for every threshold), its record preparation, and its presentation (facts, shelves, generated drawing).
- `site.js` joins the kinds' presentations. `fixtures.js` gathers the cases and holds the pool checks. `space.css` is the night-sky skin.
- `data/pool-v1.json` is one object per line: `[kind code, ...fields]`, with each kind's field list in `meta.kinds` (so 137,000 records stay 16.6 MB). `tools/fetch_raw.py` and `tools/fetch_deepsky.py` download the raw catalogs politely, `tools/build_pool.py` converts them, `tools/test_import.py` checks the parsing helpers (padded GCAT numbers, vague dates, the thinning).

## Rebuilding the pool

```
python -I tools/fetch_raw.py raw
python -I tools/fetch_deepsky.py raw
python -I tools/build_pool.py raw ../cometrng/data/pool-v1.json
python -I tools/test_import.py
```

A new snapshot changes the pool; a new kind goes last in `ORDER` so every earlier record keeps its index, and `site.store` is bumped (it is `v2` since deep-sky objects joined) because every score changes with the pool size. Bump `site.store` so saved rolls, which hold indexes into the old pool, are not read against the new one.

## Server (for later)

`rng-accounts` decides a ranked roll on the server by scoring the whole pool inside an Edge Function. For this pool that holds about 110 MB of heap once loaded for the first 129,000 records (measured in a browser) plus the transient copies made while parsing a 16.6 MB file: close to a 256 MB function limit and not measured on Supabase, so it should not be relied on. The safer design is to precompute at build time the per-badge counts and the sorted score table, ship the pool as one JSON line per record, and parse and score only the drawn record. Nothing is switched on until that is done and the owner steps in `rng-accounts/SETUP.md` are finished.

## Privacy

No accounts, cookies, analytics or tracking. Rolls stay in the browser's local storage; export or delete them on My rolls. GitHub Pages, which hosts the site, may log requests under GitHub's own privacy policy.

## Publishing

`bash scripts/publish_pages.sh` from the `rngdle-site-builder` skill commits, creates the public repository, enables Pages from `main` and fetches the live URL.
