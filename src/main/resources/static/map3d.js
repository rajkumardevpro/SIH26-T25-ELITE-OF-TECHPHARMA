/* ------------------------------------------------------------------
   map3d.js — the 3D India: extruded state solids built at runtime from
   simplified boundary polygons. No map tiles, no external services.
   Bar height of each state = how well documented it is in the platform,
   so the map itself is a data visualisation of the heritage gap.
------------------------------------------------------------------- */
const Map3D = (function () {
  let scene, camera, renderer, controls, raycaster, mouse, root, statesGroup,
      markerGroup, hovered = null, selected = null, ready = false, cb = {},
      clock, dust, rings = [], glow = [];
  const LON0 = 80.0, LAT0 = 22.4, K = 1.0;
  const meshes = [];

  const PALETTE = [0x2b3b6b, 0x3a2f5e, 0x24485c, 0x4a3355, 0x2f4d4a, 0x513a3a,
                   0x35406e, 0x2c5350, 0x46315e, 0x1f3a5c];

  function supported() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function init(el, callbacks) {
    cb = callbacks || {};
    if (!supported() || typeof THREE === 'undefined') return false;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07070f, 0.011);

    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 600);
    camera.position.set(6, 42, 44);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    el.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.minDistance = 14;
    controls.maxDistance = 95;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minPolarAngle = 0.15;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.42;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x0a0a14, 0.55));
    const key = new THREE.DirectionalLight(0xfff0dd, 1.15);
    key.position.set(-18, 34, 20); scene.add(key);
    const rim = new THREE.DirectionalLight(0xff8a2b, 0.85);
    rim.position.set(24, 14, -26); scene.add(rim);
    const fill = new THREE.PointLight(0x5b7cff, 0.9, 140);
    fill.position.set(18, 22, 26); scene.add(fill);

    root = new THREE.Group();
    root.rotation.x = -Math.PI / 2;
    scene.add(root);

    statesGroup = new THREE.Group(); root.add(statesGroup);
    markerGroup = new THREE.Group(); root.add(markerGroup);

    buildRings();
    buildDust();

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2(-9, -9);
    clock = new THREE.Clock();

    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; });
    renderer.domElement.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);

    ready = true;
    animate();
    return true;
  }

  /* --------------------------------------------------------- decoration */
  function buildRings() {
    for (let i = 0; i < 3; i++) {
      const g = new THREE.RingGeometry(20 + i * 5.5, 20.12 + i * 5.5, 128);
      const m = new THREE.MeshBasicMaterial({
        color: [0xff8a2b, 0x5b7cff, 0x1fc98b][i],
        transparent: true, opacity: 0.16 - i * 0.035, side: THREE.DoubleSide
      });
      const r = new THREE.Mesh(g, m);
      r.position.z = -0.35 - i * 0.05;
      root.add(r); rings.push(r);
    }
    // dashed mandala ticks
    const tickGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 60) {
      const r1 = 18.4, r2 = 19.2;
      pts.push(Math.cos(a) * r1, Math.sin(a) * r1, -0.3, Math.cos(a) * r2, Math.sin(a) * r2, -0.3);
    }
    tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const ticks = new THREE.LineSegments(tickGeo,
      new THREE.LineBasicMaterial({ color: 0xffb566, transparent: true, opacity: 0.28 }));
    root.add(ticks); rings.push(ticks);
  }

  let ground = null;
  function setGround(url) {
    if (!ready) return;
    new THREE.TextureLoader().load(url, tex => {
      tex.anisotropy = 4;
      const g = new THREE.PlaneGeometry(78, 78);
      const m = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0.0, depthWrite: false
      });
      ground = new THREE.Mesh(g, m);
      ground.position.z = -1.2;          // sits under the extruded states
      root.add(ground);
      // gentle fade-in
      const t0 = performance.now();
      (function fade() {
        const k = Math.min(1, (performance.now() - t0) / 1400);
        m.opacity = 0.62 * k;
        if (k < 1) requestAnimationFrame(fade);
      })();
    });
  }

  function buildDust() {
    const n = 420, pos = [];
    for (let i = 0; i < n; i++)
      pos.push((Math.random() - .5) * 90, Math.random() * 34 - 4, (Math.random() - .5) * 90);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    dust = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xffcf9a, size: 0.16, transparent: true, opacity: 0.5, depthWrite: false
    }));
    scene.add(dust);
  }

  /* --------------------------------------------------------- geometry */
  function project(lon, lat) { return [(lon - LON0) * K, (lat - LAT0) * K]; }

  function load(geo, weights) {
    if (!ready) return;
    geo.forEach((st, i) => {
      const w = (weights && weights[st.name]) || 0;
      const depth = 0.55 + Math.min(w, 8) * 0.30;
      const color = PALETTE[i % PALETTE.length];
      const group = new THREE.Group();

      st.p.forEach(ring => {
        const shape = new THREE.Shape();
        ring.forEach((c, j) => {
          const [x, y] = project(c[0], c[1]);
          if (j === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
        });
        const geom = new THREE.ExtrudeGeometry(shape, {
          depth: depth, bevelEnabled: true, bevelThickness: 0.06,
          bevelSize: 0.05, bevelSegments: 1, curveSegments: 1
        });
        const mat = new THREE.MeshStandardMaterial({
          color: color, metalness: 0.35, roughness: 0.55,
          emissive: new THREE.Color(color).multiplyScalar(0.35),
          transparent: true, opacity: 1
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.userData.state = st.name;
        group.add(mesh);

        // top outline
        const opts = [];
        ring.forEach(c => { const [x, y] = project(c[0], c[1]); opts.push(new THREE.Vector3(x, y, depth + 0.07)); });
        const lg = new THREE.BufferGeometry().setFromPoints(opts);
        const line = new THREE.Line(lg, new THREE.LineBasicMaterial({
          color: 0xffd8ab, transparent: true, opacity: 0.42
        }));
        line.userData.outline = true;
        group.add(line);
      });

      group.userData = { state: st.name, depth: depth, baseColor: color, centroid: st.c, docs: w };
      statesGroup.add(group);
      meshes.push(group);
    });
    frameAll();
  }

  function frameAll() {
    const box = new THREE.Box3().setFromObject(statesGroup);
    const c = box.getCenter(new THREE.Vector3());
    statesGroup.position.x -= c.x; statesGroup.position.y -= c.y;
    markerGroup.position.copy(statesGroup.position);
  }

  /* -------------------------------------------------------- interaction */
  function onResize() {
    if (!ready) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    if (cb.onHoverMove) cb.onHoverMove(e.clientX, e.clientY);
  }

  function pick() {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(statesGroup.children, true);
    for (const h of hits) if (h.object.userData.state) return h.object.userData.state;
    return null;
  }

  function onClick() {
    const name = pick();
    if (name && cb.onPick) cb.onPick(name);
  }

  function setHover(name) {
    if (hovered === name) return;
    hovered = name;
    if (cb.onHover) cb.onHover(name);
  }

  function focus(name) {
    selected = name;
    controls.autoRotate = false;
    let target = null;
    meshes.forEach(g => {
      const on = g.userData.state === name;
      if (on) target = g;
      g.children.forEach(ch => {
        if (ch.userData.outline) { ch.material.opacity = on ? 0.95 : 0.10; return; }
        ch.material.opacity = name ? (on ? 1 : 0.22) : 1;
        ch.material.transparent = true;
      });
    });
    if (target) {
      const [x, y] = project(target.userData.centroid[0], target.userData.centroid[1]);
      const wx = x + statesGroup.position.x, wz = -(y + statesGroup.position.y);
      animateCam(new THREE.Vector3(wx, 0, wz), 20);
    }
  }

  function reset() {
    selected = null;
    meshes.forEach(g => g.children.forEach(ch => {
      ch.material.opacity = ch.userData.outline ? 0.42 : 1;
    }));
    clearMarkers();
    animateCam(new THREE.Vector3(0, 0, 0), 46);
    setTimeout(() => { controls.autoRotate = true; }, 1400);
  }

  let camAnim = null;
  function animateCam(target, dist) {
    const from = controls.target.clone();
    const camFrom = camera.position.clone();
    const dir = new THREE.Vector3(0.16, 0.78, 0.60).normalize();
    const camTo = target.clone().add(dir.multiplyScalar(dist));
    camAnim = { t: 0, from, target, camFrom, camTo };
  }

  /* ------------------------------------------------------------ markers */
  function clearMarkers() {
    while (markerGroup.children.length) {
      const m = markerGroup.children.pop();
      if (m.geometry) m.geometry.dispose();
      if (m.material && m.material.map) m.material.map.dispose();
    }
    glow = [];
  }

  function labelSprite(text) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.font = '600 34px Inter, sans-serif';
    const w = Math.ceil(ctx.measureText(text).width) + 40;
    c.width = w; c.height = 64;
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(12,12,24,.92)'); g.addColorStop(1, 'rgba(12,12,24,.72)');
    ctx.fillStyle = g;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, w, 64, 18); else ctx.rect(0, 0, w, 64);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,181,102,.75)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = '600 30px Inter, sans-serif';
    ctx.fillStyle = '#ffe9d2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(w / 26, 64 / 26, 1);
    return sp;
  }

  function setMarkers(list) {
    clearMarkers();
    list.forEach(m => {
      const [x, y] = project(m.lng, m.lat);
      const h = 2.4;
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, h, 8),
        new THREE.MeshBasicMaterial({ color: 0xff8a2b, transparent: true, opacity: 0.85 })
      );
      pillar.rotation.x = Math.PI / 2;
      pillar.position.set(x, y, 1.4 + h / 2);
      markerGroup.add(pillar);

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.30, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0xffd6a5 })
      );
      orb.position.set(x, y, 1.4 + h);
      orb.userData.base = 1.4 + h;
      markerGroup.add(orb); glow.push(orb);

      const sp = labelSprite(m.label);
      sp.position.set(x, y, 1.4 + h + 1.15);
      markerGroup.add(sp);
    });
  }

  /* -------------------------------------------------------------- loop */
  function animate() {
    requestAnimationFrame(animate);
    if (!ready) return;
    const dt = clock.getDelta(), t = clock.elapsedTime;

    if (camAnim) {
      camAnim.t = Math.min(1, camAnim.t + dt * 1.15);
      const e = 1 - Math.pow(1 - camAnim.t, 3);
      controls.target.lerpVectors(camAnim.from, camAnim.target, e);
      camera.position.lerpVectors(camAnim.camFrom, camAnim.camTo, e);
      if (camAnim.t >= 1) camAnim = null;
    }

    const name = camAnim ? hovered : pick();
    setHover(name);

    meshes.forEach(g => {
      const isHover = g.userData.state === hovered;
      const isSel = g.userData.state === selected;
      const targetZ = isSel ? 1.1 : (isHover ? 0.55 : 0);
      g.position.z += (targetZ - g.position.z) * Math.min(1, dt * 9);
      g.children.forEach(ch => {
        if (ch.userData.outline) return;
        const base = new THREE.Color(g.userData.baseColor);
        const want = isSel ? new THREE.Color(0xff8a2b)
          : isHover ? new THREE.Color(0x1fc98b) : base;
        ch.material.color.lerp(want, Math.min(1, dt * 8));
        ch.material.emissive.lerp(want.clone().multiplyScalar(isHover || isSel ? 0.5 : 0.28),
          Math.min(1, dt * 8));
      });
    });

    rings.forEach((r, i) => { r.rotation.z += dt * (0.05 + i * 0.02) * (i % 2 ? -1 : 1); });
    if (ground) ground.rotation.z -= dt * 0.012;
    glow.forEach((o, i) => { o.position.z = o.userData.base + Math.sin(t * 2.2 + i) * 0.22; });
    if (dust) dust.rotation.y += dt * 0.012;

    renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab';
    controls.update();
    renderer.render(scene, camera);
  }

  return { init, load, focus, reset, setMarkers, setGround, supported, isReady: () => ready };
})();
