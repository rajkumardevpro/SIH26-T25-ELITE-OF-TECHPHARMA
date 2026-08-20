/* ------------------------------------------------------------------
   ai-art.js — locally stored, AI-generated artwork.

   Why this exists: Wikimedia photos need internet and don't exist for
   every district. These illustrations ship inside the app, so the UI is
   never empty and never depends on a network. They are always labelled
   as illustrations — a painting of "a South Indian temple town" is never
   passed off as a photograph of a specific monument.
------------------------------------------------------------------- */
const AI = {
  dir: 'img/ai/',

  /* full-screen backdrops that crossfade behind the 3D map */
  bg: [
    { f: 'hero-wide.jpg', c: 'Himalaya to the coral coast' },
    { f: 'bg-1.jpg', c: 'Mughal marble at dawn' },
    { f: 'bg-2.jpg', c: 'A desert fort at dusk' },
    { f: 'bg-3.jpg', c: 'Backwaters at blue hour' },
    { f: 'bg-4.jpg', c: 'A Himalayan monastery' },
    { f: 'bg-5.jpg', c: 'A temple town at sunset' },
    { f: 'bg-6.jpg', c: 'Root bridges of the Northeast' }
  ],

  /* one banner per cultural region — every state maps to one */
  region: {
    north:     'banner-north.jpg',
    desert:    'banner-desert.jpg',
    himalaya:  'banner-himalaya.jpg',
    northeast: 'banner-northeast.jpg',
    east:      'banner-east.jpg',
    central:   'banner-central.jpg',
    south:     'banner-south.jpg',
    coast:     'banner-coast.jpg'
  },

  /* last-resort fallback if a banner file is ever missing */
  regionFallback: {
    north: 'bg-1.jpg', desert: 'bg-2.jpg', himalaya: 'bg-4.jpg', northeast: 'bg-6.jpg',
    east: 'bg-1.jpg', central: 'bg-1.jpg', south: 'bg-5.jpg', coast: 'bg-3.jpg'
  },

  stateRegion: {
    'Uttar Pradesh': 'north', 'Bihar': 'north', 'Delhi': 'north', 'Haryana': 'north',
    'Punjab': 'north', 'Chandigarh': 'north',
    'Rajasthan': 'desert', 'Gujarat': 'desert',
    'Dadra and Nagar Haveli': 'desert', 'Daman and Diu': 'coast',
    'Himachal Pradesh': 'himalaya', 'Uttarakhand': 'himalaya',
    'Jammu and Kashmir': 'himalaya', 'Ladakh': 'himalaya', 'Sikkim': 'himalaya',
    'Assam': 'northeast', 'Meghalaya': 'northeast', 'Manipur': 'northeast',
    'Mizoram': 'northeast', 'Nagaland': 'northeast', 'Tripura': 'northeast',
    'Arunachal Pradesh': 'northeast',
    'West Bengal': 'east', 'Odisha': 'east', 'Jharkhand': 'east',
    'Madhya Pradesh': 'central', 'Chhattisgarh': 'central', 'Maharashtra': 'central',
    'Tamil Nadu': 'south', 'Karnataka': 'south', 'Telangana': 'south',
    'Andhra Pradesh': 'south', 'Puducherry': 'south',
    'Kerala': 'coast', 'Goa': 'coast', 'Lakshadweep': 'coast',
    'Andaman and Nicobar Islands': 'coast'
  },

  /* keyword -> illustration, used when a festival / dish / craft has no photo */
  festival: [
    [/holi|colour|color|rang|shigmo|yaoshang/i, 'fest-holi.jpg'],
    [/diwali|deepawali|deepavali|lamp|diya|karthigai|bandi chhor/i, 'fest-lamps.jpg'],
    [/durga|puja|navratri|garba|dasara|dussehra|bonalu|bathukamma|jatara|pooram|rath|yatra|mela|jatra/i, 'fest-procession.jpg'],
    [/bihu|onam|pongal|baisakhi|sankranti|harvest|sarhul|karma|wangala|moatsu|nongkrem|losar|hornbill|sekrenyi|tsechu|cham|torgya|shad|chapchar|sangai|lai haraoba/i, 'fest-folk.jpg'],
    [/boat|vallam|snake boat|nehru trophy|shikara|bali jatra|water festival|teppakulam|float/i, 'fest-boat.jpg'],
    [/mahotsav|utsav|utsavam|samaroh|festival|vizha|literature|film|biennale|carnival|tourism/i, 'fest-procession.jpg'],
    [/shivratri|purnima|ekadasi|navratra|urs|muharram|eid|ramzan|christmas|buddha|magam|aradhana|puja|parba|parab|kut|mela|fair|jatara|brahmotsavam/i, 'fest-lamps.jpg']
  ],
  festivalDefault: 'fest-procession.jpg',
  dish: [
    [/biryani|pulav|pulao|meals|thali|sadya|mahaprasad|wazwan|dham|langar|bhaat|rice|chak-hao|bisi bele|pakhala|khichdi|sangati|jonna|bajra|rotla|roti|litti|bafla|baati|dal|dalma|kadhi|sambar|rasam/i, 'food-thali.jpg'],
    [/kebab|korma|rogan|gosht|mutton|chicken|pork|duck|fish|meen|karimeen|prawn|crab|nihari|haleem|xacuti|vindaloo|laal maas|masor|khar|eromba|axone|smoked/i, 'food-curry.jpg'],
    [/dosa|idli|vada|appam|puttu|paniyaram|parotta|uttapam|pesarattu|neer|kachori|samosa|bhature|kulcha|paratha|puri|bedai|dabeli|vada pav|chaat|puchka|bhel|kathi|momo|thukpa|siddu|pitha|dhuska|chila|jadoh/i, 'food-street.jpg'],
    [/petha|peda|laddu|halwa|barfi|jalebi|rosogolla|mishti|chhena|khaja|thekua|ghewar|mysore pak|bebinca|payasam|kheer|sweet|mithai|tilkut|malaiyo|rabri|modak|puran poli|bal mithai|anarsa|malpua|shrikhand/i, 'food-sweets.jpg'],
    [/lassi|chai|tea|coffee|kahwa|thandai|toddy|feni|apong|zutho|handia|chhaang|jigarthanda|sharbat|juice|butter tea|sulaimani|irani|paal|honey/i, 'food-drink.jpg'],
    [/paan|pak|chutney|pickle|achar|mawa|khoya|holige|kadubu|laru|bati|barfi/i, 'food-sweets.jpg'],
    [/sabzi|subzi|bhaji|saag|greens|mushroom|bamboo|shoot|soybean|tungrymbai|iromba|eromba|gundruk|skyu|thukpa|noodle|zan|puta|bai|galho/i, 'food-curry.jpg']
  ],
  dishDefault: 'food-thali.jpg',
  craftDefault: 'craft-generic.jpg',

  /* --------------------------------------------------------------- api */
  bgUrl(i) { return this.dir + this.bg[i % this.bg.length].f; },

  banner(state) {
    const r = this.stateRegion[state] || 'north';
    return { url: this.dir + this.region[r], alt: this.dir + (this.regionFallback[r] || 'bg-1.jpg'), region: r };
  },

  match(kind, name) {
    const table = this[kind];
    if (!table) return '';
    for (const [re, f] of table) if (re.test(name)) return this.dir + f;
    const def = this[kind + 'Default'];
    return def ? this.dir + def : '';
  }
};
