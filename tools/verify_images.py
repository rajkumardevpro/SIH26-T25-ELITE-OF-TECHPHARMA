# -*- coding: utf-8 -*-
"""Third pass: sanity-check every monument / hidden-gem photo.

If the resolved Wikimedia filename shares no meaningful word with the item's
name, the match is probably wrong, so we retry with the district as context
and finally fall back to the district hero. Keeps obviously-wrong photos
(a Varanasi ghat filed under the Taj Mahal) out of the deck.
"""
import json, os, re, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(HERE, '..', 'src', 'main', 'resources', 'static', 'data', 'content.json')
UA = {'User-Agent': 'BharatYatra360/1.0 (SIH prototype)'}
STOP = {'temple', 'fort', 'the', 'and', 'palace', 'caves', 'cave', 'museum', 'city',
        'village', 'hill', 'hills', 'lake', 'river', 'market', 'gate', 'house', 'park',
        'valley', 'falls', 'tomb', 'tombs', 'monastery', 'church', 'mosque', 'india',
        'indian', 'group', 'complex', 'national', 'great', 'old', 'new', 'sri', 'shri'}


def words(s):
    s = re.sub(r'\([^)]*\)', ' ', s).lower()
    return {w for w in re.findall(r'[a-z]{4,}', s) if w not in STOP}


def search(term):
    url = ('https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch='
           + urllib.parse.quote(term) +
           '&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=1000&format=json')
    for _ in range(4):
        try:
            d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30))
            for p in d.get('query', {}).get('pages', {}).values():
                return p.get('title', ''), (p.get('thumbnail') or {}).get('source', '').split('?')[0]
            return '', ''
        except Exception:
            time.sleep(2)
    return '', ''


def good(name, title, url):
    """does the resolved page actually look like the thing we asked for?"""
    if not url:
        return False
    w = words(name)
    if not w:
        return True
    hay = words(title) | words(urllib.parse.unquote(url.rsplit('/', 1)[-1]))
    return bool(w & hay)


def main():
    data = json.load(open(CONTENT, encoding='utf-8'))
    fixed = dropped = kept = 0
    for key, d in data['districts'].items():
        st, di = key.split('|')
        items = list(d['monuments']) + list(d['hidden'])
        for m in items:
            cur = m.get('img', '')
            if cur and cur == d.get('hero'):
                continue
            if good(m['n'], '', cur):
                kept += 1
                continue
            for term in (m['n'] + ' ' + di, m['n'] + ' ' + st + ' India'):
                title, url = search(term)
                time.sleep(0.25)
                if good(m['n'], title, url):
                    m['img'] = url
                    fixed += 1
                    break
            else:
                m['img'] = d.get('hero', '')     # honest fallback, never a wrong place
                dropped += 1
    json.dump(data, open(CONTENT, 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    print('kept', kept, 'fixed', fixed, 'fell back to hero', dropped)


if __name__ == '__main__':
    main()
