# 🚀 Hosting Bharat Yatra yourself — GitHub + Render (free)

End result: a permanent public link like **`https://bharat-yatra.onrender.com`** that anyone can
open, and a QR code you can print.

Total time: **20–30 minutes**, first time. No credit card. No server knowledge needed.

---

## What makes this easy

The repo already contains everything Render needs:

| File | What it does |
|---|---|
| `Dockerfile` | tells Render how to build and run the app (one `javac`, one `java`) |
| `.dockerignore` | keeps the image small |
| `render.yaml` | optional blueprint — sets the free plan, Singapore region and health check |

The app already reads the `PORT` environment variable and binds `0.0.0.0`, which is exactly what
Render requires. **You don't have to change a single line of code.**

---

# PART 1 — Put the code on GitHub

Create the account first: **github.com** → Sign up (free). Verify your email.

Then create the repository:
1. Click **+** (top right) → **New repository**
2. **Repository name:** `bharat-yatra`
3. **Public** ← must be public for Render's free tier
4. **Do NOT** tick "Add a README" *(if you use Method A or B below)*
5. **Create repository**

Now pick **one** of these three ways to get the files up.

---

## Method A — IntelliJ does it for you *(recommended)*

You never leave the IDE.

1. In IntelliJ open the project
2. Menu **VCS → Enable Version Control Integration…** → choose **Git** → OK
3. Menu **Git → GitHub → Share Project on GitHub**
   *(older versions: **VCS → Import into Version Control → Share Project on GitHub**)*
4. Log in with GitHub when asked (a browser window opens — click **Authorize**)
5. Repository name: `bharat-yatra` → untick *Private* → **Share**
6. It shows a file list — click **Add** to commit everything
7. Done. Open `https://github.com/YOURNAME/bharat-yatra` and confirm you can see
   the `src` folder, `Dockerfile` and `README.md`

**Making changes later:** edit code → **Git → Commit** → tick files → *Commit and Push*.
Render redeploys automatically within a minute.

---

## Method B — Command line (Git Bash / Terminal)

Install Git first if you don't have it: **git-scm.com/downloads**

Open a terminal **inside the project folder** (in IntelliJ: **View → Tool Windows → Terminal**):

```bash
git init
git branch -M main
git config user.name  "Your Name"
git config user.email "you@example.com"

git add .
git commit -m "Bharat Yatra - SIH prototype"

git remote add origin https://github.com/YOURNAME/bharat-yatra.git
git push -u origin main
```

When it asks for a password, GitHub **will not accept your account password**. Use a token:

> github.com → click your avatar → **Settings** → scroll down to **Developer settings** →
> **Personal access tokens → Tokens (classic)** → **Generate new token (classic)** →
> Note: `render`, Expiration: 30 days, tick the **`repo`** checkbox → **Generate token** →
> **copy it** and paste it as the password.

---

## Method C — Drag and drop in the browser

Works, but you must drag **folders**, not individual files, or the structure breaks.

1. Tick **Add a README file** when creating the repo (so it isn't empty)
2. On the repo page: **Add file → Upload files**
3. Open your unzipped `bharat-yatra` folder, select **everything inside it**
   (`src`, `data`, `tools`, `Dockerfile`, `pom.xml`, all the `.md` files…) and **drag it
   onto the browser window** — Chrome/Edge on a laptop preserves folders
4. Scroll down → **Commit changes**
5. Verify `src/main/java/in/bharatyatra/App.java` exists at that exact path.
   **If your Java files landed at the top level, the build will fail** — delete them and redo.

---

# PART 2 — Deploy on Render

1. Go to **render.com** → **Get Started** → **Sign in with GitHub** → **Authorize Render**
2. Dashboard → **New +** → **Web Service**
3. **Connect a repository** → find `bharat-yatra` → **Connect**
   *(if it isn't listed: **Configure account** → give Render access to that repo)*
4. Fill in the settings:

   | Field | Value |
   |---|---|
   | **Name** | `bharat-yatra` → this becomes `bharat-yatra.onrender.com` |
   | **Region** | **Singapore** *(closest to India)* |
   | **Branch** | `main` |
   | **Language / Runtime** | **Docker** ← should auto-detect from the Dockerfile |
   | **Instance Type** | **Free** |

   Leave Build Command and Start Command **empty** — the Dockerfile handles both.
5. **Create Web Service**
6. Watch the log. You'll see the image build, then:
   ```
   ####  BHARAT YATRA  ####
   Running at : http://localhost:10000
   ==> Your service is live 🎉
   ```
   First build takes **4–8 minutes**. Later pushes take ~2 minutes.
7. Your URL is at the top of the page. Open it. **That's your live site.**

### Shortcut: the Blueprint
Instead of steps 2–5 you can use **New + → Blueprint → pick the repo**. Render reads
`render.yaml` and configures the free plan, Singapore region and the `/api/health` check for you.

---

# PART 3 — Make your QR code

1. Open your live URL (on laptop or phone)
2. Tap **▦** in the header
3. Paste your URL in the box → **Use this URL**
4. **⬇ Save QR as PNG**
5. Print it at **6 cm × 6 cm** or bigger, with the URL typed underneath as text

Scan it yourself with two different phones before you rely on it.

---

# PART 4 — Stop it falling asleep (important for judging day)

Render's free tier **sleeps after 15 minutes** with no traffic. The next visitor waits
**~50 seconds** for it to wake — which is exactly when a judge scans your QR.

Two fixes:

**Simple:** open your URL yourself **5 minutes before your slot**, and again during the wait.

**Better — a free keep-alive ping:**
1. Sign up at **uptimerobot.com** (free)
2. **+ Add New Monitor** → Type: **HTTP(s)**
3. Friendly name: `bharat-yatra`
4. URL: `https://your-app.onrender.com/api/health`
5. Monitoring interval: **5 minutes** → **Create Monitor**

Now something hits your app every 5 minutes and it never sleeps. It also emails you if the
site goes down.

---

# Troubleshooting

**Build fails: `javac: file not found`**
Your folder structure got flattened during upload. `src/main/java/in/bharatyatra/App.java`
must exist at exactly that path in the repo. Redo the upload with Method A or B.

**Build fails: `failed to read dockerfile`**
The `Dockerfile` must be in the **repo root**, not inside a `bharat-yatra/` subfolder.
On GitHub, the repo's first page should show `Dockerfile`, `src`, `data` — not a single folder.
If it's nested, either re-upload the *contents*, or set **Root Directory** to `bharat-yatra`
in Render → Settings.

**"No open ports detected"**
Only happens if you overrode the start command. Clear it — the Dockerfile's `CMD` is correct
and the app already binds `0.0.0.0:$PORT`.

**Site loads but is very slow the first time**
It was asleep. Normal on the free tier. See Part 4.

**Photos are missing on the hosted site**
Those come from Wikimedia over the internet. The 3D map, all 725 districts, the data and all
27 illustrations are bundled and always work. Run `ImageFetcher.java` locally and push again
to bake in more photos.

**Community entries disappear after a redeploy**
The free disk is ephemeral — expected, and worth saying out loud to a judge:
*"Prototype storage is a JSON file; production would be Postgres, about twenty lines."*
If you want them to survive: Render → your service → **Disks** → *Add Disk*, mount path
`/app/data`, 1 GB. (Note: adding a disk requires a paid instance on Render.)

**I pushed a change but the site is the same**
Render → your service → **Manual Deploy → Deploy latest commit**. Also confirm the push
actually reached GitHub.

---

# Cheat sheet

```
GitHub repo : https://github.com/YOURNAME/bharat-yatra
Live site   : https://bharat-yatra.onrender.com
Health check: https://bharat-yatra.onrender.com/api/health
Update it   : commit + push  ->  Render redeploys automatically
```

Write your live URL on your poster **as text as well as a QR** — someone's camera will always
refuse to scan.
