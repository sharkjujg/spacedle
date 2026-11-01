#!/usr/bin/env python3
"""Build data/pool-v1.json from the catalogs fetch_raw.py downloaded. One pool, seven kinds of real thing in space:

  asteroid   NASA/JPL Small-Body Database: every named asteroid, near-Earth asteroid, trans-Neptunian object and Centaur
  comet      NASA/JPL Small-Body Database: every comet with an orbit (cometrng's snapshot, same query)
  exoplanet  NASA Exoplanet Archive (Planetary Systems Composite Parameters)
  star       the host stars of those planets, same archive
  satellite  J. McDowell's GCAT: every cataloged payload (near-identical swarms capped, see cap_series)
  rocket     GCAT: cataloged rocket bodies, same cap
  feature    USGS Gazetteer of Planetary Nomenclature: every IAU-approved named feature on 50 solar-system bodies

Rows are arrays (the kind's schema is in meta.kinds) so 130,000 records stay a few megabytes. A value a catalog lacks is
null and never satisfies a badge. Usage: python -I tools/build_pool.py <raw dir> <cometrng pool-v1.json>
"""
import collections
import datetime as dt
import glob
import json
import os
import pathlib
import re
import struct
import sys
import zipfile

MONTHS = {m: i + 1 for i, m in enumerate('Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split())}
CAP = 25      # most near-identical spacecraft kept from one series (same name stem, maker and bus)
CAP_OVER = 60  # a series needs more members than this before the cap applies

SCHEMA = {  # kind -> (code, fields). Order is the row layout; trailing nulls are trimmed.
    'asteroid': ('a', ['id', 'name', 'diameter', 'H', 'albedo', 'spin', 'a', 'e', 'i', 'moid', 'class', 'flags', 'sats', 'spec', 'seen', 'arc', 'obs', 'cond', 'GM']),
    'comet': ('c', ['id', 'name', 'prefix', 'number', 'class', 'e', 'q', 'i', 'a', 'moid', 'mag', 'first', 'last', 'arc', 'obs', 'cond']),
    'exoplanet': ('p', ['id', 'host', 'year', 'method', 'facility', 'period', 'radius', 'mass', 'eqt', 'sma', 'ecc', 'insol', 'dist', 'pnum', 'snum']),
    'star': ('s', ['id', 'year', 'pnum', 'snum', 'sptype', 'teff', 'rad', 'smass', 'met', 'age', 'vmag', 'kmag', 'dist', 'ra', 'dec']),
    'satellite': ('t', ['id', 'name', 'piece', 'launch', 'decay', 'status', 'state', 'owner', 'maker', 'bus', 'mass', 'dmass', 'length', 'diam', 'span', 'shape', 'perigee', 'apogee', 'inc', 'orbit']),
    'rocket': ('r', ['id', 'name', 'piece', 'launch', 'decay', 'status', 'state', 'owner', 'maker', 'mass', 'length', 'diam', 'perigee', 'apogee', 'inc', 'orbit']),
    'feature': ('f', ['id', 'body', 'name', 'ftype', 'diameter', 'lat', 'year', 'eth', 'cont', 'origin', 'fid']),
}
ORDER = ['asteroid', 'comet', 'exoplanet', 'star', 'satellite', 'rocket', 'feature']


def sig(x, n=4):
    """A float to n significant digits (whole numbers stay ints). Not a number, or non-finite: None."""
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if v != v or v in (float('inf'), float('-inf')):
        return None
    v = float(f'{v:.{n}g}')
    return int(v) if v == int(v) and abs(v) < 1e15 else v


def fixed(x, d):
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return round(v, d) if v == v else None


def whole(x):
    v = sig(x, 9)
    return None if v is None else int(round(v))


def lead_number(s):
    """GCAT numbers carry flags and padding: '   7790 ', '28.0', '?', '-'. Returns the leading number or None."""
    m = re.match(r'\s*(-?\d+(?:\.\d+)?)', s or '')
    return float(m.group(1)) if m else None


def vague_date(s):
    """GCAT vague dates: '1957 Oct  4', '1957 Oct  4 1933?', '1958 Jan', '1960'. Returns (iso date or year string or None, year)."""
    m = re.match(r'\s*(\d{4})(?:\s+([A-Z][a-z]{2})(?:\s+(\d{1,2}))?)?', s or '')
    if not m:
        return None, None
    y, mo, d = int(m.group(1)), MONTHS.get(m.group(2) or ''), int(m.group(3) or 0)
    return (f'{y:04d}-{mo:02d}-{d:02d}' if mo and d else f'{y:04d}'), y


def stem(name):
    return re.sub(r'[\s\-]*[0-9]+[A-Za-z]?$', '', name).strip() or name


def cap_series(rows, key_of, sort_of):
    """Keep every record, except that a series of near-identical spacecraft (same name stem, maker and bus, more than CAP_OVER of them)
    is thinned to CAP records spread evenly through its launch history, so one constellation cannot fill the pool."""
    groups = collections.defaultdict(list)
    for r in rows:
        groups[key_of(r)].append(r)
    keep, dropped = [], collections.Counter()
    for k, g in groups.items():
        if len(g) <= CAP_OVER:
            keep += g
            continue
        g.sort(key=sort_of)
        pick = {round(i * (len(g) - 1) / (CAP - 1)) for i in range(CAP)}
        keep += [r for i, r in enumerate(g) if i in pick]
        dropped[k] = len(g) - len(pick)
    return keep, dropped


# ---- minimal dBase III/IV reader for the USGS shapefile tables ----
def read_dbf(data):
    n, hdr_len, rec_len = struct.unpack('<xxxxIHH', data[:12])
    fields, pos = [], 32
    while data[pos] != 0x0D:
        fields.append((data[pos:pos + 11].split(b'\0')[0].decode('latin-1'), data[pos + 16]))
        pos += 32
    rows = []
    for i in range(n):
        rec = data[hdr_len + i * rec_len: hdr_len + (i + 1) * rec_len]
        if rec[:1] == b'*':
            continue
        off, row = 1, {}
        for name, flen in fields:
            row[name] = rec[off:off + flen].decode('utf-8', errors='replace').strip()
            off += flen
        rows.append(row)
    return rows


def tsv(path):
    lines = open(path, encoding='utf-8', errors='replace').read().split('\n')
    cols = lines[0].lstrip('#').split('\t')
    return [dict(zip(cols, (c.strip() for c in l.split('\t')))) for l in lines[1:] if l.strip() and not l.startswith('#')]


# ---- kinds ----
def asteroids(raw):
    union = {}
    for key in ('named', 'neo', 'tno', 'centaur'):
        d = json.load(open(f'{raw}/ast_{key}.json', encoding='utf-8'))
        for row in d['data']:
            r = dict(zip(d['fields'], row))
            union.setdefault(r['pdes'], r)
    out = []
    for pdes, r in union.items():
        seen = (r['first_obs'] or '')[:4]
        cond = r['condition_code']
        out.append([pdes, (r['name'] or '').strip() or None, sig(r['diameter']), fixed(r['H'], 2), sig(r['albedo'], 3), sig(r['rot_per']), sig(r['a']), sig(r['e']), sig(r['i']),
                    sig(r['moid']), r['class'], (1 if r['neo'] == 'Y' else 0) + (2 if r['pha'] == 'Y' else 0) or None, r['sats'] or None,
                    (r['spec_B'] or r['spec_T'] or None), int(seen) if seen.isdigit() else None, whole(r['data_arc']), r['n_obs_used'],
                    int(cond) if cond and cond.isdigit() else None, sig(r['GM'], 3)])
    out.sort(key=lambda x: (0, int(x[0]), '') if x[0].isdigit() else (1, 0, x[0]))
    return out


def comets(path):
    ms = json.load(open(path, encoding='utf-8'))['members']
    return [[m['id'], m['name'], m['prefix'], m['number'], m['class'], m['e'], m['q'], m['i'], m['a'], m['moid'], m['mag'], m['first'], m['last'],
             m['arc'], m['obs'], int(m['cond']) if m['cond'] and str(m['cond']).isdigit() else None] for m in ms]


def exo(raw):
    rows = json.load(open(f'{raw}/exo.json', encoding='utf-8'))
    planets = sorted(([r['pl_name'], r['hostname'], r['disc_year'], r['discoverymethod'], r['disc_facility'], sig(r['pl_orbper'], 6), sig(r['pl_rade']), sig(r['pl_bmasse']),
                       sig(r['pl_eqt']), sig(r['pl_orbsmax']), sig(r['pl_orbeccen']), sig(r['pl_insol']), sig(r['sy_dist']), r['sy_pnum'], r['sy_snum']] for r in rows), key=lambda x: x[0])
    by = collections.defaultdict(list)
    for r in rows:
        by[r['hostname']].append(r)
    first = lambda rs, f: next((r[f] for r in rs if r[f] not in (None, '')), None)
    stars = sorted(([h, min(r['disc_year'] for r in rs), max(r['sy_pnum'] for r in rs), first(rs, 'sy_snum'), (first(rs, 'st_spectype') or '').strip() or None, sig(first(rs, 'st_teff')),
                     sig(first(rs, 'st_rad')), sig(first(rs, 'st_mass')), sig(first(rs, 'st_met'), 3), sig(first(rs, 'st_age'), 3), sig(first(rs, 'sy_vmag'), 4), sig(first(rs, 'sy_kmag'), 4),
                     sig(first(rs, 'sy_dist')), fixed(first(rs, 'ra'), 2), fixed(first(rs, 'dec'), 2)] for h, rs in by.items()), key=lambda x: x[0])
    return planets, stars


def gcat(raw):
    orgs = {o['Code']: o for o in tsv(f'{raw}/gcat_orgs.tsv')}

    def name_of(code):
        o = orgs.get(code)
        if not o or not code or code == '-':
            return None
        for f in ('ShortEName', 'EName', 'ShortName', 'Name'):
            if o.get(f) and o[f] != '-':
                return o[f]
        return code

    cat = tsv(f'{raw}/gcat_satcat.tsv')
    sat, rb = [], []
    for r in cat:
        t = r['Type'][:1]
        if t not in 'PR':
            continue
        launch, ly = vague_date(r['LDate'])
        decay, dy = vague_date(r['DDate'])
        if ly is None:
            continue
        name = r['Name'] or r['PLName']
        if not name or name == '-':
            continue
        shape = r['Shape'] if r['Shape'] not in ('', '-', '?') else None
        orbit = r['OpOrbit'] if r['OpOrbit'] not in ('', '-') else None
        common = dict(id=r['JCAT'], name=name, piece=r['Piece'] or None, launch=launch, decay=dy, status=r['Status'] or None,
                      state=name_of(r['State']), owner=name_of(r['Owner']), maker=name_of(r['Manufacturer']), bus=r['Bus'] if r['Bus'] not in ('', '-') else None,
                      mass=lead_number(r['Mass']), dmass=lead_number(r['DryMass']), length=lead_number(r['Length']), diam=lead_number(r['Diameter']), span=lead_number(r['Span']), shape=shape,
                      perigee=lead_number(r['Perigee']), apogee=lead_number(r['Apogee']), inc=lead_number(r['Inc']), orbit=orbit, _key=(stem(name), r['Manufacturer'], r['Bus']))
        (sat if t == 'P' else rb).append(common)
    outs = []
    for rows, kind in ((sat, 'satellite'), (rb, 'rocket')):
        keep, dropped = cap_series(rows, lambda r: r['_key'], lambda r: (r['launch'] or '', r['id']))
        keep.sort(key=lambda r: r['id'])
        fields = SCHEMA[kind][1]
        outs.append(([[ (sig(r[f]) if f in ('mass', 'dmass', 'length', 'diam', 'span', 'perigee', 'apogee', 'inc') else r[f]) for f in fields] for r in keep], dropped))
    return outs


def features(raw):
    out = []
    for path in sorted(glob.glob(f'{raw}/usgs/*.zip')):
        body = os.path.basename(path).split('_nomenclature')[0].title()
        z = zipfile.ZipFile(path)
        for r in read_dbf(z.read([n for n in z.namelist() if n.lower().endswith('.dbf')][0])):
            name = r['clean_name'] or r['name']
            if not name:
                continue
            ftype = re.sub(r',.*$', '', r['type']).strip() or None
            year = r['approvaldt'][:4]
            out.append([None, body, name, ftype, sig(r['diameter']), fixed(r['center_lat'], 2), int(year) if year.isdigit() else None, r['ethnicity'] or None, r['continent'] or None, (r['origin'] or '')[:160] or None, int(m.group(1)) if (m := re.search(r'/Feature/(\d+)', r.get('link', ''))) else None])
    out.sort(key=lambda x: (x[1], x[2], x[3] or ''))
    seen = collections.Counter()
    for x in out:
        k = f'{x[1]}/{x[2]}'
        seen[k] += 1
        x[0] = k if seen[k] == 1 else f'{k}~{seen[k]}'
    return out


def trim(row):
    while row and row[-1] is None:
        row.pop()
    return row


def main(raw, comet_pool):
    parts = {'asteroid': asteroids(raw), 'comet': comets(comet_pool)}
    parts['exoplanet'], parts['star'] = exo(raw)
    (parts['satellite'], sd), (parts['rocket'], rd) = gcat(raw)
    parts['feature'] = features(raw)
    members, counts = [], {}
    for kind in ORDER:
        code, fields = SCHEMA[kind]
        ids = [r[0] for r in parts[kind]]
        assert len(ids) == len(set(ids)), f'duplicate ids in {kind}'
        counts[kind] = len(ids)
        members += [[code] + trim(list(r)) for r in parts[kind]]
    n = len(members)
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    cov = {}
    for kind in ORDER:
        code, fields = SCHEMA[kind]
        rows = parts[kind]
        for j, f in enumerate(fields):
            known = sum(1 for r in rows if r[j] is not None)
            cov[f'{kind}.{f}'] = 'known' if known == len(rows) else f'known for {known:,} of {len(rows):,}; unknown never satisfies a badge'
    meta = {
        'version': 'v1', 'publishedAt': today, 'capturedAt': today,
        'source': 'NASA/JPL Small-Body Database, NASA Exoplanet Archive, GCAT (J. McDowell), USGS Gazetteer of Planetary Nomenclature',
        'provenance': f'Snapshot taken {today} by tools/fetch_raw.py and tools/build_pool.py. Asteroid and comet data courtesy of NASA/JPL-Caltech; exoplanet and host-star data from the NASA Exoplanet Archive; '
                      'satellite and rocket data from GCAT: McDowell, Jonathan C., 2020, General Catalog of Artificial Space Objects, Release 1.8.8, planet4589.org/space/gcat (CC BY 4.0); feature names from the USGS/IAU Gazetteer of Planetary Nomenclature.',
        'selection': f'{counts["asteroid"]:,} asteroids (every named one, every near-Earth asteroid, trans-Neptunian object and Centaur); {counts["comet"]:,} comets; {counts["exoplanet"]:,} confirmed exoplanets and the '
                     f'{counts["star"]:,} stars that host them; {counts["satellite"]:,} cataloged payloads and {counts["rocket"]:,} rocket bodies (series of near-identical spacecraft thinned to {CAP}: '
                     f'{sum(sd.values()):,} payloads and {sum(rd.values()):,} rocket bodies left out); {counts["feature"]:,} IAU-approved named features on 50 bodies.',
        'counts': counts,
        'kinds': {code: {'kind': kind, 'fields': fields} for kind, (code, fields) in SCHEMA.items()},
        'fieldStatus': cov,
    }
    lines = ',\n'.join('  ' + json.dumps(m, ensure_ascii=False, separators=(',', ':')) for m in members)
    text = '{"meta":' + json.dumps(meta, ensure_ascii=False) + ',\n"members":[\n' + lines + '\n]}\n'
    path = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'pool-v1.json'
    path.parent.mkdir(exist_ok=True)
    path.write_bytes(text.encode('utf-8'))
    print(f'wrote {path}: {n:,} records, {len(text) / 1e6:.1f} MB', counts, 'capped:', dict(sd.most_common(6)), dict(rd.most_common(4)), flush=True)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
