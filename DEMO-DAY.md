# 🎤 DEMO DAY — running Bharat Yatra for the judges

**Bharat Yatra** · Smart India Hackathon · *Tourism, Heritage & Culture*

Pick **one** of the three options below. Do **Option 1** at minimum — it always works,
even if the venue Wi-Fi collapses. Set up **Option 3** tonight as your backup.

---

# Option 1 — On your laptop (do this no matter what)

**The night before**
1. Unzip the project somewhere simple: `C:\SIH\bharat-yatra`
2. Open IntelliJ → File → Open → that folder
3. Open `src/main/java/in/bharatyatra/App.java` → click ▶ next to `main`
4. Open `http://localhost:8080` in **Chrome** → check the 3D map spins
5. **Leave IntelliJ open.** Don't shut the laptop down; just close the lid.

**At the table**
1. Run `App.java`, open `http://localhost:8080`
2. Press **F11** for full screen. Hide the bookmark bar (Ctrl+Shift+B)
3. Zoom to **90%** (Ctrl + minus once) so the map and the panel both fit
4. Plug in the projector → **Windows key + P → Duplicate**

**Before you speak, check these 5:**
- [ ] The 3D India map is spinning
- [ ] Clicking a state opens the panel with the banner image
- [ ] Clicking a district opens the **full page** with the hero photo
- [ ] The language dropdown flips to हिन्दी
- [ ] 🔊 read-aloud makes sound (volume up, not muted)

---

# Option 2 — Judges scan a QR and open it on their own phone

This is the moment that wins the round. Two ways to do it:

## 2A. Same Wi-Fi / your hotspot  (no internet needed at all)

1. **Turn on the hotspot on your phone.** Connect your **laptop** to it.
   *(Venue Wi-Fi often blocks device-to-device traffic — your own hotspot never does.)*
2. Run `App.java`. The console prints:
   ```
   On your phone : http://192.168.43.117:8080   (same Wi-Fi)
   ```
3. In the app header click **▦** → the QR modal opens →
   click **📶 Wi-Fi address** → that QR points at `192.168.43.117:8080`
4. Ask the judge to join your hotspot, then scan. It opens on their phone.
5. Click **⬇ Save QR as PNG**, print it, and keep it on the table.

**If the phone doesn't load it:**
- Windows Firewall is blocking Java → a popup appeared the first time you ran it;
  click **Allow access** (tick *Private networks*). If you missed it:
  Control Panel → Windows Defender Firewall → Allow an app → **Java(TM) Platform SE binary** → tick Private.
- Or turn the firewall off for **Private networks only** during the demo.
- Confirm the phone is on **your hotspot**, not on mobile data or the venue Wi-Fi.

## 2B. Hosted online (works from anywhere, even a judge in another room)

See Option 3. Then in the QR modal, paste your live URL into the box and hit
**Use this URL** → **⬇ Save QR as PNG** → print it.

---

# Option 3 — Host it free on the internet (set this up tonight)

You get a permanent link like `https://bharat-yatra.onrender.com`.

> 📖 **Full step-by-step with screenshots-level detail, three upload methods and a
> troubleshooting table: [HOST-GITHUB-RENDER.md](HOST-GITHUB-RENDER.md)**

### Step 1 — put the code on GitHub
1. Make a free account at github.com
2. New repository → name it `bharat-yatra` → **Public** → Create
3. Easiest upload: on the repo page click **Add file → Upload files**, drag in
   **everything inside** the `bharat-yatra` folder (not the folder itself), then **Commit**.
   *(Or in IntelliJ: Git → GitHub → Share Project on GitHub.)*

### Step 2 — deploy on Render
1. Sign up at **render.com** with your GitHub account (free, no card)
2. **New + → Web Service** → connect the `bharat-yatra` repo
3. Render detects the included **`Dockerfile`** — set **Language / Runtime: Docker**
4. Instance type: **Free** → **Create Web Service**
5. Wait 3–6 minutes for the first build. You get a URL — that's your site.

### Step 3 — make the QR
- Open your live URL → click **▦** → the QR now shows the public address →
  **⬇ Save QR as PNG** → print it big and stick it on your poster.

**Two things to know about the free tier:**
- The service **sleeps after 15 minutes idle** — the first hit takes ~50 seconds to wake.
  👉 **Open your live URL 5 minutes before your slot** so it's warm when a judge scans.
- The disk resets on redeploy, so community entries added during judging are
  temporary. That's fine — say so if asked; it's a prototype, and the fix is a
  managed Postgres, a ~20-line change.

> Alternatives if Render is slow: **Railway.app**, **Koyeb**, **Fly.io**, **Google Cloud Run** —
> all read the same `Dockerfile`.

> **No laptop? You can do all of Option 3 from your phone.**
> See **[HOST-FROM-PHONE.md](HOST-FROM-PHONE.md)** — GitHub Codespaces in the phone browser,
> or Termux on Android, plus the 2-minute Cloudflare Tunnel shortcut.

---

# How to create the QR code — 3 ways

| Way | How | Best for |
|---|---|---|
| **Inside the app** | Click **▦** in the header → choose *Wi-Fi address* or paste a hosted URL → **⬇ Save QR as PNG** | Everything. Use this. |
| **Chrome** | Open your site → click the **share icon** in the address bar → **Create QR code** → Download | Quick backup |
| **Print it** | Save the PNG → paste into Word at ~6 cm × 6 cm → add the text *"Scan to explore Bharat Yatra"* + the URL underneath | Your poster / table card |

**Rules for a QR that actually scans:**
- Print **at least 5 cm across**; bigger is better on a poster
- Black on white, with clear white space around it — no background image behind it
- Always print the URL as text under it, so anyone can type it if scanning fails
- **Test it yourself** with two different phones before the event

---

# The 90-second run of show

| Time | You do | You say |
|---|---|---|
| 0:00 | Landing page, map spinning | *"India has 700+ districts. Tourism portals cover about 60. Everything else is invisible."* |
| 0:10 | Point at the map | *"Real state boundaries extruded live in the browser. **The height of each state is how much of it is documented** — that's the problem, visualised."* |
| 0:20 | Click **Rajasthan** | *"Any state. 33 districts, its languages, a greeting you can hear."* |
| 0:30 | Click **Jaisalmer** | *"A district opens as its own page — monuments with dates, festivals, food, homestays, crafts, hidden gems."* |
| 0:45 | Scroll to the red box | *"And this: conservationists ask visitors **not** to stay inside the living fort — its drainage is failing. That's why this isn't a brochure."* |
| 0:55 | Switch language → हिन्दी, tap 🔊 | *"Twelve Indian languages, and it reads aloud — for low-literacy and blind users."* |
| 1:05 | Go to **Meerut** | *"A district no tourism site covers. A student and a resident documented these."* |
| 1:15 | Hand them the QR | *"Scan that. Add a place from your own town — it'll appear on this screen in five seconds, tagged **community**, never mixed with verified heritage content."* |
| 1:30 | Land it | *"Discovery, preservation, 12 languages, responsible tourism — and the crowdsourcing loop, live."* |

---

# If something breaks on stage

| Problem | Fix in 5 seconds |
|---|---|
| Map is black / doesn't render | Click **Explore** in the header — the whole app works without 3D |
| Port 8080 busy | Run → Edit Configurations → Program arguments: `8081` |
| Blank page, "Not found" | Run → Edit Configurations → Working directory = project root |
| Phone won't load the QR | Switch to your hotspot; allow Java in the firewall; worst case, hand them the laptop |
| Hosted site is slow | It was asleep. Wait 50 s, or fall back to localhost |
| No internet at all | Fine — the 3D map, all 725 districts, all data and all 27 illustrations are bundled. Only the Wikimedia photos need internet, and the app labels which is which |

**Have a 60-second screen recording of the full flow on your phone.** If the laptop dies,
you still have a demo.

---

# Three questions judges always ask

**"Isn't this just another travel website?"**
> No. Two things nobody else has: the map is a *data visualisation of the documentation gap*,
> and locals can add their own heritage in 12 languages — with verified and community content
> kept strictly separate so crowdsourcing can never rewrite history.

**"How do you keep the information reliable?"**
> Verified content is human-written and human-checked. Community entries are labelled
> `COMMUNITY`, promoted to `COMMUNITY-REVIEWED` after five independent confirmations, and never
> merged into the verified layer. Even our photos are checked — if the filename doesn't match the
> monument, we show *"photo needed"* instead of a wrong picture.

**"What's the tech stack?"**
> Pure Java 11 with the JDK's built-in HTTP server — no Spring, no database, no npm, zero
> dependencies. The 3D is three.js building geometry from boundary polygons at runtime. It's one
> `java` process, ~6 MB, deployable from a Dockerfile, and it runs offline.
