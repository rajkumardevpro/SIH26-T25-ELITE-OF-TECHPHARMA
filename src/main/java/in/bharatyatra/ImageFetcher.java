package in.bharatyatra;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/**
 * ImageFetcher — fills in the missing photographs.
 *
 * HOW TO RUN (IntelliJ):
 *     right-click this file  ->  Run 'ImageFetcher.main()'
 *     ...then restart App.java and refresh the browser.
 *
 * What it does:
 *   1. reads  src/main/resources/static/data/content.json
 *   2. for every monument / festival / dish / craft / hidden gem with no photo,
 *      asks the Wikipedia API for a Wikimedia Commons image
 *   3. REJECTS the result if the filename shares no word with the item's name,
 *      so a Varanasi ghat can never end up filed under the Taj Mahal
 *   4. writes the URLs back into content.json and saves a cache in
 *      tools/imgcache-java.json so re-runs are instant
 *
 * Safe to stop and re-run at any time. It never deletes photos you already have,
 * and it makes a .backup copy of content.json before writing.
 *
 * Pure JDK — no dependencies, exactly like the rest of this project.
 */
public class ImageFetcher {

    static final String UA = "BharatYatra/1.0 (SIH prototype; educational use)";
    static Path CONTENT, CACHE;
    static Map<String, String> cache = new LinkedHashMap<>();
    static int filled = 0, rejected = 0, network = 0, skipped = 0;

    /** words we ignore when checking that a photo matches its caption */
    static final Set<String> STOP = new HashSet<>(Arrays.asList(
            "temple", "fort", "the", "and", "palace", "caves", "cave", "museum", "city",
            "village", "hill", "hills", "lake", "river", "market", "gate", "house", "park",
            "valley", "falls", "tomb", "tombs", "monastery", "church", "mosque", "india",
            "indian", "group", "complex", "national", "great", "old", "new", "sri", "shri",
            "festival", "food", "craft", "street", "walk", "tour", "sunset", "sunrise"));

    public static void main(String[] args) throws Exception {
        CONTENT = findFile("src/main/resources/static/data/content.json");
        CACHE = Paths.get("tools", "imgcache-java.json");
        Files.createDirectories(CACHE.getParent());

        System.out.println("Reading  " + CONTENT.toAbsolutePath());
        String raw = new String(Files.readAllBytes(CONTENT), StandardCharsets.UTF_8);
        Object root = Json.parse(raw);
        loadCache();

        Map<String, Object> data = asMap(root);
        Map<String, Object> districts = asMap(data.get("districts"));
        Map<String, Object> states = asMap(data.get("states"));

        int i = 0, total = districts.size(), lastWrite = 0;
        Files.copy(CONTENT, CONTENT.resolveSibling("content.json.backup"),
                StandardCopyOption.REPLACE_EXISTING);
        for (Map.Entry<String, Object> e : districts.entrySet()) {
            i++;
            String key = e.getKey();
            String stateName = key.split("\\|")[0];
            String distName = key.substring(key.indexOf('|') + 1);
            Map<String, Object> d = asMap(e.getValue());
            System.out.printf("[%2d/%d] %-42s ", i, total, distName + ", " + stateName);

            int before = filled;
            fillList(d.get("monuments"), "n", "img", distName, stateName, "");
            fillList(d.get("festivals"), "n", "img", distName, stateName, "festival");
            fillList(d.get("food"), "n", "img", distName, stateName, "Indian food");
            fillList(d.get("hidden"), "n", "img", distName, stateName, "");
            fillCrafts(d, stateName);

            System.out.println("+" + (filled - before));
            saveCache();                       // checkpoint after every district
            if (filled > lastWrite) {          // ...and save the data itself, so
                writeContent(root);            //    stopping the run never loses work
                lastWrite = filled;
            }
        }

        // state banner photos
        for (Map.Entry<String, Object> e : states.entrySet()) {
            Map<String, Object> s = asMap(e.getValue());
            if (isBlank(s.get("img"))) {
                String u = resolve(e.getKey() + " India heritage", e.getKey());
                if (u != null) { s.put("img", u); filled++; }
            }
        }

        writeContent(root);
        saveCache();

        System.out.println();
        System.out.println("  photos added        : " + filled);
        System.out.println("  rejected (bad match): " + rejected);
        System.out.println("  already had a photo : " + skipped);
        System.out.println("  network failures    : " + network
                + (network > 0 ? "   <- just run this again, it resumes" : ""));
        System.out.println("  written to          : " + CONTENT.toAbsolutePath());
        System.out.println();
        System.out.println("  Now restart App.java and hard-refresh the browser (Ctrl+Shift+R).");
    }

    static void writeContent(Object root) throws IOException {
        Path tmp = CONTENT.resolveSibling("content.json.tmp");
        Files.write(tmp, Json.write(root).getBytes(StandardCharsets.UTF_8));
        Files.move(tmp, CONTENT, StandardCopyOption.REPLACE_EXISTING);
    }

    // ------------------------------------------------------------------ work

    @SuppressWarnings("unchecked")
    static void fillList(Object listObj, String nameKey, String imgKey,
                         String district, String state, String hint) {
        if (!(listObj instanceof List)) return;
        for (Object o : (List<Object>) listObj) {
            Map<String, Object> m = asMap(o);
            if (m == null) continue;
            if (!isBlank(m.get(imgKey))) { skipped++; continue; }
            String name = String.valueOf(m.get(nameKey));
            String url = resolve(clean(name) + " " + hint + " " + district, name);
            if (url == null) url = resolve(clean(name) + " " + hint + " " + state, name);
            if (url != null) { m.put(imgKey, url); filled++; }
        }
    }

    @SuppressWarnings("unchecked")
    static void fillCrafts(Map<String, Object> d, String state) {
        if (!(d.get("crafts") instanceof List)) return;
        List<Object> crafts = (List<Object>) d.get("crafts");
        List<Object> imgs = d.get("craftImgs") instanceof List
                ? (List<Object>) d.get("craftImgs") : new ArrayList<>();
        while (imgs.size() < crafts.size()) imgs.add("");
        for (int j = 0; j < crafts.size(); j++) {
            if (!isBlank(imgs.get(j))) { skipped++; continue; }
            String name = String.valueOf(crafts.get(j));
            String url = resolve(clean(name) + " craft " + state, name);
            if (url == null) url = resolve(clean(name) + " Indian handicraft", name);
            if (url != null) { imgs.set(j, url); filled++; }
        }
        d.put("craftImgs", imgs);
    }

    /** search Wikipedia, return the image URL only if it plausibly matches `name` */
    static String resolve(String term, String name) {
        term = term.replaceAll("\\s+", " ").trim();
        if (cache.containsKey(term)) {
            String u = cache.get(term);
            return u.isEmpty() ? null : (matches(name, u) ? u : null);
        }
        String json = get("https://en.wikipedia.org/w/api.php?action=query&generator=search"
                + "&gsrsearch=" + enc(term)
                + "&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=1200&format=json");
        if (json == null) { network++; return null; }

        String url = between(json, "\"source\":\"", "\"");
        if (url == null) { cache.put(term, ""); return null; }
        url = url.replace("\\/", "/");
        int q = url.indexOf('?');
        if (q > 0) url = url.substring(0, q);
        cache.put(term, url);

        if (!matches(name, url)) { rejected++; return null; }
        return url;
    }

    /** does the Commons filename share a meaningful word with the item name? */
    static boolean matches(String name, String url) {
        Set<String> want = words(name);
        if (want.isEmpty()) return true;
        String file = url.substring(url.lastIndexOf('/') + 1).replace("%20", " ");
        Set<String> got = words(file);
        for (String w : want) if (got.contains(w)) return true;
        return false;
    }

    static Set<String> words(String s) {
        Set<String> out = new HashSet<>();
        for (String w : s.toLowerCase().replaceAll("\\([^)]*\\)", " ").split("[^a-z]+"))
            if (w.length() >= 4 && !STOP.contains(w)) out.add(w);
        return out;
    }

    static String clean(String s) {
        return s.replaceAll("\\([^)]*\\)", " ").replace("&", " and ").replaceAll("\\s+", " ").trim();
    }

    // ------------------------------------------------------------------ http

    static String get(String url) {
        for (int attempt = 0; attempt < 4; attempt++) {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setRequestProperty("User-Agent", UA);
                c.setRequestProperty("Accept", "application/json");
                c.setConnectTimeout(15000);
                c.setReadTimeout(25000);
                int code = c.getResponseCode();
                if (code == 429 || code >= 500) {          // rate limited — back off
                    sleep(2500L * (attempt + 1));
                    continue;
                }
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                try (InputStream in = c.getInputStream()) {
                    byte[] b = new byte[8192]; int n;
                    while ((n = in.read(b)) > 0) bos.write(b, 0, n);
                }
                sleep(350);                                 // be polite to Wikipedia
                return new String(bos.toByteArray(), StandardCharsets.UTF_8);
            } catch (Exception ex) {
                sleep(1800L * (attempt + 1));
            }
        }
        return null;
    }

    static void sleep(long ms) { try { Thread.sleep(ms); } catch (InterruptedException ignored) { } }
    static String enc(String s) {
        try { return URLEncoder.encode(s, "UTF-8"); } catch (Exception e) { return s; }
    }
    static String between(String s, String a, String b) {
        int i = s.indexOf(a); if (i < 0) return null;
        int j = s.indexOf(b, i + a.length()); if (j < 0) return null;
        return s.substring(i + a.length(), j);
    }

    // ----------------------------------------------------------------- cache

    static void loadCache() {
        try {
            if (!Files.exists(CACHE)) return;
            Object o = Json.parse(new String(Files.readAllBytes(CACHE), StandardCharsets.UTF_8));
            for (Map.Entry<String, Object> e : asMap(o).entrySet())
                cache.put(e.getKey(), String.valueOf(e.getValue()));
            System.out.println("Cache    " + cache.size() + " lookups remembered");
        } catch (Exception ignored) { }
    }

    static void saveCache() {
        try {
            Map<String, Object> m = new LinkedHashMap<>(cache);
            Files.write(CACHE, Json.write(m).getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) { }
    }

    // ---------------------------------------------------------------- helpers

    @SuppressWarnings("unchecked")
    static Map<String, Object> asMap(Object o) {
        return o instanceof Map ? (Map<String, Object>) o : null;
    }
    static boolean isBlank(Object o) {
        return o == null || String.valueOf(o).trim().isEmpty();
    }
    static Path findFile(String rel) {
        Path[] tries = { Paths.get(rel), Paths.get("..", rel), Paths.get("../..", rel) };
        for (Path p : tries) if (Files.exists(p)) return p;
        throw new RuntimeException("Could not find " + rel
                + " — run this with the project folder as the working directory.");
    }

    /* =================================================================
       Json — a 120-line JSON reader/writer so this project still has
       zero dependencies. Handles objects, arrays, strings, numbers,
       booleans and null, which is all content.json contains.
       ================================================================= */
    static class Json {
        private final String s; private int i;
        private Json(String s) { this.s = s; }

        static Object parse(String text) {
            Json p = new Json(text);
            p.ws();
            Object v = p.value();
            return v;
        }

        private Object value() {
            char c = s.charAt(i);
            switch (c) {
                case '{': return object();
                case '[': return array();
                case '"': return string();
                case 't': i += 4; return Boolean.TRUE;
                case 'f': i += 5; return Boolean.FALSE;
                case 'n': i += 4; return null;
                default:  return number();
            }
        }

        private Map<String, Object> object() {
            Map<String, Object> m = new LinkedHashMap<>();
            i++; ws();
            if (s.charAt(i) == '}') { i++; return m; }
            while (true) {
                ws();
                String k = string(); ws();
                i++;                       // ':'
                ws();
                m.put(k, value()); ws();
                char c = s.charAt(i++);
                if (c == '}') return m;    // ',' otherwise
            }
        }

        private List<Object> array() {
            List<Object> l = new ArrayList<>();
            i++; ws();
            if (s.charAt(i) == ']') { i++; return l; }
            while (true) {
                ws();
                l.add(value()); ws();
                char c = s.charAt(i++);
                if (c == ']') return l;
            }
        }

        private String string() {
            StringBuilder b = new StringBuilder();
            i++;                            // opening quote
            while (true) {
                char c = s.charAt(i++);
                if (c == '"') return b.toString();
                if (c == '\\') {
                    char n = s.charAt(i++);
                    switch (n) {
                        case 'n': b.append('\n'); break;
                        case 't': b.append('\t'); break;
                        case 'r': b.append('\r'); break;
                        case 'b': b.append('\b'); break;
                        case 'f': b.append('\f'); break;
                        case 'u': b.append((char) Integer.parseInt(s.substring(i, i + 4), 16)); i += 4; break;
                        default:  b.append(n);
                    }
                } else b.append(c);
            }
        }

        private Object number() {
            int st = i;
            while (i < s.length() && "-+.eE0123456789".indexOf(s.charAt(i)) >= 0) i++;
            String n = s.substring(st, i);
            if (n.contains(".") || n.contains("e") || n.contains("E")) return Double.parseDouble(n);
            return Long.parseLong(n);
        }

        private void ws() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }

        // ---- writing ----
        @SuppressWarnings("unchecked")
        static String write(Object o) {
            StringBuilder b = new StringBuilder();
            w(o, b);
            return b.toString();
        }

        @SuppressWarnings("unchecked")
        private static void w(Object o, StringBuilder b) {
            if (o == null) { b.append("null"); return; }
            if (o instanceof Map) {
                b.append('{');
                boolean first = true;
                for (Map.Entry<String, Object> e : ((Map<String, Object>) o).entrySet()) {
                    if (!first) b.append(',');
                    first = false;
                    str(e.getKey(), b); b.append(':'); w(e.getValue(), b);
                }
                b.append('}');
            } else if (o instanceof List) {
                b.append('[');
                boolean first = true;
                for (Object x : (List<Object>) o) {
                    if (!first) b.append(',');
                    first = false;
                    w(x, b);
                }
                b.append(']');
            } else if (o instanceof String) {
                str((String) o, b);
            } else {
                b.append(o.toString());
            }
        }

        private static void str(String v, StringBuilder b) {
            b.append('"');
            for (int k = 0; k < v.length(); k++) {
                char c = v.charAt(k);
                switch (c) {
                    case '"':  b.append("\\\""); break;
                    case '\\': b.append("\\\\"); break;
                    case '\n': b.append("\\n"); break;
                    case '\r': b.append("\\r"); break;
                    case '\t': b.append("\\t"); break;
                    default:
                        if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
                        else b.append(c);
                }
            }
            b.append('"');
        }
    }
}
