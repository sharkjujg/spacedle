#!/usr/bin/env python3
"""Download the deep-sky objects: every Wikidata item that has a New General Catalogue (NGC) id, with its type, brightness, constellation,
distance, discoverer and discovery date. Wikidata's structured data is CC0. One service, polite pauses, queries in ranges of NGC numbers so
none times out; rows are written as they are fetched and a range already on disk is not fetched again.

Usage: python -I tools/fetch_deepsky.py <raw dir>   (writes <raw dir>/deepsky.json)
"""
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request

UA = 'Spacedle-fan-prototype/0.1 (https://github.com/sharkjujg/spacedle)'
STEP = 500
QUERY = '''SELECT ?x ?id ?xLabel ?type ?typeLabel ?m ?conLabel ?amt ?unit ?discLabel ?date ?z ?H ?alias WHERE {
  ?x wdt:P3208 ?id . FILTER(xsd:integer(REPLACE(?id, "[^0-9]", "")) >= %d && xsd:integer(REPLACE(?id, "[^0-9]", "")) < %d)
  OPTIONAL { ?x wdt:P31 ?type } OPTIONAL { ?x wdt:P1215 ?m } OPTIONAL { ?x wdt:P59 ?con }
  OPTIONAL { ?x p:P2583/psv:P2583 [ wikibase:quantityAmount ?amt ; wikibase:quantityUnit ?unit ] }
  OPTIONAL { ?x wdt:P61 ?disc } OPTIONAL { ?x wdt:P575 ?date } OPTIONAL { ?x wdt:P1090 ?z } OPTIONAL { ?x wdt:P1457 ?H }
  OPTIONAL { ?x skos:altLabel ?alias . FILTER(LANG(?alias) = "en" && REGEX(?alias, "^M ?[0-9]+$")) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}'''


def run(a, b):
    url = 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': QUERY % (a, b), 'format': 'json'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/sparql-results+json'}), timeout=120) as r:
                return [{k: v['value'] for k, v in row.items()} for row in json.load(r)['results']['bindings']]
        except Exception as e:  # Wikidata sometimes answers 429/504 under load: wait and retry
            print('retry', a, attempt, str(e)[:80], flush=True)
            time.sleep(10 * (attempt + 1))
    raise SystemExit(f'range {a}-{b} failed')


def main(raw):
    out = pathlib.Path(raw) / 'deepsky.json'
    done = json.loads(out.read_text(encoding='utf-8')) if out.exists() else {}
    for a in range(0, 8000, STEP):
        if str(a) in done:
            continue
        done[str(a)] = run(a, a + STEP)
        out.write_text(json.dumps(done, ensure_ascii=False), encoding='utf-8')
        print('NGC', a, len(done[str(a)]), 'rows', flush=True)
        time.sleep(4)
    print('done', sum(len(v) for v in done.values()), 'rows')


if __name__ == '__main__':
    main(sys.argv[1])
