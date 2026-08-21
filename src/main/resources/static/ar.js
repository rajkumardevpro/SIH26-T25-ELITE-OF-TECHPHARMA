/* ------------------------------------------------------------------
   ar.js — AR Heritage Finder.

   Opens the rear camera, reads the compass and GPS, and floats the
   heritage sites around you onto the live view with their true bearing
   and distance. Point the phone at the horizon and the monuments that
   lie that way appear, nearest first.

   Everything runs on-device: camera + magnetometer + the coordinates
   already bundled in content.json. No map service, no network calls.
------------------------------------------------------------------- */
const AR = (function () {
  let el, video, cv, ctx, stream = null, raf = null;
  let heading = 0, haveHeading = false, pitch = 0;
  let me = null, targets = [], focusName = null, statusMsg = 'Starting…';

  const R = 6371; // km
  const rad = d => d * Math.PI / 180;
  const deg = r => r * 180 / Math.PI;

  function distKm(a, b) {
    const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function bearing(a, b) {
    const dLon = rad(b[1] - a[1]);
    const y = Math.sin(dLon) * Math.cos(rad(b[0]));
    const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) -
      Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(dLon);
    return (deg(Math.atan2(y, x)) + 360) % 360;
  }
  function compassLabel(b) {
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(b / 45) % 8];
  }

  /* ------------------------------------------------------------ open */
  async function open(focusState, focusDistrict) {
    focusName = focusDistrict || null;
    build();
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    buildTargets();

    /* camera */
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false
      });
      video.srcObject = stream;
      await video.play();
      statusMsg = '';
    } catch (e) {
      statusMsg = 'Camera blocked — the compass still works below.';
      el.classList.add('nocam');
    }

    /* compass */
    const attach = () => {
      window.addEventListener('deviceorientationabsolute', onOrient, true);
      window.addEventListener('deviceorientation', onOrient, true);
    };
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { if (await DeviceOrientationEvent.requestPermission() === 'granted') attach(); }
      catch (e) { /* ignore */ }
    } else attach();

    /* location */
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        p => { me = [p.coords.latitude, p.coords.longitude]; buildTargets(); },
        () => { statusMsg = 'Location denied — showing directions from Delhi.'; me = me || [28.6139, 77.2090]; buildTargets(); },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 }
      );
    } else { me = [28.6139, 77.2090]; }

    resize();
    loop();
  }

  function close() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    window.removeEventListener('deviceorientationabsolute', onOrient, true);
    window.removeEventListener('deviceorientation', onOrient, true);
    if (el) el.classList.remove('open');
    document.body.style.overflow = '';
  }

  function onOrient(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;      // iOS
    else if (e.absolute && typeof e.alpha === 'number') h = 360 - e.alpha;           // Android
    else if (typeof e.alpha === 'number') h = 360 - e.alpha;
    if (h != null && !isNaN(h)) { heading = (h + 360) % 360; haveHeading = true; }
    if (typeof e.beta === 'number') pitch = e.beta;
  }

  /* --------------------------------------------------------- targets */
  function buildTargets() {
    if (typeof CONTENT === 'undefined' || !me) { targets = []; return; }
    const out = [];
    Object.keys(CONTENT.districts).forEach(k => {
      const d = CONTENT.districts[k];
      if (!d.coords) return;
      const [st, di] = k.split('|');
      out.push({
        name: di, state: st, key: k, unesco: !!d.unesco,
        tag: d.tagline,
        km: distKm(me, d.coords),
        brg: bearing(me, d.coords),
        focus: focusName === di
      });
    });
    out.sort((a, b) => (b.focus - a.focus) || (a.km - b.km));
    targets = out.slice(0, 14);
  }

  /* ----------------------------------------------------------- build */
  function build() {
    if (el) return;
    el = document.createElement('div');
    el.id = 'arStage';
    el.innerHTML = `
      <video id="arVid" playsinline muted></video>
      <canvas id="arCv"></canvas>
      <div class="arhud">
        <div class="arttl"><b>AR Heritage Finder</b><span id="arStatus"></span></div>
        <div class="vrbtns">
          <button class="vrb" id="arCal" title="Wave the phone in a figure-8 to calibrate">🧭</button>
          <button class="vrb x" id="arExit">✕</button>
        </div>
      </div>
      <div class="arlist" id="arList"></div>
      <div class="vrhint" id="arHint">Point your phone at the horizon and turn slowly</div>`;
    document.body.appendChild(el);
    video = el.querySelector('#arVid');
    cv = el.querySelector('#arCv');
    ctx = cv.getContext('2d');
    el.querySelector('#arExit').onclick = close;
    el.querySelector('#arCal').onclick = () =>
      hint('Wave the phone in a figure-8 to calibrate the compass');
    window.addEventListener('resize', resize);
  }

  function hint(t) {
    const h = el.querySelector('#arHint');
    if (h) { h.textContent = t; h.style.opacity = 1; setTimeout(() => h.style.opacity = .5, 3000); }
  }
  function resize() {
    if (!cv) return;
    cv.width = window.innerWidth * Math.min(devicePixelRatio, 2);
    cv.height = window.innerHeight * Math.min(devicePixelRatio, 2);
    cv.style.width = window.innerWidth + 'px';
    cv.style.height = window.innerHeight + 'px';
  }

  /* ------------------------------------------------------------ draw */
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!ctx) return;
    const W = cv.width, H = cv.height, S = Math.min(devicePixelRatio, 2);
    ctx.clearRect(0, 0, W, H);

    const fov = 62;                                   // horizontal degrees on screen
    const cxm = W / 2, horizon = H * 0.52 - (pitch - 90) * 5 * S;

    /* compass strip */
    ctx.save();
    ctx.font = `${13 * S}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    for (let b = 0; b < 360; b += 15) {
      let rel = ((b - heading + 540) % 360) - 180;
      if (Math.abs(rel) > fov / 2) continue;
      const x = cxm + (rel / (fov / 2)) * (W / 2);
      const major = b % 45 === 0;
      ctx.strokeStyle = major ? 'rgba(255,181,102,.9)' : 'rgba(255,255,255,.35)';
      ctx.lineWidth = major ? 2 * S : 1 * S;
      ctx.beginPath();
      ctx.moveTo(x, 74 * S); ctx.lineTo(x, (major ? 92 : 84) * S); ctx.stroke();
      if (major) {
        ctx.fillStyle = 'rgba(255,233,210,.95)';
        ctx.fillText(compassLabel(b), x, 110 * S);
      }
    }
    ctx.restore();

    /* markers */
    const drawn = [];
    targets.forEach((t, i) => {
      let rel = ((t.brg - heading + 540) % 360) - 180;
      if (Math.abs(rel) > fov / 2 + 6) return;
      const x = cxm + (rel / (fov / 2)) * (W / 2);
      // nearer sites sit lower on screen, far ones near the horizon
      const near = Math.max(0, Math.min(1, 1 - t.km / 900));
      let y = horizon + near * H * 0.16 + (i % 3) * 34 * S;
      while (drawn.some(d => Math.abs(d.x - x) < 190 * S && Math.abs(d.y - y) < 46 * S))
        y += 52 * S;
      drawn.push({ x, y });

      const label = t.name;
      const sub = (t.km < 1 ? 'you are here' :
                   t.km < 10 ? t.km.toFixed(1) + ' km' : Math.round(t.km) + ' km')
                  + ' · ' + compassLabel(t.brg);
      ctx.font = `600 ${17 * S}px Inter, sans-serif`;
      const w = Math.max(ctx.measureText(label).width, 120 * S) + 34 * S;
      const h = 52 * S;

      ctx.save();
      ctx.globalAlpha = t.focus ? 1 : 0.92;
      ctx.fillStyle = t.focus ? 'rgba(255,138,43,.92)'
        : t.unesco ? 'rgba(20,34,72,.85)' : 'rgba(10,10,20,.78)';
      ctx.strokeStyle = t.focus ? '#fff' : 'rgba(255,181,102,.75)';
      ctx.lineWidth = 2 * S;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, 16 * S);
      else ctx.rect(x - w / 2, y - h / 2, w, h);
      ctx.fill(); ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = t.focus ? '#1a0a02' : '#ffe9d2';
      ctx.font = `600 ${17 * S}px Inter, sans-serif`;
      ctx.fillText(label, x, y - 4 * S);
      ctx.fillStyle = t.focus ? 'rgba(26,10,2,.8)' : 'rgba(255,255,255,.62)';
      ctx.font = `${12.5 * S}px Inter, sans-serif`;
      ctx.fillText(sub, x, y + 15 * S);

      // stalk down to the ground
      ctx.strokeStyle = t.focus ? 'rgba(255,138,43,.7)' : 'rgba(255,181,102,.35)';
      ctx.lineWidth = 1.6 * S;
      ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x, y + h / 2 + 34 * S); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y + h / 2 + 38 * S, 4.5 * S, 0, 6.29); ctx.fill();
      ctx.restore();
    });

    /* status + nearest list */
    const st = el.querySelector('#arStatus');
    if (st) st.textContent = statusMsg ||
      (!haveHeading ? 'Compass warming up — wave the phone in a figure-8'
        : !me ? 'Waiting for GPS…'
        : targets.length ? `${targets.length} heritage sites around you` : 'No sites in range');

    const list = el.querySelector('#arList');
    if (list && targets.length) {
      list.innerHTML = targets.slice(0, 3).map(t =>
        `<button class="arrow" onclick="AR.close();go('#/d/${encodeURIComponent(t.state)}/${encodeURIComponent(t.name)}')">
           <b>${t.name}</b><span>${t.km < 10 ? t.km.toFixed(1) : Math.round(t.km)} km ${compassLabel(t.brg)}</span>
         </button>`).join('');
    }
  }

  return { open, close, get targets() { return targets; } };
})();
