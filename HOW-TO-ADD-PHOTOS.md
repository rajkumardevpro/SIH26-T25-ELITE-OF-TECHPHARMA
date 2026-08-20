# 📷 How to fill the "Photo needed" tiles

Some cards in the app show a **"Photo needed — add yours →"** tile instead of a photograph.
That happens when no free Wikimedia Commons image could be matched to that item yet.

You have three ways to fill them. **Option A needs nothing but IntelliJ.**

---

## Option A — run the Java tool (recommended, no Python needed)

1. In IntelliJ, open `src/main/java/in/bharatyatra/ImageFetcher.java`
2. Right-click anywhere in the file → **Run 'ImageFetcher.main()'**
3. Watch the console. It prints a line per district:
   ```
   [ 7/48] Jaipur, Rajasthan                          +9
   [ 8/48] Jaisalmer, Rajasthan                       +6
   ```
   `+9` = nine photographs added.
4. When it finishes, **stop `App`, run `App` again**, and hard-refresh the browser
   (`Ctrl` + `Shift` + `R`).

**Notes**
- Needs an internet connection. It takes roughly 5–15 minutes on a normal home connection.
- It is **safe to stop and re-run** at any moment: it saves after every district and remembers
  every lookup in `tools/imgcache-java.json`, so a second run continues where it left off.
- It never overwrites a photo you already have, and it writes a backup to
  `src/main/resources/static/data/content.json.backup` before touching anything.
- If the console says `network failures : 137`, Wikipedia was rate-limiting you.
  Just run it again — each run gets further.

### If IntelliJ says "cannot find content.json"
It's a working-directory problem. Do:
`Run → Edit Configurations… → ImageFetcher → Working directory:` set it to the **project root**
(the folder that contains `src`, `tools`, `data`, `README.md`), then run again.

---

## Option B — put your own photos in (best for your own district)

This is the actual point of the product, and it demos better than a Wikipedia photo.

1. Open the district in the app → **+ Add a place in this district**
2. Fill the form, attach a **Photo** you took yourself
3. Submit — it appears immediately in the *Added by locals* section, tagged `COMMUNITY`

Your photo is resized in the browser and stored on the server in `data/contributions.json`.

**Judge-friendly line:** *"The empty tiles aren't missing data — they're the ask. That's what the
platform is for."* Consider deliberately leaving a few empty for the demo.

---

## Option C — the Python scripts (if you have Python 3)

```bash
python3 tools/add_images.py        # bulk-resolve photos (cached, resumable)
python3 tools/fix_hero_images.py   # lock the 48 hero images to exact Wikipedia articles
python3 tools/verify_images.py     # delete any photo that doesn't match its caption
```

Same job as Option A. Use whichever you're comfortable with — **don't run both at once.**

---

## How a photo gets accepted or rejected

For every item the tool asks Wikipedia for the best-matching article's lead image, then compares
the **Commons filename** with the **item's name**:

| Item | Returned file | Verdict |
|---|---|---|
| Taj Mahal | `Taj_Mahal_(Edited).jpeg` | ✅ shares "mahal" → accepted |
| Taj Mahal | `1167_main-ghat-at-bithoor.jpg` | ❌ nothing in common → rejected, tile stays empty |

That check is why the app never shows a confidently wrong monument. An empty tile is honest;
a wrong photo of somebody's temple is not — and a judge *will* spot the wrong one.

---

## Where the photos come from / licensing

All resolved images are hot-linked from **Wikimedia Commons** under their respective free licences
and are used here for a non-commercial educational prototype. Each district page carries the credit
line at the bottom, and the hero image names its source article. If you go public, swap hot-linking
for downloaded copies with per-image attribution.
