/* ------------------------------------------------------------------
   vr.js — 360° VR walk-in for every district.

   Works in three modes, all offline:
     • Desktop  — drag to look around
     • Phone    — gyroscope look (tilt the phone and the view follows)
     • Cardboard— split-screen stereo for a ₹200 VR viewer
   Uses the panorama bundled with the app, so it needs no network.
------------------------------------------------------------------- */
const VR = (function () {
  let scene, cam, renderer, sphere, raf = null, el;
  let lon = 0, lat = 0, drag = false, px = 0, py = 0;
  let gyro = false, stereo = false, orient = null;
  let title = '', place = '';

  const PANO = {
    north: 'pano-north.jpg', desert: 'pano-desert.jpg', himalaya: 'pano-himalaya.jpg',
    northeast: 'pano-northeast.jpg', east: 'pano-east.jpg', central: 'pano-central.jpg',
    south: 'pano-south.jpg', coast: 'pano-coast.jpg'
  };

  function panoFor(state) {
    const r = (typeof ART !== 'undefined' && ART.stateRegion[state]) || 'north';
    return 'img/pano/' + (PANO[r] || PANO.north);
  }

  /* ------------------------------------------------------------ open */
  function open(state, district, hotspots) {
    if (typeof THREE === 'undefined') { alert('3D is not available in this browser.'); return; }
    place = district || state; title = state;
    build();
    const url = panoFor(state);

    const loader = new THREE.TextureLoader();
    setStatus('Loading the 360° view…');
    loader.load(url, tex => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      const geo = new THREE.SphereGeometry(500, 60, 40);
      geo.scale(-1, 1, 1);                       // render on the inside
      sphere = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));
      scene.add(sphere);
      addHotspots(hotspots || []);
      setStatus('');
    }, undefined, () => setStatus('Could not load the panorama.'));

    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    loop();
  }

  function close() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    window.removeEventListener('deviceorientation', onOrient);
    if (el) el.classList.remove('open');
    document.body.style.overflow = '';
    if (renderer) { renderer.dispose(); renderer.domElement.remove(); renderer = null; }
    scene = null; sphere = null; gyro = false; stereo = false; lon = 0; lat = 0;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  /* ----------------------------------------------------------- build */
  function build() {
    if (!el) {
      el = document.createElement('div');
      el.id = 'vrStage';
      el.innerHTML = `
        <div class="vrhud">
          <div class="vrtitle"><b id="vrPlace"></b><span id="vrStatus"></span></div>
          <div class="vrbtns">
            <button class="vrb" id="vrGyro" title="Move the phone to look around">📱 Gyro</button>
            <button class="vrb" id="vrCard" title="Split screen for a Cardboard viewer">🥽 VR</button>
            <button class="vrb" id="vrFull" title="Full screen">⛶</button>
            <button class="vrb x" id="vrExit">✕</button>
          </div>
        </div>
        <div class="vrhint" id="vrHint">Drag to look around · pinch or scroll to zoom</div>
        <div class="vrreticle"></div>`;
      document.body.appendChild(el);
      el.querySelector('#vrExit').onclick = close;
      el.querySelector('#vrGyro').onclick = toggleGyro;
      el.querySelector('#vrCard').onclick = toggleStereo;
      el.querySelector('#vrFull').onclick = () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else el.requestFullscreen && el.requestFullscreen().catch(() => {});
      };
      el.addEventListener('pointerdown', e => { drag = true; px = e.clientX; py = e.clientY; });
      el.addEventListener('pointermove', e => {
        if (!drag || gyro) return;
        lon -= (e.clientX - px) * 0.16;
        lat += (e.clientY - py) * 0.16;
        lat = Math.max(-85, Math.min(85, lat));
        px = e.clientX; py = e.clientY;
      });
      window.addEventListener('pointerup', () => { drag = false; });
      el.addEventListener('wheel', e => {
        cam.fov = Math.max(35, Math.min(100, cam.fov + e.deltaY * 0.05));
        cam.updateProjectionMatrix();
      }, { passive: true });
      window.addEventListener('resize', resize);
    }
    el.querySelector('#vrPlace').textContent = place;

    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1100);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    el.insertBefore(renderer.domElement, el.firstChild);
  }

  function setStatus(s) {
    const n = el && el.querySelector('#vrStatus');
    if (n) n.textContent = s;
  }

  /* --------------------------------------------------------- hotspots */
  function addHotspots(list) {
    list.slice(0, 5).forEach((h, i) => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      ctx.font = '600 30px Inter, sans-serif';
      const w = Math.ceil(ctx.measureText(h).width) + 56;
      c.width = w; c.height = 76;
      ctx.fillStyle = 'rgba(10,10,20,.82)';
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(0, 0, w, 76, 22); ctx.fill(); }
      else ctx.fillRect(0, 0, w, 76);
      ctx.strokeStyle = 'rgba(255,181,102,.85)'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#ffe9d2'; ctx.font = '600 27px Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('◈  ' + h, w / 2, 39);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c), transparent: true, depthTest: false
      }));
      const a = (i / Math.max(1, list.slice(0, 5).length)) * Math.PI * 2;
      sp.position.set(Math.sin(a) * 300, -20 + (i % 2) * 45, Math.cos(a) * 300);
      sp.scale.set(w / 4.2, 76 / 4.2, 1);
      scene.add(sp);
    });
  }

  /* ------------------------------------------------------------ gyro */
  function toggleGyro() {
    if (gyro) { gyro = false; window.removeEventListener('deviceorientation', onOrient); flag('#vrGyro', false); return; }
    const start = () => {
      gyro = true; flag('#vrGyro', true);
      window.addEventListener('deviceorientation', onOrient);
      hint('Move your phone to look around');
    };
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(p => p === 'granted' ? start() : hint('Motion access was denied'))
        .catch(() => hint('Motion access is unavailable'));
    } else if (window.DeviceOrientationEvent) start();
    else hint('This device has no motion sensor — drag instead');
  }

  function onOrient(e) { orient = e; }

  function toggleStereo() {
    stereo = !stereo;
    flag('#vrCard', stereo);
    hint(stereo ? 'Put the phone in a Cardboard viewer 🥽' : 'Drag to look around');
    resize();
  }

  function flag(sel, on) {
    const b = el.querySelector(sel);
    if (b) b.classList.toggle('on', on);
  }
  function hint(t) {
    const h = el.querySelector('#vrHint');
    if (h) { h.textContent = t; h.style.opacity = 1; setTimeout(() => h.style.opacity = .45, 2600); }
  }
  function resize() {
    if (!renderer) return;
    renderer.setSize(window.innerWidth, window.innerHeight);
    cam.aspect = (stereo ? window.innerWidth / 2 : window.innerWidth) / window.innerHeight;
    cam.updateProjectionMatrix();
  }

  /* ------------------------------------------------------------ loop */
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!renderer || !scene) return;

    if (gyro && orient) {
      lon = -(orient.alpha || 0);
      lat = Math.max(-85, Math.min(85, (orient.beta || 0) - 90));
    } else if (!drag) {
      lon += 0.022;                                   // slow idle drift
    }
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon);
    cam.lookAt(
      500 * Math.sin(phi) * Math.cos(theta),
      500 * Math.cos(phi),
      500 * Math.sin(phi) * Math.sin(theta)
    );

    const W = window.innerWidth, H = window.innerHeight;
    if (stereo) {
      const half = W / 2;
      cam.aspect = half / H; cam.updateProjectionMatrix();
      renderer.setScissorTest(true);
      renderer.setViewport(0, 0, half, H); renderer.setScissor(0, 0, half, H);
      cam.position.x = -0.55; renderer.render(scene, cam);
      renderer.setViewport(half, 0, half, H); renderer.setScissor(half, 0, half, H);
      cam.position.x = 0.55; renderer.render(scene, cam);
      renderer.setScissorTest(false);
      cam.position.x = 0;
    } else {
      renderer.setViewport(0, 0, W, H);
      renderer.render(scene, cam);
    }
  }

  return { open, close };
})();
