# 🇮🇳 Bharat Yatra
### Every district of India, told properly — a 3D heritage discovery and community documentation platform

**Smart India Hackathon · Problem Statement: Tourism, Heritage & Culture**

Built with **core Java** (zero backend dependencies) and plain HTML, CSS and JavaScript.

---

## The problem we address

India has **700+ districts**. National tourism portals cover roughly sixty of them.
Everything else — the stepwell three streets away, the Theyyam in a village grove, the
weaving cluster behind a bus stand — is **undocumented, therefore invisible, therefore
unvisited, therefore unfunded, therefore lost**.

What little documentation exists is often unreliable, English-only, and written for an
outside visitor rather than for the community that owns the heritage.

**Our specific sub-problem:** the documentation gap in India's lesser-known districts, and
the reliability of the information that does exist.

---

## What it does

| | |
|---|---|
| **Discovery** | 3D map of India → state → district. All **37 States/UTs** and **725 districts**. Hidden-gem sections, GPS "Near me", an AR finder and global search. |
| **Interpretation** | Every monument carries its **era** and **why it matters** — not just a name and a photo. |
| **Accessibility** | **12 Indian languages** with read-aloud, high-contrast/large-text mode, and a physical-accessibility note per district. |
| **Preservation** | Locals document what guidebooks miss, including **intangible heritage** — festivals, dialects, crafts, performance. |
| **Responsible promotion** | Site-specific etiquette (not generic advice), community homestays listed above hotels, buy-direct-from-the-artisan guidance. |
| **Getting there** | Nearest airport (IATA) and railhead (station code) with **numbered, priced steps** from both. |
| **Immersive** | 360° VR walk-in (gyroscope + Cardboard) and camera-based AR with true compass bearing and distance. |
| **Offline** | Installable PWA — the map, all district data and the artwork are bundled and work with no network. |

### Reliability model
Two layers that never mix:

```
COMMUNITY  (added by a local)
    ↓  five independent confirmations
COMMUNITY-REVIEWED
    ↓  approval by a district tourism officer / ASI-listed guide
VERIFIED   (human-written, human-checked heritage content)
```

Community submissions are stored and displayed **separately** and can never overwrite
verified content. Photographs are checked too: if a candidate image's filename shares no
meaningful word with the monument's name it is rejected, and the card shows an honest
*"Photo needed — add yours"* instead of a wrong picture.

---

## Run it

**Requires only a JDK 11+.** No Maven, no Spring, no database, no npm.

### IntelliJ IDEA
1. `File → Open…` → select this folder
2. Open `src/main/java/in/bharatyatra/App.java`
3. Click ▶ next to `main`
4. Open <http://localhost:8080>

### Terminal
```bash
./run.sh        # macOS / Linux
run.bat         # Windows
```

The console prints a LAN address as well, so a phone on the same Wi-Fi can open it.
The in-app **▦** button generates a QR code for that address.

---

## Deploy

The included `Dockerfile` is a multi-stage build (compile with the JDK, ship a JRE) and
works as-is on **Render, Railway, Koyeb, Fly.io and Google Cloud Run**. The app reads the
`PORT` environment variable and binds `0.0.0.0`.

Optional: set `KEEPALIVE_URL` to your public `/api/health` so a free instance never
hibernates.

---

## Architecture

```
Browser / Phone            Java HTTP server              JSON data store
3D map · VR · AR    <-->   static files + REST API  <-->  districts · content
read-aloud · offline       single process, ~8 MB          community entries
```

The heavy work — 3D rendering, VR, AR — happens on the visitor's own device. The server
only hands over files, which is why it runs comfortably on a free tier.

### Project layout
```
src/main/java/in/bharatyatra/
      App.java             the whole backend — HTTP server + REST API, ~600 lines
      ImageFetcher.java    utility: resolves and verifies photographs
src/main/resources/static/
      index.html  style.css  app.js        UI and routing
      map3d.js                             the 3D India (three.js + WebGL)
      vr.js  ar.js                         360° VR and camera AR
      i18n.js                              12 Indian languages
      artwork.js                           regional illustration mapping
      sw.js  manifest.webmanifest          offline + installable
      data/districts.json                  725 districts across 37 States/UTs
      data/india-states.json               simplified state boundaries
      data/content.json                    heritage content + transport + photos
      img/art/  img/pano/                  bundled illustrations and VR panoramas
      vendor/                              three.js, OrbitControls, qrcode.js
data/contributions.json                    community submissions (runtime)
tools/                                     scripts used once to build the datasets
Dockerfile  render.yaml                    deployment
```

### Technology
- **Backend:** Core Java 11, `com.sun.net.httpserver` (built into the JDK). **Zero external
  dependencies** — no Spring, no ORM, no database driver.
- **Frontend:** HTML5, CSS3, vanilla JavaScript.
- **3D/VR:** three.js + WebGL — the only third-party library in the project, bundled in
  `vendor/` rather than fetched at runtime.
- **AR:** device camera, magnetometer and GPS; haversine distance and great-circle bearing
  computed on-device. No AR SDK.
- **Data:** JSON files. Every write goes through a single method, so moving to PostgreSQL
  is a small, contained change.

### API
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | liveness + LAN address |
| GET | `/api/states` | all states with their districts |
| GET | `/api/districts?state=` | districts of one state |
| GET | `/api/place?state=&district=` | community entries for a district |
| GET | `/api/contributions` | all community entries |
| GET | `/api/stats` | dashboard counters |
| POST | `/api/contribute` | add a place (form-encoded, optional photo ≤1 MB) |
| POST | `/api/vote` | confirm an entry; 5 confirmations ⇒ community-reviewed |

---

## Scope, honestly stated

- **48 districts** have deep verified guides; the remaining 677 open with state-level
  cultural context plus the community layer. **The gap is the point** — the platform exists
  so that locals fill it.
- State boundaries come from public-domain GIS data, simplified for browser rendering.
  They are **illustrative and not an official Survey of India map**.
- Photographs are from **Wikimedia Commons** under their respective free licences and are
  credited in the application. Illustrations are labelled *"Illustration"* in the interface
  and are never used to depict a specific monument.

## References
- Ministry of Tourism, Government of India — tourism.gov.in
- India Tourism Data Portal — indiatourismstats.gov.in
- Archaeological Survey of India — asi.nic.in
- UNESCO World Heritage & Intangible Cultural Heritage — whc.unesco.org
- Incredible India — incredibleindia.gov.in
- UNESCO 2003 Convention on Intangible Cultural Heritage; UNWTO Global Code of Ethics for
  Tourism; Swadesh Darshan & PRASHAD schemes; GI Registry of India; W3C WCAG.

## Roadmap
Offline-first distribution for low-connectivity heritage villages · verifier logins for
State Tourism Boards and ASI · UPI tips paid directly to artisans · AR overlays on the
monument itself · speech-based contribution in 12 languages so a maker who cannot type can
still document their own craft.
