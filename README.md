# 🇮🇳 Bharat Yatra
### Every district of India, told properly — a 3D heritage discovery + community documentation platform

**Smart India Hackathon · Problem Statement 5 — Tourism, Heritage & Culture**
Built in **pure Java (no frameworks, no dependencies)** + WebGL frontend.

---

## The problem we actually attack

India has 700+ districts. National tourism portals cover maybe 60 of them. Everything else —
the stepwell three streets from your house, the Theyyam in your grandmother's kavu, the bat
workshop in Meerut's Sports Colony — is **undocumented, so it is invisible, so it dies**.

Meanwhile the information that *does* exist online is often unreliable, monolingual, and
written for a foreign tourist rather than for the community that owns the heritage.

## Our answer

A single platform with **two layers that never contaminate each other**:

| Layer | Source | Label in the UI |
|---|---|---|
| **Verified guides** | Curated, human-checked heritage content for flagship districts | green `✓ VERIFIED` |
| **Community knowledge** | Uploaded by locals, guides, artisans, students, teachers | orange `COMMUNITY` → blue `COMMUNITY-REVIEWED` after 5 independent confirmations |

That separation is the reliability answer the problem statement asks for: **crowdsourcing without
letting crowdsourcing rewrite history.**

---

## What makes it different from the other SIH teams on this PS

Most teams will build a list of tourist places with a chatbot. We built:

1. **A real 3D map of India, generated at runtime.** Not an image, not Google Maps. Every state is
   extruded from actual boundary polygons in the browser with three.js. Drag, spin, zoom, click.
2. **The map is a data visualisation of the problem itself.** *A state's height = how much of it is
   documented.* Judges can literally see the heritage gap: Rajasthan stands tall, the Northeast is flat.
   As people contribute, the map grows. Nobody else will have that.
3. **Districts, not just cities.** All **725 districts** across **37 states/UTs** are navigable.
   State → district → full cultural profile.
4. **A cultural profile, not a "places to see" list.** Each district gives monuments *with their era
   and why they matter*, the festival calendar, street food, **where to stay including community
   homestays**, **phrases in the local language with audio**, crafts and GI-tagged products,
   hidden gems, and a responsible-travel checklist.
5. **12-language interface** (English, हिन्दी, বাংলা, தமிழ், తెలుగు, मराठी, ગુજરાતી, ಕನ್ನಡ, മലയാളം, ਪੰਜਾਬੀ, ଓଡ଼ିଆ, অসমীয়া)
   with **read-aloud** in Indian voices — accessibility for low-literacy and visually impaired users.
6. **Responsible tourism is not a footer.** Every district ships hard, specific warnings:
   *don't photograph cremations at Manikarnika · staying inside Jaisalmer Fort damages its drainage ·
   it is illegal to photograph the Jarawa · root bridges are load-limited · skip the Amber elephant ride.*
7. **Real photographs, honestly sourced.** Every district opens as a full **magazine-style page** with a
   full-bleed hero photo and image cards for each monument, festival, dish, craft and hidden gem —
   613 photographs resolved from **Wikimedia Commons** (CC-licensed) at build time, cached in the repo.
   Where no free photo exists, the card doesn't fake it: it shows a **"Photo needed — add yours"** tile
   that opens the contribution form. *The gap becomes the call to action.*
8. **Runs from a QR code.** One `java` process, no database, no build tool needed.

---

## Run it (IntelliJ IDEA — the way you'll demo it)

1. `File → Open…` → select the **`bharat-yatra`** folder.
2. If IntelliJ asks, mark `src/main/java` as **Sources Root** (right-click → Mark Directory as → Sources Root).
3. Open `src/main/java/in/bharatyatra/App.java` → click the green ▶ next to `public static void main`.
4. Open **http://localhost:8080**

That's it. **No Maven, no Gradle, no Spring, no internet needed.** It uses only `java.net`,
`java.nio` and the JDK's built-in `com.sun.net.httpserver`. Requires JDK 11+.

### Or from a terminal
```bash
./run.sh          # macOS / Linux
run.bat           # Windows
```

> **Judging tomorrow? Read [DEMO-DAY.md](DEMO-DAY.md)** — setup checklist, free hosting,
> QR instructions, the 90-second script and what to do when something breaks on stage.

### Demo on judges' phones (the QR trick)
The console prints a LAN address like `http://192.168.1.7:8080`. Put the judges' phones on the same
Wi-Fi, click **▦** in the header, and it renders a QR code of the live URL. They scan; it opens on
their phone; whatever they add appears on your projected screen instantly.

---

## Put it online for free

The app reads the `PORT` environment variable and binds `0.0.0.0`, so it deploys as-is.

**Full walkthrough: [HOST-GITHUB-RENDER.md](HOST-GITHUB-RENDER.md)**

**Render.com (easiest, free tier):** push this folder to GitHub → New → Web Service → *Docker* →
pick the repo. The included `Dockerfile` does everything. You get
`https://bharat-yatra.onrender.com`. Make the QR point at that and it works from anywhere.

Same `Dockerfile` works on **Railway**, **Koyeb**, **Fly.io** and **Google Cloud Run**.

> Free tiers use ephemeral disks — community uploads in `data/contributions.json` reset on redeploy.
> For the hackathon that's fine (and honest). Swapping `saveContributions()` for a Postgres write is
> a ~20-line change if a judge asks about scale.

---

## Architecture

```
bharat-yatra/
├── src/main/java/in/bharatyatra/
│     App.java            ← the whole backend, ~470 lines, 0 dependencies
│     ImageFetcher.java   ← run this to fill missing photos (incl. a tiny JSON parser)
├── src/main/resources/static/
│   ├── index.html          shell
│   ├── style.css           dark glass UI
│   ├── map3d.js            the 3D India (three.js scene built from polygons)
│   ├── app.js              router, rendering, contribute flow, speech, QR
│   ├── i18n.js             12-language interface strings
│   ├── data/india-states.json   36 simplified state boundaries (82 KB, from public GIS data)
│   ├── data/districts.json      725 districts across 37 states/UTs
│   ├── data/content.json        curated heritage content: 37 state profiles + 48 deep district
│   │                            guides + 613 Wikimedia Commons photo URLs
│   └── vendor/                  three.js, OrbitControls, qrcode.js — bundled locally, works offline
├── data/contributions.json   ← community uploads land here (created at runtime)
├── tools/                    Python scripts that generated the datasets (provenance is documented)
│     build_districts.py  · build_content.py
│     add_images.py       · fix_hero_images.py · verify_images.py   ← photo resolution + sanity checks
├── Dockerfile, render.yaml   free hosting
└── pom.xml                   optional, only if you want `mvn package`
```

### REST API
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/states` | all states with their districts |
| GET | `/api/districts?state=Bihar` | districts of a state |
| GET | `/api/place?state=&district=` | community entries for a district |
| GET | `/api/contributions` | every community entry |
| GET | `/api/stats` | dashboard counters |
| POST | `/api/contribute` | add a place (form-encoded, optional base64 photo ≤1 MB) |
| POST | `/api/vote` | confirm an entry; 5 confirmations ⇒ *community-reviewed* |

---

## Artwork: two layers, always honest

| Layer | Where it lives | Label shown |
|---|---|---|
| **AI illustrations** | `src/main/resources/static/img/ai/` — 25 images bundled in the app, 4.9 MB, **work offline** | `ILLUSTRATION` badge, or “· illustration” in the backdrop caption |
| **Real photographs** | hot-linked Wikimedia Commons, resolved at build time | credited on each district page |

The backdrop behind the 3D map is now six locally-stored AI paintings crossfading with a Ken-Burns
drift. Every state gets a **regional banner painting** (north / desert / himalaya / northeast /
east / central / south / coast) that renders instantly, with the real photo fading in on top of it
if it loads. Festival, dish and craft cards with no photograph fall back to a matching illustration.

Current coverage across the 48 curated district pages: **613 real photographs · 115 illustrations ·
159 honest "photo needed" tiles**. The bundled set is 6 backdrops, 8 regional banners, 5 festival
scenes, 5 food scenes and 1 artisan scene.

**Specific monuments never get an illustration** — a painting of "a temple town" must never be
passed off as a photo of somebody's actual temple. Those keep the honest *"Photo needed — add yours"*
tile instead. `ai-art.js` holds the whole mapping in one file.

---

## Photographs

**Missing photos? → see [HOW-TO-ADD-PHOTOS.md](HOW-TO-ADD-PHOTOS.md).**
The short version: in IntelliJ, right-click `src/main/java/in/bharatyatra/ImageFetcher.java` →
**Run 'ImageFetcher.main()'**, wait, restart `App`, hard-refresh. No Python required.

`tools/add_images.py` queries the Wikipedia/Wikimedia API for each item and bakes the resulting
image URLs into `content.json`; `verify_images.py` then throws away any photo whose filename shares
no word with the item's name, so a Varanasi ghat can never end up filed under the Taj Mahal.
Re-run either script any time to fill more gaps:

```bash
python3 tools/add_images.py       # resolve new photos (cached in tools/imgcache.json)
python3 tools/fix_hero_images.py  # force the 48 hero images to exact articles
python3 tools/verify_images.py    # drop mismatches
```

Images are hot-linked from Wikimedia Commons, so the app needs internet for photos (everything else
— the 3D map, the data, the contribution flow — works fully offline).

---

## 90-second demo script for the judges

1. **Land on the page.** India is rotating in 3D. *"Every solid is a real state boundary, extruded live
   in the browser. The height is how much of that state we've documented — that's the problem, visualised."*
1b. **The backdrop itself is India** — the Taj, Jaisalmer, the root bridges of Meghalaya, Hampi,
   Alappuzha, Leh — slowly crossfading behind the map with a Ken-Burns drift.
2. **Click Rajasthan.** It lifts, camera flies in, glowing pillars mark documented districts, panel
   slides in with 33 districts, the state's languages, a greeting you can play aloud.
3. **Click Jaisalmer** — the whole screen becomes a full district page: hero photograph, sticky
   section nav, image cards. Monuments with dates, Desert Festival, ker sangri, community homestays,
   two Marwari phrases with a speaker button, crafts, hidden gems — then the responsible-travel box:
   *"conservationists ask visitors not to stay inside the living fort; its drainage is failing."*
   *"That line is why this isn't a travel brochure."*
4. **Switch the language dropdown to हिन्दी.** Whole interface flips. Tap 🔊 — it reads aloud.
5. **Go to Meerut** (a district no tourism site covers). Show the community entries already there:
   the Suraj Kund stepwell, the cricket-bat workshops. *"A student and a resident wrote these."*
6. **Hit "+ Add a place"**, fill it in from your phone via the QR, submit — it appears on the big
   screen immediately, tagged `COMMUNITY`, never mixed with verified content.
7. **Add three districts to "My Yatra"** → print → a responsible-travel itinerary PDF.

---

## Honest scope notes (say these before a judge finds them)

- 48 districts have deep curated guides; the other 677 open with state-level cultural context plus
  the community layer. **The gap is the product**: the platform exists to get those 677 filled by locals.
- State boundaries are simplified public-domain GIS data for rendering, **not** an official
  Survey of India map, and Ladakh is not yet a separate polygon in that dataset (it is fully
  navigable in the district list).
- Content is human-written and human-checkable, not LLM-generated at runtime — deliberately, because
  the problem statement asks for information that is *reliable and contextually appropriate*.

---

## Where we'd take it next
Offline-first PWA for low-connectivity heritage villages · ASI / State Tourism Board verification
logins that promote community entries to verified · UPI tip jar that pays the artisan or homestay
directly · AR monument overlay from the district page · speech-to-text contribution in 12 languages
so a weaver who cannot type can still document their own craft.
