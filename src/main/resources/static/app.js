/* ------------------------------------------------------------------
   app.js — router, data layer and all UI rendering for Bharat Yatra
------------------------------------------------------------------- */
let GEO = [], DISTRICTS = {}, CONTENT = { states: {}, districts: {} }, COMMUNITY = [];
let YATRA = JSON.parse(localStorage.getItem('by360.yatra') || '[]');

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* --------------------------------------------------------------- boot */
(async function boot() {
  buildSpokes();
  buildLangSelect();

  const [g, d, c] = await Promise.all([
    fetch('data/india-states.json').then(r => r.json()),
    fetch('data/districts.json').then(r => r.json()),
    fetch('data/content.json').then(r => r.json())
  ]);
  GEO = g; DISTRICTS = d; CONTENT = c;
  await refreshCommunity();
  await loadHealth();

  applyLang();
  renderStats();
  startBackdrop();
  renderHome();

  const ok = Map3D.init($('#stage'), {
    onPick: name => go('#/state/' + encodeURIComponent(name)),
    onHover: name => showTip(name),
    onHoverMove: (x, y) => moveTip(x, y)
  });
  if (ok) {
    Map3D.setGround(AI.dir + 'ground-mandala.jpg');
    const weights = {};
    Object.keys(CONTENT.districts).forEach(k => {
      const s = k.split('|')[0]; weights[s] = (weights[s] || 0) + 1;
    });
    COMMUNITY.forEach(c => { weights[c.state] = (weights[c.state] || 0) + 0.5; });
    Map3D.load(GEO, weights);
  } else {
    $('#maphint').textContent = 'Your browser has no WebGL — use the state list.';
    $('#stage').innerHTML = '<div style="position:absolute;inset:0;display:grid;place-items:center;' +
      'font-size:120px;opacity:.08">🇮🇳</div>';
  }

  window.addEventListener('hashchange', route);
  route();
})();

function buildSpokes() {
  const g = document.getElementById('spokes');
  if (!g) return;
  let s = '';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    s += `<line x1="${50 + Math.cos(a) * 11}" y1="${50 + Math.sin(a) * 11}" x2="${50 + Math.cos(a) * 41}" y2="${50 + Math.sin(a) * 41}"/>`;
  }
  g.innerHTML = s;
}

let SERVER = { lan: '', port: 0 };
async function loadHealth() {
  try { SERVER = await fetch('api/health').then(r => r.json()); } catch (e) { }
}

async function refreshCommunity() {
  try { COMMUNITY = await fetch('api/contributions').then(r => r.json()); }
  catch (e) { COMMUNITY = []; }
}

/* -------------------------------------------------------------- i18n */
function buildLangSelect() {
  $('#langSel').innerHTML = LANGS.map(l =>
    `<option value="${l.code}" ${l.code === LANG ? 'selected' : ''}>${l.label}</option>`).join('');
}
function setLang(code) {
  LANG = code; localStorage.setItem('by360.lang', code);
  applyLang(); route();
}
function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (k === 'h1') return;
    if (STR[LANG] && STR[LANG][k]) el.textContent = STR[LANG][k];
    else if (STR.en[k]) el.textContent = STR.en[k];
  });
  const h1 = document.querySelector('.hero h1');
  if (h1) h1.innerHTML = esc(t('h1a')) + ' <em>' + esc(t('h1b')) + '</em>';
  document.documentElement.lang = LANG;
}

/* ------------------------------------------------------------- stats */
function renderStats() {
  const nStates = Object.keys(DISTRICTS).length;
  const nDist = Object.values(DISTRICTS).reduce((a, b) => a + b.length, 0);
  const nCur = Object.keys(CONTENT.districts).length;
  $('#stats').innerHTML = [
    [nStates, t('states')], [nDist, t('districts')],
    [nCur, t('curated')], [COMMUNITY.length, t('community')]
  ].map(([n, l]) => `<div class="stat"><b>${n}</b><span>${esc(l)}</span></div>`).join('');
  $('#yatraCount').textContent = YATRA.length;
}

/* ------------------------------------------------------------ router */
function go(h) { if (location.hash === h) route(); else location.hash = h; }

function route() {
  const h = decodeURIComponent(location.hash || '#/');
  if (!/^#\/d\//.test(location.hash)) closePage();
  const p = h.replace(/^#\//, '').split('/');
  if (p[0] === 'state' && p[1]) return viewState(p[1]);
  if (p[0] === 'd' && p[1] && p[2]) return viewDistrictPage(p[1], p[2]);
  if (p[0] === 'sheet' && p[1] && p[2]) return viewDistrict(p[1], p[2]);
  if (p[0] === 'contribute') return viewContribute(p[1] || '', p[2] || '');
  if (p[0] === 'explore') return viewExplore();
  if (p[0] === 'region' && p[1]) return viewRegion(p[1]);
  if (p[0] === 'qr') { openQR(); history.replaceState(null, '', '#/'); return; }
  if (p[0] === 'yatra') return viewYatra();
  closeSheet(); Map3D.isReady() && Map3D.reset();
}

/* ------------------------------------------------------------- sheet */
function openSheet(title, sub, html) {
  $('#sheetTitle').innerHTML = title;
  $('#sheetSub').innerHTML = sub;
  $('#sheetBody').innerHTML = html;
  $('#sheetBody').scrollTop = 0;
  $('#sheet').classList.add('open');
}
function closeSheet() { $('#sheet').classList.remove('open'); }
function dismissSheet() { closeSheet(); closePage(); go('#/'); }

function showTip(name) {
  const tip = $('#tooltip');
  if (!name) { tip.style.opacity = 0; return; }
  const n = (DISTRICTS[name] || []).length;
  const cur = Object.keys(CONTENT.districts).filter(k => k.startsWith(name + '|')).length;
  tip.innerHTML = `<b>${esc(name)}</b><span>${n} ${t('districts')} · ${cur} ${t('curated')}</span>`;
  tip.style.opacity = 1;
}
function moveTip(x, y) {
  const tip = $('#tooltip');
  tip.style.left = Math.min(x + 16, window.innerWidth - 220) + 'px';
  tip.style.top = (y + 16) + 'px';
}

/* -------------------------------------------------------- state view */
let CURSTATE = '';
function viewState(state) {
  if (!DISTRICTS[state]) { go('#/'); return; }
  CURSTATE = state;
  Map3D.isReady() && Map3D.focus(state);

  const s = CONTENT.states[state] || {};
  const dists = DISTRICTS[state];
  const cur = k => CONTENT.districts[state + '|' + k];
  const commCount = k => COMMUNITY.filter(c => c.state === state && c.district === k).length;

  // 3D markers for curated districts of this state
  const marks = dists.filter(d => cur(d) && cur(d).coords)
    .map(d => ({ lat: cur(d).coords[0], lng: cur(d).coords[1], label: d }));
  Map3D.isReady() && Map3D.setMarkers(marks);

  const cards = dists.map(d => {
    const c = cur(d), n = commCount(d);
    return `<div class="dcard${c ? ' withimg' : ''}" onclick="go('#/d/${encodeURIComponent(state)}/${encodeURIComponent(d)}')">
      ${c && c.hero ? `<img class="thumb" loading="lazy" src="${esc(c.hero)}" alt="${esc(d)}" onerror="this.remove()">` : ''}
      ${c ? '<i class="dot"></i>' : (n ? '<i class="dot c"></i>' : '')}
      <b>${esc(d)}</b>
      <small>${c ? esc(c.tagline) : (n ? n + ' ' + esc(t('community')) : '—')}</small>
    </div>`;
  }).join('');

  const html = `
    ${stateBanner(state, s)}
    ${s.blurb ? `<p style="margin:0 0 14px;color:var(--dim);font-size:15px">${esc(s.blurb)}</p>` : ''}
    ${s.langs ? `<div class="chips" style="margin-bottom:12px">
        ${s.langs.map(l => `<span class="chip">🗣 ${esc(l)}</span>`).join('')}</div>` : ''}
    ${s.greeting ? `<div class="phrase">
        <div><div class="native">${esc(s.greeting.t)}</div>
        <div class="rom">${esc(s.greeting.r)}</div>
        <div class="mean">${esc(s.greeting.m)}</div></div>
        <button onclick="speak('${jsq(s.greeting.r)}')" aria-label="Play">🔊</button></div>` : ''}

    <div class="searchwrap" style="margin-top:14px">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input class="search" id="dq" placeholder="${esc(t('searchd'))}" oninput="filterD(this.value)">
    </div>
    <div class="grid" id="dgrid">${cards}</div>

    ${s.festivals ? section(t('festivals'), s.festivals.map(f => `<span class="chip">🎉 ${esc(f)}</span>`).join(''), 'chips') : ''}
    ${s.cuisine ? section(t('food'), s.cuisine.map(f => `<span class="chip">🍲 ${esc(f)}</span>`).join(''), 'chips') : ''}
    ${s.attire ? section('Traditional dress', s.attire.map(f => `<span class="chip">🧵 ${esc(f)}</span>`).join(''), 'chips') : ''}
    ${s.crafts ? section(t('crafts'), s.crafts.map(f => `<span class="chip">🪡 ${esc(f)}</span>`).join(''), 'chips') : ''}
    ${s.bestTime ? `<div class="section"><h3>${esc(t('best'))}</h3><div class="note">🗓 ${esc(s.bestTime)}</div></div>` : ''}
    <button class="cta" style="margin-top:20px" onclick="go('#/contribute/${encodeURIComponent(state)}')">+ ${esc(t('nav_add'))}</button>
  `;
  openSheet(esc(state), `${dists.length} ${esc(t('districts'))} · ${dists.filter(d => cur(d)).length} ${esc(t('curated'))}`, html);
}

function section(title, inner, cls) {
  return `<div class="section"><h3>${esc(title)}</h3><div class="${cls || ''}">${inner}</div></div>`;
}
function filterD(q) {
  q = q.toLowerCase();
  document.querySelectorAll('#dgrid .dcard').forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

/* ----------------------------------------------------- district view */
function viewDistrict(state, district) {
  const key = state + '|' + district;
  const c = CONTENT.districts[key];
  const s = CONTENT.states[state] || {};
  const comm = COMMUNITY.filter(x => x.state === state && x.district === district);
  Map3D.isReady() && Map3D.focus(state);
  if (c && c.coords && Map3D.isReady())
    Map3D.setMarkers([{ lat: c.coords[0], lng: c.coords[1], label: district }]);

  const inY = YATRA.some(y => y.s === state && y.d === district);
  let html = '';

  if (c) {
    html += `<p style="margin:0 0 12px;font-size:15.5px;color:var(--dim)">${esc(c.blurb)}</p>`;
    html += `<div class="chips" style="margin-bottom:6px">
      <span class="pill verified">✓ ${esc(t('verified'))}</span>
      ${c.unesco ? '<span class="pill unesco">UNESCO</span>' : ''}
      <span class="pill">🗓 ${esc(c.bestTime)}</span></div>`;

    html += section(t('monuments'), c.monuments.map(m => `<div class="item">
      <b>${esc(m.n)}</b> <span class="meta">${esc(m.e)}</span>
      <p>${esc(m.w)}</p></div>`).join(''));

    html += section(t('festivals'), c.festivals.map(f => `<div class="item p">
      <b>${esc(f.n)}</b> <span class="meta">${esc(f.w)}</span>
      <p>${esc(f.y)}</p></div>`).join(''));

    html += section(t('food'), c.food.map(f => `<div class="item g">
      <b>${esc(f.n)}</b><p>${esc(f.w)}</p></div>`).join(''));

    html += section(t('stay'), c.stay.map(f => `<div class="item b">
      <b>${esc(f.n)}</b> <span class="meta">${esc(f.t)}</span><p>${esc(f.w)}</p></div>`).join(''));

    html += section(t('language'),
      (c.phrases || []).map(p => `<div class="phrase">
        <div><div class="native">${esc(p.t)}</div><div class="rom">${esc(p.r)}</div>
        <div class="mean">${esc(p.m)}</div></div>
        <button onclick="speak('${jsq(p.r)}')" aria-label="Play">🔊</button></div>`).join('') +
      (s.langs ? `<div class="chips" style="margin-top:6px">${s.langs.map(l => `<span class="chip">🗣 ${esc(l)}</span>`).join('')}</div>` : ''));

    html += section(t('crafts'), c.crafts.map(x => `<span class="chip">🪡 ${esc(x)}</span>`).join(''), 'chips');

    html += section('💎 ' + t('hidden'), c.hidden.map(x => `<div class="item">
      <b>${esc(x.n)}</b><p>${esc(x.note || x.w || '')}</p></div>`).join(''));

    html += section('🧭 ' + t('responsible'),
      `<div class="warn"><ul>${c.responsible.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`);
  } else {
    html += `<div class="note" style="margin-bottom:14px">
      <b style="color:var(--txt)">${esc(t('nodata'))}</b><br>${esc(t('nodata2'))}</div>`;
    if (s.blurb) html += `<p style="color:var(--dim)">${esc(state)}: ${esc(s.blurb)}</p>`;
    if (s.langs) html += section(t('language'), s.langs.map(l => `<span class="chip">🗣 ${esc(l)}</span>`).join(''), 'chips');
    if (s.cuisine) html += section(t('food') + ' (' + esc(state) + ')', s.cuisine.map(l => `<span class="chip">🍲 ${esc(l)}</span>`).join(''), 'chips');
    if (s.festivals) html += section(t('festivals') + ' (' + esc(state) + ')', s.festivals.map(l => `<span class="chip">🎉 ${esc(l)}</span>`).join(''), 'chips');
    if (s.crafts) html += section(t('crafts') + ' (' + esc(state) + ')', s.crafts.map(l => `<span class="chip">🪡 ${esc(l)}</span>`).join(''), 'chips');
  }

  /* ---- community layer ---- */
  html += `<div class="section"><h3>👥 ${esc(t('commtitle'))} (${comm.length})</h3>`;
  if (!comm.length) {
    html += `<div class="note">Nothing added here yet. If you live here, you know something this app doesn't.</div>`;
  } else {
    html += comm.map(x => `<div class="ccard">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:5px">
        <span class="pill ${x.status === 'reviewed' ? 'reviewed' : 'community'}">
          ${x.status === 'reviewed' ? esc(t('reviewed')) : esc(t('comm'))}</span>
        <span class="pill">${esc(x.category)}</span>
      </div>
      <b style="font-size:16px">${esc(x.title)}</b>
      <p style="margin:5px 0 0;color:var(--dim);font-size:13.5px">${esc(x.summary)}</p>
      ${x.photo ? `<img src="${esc(x.photo)}" alt="${esc(x.title)}">` : ''}
      ${x.location ? `<div style="font-size:12.5px;color:var(--dim);margin-top:6px">📍 ${esc(x.location)}</div>` : ''}
      ${x.bestTime ? `<div style="font-size:12.5px;color:var(--dim)">🗓 ${esc(x.bestTime)}</div>` : ''}
      ${x.language ? `<div style="font-size:12.5px;color:var(--dim)">🗣 ${esc(x.language)}</div>` : ''}
      ${x.tips ? `<div style="font-size:12.5px;color:var(--dim)">💡 ${esc(x.tips)}</div>` : ''}
      <div class="who">
        <span>— ${esc(x.contributor)}, ${esc(x.role)} · ${esc(x.created)}</span>
        <button class="vote" onclick="vote('${jsq(x.id)}')">👍 I can confirm (${esc(x.votes)})</button>
      </div>
    </div>`).join('');
    html += `<div class="note" style="margin-top:6px">Community entries are shown separately from verified guides
      and are promoted to <b>community-reviewed</b> once five different visitors confirm them. Nothing overwrites verified heritage information.</div>`;
  }
  html += `<button class="cta" onclick="go('#/contribute/${encodeURIComponent(state)}/${encodeURIComponent(district)}')">+ ${esc(t('addhere'))}</button></div>`;

  html += `<div class="two" style="margin-top:14px">
    <button class="cta ghost" onclick="toggleYatra('${jsq(state)}','${jsq(district)}')" id="yBtn">
      ${inY ? esc(t('inyatra')) : '＋ ' + esc(t('addyatra'))}</button>
    <button class="cta ghost" onclick="shareDistrict('${jsq(state)}','${jsq(district)}')">▦ QR / Share</button>
  </div>`;

  openSheet(esc(district), esc(state) + (c ? ' · ' + esc(c.tagline) : ''), html);
}

/* ------------------------------------------------------------ explore */
function viewExplore() {
  Map3D.isReady() && Map3D.reset();
  const keys = Object.keys(CONTENT.districts).sort();
  const cards = keys.map(k => {
    const [s, d] = k.split('|'); const c = CONTENT.districts[k];
    return `<div class="dcard withimg" onclick="go('#/d/${encodeURIComponent(s)}/${encodeURIComponent(d)}')">
      ${c.hero ? `<img class="thumb" loading="lazy" src="${esc(c.hero)}" alt="${esc(d)}" onerror="this.remove()">` : ''}
      ${c.unesco ? '<i class="dot" style="background:#9ecbff;box-shadow:0 0 10px #9ecbff"></i>' : '<i class="dot"></i>'}
      <b>${esc(d)}</b><small>${esc(s)}<br>${esc(c.tagline)}</small></div>`;
  }).join('');
  const html = `
    <div class="searchwrap">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input class="search" id="gq" placeholder="${esc(t('searchs'))}" oninput="globalSearch(this.value)">
    </div>
    <div id="gres"></div>
    <div class="section"><h3>${esc(t('curated'))} — ${keys.length}</h3><div class="grid">${cards}</div></div>
    <div class="section"><h3>${esc(t('states'))}</h3><div class="grid">
      ${Object.keys(DISTRICTS).map(s => `<div class="dcard" onclick="go('#/state/${encodeURIComponent(s)}')">
        <b>${esc(s)}</b><small>${DISTRICTS[s].length} ${esc(t('districts'))}</small></div>`).join('')}
    </div></div>`;
  openSheet('Explore India', 'Search every state, district and craft', html);
}

function openStateList() { go('#/explore'); }

function globalSearch(q) {
  q = q.trim().toLowerCase();
  const box = $('#gres');
  if (q.length < 2) { box.innerHTML = ''; return; }
  const out = [];
  Object.keys(DISTRICTS).forEach(s => {
    if (s.toLowerCase().includes(q)) out.push(['state', s, '']);
    DISTRICTS[s].forEach(d => { if (d.toLowerCase().includes(q)) out.push(['district', s, d]); });
  });
  Object.keys(CONTENT.districts).forEach(k => {
    const c = CONTENT.districts[k];
    const hay = JSON.stringify(c).toLowerCase();
    if (hay.includes(q)) {
      const [s, d] = k.split('|');
      if (!out.some(o => o[1] === s && o[2] === d)) out.push(['content', s, d]);
    }
  });
  COMMUNITY.forEach(c => {
    if ((c.title + c.summary + c.district).toLowerCase().includes(q))
      out.push(['community', c.state, c.district]);
  });
  box.innerHTML = `<div class="section"><h3>${out.length} results</h3><div class="grid">` +
    out.slice(0, 60).map(([kind, s, d]) => `<div class="dcard" onclick="go('${d ? '#/d/' + encodeURIComponent(s) + '/' + encodeURIComponent(d) : '#/state/' + encodeURIComponent(s)}')">
      <b>${esc(d || s)}</b><small>${esc(d ? s : 'State')} · ${kind}</small></div>`).join('') + '</div></div>';
}

/* --------------------------------------------------------- contribute */
function viewContribute(state, district) {
  const stateOpts = Object.keys(DISTRICTS).map(s =>
    `<option ${s === state ? 'selected' : ''}>${esc(s)}</option>`).join('');
  const html = `
    <p style="color:var(--dim);margin-top:0">You know a shrine, a stepwell, a weaver, a festival, a food street or a trail
    that no guidebook lists. Add it. It appears instantly for every visitor, clearly labelled as
    <b style="color:var(--saffron2)">community knowledge</b> until it is confirmed.</p>
    <form onsubmit="submitContribution(event)">
      <div class="two">
        <label class="f"><span>State *</span><select name="state" id="cState" onchange="fillDistricts()">${stateOpts}</select></label>
        <label class="f"><span>District *</span><select name="district" id="cDistrict"></select></label>
      </div>
      <label class="f"><span>What is it? *</span>
        <select name="category">
          <option>Hidden gem</option><option>Monument / heritage site</option>
          <option>Festival / ritual</option><option>Street food / dish</option>
          <option>Craft / artisan</option><option>Homestay / where to stay</option>
          <option>Folk art / performance</option><option>Language / dialect note</option>
          <option>Nature / trail</option><option>Accessibility info</option>
        </select></label>
      <label class="f"><span>Name / title *</span><input name="title" required maxlength="90" placeholder="e.g. Suraj Kund stepwell, Meerut"></label>
      <label class="f"><span>Tell a visitor why it matters *</span>
        <textarea name="summary" required maxlength="900" placeholder="What is it, how old, who made it, what happens there, what most people miss…"></textarea></label>
      <div class="two">
        <label class="f"><span>How to find it</span><input name="location" maxlength="140" placeholder="Landmark, area, or map link"></label>
        <label class="f"><span>Best time</span><input name="bestTime" maxlength="80" placeholder="e.g. Oct–Mar, mornings"></label>
      </div>
      <label class="f"><span>Say it in the local language (optional)</span>
        <input name="language" maxlength="160" placeholder="A phrase locals use, with meaning"></label>
      <label class="f"><span>Visitor etiquette / responsible-travel note</span>
        <textarea name="tips" maxlength="400" placeholder="Dress code, photography rules, fragile surfaces, who to pay…"></textarea></label>
      <label class="f"><span>Photo (optional, stays on this server)</span>
        <input type="file" accept="image/*" id="cPhoto"></label>
      <div id="cPrev"></div>
      <div class="two">
        <label class="f"><span>Your name</span><input name="contributor" maxlength="60" placeholder="Anonymous local"></label>
        <label class="f"><span>You are a…</span>
          <select name="role"><option>Local resident</option><option>Licensed guide</option>
          <option>Artisan / performer</option><option>Student</option><option>Teacher / historian</option>
          <option>Temple / trust member</option><option>Traveller</option></select></label>
      </div>
      <label class="f"><span>Contact for verification (optional, not shown publicly)</span>
        <input name="contact" maxlength="80" placeholder="Phone or email"></label>
      <div class="note" style="margin-bottom:12px">Submissions are stored on this server as community knowledge.
        They are never merged into verified heritage content — a district officer or ASI-listed guide reviews them before promotion.</div>
      <button class="cta" type="submit">Submit to Bharat Yatra</button>
    </form>`;
  openSheet('Add a place', 'Locals know what guidebooks do not', html);
  fillDistricts(district);
  $('#cPhoto').addEventListener('change', previewPhoto);
}

function fillDistricts(pre) {
  const s = $('#cState').value;
  $('#cDistrict').innerHTML = (DISTRICTS[s] || []).map(d =>
    `<option ${d === pre ? 'selected' : ''}>${esc(d)}</option>`).join('');
}

let PHOTO = '';
function previewPhoto(e) {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image();
  const rd = new FileReader();
  rd.onload = () => {
    img.onload = () => {
      const max = 1000, sc = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = img.width * sc; cv.height = img.height * sc;
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      PHOTO = cv.toDataURL('image/jpeg', 0.72);
      $('#cPrev').innerHTML = `<img src="${PHOTO}" style="width:100%;border-radius:12px;margin-bottom:12px">`;
    };
    img.src = rd.result;
  };
  rd.readAsDataURL(f);
}

async function submitContribution(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (PHOTO) fd.set('photo', PHOTO);
  const body = new URLSearchParams();
  for (const [k, v] of fd.entries()) body.append(k, v);
  try {
    const r = await fetch('api/contribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString()
    }).then(r => r.json());
    if (!r.ok) throw new Error(r.error || 'failed');
    PHOTO = '';
    await refreshCommunity();
    renderStats();
    renderHome();
    toast('Added. Thank you for documenting India 🇮🇳');
    go('#/d/' + encodeURIComponent(fd.get('state')) + '/' + encodeURIComponent(fd.get('district')));
  } catch (err) {
    toast('Could not save: ' + err.message, true);
  }
}

async function vote(id) {
  try {
    await fetch('api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'id=' + encodeURIComponent(id)
    });
    await refreshCommunity();
    toast('Confirmation recorded');
    route();
  } catch (e) { toast('Failed', true); }
}

/* -------------------------------------------------------------- yatra */
function toggleYatra(s, d) {
  const i = YATRA.findIndex(y => y.s === s && y.d === d);
  if (i >= 0) YATRA.splice(i, 1); else YATRA.push({ s, d });
  localStorage.setItem('by360.yatra', JSON.stringify(YATRA));
  renderStats();
  const b = $('#yBtn'); if (b) b.textContent = i >= 0 ? '＋ ' + t('addyatra') : t('inyatra');
  toast(i >= 0 ? 'Removed from My Yatra' : 'Added to My Yatra');
}
function openYatra() { go('#/yatra'); }
function viewYatra() {
  if (!YATRA.length) {
    openSheet('My Yatra', 'Your itinerary', `<div class="note">Nothing saved yet. Open any district and tap “Add to My Yatra”.</div>`);
    return;
  }
  const rows = YATRA.map((y, i) => {
    const c = CONTENT.districts[y.s + '|' + y.d];
    return `<div class="item"><b>${i + 1}. ${esc(y.d)}</b> <span class="meta">${esc(y.s)}</span>
      <p>${c ? esc(c.tagline) + ' · ' + esc(c.bestTime) : 'Community entries only'}</p>
      <div style="display:flex;gap:8px;margin-top:7px">
        <button class="vote" onclick="go('#/d/${encodeURIComponent(y.s)}/${encodeURIComponent(y.d)}')">Open</button>
        <button class="vote" onclick="toggleYatra('${jsq(y.s)}','${jsq(y.d)}');viewYatra()">Remove</button>
      </div></div>`;
  }).join('');
  const tips = [...new Set(YATRA.map(y => CONTENT.districts[y.s + '|' + y.d])
    .filter(Boolean).flatMap(c => c.responsible))].slice(0, 8);
  openSheet('My Yatra', YATRA.length + ' stops', rows +
    (tips.length ? section('🧭 ' + t('responsible'), `<div class="warn"><ul>${tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`) : '') +
    `<button class="cta ghost" style="margin-top:12px" onclick="window.print()">🖨 Print / save as PDF</button>`);
}

/* -------------------------------------------------------------- extras */
function surprise() {
  const keys = Object.keys(CONTENT.districts);
  const k = keys[Math.floor(Math.random() * keys.length)];
  const [s, d] = k.split('|');
  go('#/d/' + encodeURIComponent(s) + '/' + encodeURIComponent(d));
}

function speak(text, lang) {
  if (!('speechSynthesis' in window)) { toast('Speech not supported here', true); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang || bcp(); u.rate = 0.92;
  speechSynthesis.speak(u);
}
function speakPage() {
  const el = $('#sheetBody');
  const txt = ($('#sheetTitle').textContent + '. ' + $('#sheetSub').textContent + '. ' +
    el.innerText).slice(0, 4000);
  speak(txt, 'en-IN');
}

function toggleA11y() {
  document.body.classList.toggle('big');
  document.body.classList.toggle('contrast');
  toast(document.body.classList.contains('big') ? 'Large text + high contrast on' : 'Standard view');
}

function lanUrl(hash) {
  const host = location.hostname;
  const local = host === 'localhost' || host === '127.0.0.1' || host === '';
  const base = (local && SERVER.lan && SERVER.lan !== 'localhost')
    ? location.protocol + '//' + SERVER.lan + ':' + (SERVER.port || location.port || 8080) + '/'
    : location.href.split('#')[0];
  return base + (hash || '');
}

let QR_URL = '';
function openQR(url, note) {
  QR_URL = url || lanUrl();
  drawQR(QR_URL);
  $('#qrNote').textContent = note || 'Point a phone camera at this code.';

  // choices: LAN address (works on the same Wi-Fi) vs whatever is in the address bar
  const btns = $('#qrBtns');
  const opts = [];
  if (SERVER.lan && SERVER.lan !== 'localhost')
    opts.push(['📶 Wi-Fi address', location.protocol + '//' + SERVER.lan + ':' + (SERVER.port || 8080) + '/']);
  opts.push(['💻 This address', location.href.split('#')[0]]);
  btns.innerHTML = opts.map(([l, u]) =>
    `<button class="vote" onclick="drawQR('${jsq(u)}')">${esc(l)}</button>`).join('');

  const warn = $('#qrWarn');
  const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (isLocal && (!SERVER.lan || SERVER.lan === 'localhost')) {
    warn.style.display = 'block';
    warn.innerHTML = '⚠️ This code says <b>localhost</b>, which only works on this laptop. ' +
      'For phones, host it online (see DEMO-DAY.md) or connect both devices to one Wi-Fi and reload.';
  } else if (isLocal) {
    warn.style.display = 'block';
    warn.innerHTML = '📶 Using your Wi-Fi address <b>' + esc(SERVER.lan) + '</b>. ' +
      'The phone must be on the <b>same Wi-Fi / hotspot</b> as this laptop.';
  } else { warn.style.display = 'none'; }

  $('#qrModal').classList.add('open');
}

function drawQR(u) {
  QR_URL = u;
  $('#qrUrl').textContent = u;
  const box = $('#qr'); box.innerHTML = '';
  try { new QRCode(box, { text: u, width: 230, height: 230, correctLevel: QRCode.CorrectLevel.M }); }
  catch (e) { box.textContent = u; }
}

function useCustomQR() {
  let v = ($('#qrCustom').value || '').trim();
  if (!v) return;
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  drawQR(v);
  $('#qrWarn').style.display = 'block';
  $('#qrWarn').innerHTML = '🌐 Showing a QR for your hosted site. Anyone, anywhere can scan this.';
}

function downloadQR() {
  const box = $('#qr');
  const cv = box.querySelector('canvas');
  const img = box.querySelector('img');
  const a = document.createElement('a');
  a.download = 'bharat-yatra-qr.png';
  if (cv) a.href = cv.toDataURL('image/png');
  else if (img) a.href = img.src;
  else return toast('Nothing to save', true);
  a.click();
  toast('QR saved — print it and put it on your table');
}
function shareDistrict(s, d) {
  const u = location.href.split('#')[0] + '#/d/' + encodeURIComponent(s) + '/' + encodeURIComponent(d);
  if (navigator.share) navigator.share({ title: d + ', ' + s, url: u }).catch(() => openQR(u, d + ', ' + s));
  else openQR(u, d + ', ' + s);
}

let toastT;
function toast(msg, err) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('err', !!err);
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2600);
}

function jsq(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if ($('#qrModal').classList.contains('open')) { $('#qrModal').classList.remove('open'); return; }
    if ($('#page').classList.contains('open')) { go('#/state/' + encodeURIComponent(CURSTATE || '')); return; }
    dismissSheet();
  }
});

/* ==================================================================
   PHOTO BACKDROP — real photographs of Indian heritage sites,
   slow Ken-Burns crossfade behind the 3D map.
   ================================================================== */
let BG = [], bgI = 0, bgTimer = null, bgSlides = [];

function startBackdrop() {
  const wrap = $('#backdrop');
  if (!wrap) return;
  // locally stored AI paintings first — they always load, even with no internet
  BG = AI.bg.map((b, i) => ({ url: AI.bgUrl(i), cap: b.c + ' · illustration' }));
  if (!BG.length) return;

  // two stacked layers we crossfade between
  for (let i = 0; i < 2; i++) {
    const el = document.createElement('div');
    el.className = 'slide';
    wrap.insertBefore(el, wrap.firstChild);
    bgSlides.push(el);
  }
  showBg(0);
  bgTimer = setInterval(() => showBg((bgI + 1) % BG.length), 8000);
}

function showBg(i) {
  const cur = bgSlides[i % 2], other = bgSlides[(i + 1) % 2];
  const img = new Image();
  img.onload = () => {
    cur.style.backgroundImage = `url("${BG[i].url}")`;
    cur.classList.add('on');
    other.classList.remove('on');
    const cap = $('#bgCaption');
    if (cap) cap.textContent = BG[i].cap;
    bgI = i;
  };
  img.onerror = () => { bgI = i; };
  img.src = BG[i].url;
}

function pauseBackdrop(on) {
  $('#backdrop').style.display = on ? 'none' : '';
  $('#bgCaption').style.display = on ? 'none' : '';
}

/* ==================================================================
   FULL DISTRICT PAGE — a magazine spread for one district
   ================================================================== */
let PCTX = { s: '', d: '' };
function photo(url, alt, era, big, art) {
  if (!url && art) return `<div class="ph"><img loading="lazy" src="${esc(art)}" alt="${esc(alt)}"
      onerror="artFail(this)">
      <span class="illus">Illustration</span>
      ${era ? `<span class="era">${esc(era)}</span>` : ''}</div>`;
  if (!url) return `<div class="ph need" onclick="event.stopPropagation();go('#/contribute/${encodeURIComponent(PCTX.s)}/${encodeURIComponent(PCTX.d)}')" title="No free photograph exists yet — add yours">
      <div class="needin"><span class="ic">📷</span><b>Photo needed</b><em>${esc(alt)}</em><u>Add yours →</u></div>
      ${era ? `<span class="era">${esc(era)}</span>` : ''}</div>`;
  return `<div class="ph"><img loading="lazy" src="${esc(url)}" alt="${esc(alt)}"
    onerror="this.style.display='none';this.parentNode.insertAdjacentHTML('beforeend','<div class=noimg>🏛</div>')">
    ${era ? `<span class="era">${esc(era)}</span>` : ''}</div>`;
}

function closePage() {
  const p = $('#page');
  if (p && p.classList.contains('open')) {
    p.classList.remove('open');
    pauseBackdrop(false);
    setTimeout(() => { if (!p.classList.contains('open')) p.innerHTML = ''; }, 400);
  }
}

function viewDistrictPage(state, district) {
  const key = state + '|' + district;
  const c = CONTENT.districts[key];
  const s = CONTENT.states[state] || {};
  const comm = COMMUNITY.filter(x => x.state === state && x.district === district);
  CURSTATE = state;
  closeSheet();
  pauseBackdrop(true);
  PCTX = { s: state, d: district };
  Map3D.isReady() && Map3D.focus(state);

  const ban = AI.banner(state);
  const hero = (c && c.hero) || s.img || '';
  const heroArt = ban.url;
  const inY = YATRA.some(y => y.s === state && y.d === district);
  const sec = [];

  let html = `
  <div class="phero">
    <div class="bg" style="background-image:url('${esc(heroArt)}')"
         onerror="this.style.backgroundImage='url(${esc(ban.alt)})'"></div>
    ${hero ? `<img class="bgphoto" src="${esc(hero)}" alt="${esc(district)}"
         onload="this.classList.add('in')" onerror="this.remove()">` : ''}
    <div class="grad"></div>
    <div class="inner">
      <div style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--saffron2);margin-bottom:10px">
        ${esc(state)} · India</div>
      <h1>${esc(district)}</h1>
      ${c ? `<div class="tl">${esc(c.tagline)}</div>` : ''}
      <div class="badges">
        ${c ? `<span class="pill verified">✓ ${esc(t('verified'))}</span>` : `<span class="pill community">${esc(t('comm'))}</span>`}
        ${c && c.unesco ? '<span class="pill unesco">UNESCO World Heritage</span>' : ''}
        ${c ? `<span class="pill">🗓 ${esc(c.bestTime)}</span>` : ''}
        ${comm.length ? `<span class="pill community">👥 ${comm.length} ${esc(t('community'))}</span>` : ''}
      </div>
    </div>
  </div>`;

  const navItems = [];
  const add = (id, label) => navItems.push(`<button class="pnav" onclick="jumpTo('${id}')">${esc(label)}</button>`);

  let body = '';
  if (c) {
    body += `<p class="pintro">${esc(c.blurb)}</p>`;
    if (c.heroCredit) body += `<div class="pcredit">Hero photograph: ${esc(c.heroCredit)}</div>`;

    /* monuments */
    add('s-mon', t('monuments'));
    body += `<section class="psec" id="s-mon"><h2>${esc(t('monuments'))}</h2>
      <div class="sd">What to see, when it was built, and why it matters</div>
      <div class="cards c2">` + c.monuments.map(m => `<article class="pc">
        ${photo(m.img, m.n, m.e, true)}
        <div class="tx"><b>${esc(m.n)}</b><p>${esc(m.w)}</p></div></article>`).join('') + `</div></section>`;

    /* festivals */
    add('s-fes', t('festivals'));
    body += `<section class="psec" id="s-fes"><h2>${esc(t('festivals'))}</h2>
      <div class="sd">Time your visit around these</div>
      <div class="cards c3">` + c.festivals.map(f => `<article class="pc sm">
        ${photo(f.img, f.n, f.w, false, AI.match('festival', f.n))}
        <div class="tx"><b>${esc(f.n)}</b><p>${esc(f.y)}</p></div></article>`).join('') + `</div></section>`;

    /* food */
    add('s-food', t('food'));
    body += `<section class="psec" id="s-food"><h2>${esc(t('food'))}</h2>
      <div class="sd">What locals actually eat here</div>
      <div class="cards c3">` + c.food.map(f => `<article class="pc sm">
        ${photo(f.img, f.n, '', false, AI.match('dish', f.n))}
        <div class="tx"><b>${esc(f.n)}</b><p>${esc(f.w)}</p></div></article>`).join('') + `</div></section>`;

    /* stay + language side by side */
    add('s-stay', t('stay'));
    body += `<section class="psec" id="s-stay"><div class="pgrid2">
      <div><h2>${esc(t('stay'))}</h2><div class="sd">Community homestays listed first wherever they exist</div>
        <div class="plist">` + c.stay.map(f => `<div class="item b"><b>${esc(f.n)}</b>
          <span class="meta">${esc(f.t)}</span><p>${esc(f.w)}</p></div>`).join('') + `</div></div>
      <div><h2>${esc(t('language'))}</h2><div class="sd">Tap 🔊 to hear it</div>` +
      (c.phrases || []).map(p => `<div class="phrase"><div>
          <div class="native">${esc(p.t)}</div><div class="rom">${esc(p.r)}</div>
          <div class="mean">${esc(p.m)}</div></div>
          <button onclick="speak('${jsq(p.r)}')" aria-label="Play">🔊</button></div>`).join('') +
      (s.langs ? `<div class="chips" style="margin-top:8px">${s.langs.map(l => `<span class="chip">🗣 ${esc(l)}</span>`).join('')}</div>` : '') +
      `</div></div></section>`;

    /* crafts */
    add('s-craft', t('crafts'));
    body += `<section class="psec" id="s-craft"><h2>${esc(t('crafts'))}</h2>
      <div class="sd">Buy from the maker — most of these are GI-tagged</div>
      <div class="strip">` + c.crafts.map((x, i) => `<article class="pc sm">
        ${photo((c.craftImgs || [])[i], x, '', false, AI.dir + AI.craftDefault)}
        <div class="tx"><b>${esc(x)}</b></div></article>`).join('') + `</div></section>`;

    /* hidden gems */
    add('s-hid', t('hidden'));
    body += `<section class="psec" id="s-hid"><h2>💎 ${esc(t('hidden'))}</h2>
      <div class="sd">The places the tour buses skip</div>
      <div class="cards c2">` + c.hidden.map(x => `<article class="pc">
        ${photo(x.img, x.n)}
        <div class="tx"><b>${esc(x.n)}</b><p>${esc(x.note || x.w || '')}</p></div></article>`).join('') + `</div></section>`;

    /* responsible */
    add('s-resp', t('responsible'));
    body += `<section class="psec" id="s-resp"><h2>🧭 ${esc(t('responsible'))}</h2>
      <div class="sd">Specific to this place, not generic advice</div>
      <div class="warn"><ul>${c.responsible.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></section>`;
  } else {
    body += `<p class="pintro">${esc(t('nodata'))} ${esc(t('nodata2'))}</p>`;
    if (s.blurb) body += `<p style="color:var(--dim);max-width:760px">${esc(state)} — ${esc(s.blurb)}</p>`;
    const chipSec = (title, arr, icon) => arr ? `<section class="psec"><h2>${esc(title)}</h2>
      <div class="chips">${arr.map(x => `<span class="chip">${icon} ${esc(x)}</span>`).join('')}</div></section>` : '';
    body += chipSec(t('language') + ' — ' + state, s.langs, '🗣');
    body += chipSec(t('food') + ' — ' + state, s.cuisine, '🍲');
    body += chipSec(t('festivals') + ' — ' + state, s.festivals, '🎉');
    body += chipSec(t('crafts') + ' — ' + state, s.crafts, '🪡');
  }

  /* community */
  add('s-comm', t('commtitle'));
  body += `<section class="psec" id="s-comm"><h2>👥 ${esc(t('commtitle'))} <span style="color:var(--dim);font-size:.55em">(${comm.length})</span></h2>
    <div class="sd">Added by residents, guides, artisans and students — shown separately from verified content</div>`;
  if (!comm.length) {
    body += `<div class="note">Nothing here yet. If you live in ${esc(district)}, you know something this app doesn't.</div>`;
  } else {
    body += `<div class="cards c2">` + comm.map(x => `<article class="pc">
      ${x.photo ? `<div class="ph"><img src="${esc(x.photo)}" alt="${esc(x.title)}"></div>` : ''}
      <div class="tx">
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:7px">
          <span class="pill ${x.status === 'reviewed' ? 'reviewed' : 'community'}">${x.status === 'reviewed' ? esc(t('reviewed')) : esc(t('comm'))}</span>
          <span class="pill">${esc(x.category)}</span></div>
        <b>${esc(x.title)}</b><p>${esc(x.summary)}</p>
        ${x.location ? `<p style="margin-top:6px">📍 ${esc(x.location)}</p>` : ''}
        ${x.bestTime ? `<p>🗓 ${esc(x.bestTime)}</p>` : ''}
        ${x.language ? `<p>🗣 ${esc(x.language)}</p>` : ''}
        ${x.tips ? `<p>💡 ${esc(x.tips)}</p>` : ''}
        <div class="who"><span>— ${esc(x.contributor)}, ${esc(x.role)} · ${esc(x.created)}</span>
        <button class="vote" onclick="vote('${jsq(x.id)}')">👍 I can confirm (${esc(x.votes)})</button></div>
      </div></article>`).join('') + `</div>`;
  }
  body += `<button class="cta" style="max-width:420px;margin-top:16px"
      onclick="go('#/contribute/${encodeURIComponent(state)}/${encodeURIComponent(district)}')">
      + ${esc(t('addhere'))}</button></section>`;

  body += `<div class="pfoot">
    <button class="navbtn pri" onclick="toggleYatra('${jsq(state)}','${jsq(district)}');route()">
      ${inY ? esc(t('inyatra')) : '＋ ' + esc(t('addyatra'))}</button>
    <button class="navbtn" onclick="shareDistrict('${jsq(state)}','${jsq(district)}')">▦ QR / Share</button>
    <button class="navbtn" onclick="speakPageFull()">🔊 ${esc(t('readaloud'))}</button>
    <button class="navbtn" onclick="go('#/state/${encodeURIComponent(state)}')">← All ${esc(state)} districts</button>
    <button class="navbtn" onclick="go('#/')">🗺 Back to the 3D map</button>
  </div>
  <div class="pcredit">Photographs are from Wikimedia Commons under their respective free licences and are
  shown for educational, non-commercial demonstration. Verified text is human-written and human-checked.</div>`;

  html += `<div class="pbackrow">
      <button class="pnav" onclick="go('#/')" style="color:var(--saffron2)">← Map</button>
      <button class="pnav" onclick="go('#/state/${encodeURIComponent(state)}')">${esc(state)}</button>
      ${navItems.join('')}
    </div><div class="pbody">${body}</div>`;

  const page = $('#page');
  page.innerHTML = html;
  page.scrollTop = 0;
  page.classList.add('open');
  document.title = district + ', ' + state + ' — Bharat Yatra';
}

function jumpTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function speakPageFull() {
  const el = $('#page');
  speak(el.innerText.slice(0, 4000), 'en-IN');
}

/* AI regional artwork as the state banner, with the real photograph
   fading in on top of it when (and only when) it loads. */
function stateBanner(state, s) {
  const b = AI.banner(state);
  return `<div class="statebanner" style="background-image:url('${esc(b.url)}')">
    <img class="fallbg" src="${esc(b.url)}" alt="" aria-hidden="true"
         onerror="this.closest('.statebanner').style.backgroundImage='url(${esc(b.alt)})';this.remove()">
    ${s && s.img ? `<img class="real" src="${esc(s.img)}" alt="${esc(state)}"
         onload="this.classList.add('in')" onerror="this.remove()">` : ''}
    <span>${esc(state)}</span>
    <i class="reg">${esc(b.region)} india</i></div>`;
}


/* if a bundled illustration is missing, degrade to the honest "photo needed" tile */
function artFail(img) {
  const ph = img.parentNode, alt = img.alt || '';
  img.remove();
  ph.classList.add('need');
  ph.onclick = e => { e.stopPropagation(); go('#/contribute/' + encodeURIComponent(PCTX.s) + '/' + encodeURIComponent(PCTX.d)); };
  const badge = ph.querySelector('.illus'); if (badge) badge.remove();
  ph.insertAdjacentHTML('afterbegin',
    `<div class="needin"><span class="ic">📷</span><b>Photo needed</b><em>${esc(alt)}</em><u>Add yours →</u></div>`);
}

/* ==================================================================
   ENTRY-PAGE SECTIONS BELOW THE MAP
   ================================================================== */
const REGION_LABEL = {
  north: 'The Gangetic North', desert: 'Desert & Western India', himalaya: 'The Himalaya',
  northeast: 'The Northeast', east: 'The East', central: 'Central India',
  south: 'The South', coast: 'Coast & Islands'
};

function renderHome() {
  /* --- regions --- */
  const byRegion = {};
  Object.keys(DISTRICTS).forEach(s => {
    const r = AI.stateRegion[s] || 'north';
    (byRegion[r] = byRegion[r] || []).push(s);
  });
  const rg = $('#regionGrid');
  if (rg) rg.innerHTML = Object.keys(REGION_LABEL).map(r => {
    const states = byRegion[r] || [];
    const nd = states.reduce((a, s) => a + DISTRICTS[s].length, 0);
    const b = AI.dir + AI.region[r];
    const alt = AI.dir + (AI.regionFallback[r] || 'bg-1.jpg');
    return `<div class="rcard" onclick="go('#/region/${r}')">
      <img loading="lazy" src="${b}" alt="${esc(REGION_LABEL[r])}" onerror="this.src='${alt}'">
      <span class="art">illustration</span>
      <div class="lb"><b>${esc(REGION_LABEL[r])}</b>
        <small>${states.length} states · ${nd} districts</small></div></div>`;
  }).join('');

  /* --- featured district guides --- */
  const feat = ['Uttar Pradesh|Agra', 'Rajasthan|Jaisalmer', 'Meghalaya|East Khasi Hills',
    'Karnataka|Ballari (Bellary)', 'Kerala|Alappuzha', 'Ladakh|Leh',
    'Tamil Nadu|Thanjavur', 'Gujarat|Kachchh'];
  const fg = $('#featuredGrid');
  if (fg) fg.innerHTML = feat.filter(k => CONTENT.districts[k]).map(k => {
    const [st, di] = k.split('|'); const c = CONTENT.districts[k];
    const art = AI.banner(st);
    return `<div class="fcard" onclick="go('#/d/${encodeURIComponent(st)}/${encodeURIComponent(di)}')">
      <div class="im"><img loading="lazy" src="${esc(c.hero || art.url)}" alt="${esc(di)}"
        onerror="this.src='${esc(art.url)}'">
        ${c.unesco ? '<span class="tag">UNESCO</span>' : '<span class="tag">Verified</span>'}</div>
      <div class="tx"><b>${esc(di)}</b><small>${esc(st)} · ${esc(c.tagline)}</small></div></div>`;
  }).join('');

  /* --- newest community entries --- */
  const cg = $('#communityGrid');
  if (cg) {
    const list = COMMUNITY.slice().reverse().slice(0, 8);
    cg.innerHTML = list.length ? list.map(x => {
      const art = AI.banner(x.state);
      return `<div class="fcard" onclick="go('#/d/${encodeURIComponent(x.state)}/${encodeURIComponent(x.district)}')">
        <div class="im"><img loading="lazy" src="${esc(x.photo || art.url)}" alt="${esc(x.title)}"
          onerror="this.src='${esc(art.url)}'">
          <span class="tag">${esc(x.category)}</span></div>
        <div class="tx"><b>${esc(x.title)}</b>
          <small>${esc(x.district)}, ${esc(x.state)} · ${esc(x.contributor)}</small></div></div>`;
    }).join('') : `<div class="note">No community entries yet — be the first.</div>`;
  }
}

/* one region -> its states, with the regional painting as the banner */
function viewRegion(region) {
  const states = Object.keys(DISTRICTS).filter(s => (AI.stateRegion[s] || 'north') === region);
  if (!states.length) { go('#/'); return; }
  const b = AI.banner(states[0]);
  const cards = states.map(s => {
    const sc = CONTENT.states[s] || {};
    const nd = DISTRICTS[s].length;
    const nc = Object.keys(CONTENT.districts).filter(k => k.startsWith(s + '|')).length;
    return `<div class="dcard withimg" onclick="go('#/state/${encodeURIComponent(s)}')">
      <img class="thumb" loading="lazy" src="${esc(sc.img || b.url)}" alt="${esc(s)}"
        onerror="this.src='${esc(b.url)}'">
      <b>${esc(s)}</b><small>${nd} ${esc(t('districts'))} · ${nc} ${esc(t('curated'))}</small></div>`;
  }).join('');
  openSheet(esc(REGION_LABEL[region] || region),
    `${states.length} ${esc(t('states'))}`,
    `<div class="statebanner" style="background-image:url('${esc(b.url)}')">
       <span>${esc(REGION_LABEL[region] || region)}</span><i class="reg">illustration</i></div>
     <div class="grid">${cards}</div>`);
}


/* fade the map hint out once the visitor scrolls into the image sections */
window.addEventListener('scroll', () => {
  const h = document.getElementById('maphint');
  if (!h) return;
  const y = window.scrollY;
  h.style.opacity = y > 60 ? 0 : 1;
  h.style.transition = 'opacity .3s';
  const cue = document.querySelector('.scrollcue');
  if (cue) cue.style.opacity = y > 60 ? 0 : 1;
}, { passive: true });
