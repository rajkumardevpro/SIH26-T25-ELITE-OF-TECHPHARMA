# 📱 Hosting Bharat Yatra from your phone (no laptop)

Yes, Option 3 can be done phone-only. Three routes below — **Route A is the one to use.**
All of them are free.

Before you start, put **`bharat-yatra.zip`** somewhere on your phone (Downloads folder is fine).

---

# ⚡ Route 0 — the shortcut, if your laptop is with you

You do **not** need GitHub or Render to get a public link. On the laptop, with the app
already running on port 8080, open a second terminal:

**Cloudflare Tunnel** (no account needed)
```
cloudflared tunnel --url http://localhost:8080
```
Download `cloudflared` from Cloudflare's site first. It prints a public link like
`https://random-words-1234.trycloudflare.com` — that works on **any** phone anywhere,
on mobile data, no Wi-Fi sharing needed.

Paste that link into the app's QR box (**▦ → paste → Use this URL → ⬇ Save QR as PNG**).

⚠️ The link changes every time you restart it, and it dies when you close the terminal.
Great for the demo itself, not for a printed poster. `ngrok http 8080` does the same thing.

---

# ✅ Route A — GitHub Codespaces, all in the phone browser

**~20 minutes. Everything happens in Chrome on your phone.** Turn the phone sideways.

### Step 1 — put the ZIP where the internet can reach it
1. Open **Google Drive** app → **+ → Upload** → pick `bharat-yatra.zip`
2. Long-press the file → **Share → Anyone with the link** → **Copy link**
3. The link looks like `https://drive.google.com/file/d/`**`1AbCdEfGh...`**`/view?usp=sharing`
   — the bold part is the **FILE_ID**. You'll need it in Step 4.

### Step 2 — make a GitHub repo
1. Chrome → **github.com** → sign up / log in
2. Tap **⋮ (menu) → Desktop site** ← *important, do this on every GitHub page*
3. **+ → New repository** → Name: `bharat-yatra` → **Public** →
   tick **Add a README file** → **Create repository**

### Step 3 — open a Codespace (VS Code in your browser)
1. On the repo page: **Code ▾ → Codespaces → Create codespace on main**
2. Wait ~60 seconds. You now have a full Linux terminal on your phone.
3. If you can't see the terminal, tap the **☰ menu → Terminal → New Terminal**

### Step 4 — pull in the project and push it
Type these one at a time (long-press to paste). Replace `FILE_ID` with yours:

```bash
pip install gdown
gdown FILE_ID -O p.zip
unzip -q p.zip
cp -r bharat-yatra/. .
rm -rf bharat-yatra p.zip
ls
```
`ls` should now show `src`, `data`, `tools`, `Dockerfile`, `README.md`.

```bash
git add -A
git commit -m "Bharat Yatra - SIH prototype"
git push
```

*(If `gdown` fails, use Dropbox instead: upload the zip, copy the share link, change the
end from `?dl=0` to `?dl=1`, then `wget -O p.zip "THAT_LINK"`.)*

### Step 5 — deploy on Render
1. Chrome → **render.com** → **Get Started → Sign in with GitHub** → allow access
2. **New + → Web Service** → pick your **bharat-yatra** repo → **Connect**
3. Settings:
   - Language / Runtime: **Docker** *(it should auto-detect the Dockerfile)*
   - Region: **Singapore** (closest to India)
   - Instance Type: **Free**
4. **Create Web Service** → wait 4–7 minutes for the build to say **Live**
5. Your URL appears at the top: `https://bharat-yatra-xxxx.onrender.com`

### Step 6 — make your QR
1. Open your live URL on the phone
2. Tap **▦** in the header → paste the URL in the box → **Use this URL**
3. **⬇ Save QR as PNG** → it's in your phone's Downloads → print it, or just show
   the phone screen to the judges

### Step 7 — **close the Codespace** (so you don't burn free hours)
github.com → **⋮ → Your codespaces** → **⋮ next to yours → Stop codespace**

---

# 🔧 Route B — Termux (Android only, works offline-ish)

If Codespaces won't cooperate. ~25 minutes.

1. Install **Termux** from **F-Droid** (the Play Store version is broken/outdated)
2. In Termux:
```bash
pkg update -y && pkg install -y git unzip
cd ~
unzip -q /sdcard/Download/bharat-yatra.zip
cd bharat-yatra
git init && git branch -M main
git config user.email "you@example.com"
git config user.name "Your Name"
git add -A && git commit -m "Bharat Yatra"
git remote add origin https://github.com/YOURNAME/bharat-yatra.git
git push -u origin main
```
3. When it asks for a password, paste a **Personal Access Token**, not your GitHub password:
   github.com (desktop site) → Settings → Developer settings → Personal access tokens →
   **Tokens (classic)** → Generate new → tick **repo** → copy the token.
   *(Termux may need `termux-setup-storage` once to read `/sdcard`.)*
4. Then do **Step 5–7** of Route A.

**Bonus:** Termux can also run the whole app on your phone —
`pkg install openjdk-17` then `bash run.sh`, and open `http://localhost:8080` in the phone
browser. Good as a last-resort backup demo, though the 3D map is heavy on older phones.

---

# 📤 Route C — uploading files through the GitHub website

Possible but **painful on a phone** — the mobile file picker can't upload folders, so the
`src/main/java/in/bharatyatra/` structure gets flattened and the build fails.

Only try this if A and B both fail, and do it folder by folder using
**Add file → Create new file**, typing the full path with slashes in the filename box
(e.g. `src/main/java/in/bharatyatra/App.java`) — GitHub creates the folders for you.
That's ~70 files. Don't do this the night before judging.

---

# Reminders for the free tier

- Render's free service **sleeps after 15 minutes** of no traffic. The first request then
  takes **~50 seconds**. 👉 **Open your URL 5 minutes before your slot.**
- Any community entries added while judging are lost on the next redeploy — the disk is
  ephemeral. Say so honestly if asked; the fix is a managed Postgres, ~20 lines of change.
- Photos come from Wikimedia over the internet. The 3D map, all 725 districts, the data and
  all 27 illustrations are bundled — so even on bad venue Wi-Fi the app still works.

---

# Which should you actually do?

| Situation | Do this |
|---|---|
| Laptop with you at the venue | **Route 0** (cloudflared) for the link, plus localhost as the main demo |
| Phone only, tonight, calm | **Route A** — permanent URL, printable QR |
| Codespaces won't load | **Route B** |
| Nothing works | Demo on the laptop at `localhost:8080` and share via **hotspot + the app's 📶 Wi-Fi QR**. This needs no internet at all and is a perfectly good demo. |
