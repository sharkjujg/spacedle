#!/usr/bin/env python3
"""Checks for the parsing helpers in build_pool.py, with inputs copied from the real catalogs. Usage: python -I tools/test_import.py"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import build_pool as b  # noqa: E402

eq = lambda got, want: (got == want) or sys.exit(f'FAIL got {got!r}, want {want!r}')

# significant digits: whole numbers stay ints, junk becomes None
eq(b.sig('939.4012345'), 939.4); eq(b.sig('50.0'), 50); eq(b.sig(None), None); eq(b.sig('nan'), None); eq(b.sig('inf'), None); eq(b.sig('x'), None)
eq(b.sig('0.000123456'), 0.0001235); eq(b.sig('4.02e+08', 6), 402000000)
eq(b.whole('56459.4'), 56459); eq(b.whole(None), None)
# GCAT numbers carry padding and flags
eq(b.lead_number('    7790 '), 7790.0); eq(b.lead_number('28.0'), 28.0); eq(b.lead_number('?'), None); eq(b.lead_number('-'), None); eq(b.lead_number(' -1600 '), -1600.0); eq(b.lead_number(''), None)
# GCAT vague dates
eq(b.vague_date('1957 Oct  4'), ('1957-10-04', 1957)); eq(b.vague_date('1957 Oct  4 1933?'), ('1957-10-04', 1957)); eq(b.vague_date('1958 Jan'), ('1958', 1958))
eq(b.vague_date('1960'), ('1960', 1960)); eq(b.vague_date('-'), (None, None)); eq(b.vague_date(''), (None, None))
# series stems: the name with its trailing serial number removed
eq(b.stem('Starlink-1007'), 'Starlink'); eq(b.stem('Gemini VI-A'), 'Gemini VI-A'); eq(b.stem('Flock 4s'), 'Flock'); eq(b.stem('Kosmos 1234'), 'Kosmos'); eq(b.stem('Delta 4'), 'Delta')
# the cap thins a big series evenly, keeps the first and last, and leaves a small series alone
rows = [{'k': 's', 'launch': f'2020-01-{i % 28 + 1:02d}', 'id': f'S{i:05d}'} for i in range(300)] + [{'k': 'small', 'launch': '2000-01-01', 'id': f'T{i}'} for i in range(b.CAP_OVER)]
keep, dropped = b.cap_series(rows, lambda r: r['k'], lambda r: (r['launch'], r['id']))
eq(sum(1 for r in keep if r['k'] == 's'), b.CAP); eq(sum(1 for r in keep if r['k'] == 'small'), b.CAP_OVER); eq(dropped['s'], 300 - b.CAP); eq('small' in dropped, False)
big = sorted((r for r in rows if r['k'] == 's'), key=lambda r: (r['launch'], r['id']))
kept = {r['id'] for r in keep}
eq(big[0]['id'] in kept and big[-1]['id'] in kept, True)
# trailing nulls are trimmed so a sparse row stays short
eq(b.trim([1, 'a', None, 3, None, None]), [1, 'a', None, 3]); eq(b.trim([None, None]), [])
# the schema: ids first, codes unique, every kind ordered
eq(len({c for c, _ in b.SCHEMA.values()}), len(b.SCHEMA)); eq(all(f[0] == 'id' for _, f in b.SCHEMA.values()), True); eq(sorted(b.ORDER), sorted(b.SCHEMA))
print('all import checks passed')
