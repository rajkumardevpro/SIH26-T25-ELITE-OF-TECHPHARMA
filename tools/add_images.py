# -*- coding: utf-8 -*-
"""Resolves a real photograph for every curated item from Wikipedia/Wikimedia
Commons (CC-licensed) and bakes the URLs into content.json.

Run:  python3 tools/add_images.py
Cache lives in tools/imgcache.json so re-runs are instant and offline-safe.
"""
import json, os, re, urllib.parse, urllib.request, concurrent.futures as cf

HERE = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(HERE, '..', 'src', 'main', 'resources', 'static', 'data', 'content.json')
CACHE = os.path.join(HERE, 'imgcache.json')
UA = {'User-Agent': 'BharatYatra360/1.0 (SIH prototype; contact: team@bharatyatra.in)'}

cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}


import time, threading
_lock = threading.Lock()


def lookup(term):
    if term in cache:
        return cache[term]
    url = ('https://en.wikipedia.org/w/api.php?action=query&generator=search'
           '&gsrsearch=' + urllib.parse.quote(term) +
           '&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=1000&format=json')
    for attempt in range(4):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30)
            d = json.load(r)
            src = ''
            for pg in d.get('query', {}).get('pages', {}).values():
                src = (pg.get('thumbnail') or {}).get('source', '') or ''
            src = src.split('?')[0]
            with _lock:
                cache[term] = src          # cache only real answers
            return src
        except Exception:
            time.sleep(1.2 * (attempt + 1))
    return ''


def clean(s):
    s = re.sub(r'\([^)]*\)', ' ', s)
    s = s.replace('&', ' and ')
    return re.sub(r'\s+', ' ', s).strip()


def main():
    data = json.load(open(CONTENT, encoding='utf-8'))
    terms = []

    def add(t):
        if t and t not in terms:
            terms.append(t)

    for state, s in data['states'].items():
        add(clean(state) + ' India heritage')

    for key, d in data['districts'].items():
        st, di = key.split('|')
        add(clean(d['monuments'][0]['n']) + ' ' + clean(di))
        for m in d['monuments']:
            add(clean(m['n']) + ' ' + clean(st))
        for f in d['festivals']:
            add(clean(f['n']) + ' festival ' + clean(st))
        for f in d['food']:
            add(clean(f['n']) + ' Indian food')
        for c in d['crafts']:
            add(clean(c) + ' craft India')
        for h in d['hidden']:
            add(clean(h['n']) + ' ' + clean(st))

    for k in [k for k, v in list(cache.items()) if not v]:
        cache.pop(k)                      # retry previous failures
    todo = [t for t in terms if t not in cache]
    print('terms', len(terms), 'to fetch', len(todo))
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        for i, _ in enumerate(ex.map(lookup, todo)):
            if i % 50 == 0:
                print(' ', i, '/', len(todo))
    json.dump(cache, open(CACHE, 'w'), indent=0)

    hit = 0; miss = 0

    def img(t):
        nonlocal hit, miss
        u = cache.get(t, '')
        if u: hit += 1
        else: miss += 1
        return u

    for state, s in data['states'].items():
        s['img'] = img(clean(state) + ' India heritage')

    for key, d in data['districts'].items():
        st, di = key.split('|')
        d['hero'] = img(clean(d['monuments'][0]['n']) + ' ' + clean(di)) \
            or img(clean(d['monuments'][0]['n']) + ' ' + clean(st))
        for m in d['monuments']:
            m['img'] = img(clean(m['n']) + ' ' + clean(st))
        for f in d['festivals']:
            f['img'] = img(clean(f['n']) + ' festival ' + clean(st))
        for f in d['food']:
            f['img'] = img(clean(f['n']) + ' Indian food')
        d['craftImgs'] = [img(clean(c) + ' craft India') for c in d['crafts']]
        for h in d['hidden']:
            h['img'] = img(clean(h['n']) + ' ' + clean(st))

    json.dump(data, open(CONTENT, 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    print('images found', hit, 'missing', miss,
          'bytes', os.path.getsize(CONTENT))


if __name__ == '__main__':
    main()
