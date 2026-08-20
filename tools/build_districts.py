import json, re, os
raw = json.load(open('/tmp/districts_raw.json'))
RENAME = {
    'Allahabad': 'Prayagraj (Allahabad)',
    'Faizabad': 'Ayodhya (Faizabad)',
}

def fix(s):
    s = s.replace('&amp;', '&').replace('&nbsp;', ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    return RENAME.get(s, s)

clean = {}
for k, v in raw.items():
    name = re.sub(r'\s*\((UT|NCT)\)$', '', k).strip()
    clean[name] = sorted(set(fix(x) for x in v))

clean['Andaman and Nicobar Islands'] = ['Nicobar', 'North and Middle Andaman', 'South Andaman']
clean['Ladakh'] = ['Kargil', 'Leh']
jk = [d for d in clean.get('Jammu and Kashmir', []) if d not in ('Kargil', 'Leh')]
clean['Jammu and Kashmir'] = jk

out = dict(sorted(clean.items()))
p = os.path.join(os.path.dirname(__file__), '..', 'src', 'main', 'resources', 'static', 'data', 'districts.json')
json.dump(out, open(p, 'w'), separators=(',', ':'), ensure_ascii=False)
print('states', len(out), 'districts', sum(len(v) for v in out.values()))
