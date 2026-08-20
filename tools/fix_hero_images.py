# -*- coding: utf-8 -*-
"""Second pass: force the 48 district hero photos (and a few known mismatches)
to exact Wikipedia articles, so the big images are always the right place."""
import json, os, urllib.parse, urllib.request, time

HERE = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(HERE, '..', 'src', 'main', 'resources', 'static', 'data', 'content.json')
UA = {'User-Agent': 'BharatYatra360/1.0 (SIH prototype)'}

HERO = {
 "Andaman and Nicobar Islands|South Andaman": "Cellular Jail",
 "Andhra Pradesh|Chittoor": "Venkateswara Temple, Tirumala",
 "Arunachal Pradesh|Tawang": "Tawang Monastery",
 "Assam|Kamrup Metropolitan": "Kamakhya Temple",
 "Assam|Majuli": "Majuli",
 "Bihar|Gaya": "Mahabodhi Temple",
 "Bihar|Nalanda": "Nalanda mahavihara",
 "Chhattisgarh|Bastar": "Chitrakote Falls",
 "Delhi|New Delhi": "Humayun's Tomb",
 "Goa|North Goa": "Basilica of Bom Jesus",
 "Gujarat|Kachchh": "Rann of Kutch",
 "Gujarat|Patan": "Rani ki vav",
 "Himachal Pradesh|Kangra": "McLeod Ganj",
 "Jammu and Kashmir|Srinagar": "Dal Lake",
 "Jharkhand|Ranchi": "Hundru Falls",
 "Karnataka|Ballari (Bellary)": "Hampi",
 "Karnataka|Mysuru (Mysore)": "Mysore Palace",
 "Kerala|Alappuzha": "Alappuzha",
 "Kerala|Ernakulam": "Fort Kochi",
 "Ladakh|Leh": "Thikse Monastery",
 "Madhya Pradesh|Bhopal": "Taj-ul-Masajid",
 "Madhya Pradesh|Chhatarpur": "Khajuraho Group of Monuments",
 "Maharashtra|Aurangabad": "Ajanta Caves",
 "Maharashtra|Mumbai City": "Chhatrapati Shivaji Maharaj Terminus",
 "Manipur|Imphal West": "Loktak Lake",
 "Meghalaya|East Khasi Hills": "Living root bridge",
 "Nagaland|Kohima": "Hornbill Festival",
 "Odisha|Puri": "Konark Sun Temple",
 "Puducherry|Pondicherry": "Puducherry",
 "Punjab|Amritsar": "Golden Temple",
 "Rajasthan|Bikaner": "Junagarh Fort",
 "Rajasthan|Jaipur": "Amber Fort",
 "Rajasthan|Jaisalmer": "Jaisalmer Fort",
 "Rajasthan|Jodhpur": "Mehrangarh",
 "Rajasthan|Udaipur": "City Palace, Udaipur",
 "Sikkim|East Sikkim": "Rumtek Monastery",
 "Tamil Nadu|Madurai": "Meenakshi Temple",
 "Tamil Nadu|Thanjavur": "Brihadisvara Temple, Thanjavur",
 "Telangana|Hyderabad": "Charminar",
 "Telangana|Warangal (Urban)": "Ramappa Temple",
 "Uttar Pradesh|Agra": "Taj Mahal",
 "Uttar Pradesh|Lucknow": "Bara Imambara",
 "Uttar Pradesh|Mathura": "Vrindavan",
 "Uttar Pradesh|Meerut": "Meerut",
 "Uttar Pradesh|Varanasi": "Dashashwamedh Ghat",
 "Uttarakhand|Haridwar": "Har Ki Pauri",
 "West Bengal|Darjeeling": "Darjeeling Himalayan Railway",
 "West Bengal|Kolkata": "Victoria Memorial, Kolkata",
}

# state banner photos
STATE = {
 "Uttar Pradesh": "Taj Mahal", "Rajasthan": "Hawa Mahal", "Kerala": "Kerala backwaters",
 "Tamil Nadu": "Meenakshi Temple", "Karnataka": "Hampi", "Maharashtra": "Ellora Caves",
 "West Bengal": "Victoria Memorial, Kolkata", "Gujarat": "Rani ki vav",
 "Madhya Pradesh": "Khajuraho Group of Monuments", "Odisha": "Konark Sun Temple",
 "Bihar": "Mahabodhi Temple", "Punjab": "Golden Temple", "Himachal Pradesh": "Spiti Valley",
 "Uttarakhand": "Valley of Flowers National Park", "Delhi": "India Gate", "Goa": "Basilica of Bom Jesus",
 "Assam": "Kaziranga National Park", "Meghalaya": "Nohkalikai Falls",
 "Jammu and Kashmir": "Dal Lake", "Ladakh": "Pangong Tso", "Telangana": "Charminar",
 "Andhra Pradesh": "Venkateswara Temple, Tirumala", "Chhattisgarh": "Chitrakote Falls",
 "Jharkhand": "Hundru Falls", "Sikkim": "Kangchenjunga", "Nagaland": "Hornbill Festival",
 "Manipur": "Loktak Lake", "Mizoram": "Aizawl", "Tripura": "Ujjayanta Palace",
 "Arunachal Pradesh": "Tawang Monastery", "Haryana": "Kurukshetra", "Puducherry": "Puducherry",
 "Andaman and Nicobar Islands": "Radhanagar Beach", "Lakshadweep": "Lakshadweep",
 "Chandigarh": "Rock Garden of Chandigarh", "Dadra and Nagar Haveli": "Silvassa",
 "Daman and Diu": "Diu Fort",
}


def by_title(title):
    url = ('https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail'
           '&pithumbsize=1400&format=json&redirects=1&titles=' + urllib.parse.quote(title))
    for _ in range(4):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30)
            d = json.load(r)
            for p in d.get('query', {}).get('pages', {}).values():
                src = (p.get('thumbnail') or {}).get('source', '')
                if src:
                    return src.split('?')[0]
            return ''
        except Exception:
            time.sleep(3)
    return ''


def main():
    pass_delay = 0.35
    data = json.load(open(CONTENT, encoding='utf-8'))
    ok = 0
    for key, title in HERO.items():
        if key not in data['districts']:
            print('  ! unknown key', key); continue
        time.sleep(pass_delay)
        u = by_title(title)
        if u:
            data['districts'][key]['hero'] = u
            data['districts'][key]['heroCredit'] = title + ' — Wikimedia Commons'
            ok += 1
        else:
            print('  ! no image for', title)
    for st, title in STATE.items():
        if st in data['states']:
            time.sleep(pass_delay)
            u = by_title(title)
            if u:
                data['states'][st]['img'] = u
    # the first monument of each district should show the hero if it had none
    for key, d in data['districts'].items():
        for m in d['monuments']:
            if not m.get('img'):
                m['img'] = d.get('hero', '')
    json.dump(data, open(CONTENT, 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    print('heroes set', ok, '/', len(HERO), 'bytes', os.path.getsize(CONTENT))


if __name__ == '__main__':
    main()
