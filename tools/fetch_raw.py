#!/usr/bin/env python3
"""Download the raw catalogs build_pool.py needs into one folder. Polite: one request at a time with pauses, a descriptive User-Agent,
and nothing is fetched twice. Each source states its terms on its own site; see the README for what Spacedle keeps and credits.

Usage: python -I tools/fetch_raw.py <raw dir>
  ast_{named,neo,tno,centaur}.json   NASA/JPL Small-Body Database query API (https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html)
  exo.json                           NASA Exoplanet Archive TAP service, table pscomppars
  usgs/<BODY>_nomenclature_center_pts.zip   USGS Gazetteer of Planetary Nomenclature shapefile tables (one per body)
  gcat_satcat.tsv, gcat_orgs.tsv     GCAT by Jonathan McDowell (CC BY 4.0)
The comet pool is not fetched here: build_pool.py reads the CometRNG snapshot, which is the same JPL comet query.
"""
import json
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request

UA = 'Spacedle-fan-prototype/0.1 (https://github.com/sharkjujg/spacedle)'
SBDB = 'https://ssd-api.jpl.nasa.gov/sbdb_query.api'
FIELDS = 'full_name,pdes,name,prefix,class,neo,pha,sats,H,diameter,extent,albedo,rot_per,GM,spec_B,spec_T,e,a,q,ad,i,per_y,moid,first_obs,last_obs,data_arc,n_obs_used,condition_code'
EXO_COLS = 'pl_name,hostname,disc_year,discoverymethod,disc_facility,pl_orbper,pl_rade,pl_bmasse,pl_eqt,pl_orbsmax,pl_orbeccen,pl_insol,sy_dist,sy_pnum,sy_snum,st_spectype,st_teff,st_rad,st_mass,st_met,st_age,sy_vmag,sy_kmag,ra,dec'


def get(url, timeout=300):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=timeout) as r:
        return r.read()


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def main(raw):
    raw = pathlib.Path(raw)
    raw.mkdir(parents=True, exist_ok=True)
    subsets = {'named': {'sb-cdata': json.dumps({'AND': ['name|DF']})}, 'neo': {'sb-group': 'neo'}, 'tno': {'sb-class': 'TNO'}, 'centaur': {'sb-class': 'CEN'}}
    for key, extra in subsets.items():
        out = raw / f'ast_{key}.json'
        if not out.exists():
            out.write_bytes(get(f'{SBDB}?' + urllib.parse.urlencode({'fields': FIELDS, 'sb-kind': 'a', **extra})))
            log('asteroids', key, json.loads(out.read_bytes()).get('count'))
            time.sleep(3)
    out = raw / 'exo.json'
    if not out.exists():
        out.write_bytes(get('https://exoplanetarchive.ipac.caltech.edu/TAP/sync?' + urllib.parse.urlencode({'query': f'select {EXO_COLS} from pscomppars', 'format': 'json'})))
        log('exoplanets', len(json.loads(out.read_bytes())))
        time.sleep(3)
    page = get('https://planetarynames.wr.usgs.gov/GIS_Downloads').decode('utf-8', errors='replace')
    links = sorted(set(re.findall(r'href="(https://asc-planetarynames-data\.s3[^"]+_nomenclature_center_pts\.zip)"', page)))
    log('USGS body files', len(links))
    (raw / 'usgs').mkdir(exist_ok=True)
    for u in links:
        out = raw / 'usgs' / u.rsplit('/', 1)[1]
        if not out.exists():
            try:
                out.write_bytes(get(u, 120))
                log('usgs', out.name, out.stat().st_size)
            except Exception as e:  # one body failing should not stop the rest; rerun to retry it
                log('usgs FAILED', out.name, e)
            time.sleep(1)
    for name, url in (('gcat_satcat.tsv', 'https://planet4589.org/space/gcat/tsv/cat/satcat.tsv'), ('gcat_orgs.tsv', 'https://planet4589.org/space/gcat/tsv/tables/orgs.tsv')):
        if not (raw / name).exists():
            (raw / name).write_bytes(get(url))
            log('gcat', name)
            time.sleep(2)
    log('done')


if __name__ == '__main__':
    main(sys.argv[1])
