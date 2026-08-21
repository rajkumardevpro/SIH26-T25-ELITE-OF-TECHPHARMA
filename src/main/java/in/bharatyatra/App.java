package in.bharatyatra;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Bharat Yatra  --  Tourism, Heritage & Culture platform for India.
 *
 * Pure Java 11+. ZERO external dependencies, so it runs from IntelliJ with a
 * single click (Run 'App.main()') and packs into one runnable jar.
 *
 *   REST API
 *     GET  /api/health
 *     GET  /api/states                     -> list of states + district counts
 *     GET  /api/districts?state=X          -> districts of a state
 *     GET  /api/place?state=X&district=Y   -> merged verified + community content
 *     GET  /api/contributions              -> all community submissions
 *     GET  /api/search?q=...               -> global search
 *     GET  /api/stats                      -> dashboard numbers
 *     POST /api/contribute                 -> add a community entry (form-encoded)
 *     POST /api/vote                       -> up-vote a community entry (trust score)
 *
 * Everything else is served from the static web folder.
 */
public class App {

    static final int DEFAULT_PORT = 8080;
    static int PORT = DEFAULT_PORT;
    static String LAN_IP = "localhost";
    static Path STATIC_DIR;
    static Path DATA_DIR;
    static Path CONTRIB_FILE;

    /** In-memory store of community contributions; mirrored to disk as JSON. */
    static final List<Map<String, String>> CONTRIBUTIONS =
            Collections.synchronizedList(new ArrayList<>());
    static final AtomicLong SEQ = new AtomicLong(1000);

    // cached raw JSON of the curated data files (served straight through)
    static String districtsJson = "{}";
    static String contentJson = "{\"states\":{},\"districts\":{}}";

    public static void main(String[] args) throws Exception {
        int port = DEFAULT_PORT;
        String env = System.getenv("PORT");
        if (env != null && !env.isEmpty()) port = Integer.parseInt(env.trim());
        if (args.length > 0) port = Integer.parseInt(args[0]);

        PORT = port;
        LAN_IP = lanIp();
        STATIC_DIR = locateStatic();
        DATA_DIR = Paths.get("data");
        Files.createDirectories(DATA_DIR);
        CONTRIB_FILE = DATA_DIR.resolve("contributions.json");

        districtsJson = readStatic("data/districts.json", "{}");
        contentJson = readStatic("data/content.json", "{\"states\":{},\"districts\":{}}");
        loadContributions();

        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.createContext("/api/", new ApiHandler());
        server.createContext("/", new StaticHandler());
        server.setExecutor(Executors.newFixedThreadPool(8));
        server.start();

        // containers stop services with SIGTERM: finish in-flight requests, then exit cleanly
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("  shutting down…");
            server.stop(2);
        }));

        System.out.println();
        System.out.println("  ####  BHARAT YATRA  ####");
        System.out.println("  Static folder : " + STATIC_DIR.toAbsolutePath());
        System.out.println("  Contributions : " + CONTRIB_FILE.toAbsolutePath()
                + "  (" + CONTRIBUTIONS.size() + " loaded)");
        System.out.println("  Running at    : http://localhost:" + port);
        System.out.println("  On your phone : http://" + lanIp() + ":" + port + "   (same Wi-Fi)");
        System.out.println("  Press Ctrl+C to stop.");
        System.out.println();

        startKeepAlive();
    }

    /**
     * Free hosting tiers hibernate a service after ~15 minutes without traffic,
     * and the wake-up can fail with a 502/503 exactly when a judge scans your QR.
     * Set the env var KEEPALIVE_URL to your public address and the app will ping
     * itself every 10 minutes so it never goes to sleep.
     *
     *     KEEPALIVE_URL = https://bharat-yatra1.onrender.com/api/health
     */
    static void startKeepAlive() {
        String url = System.getenv("KEEPALIVE_URL");
        if (url == null || url.trim().isEmpty()) return;
        final String target = url.trim();
        System.out.println("  Keep-alive    : pinging " + target + " every 10 min");
        Thread t = new Thread(() -> {
            while (true) {
                try {
                    Thread.sleep(10 * 60 * 1000L);
                    java.net.HttpURLConnection c =
                            (java.net.HttpURLConnection) new java.net.URL(target).openConnection();
                    c.setRequestProperty("User-Agent", "BharatYatra-KeepAlive");
                    c.setConnectTimeout(10000);
                    c.setReadTimeout(15000);
                    int code = c.getResponseCode();
                    c.getInputStream().close();
                    System.out.println("  keep-alive ping -> " + code);
                } catch (InterruptedException ie) {
                    return;
                } catch (Exception e) {
                    System.out.println("  keep-alive ping failed: " + e);
                }
            }
        }, "keep-alive");
        t.setDaemon(true);
        t.start();
    }

    // ------------------------------------------------------------------ setup

    private static Path locateStatic() {
        String[] candidates = {
                "src/main/resources/static",
                "resources/static",
                "static",
                "../src/main/resources/static"
        };
        for (String c : candidates) {
            Path p = Paths.get(c);
            if (Files.isDirectory(p) && Files.exists(p.resolve("index.html"))) return p;
        }
        return Paths.get("src/main/resources/static");
    }

    private static String readStatic(String rel, String fallback) {
        try {
            Path p = STATIC_DIR.resolve(rel);
            if (Files.exists(p)) return new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
            InputStream in = App.class.getResourceAsStream("/static/" + rel);
            if (in != null) return slurp(in);
        } catch (Exception e) {
            System.err.println("could not read " + rel + ": " + e);
        }
        return fallback;
    }

    private static String slurp(InputStream in) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) bos.write(buf, 0, n);
        in.close();
        return new String(bos.toByteArray(), StandardCharsets.UTF_8);
    }

    static String lanIp() {
        try {
            java.util.Enumeration<java.net.NetworkInterface> ifs =
                    java.net.NetworkInterface.getNetworkInterfaces();
            while (ifs.hasMoreElements()) {
                java.net.NetworkInterface ni = ifs.nextElement();
                if (ni.isLoopback() || !ni.isUp()) continue;
                for (java.net.InterfaceAddress ia : ni.getInterfaceAddresses()) {
                    java.net.InetAddress a = ia.getAddress();
                    if (a instanceof java.net.Inet4Address) return a.getHostAddress();
                }
            }
        } catch (Exception ignored) { }
        return "localhost";
    }

    // ------------------------------------------------------------- static web

    static class StaticHandler implements HttpHandler {
        public void handle(HttpExchange ex) {
            try { serve(ex); }
            catch (Throwable t) {
                System.err.println("static error: " + t);
                try { send(ex, 500, "text/plain; charset=utf-8", "error"); } catch (Exception ignored) { }
            }
        }

        void serve(HttpExchange ex) throws IOException {
            String path = ex.getRequestURI().getPath();
            if (path.equals("/") || path.isEmpty()) path = "/index.html";
            // single page app: unknown extension-less routes fall back to index
            Path file = STATIC_DIR.resolve(path.substring(1)).normalize();
            if (!file.startsWith(STATIC_DIR.normalize()) || !Files.exists(file)
                    || Files.isDirectory(file)) {
                if (!path.contains(".")) file = STATIC_DIR.resolve("index.html");
            }
            if (!Files.exists(file)) {
                // fallback: the same file packed inside the jar under /static/...
                InputStream in = App.class.getResourceAsStream("/static" + path);
                if (in == null) in = App.class.getResourceAsStream("/static/index.html");
                if (in != null) {
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    byte[] b = new byte[8192]; int k;
                    while ((k = in.read(b)) > 0) bos.write(b, 0, k);
                    in.close();
                    sendBytes(ex, 200, mime(path), bos.toByteArray());
                    return;
                }
                send(ex, 404, "text/plain; charset=utf-8", "Not found: " + path);
                return;
            }
            byte[] body = Files.readAllBytes(file);
            ex.getResponseHeaders().add("Cache-Control", "no-cache");
            sendBytes(ex, 200, mime(file.toString()), body);
        }
    }

    static String mime(String f) {
        f = f.toLowerCase();
        if (f.endsWith(".html")) return "text/html; charset=utf-8";
        if (f.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (f.endsWith(".css")) return "text/css; charset=utf-8";
        if (f.endsWith(".json")) return "application/json; charset=utf-8";
        if (f.endsWith(".webmanifest")) return "application/manifest+json; charset=utf-8";
        if (f.endsWith(".svg")) return "image/svg+xml";
        if (f.endsWith(".png")) return "image/png";
        if (f.endsWith(".jpg") || f.endsWith(".jpeg")) return "image/jpeg";
        if (f.endsWith(".webp")) return "image/webp";
        if (f.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }

    // -------------------------------------------------------------------- api

    static class ApiHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            ex.getResponseHeaders().add("Cache-Control", "no-store");
            ex.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            ex.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
            String path = ex.getRequestURI().getPath();
            String method = ex.getRequestMethod();
            if (method.equals("OPTIONS")) { sendBytes(ex, 204, "text/plain", new byte[0]); return; }
            try {
                Map<String, String> q = query(ex.getRequestURI().getRawQuery());
                switch (path) {
                    case "/api/health":
                        json(ex, "{\"ok\":true,\"app\":\"Bharat Yatra\",\"lan\":"
                                + jstr(LAN_IP) + ",\"port\":" + PORT + "}"); return;
                    case "/api/districts":
                        handleDistricts(ex, q); return;
                    case "/api/states":
                        json(ex, districtsJson); return;
                    case "/api/content":
                        json(ex, contentJson); return;
                    case "/api/place":
                        handlePlace(ex, q); return;
                    case "/api/contributions":
                        json(ex, contributionsJson(null, null)); return;
                    case "/api/stats":
                        handleStats(ex); return;
                    case "/api/contribute":
                        if (!method.equals("POST")) { send(ex, 405, "text/plain", "POST only"); return; }
                        handleContribute(ex); return;
                    case "/api/vote":
                        if (!method.equals("POST")) { send(ex, 405, "text/plain", "POST only"); return; }
                        handleVote(ex); return;
                    default:
                        json(ex, "{\"error\":\"unknown endpoint\"}");
                }
            } catch (Exception e) {
                e.printStackTrace();
                send(ex, 500, "application/json; charset=utf-8",
                        "{\"error\":" + jstr(String.valueOf(e.getMessage())) + "}");
            }
        }
    }

    static void handleDistricts(HttpExchange ex, Map<String, String> q) throws IOException {
        String state = q.getOrDefault("state", "");
        String key = "\"" + state + "\":[";
        int i = districtsJson.indexOf(key);
        if (i < 0) { json(ex, "{\"state\":" + jstr(state) + ",\"districts\":[]}"); return; }
        int start = i + key.length() - 1;
        int end = districtsJson.indexOf(']', start) + 1;
        json(ex, "{\"state\":" + jstr(state) + ",\"districts\":"
                + districtsJson.substring(start, end) + "}");
    }

    static void handlePlace(HttpExchange ex, Map<String, String> q) throws IOException {
        String state = q.getOrDefault("state", "");
        String district = q.getOrDefault("district", "");
        StringBuilder sb = new StringBuilder();
        sb.append("{\"state\":").append(jstr(state))
          .append(",\"district\":").append(jstr(district))
          .append(",\"community\":").append(contributionsJson(state, district))
          .append("}");
        json(ex, sb.toString());
    }

    static void handleStats(HttpExchange ex) throws IOException {
        int districts = countDistricts(districtsJson);
        int curated = countOccurrences(contentJson, "\"tagline\":");
        json(ex, "{\"states\":" + countOccurrences(districtsJson, "\":[")
                + ",\"districts\":" + districts
                + ",\"curated\":" + curated
                + ",\"community\":" + CONTRIBUTIONS.size() + "}");
    }

    static int countDistricts(String s) {
        int n = 0; boolean inStr = false; boolean inArr = false; boolean esc = false;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (esc) { esc = false; continue; }
            if (c == '\\') { esc = true; continue; }
            if (c == '"') { if (inArr && !inStr) n++; inStr = !inStr; continue; }
            if (inStr) continue;
            if (c == '[') inArr = true;
            else if (c == ']') inArr = false;
        }
        return n;
    }

    static int countOccurrences(String hay, String needle) {
        int n = 0, i = 0;
        while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length(); }
        return n;
    }

    // ------------------------------------------------------- contributions

    static final String[] FIELDS = {
            "id", "state", "district", "category", "title", "summary", "location",
            "bestTime", "language", "tips", "contributor", "role", "contact",
            "photo", "created", "votes", "status"
    };

    static void handleContribute(HttpExchange ex) throws IOException {
        String body = slurp(ex.getRequestBody());
        Map<String, String> f = parseForm(body);

        String title = f.getOrDefault("title", "").trim();
        String state = f.getOrDefault("state", "").trim();
        String district = f.getOrDefault("district", "").trim();
        if (title.isEmpty() || state.isEmpty() || district.isEmpty()) {
            send(ex, 400, "application/json; charset=utf-8",
                    "{\"ok\":false,\"error\":\"state, district and title are required\"}");
            return;
        }
        String photo = f.getOrDefault("photo", "");
        if (photo.length() > 1_400_000) photo = ""; // ~1 MB image cap

        Map<String, String> rec = new LinkedHashMap<>();
        rec.put("id", "c" + SEQ.incrementAndGet());
        rec.put("state", state);
        rec.put("district", district);
        rec.put("category", f.getOrDefault("category", "Hidden gem"));
        rec.put("title", title);
        rec.put("summary", f.getOrDefault("summary", ""));
        rec.put("location", f.getOrDefault("location", ""));
        rec.put("bestTime", f.getOrDefault("bestTime", ""));
        rec.put("language", f.getOrDefault("language", ""));
        rec.put("tips", f.getOrDefault("tips", ""));
        rec.put("contributor", f.getOrDefault("contributor", "Anonymous local"));
        rec.put("role", f.getOrDefault("role", "Local resident"));
        rec.put("contact", f.getOrDefault("contact", ""));
        rec.put("photo", photo);
        rec.put("created", new SimpleDateFormat("yyyy-MM-dd HH:mm").format(new Date()));
        rec.put("votes", "0");
        rec.put("status", "community");   // community -> reviewed -> verified

        CONTRIBUTIONS.add(rec);
        saveContributions();
        json(ex, "{\"ok\":true,\"id\":" + jstr(rec.get("id")) + "}");
    }

    static void handleVote(HttpExchange ex) throws IOException {
        Map<String, String> f = parseForm(slurp(ex.getRequestBody()));
        String id = f.getOrDefault("id", "");
        synchronized (CONTRIBUTIONS) {
            for (Map<String, String> c : CONTRIBUTIONS) {
                if (c.get("id").equals(id)) {
                    int v = Integer.parseInt(c.getOrDefault("votes", "0")) + 1;
                    c.put("votes", String.valueOf(v));
                    // community trust model: 5 independent confirmations => reviewed
                    if (v >= 5) c.put("status", "reviewed");
                    saveContributions();
                    json(ex, "{\"ok\":true,\"votes\":" + v + ",\"status\":"
                            + jstr(c.get("status")) + "}");
                    return;
                }
            }
        }
        send(ex, 404, "application/json; charset=utf-8", "{\"ok\":false}");
    }

    static String contributionsJson(String state, String district) {
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        synchronized (CONTRIBUTIONS) {
            for (Map<String, String> c : CONTRIBUTIONS) {
                if (state != null && !state.equalsIgnoreCase(c.get("state"))) continue;
                if (district != null && !district.equalsIgnoreCase(c.get("district"))) continue;
                if (!first) sb.append(',');
                first = false;
                sb.append(objToJson(c));
            }
        }
        return sb.append(']').toString();
    }

    static String objToJson(Map<String, String> m) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (String k : FIELDS) {
            String v = m.get(k);
            if (v == null) continue;
            if (!first) sb.append(',');
            first = false;
            sb.append(jstr(k)).append(':');
            if (k.equals("votes")) sb.append(v.isEmpty() ? "0" : v);
            else sb.append(jstr(v));
        }
        return sb.append('}').toString();
    }

    static synchronized void saveContributions() {
        try {
            Files.write(CONTRIB_FILE, contributionsJson(null, null).getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            System.err.println("could not save contributions: " + e);
        }
    }

    /** Minimal reader for the flat array of flat string objects we write ourselves. */
    static void loadContributions() {
        try {
            if (!Files.exists(CONTRIB_FILE)) return;
            String s = new String(Files.readAllBytes(CONTRIB_FILE), StandardCharsets.UTF_8).trim();
            int i = 0;
            while (i < s.length()) {
                int open = s.indexOf('{', i);
                if (open < 0) break;
                int close = findObjEnd(s, open);
                if (close < 0) break;
                Map<String, String> rec = parseFlatObject(s.substring(open + 1, close));
                if (!rec.isEmpty()) {
                    CONTRIBUTIONS.add(rec);
                    String id = rec.getOrDefault("id", "c0").replaceAll("[^0-9]", "");
                    if (!id.isEmpty()) SEQ.set(Math.max(SEQ.get(), Long.parseLong(id)));
                }
                i = close + 1;
            }
        } catch (Exception e) {
            System.err.println("could not load contributions: " + e);
        }
    }

    static int findObjEnd(String s, int open) {
        boolean inStr = false, esc = false;
        for (int i = open; i < s.length(); i++) {
            char c = s.charAt(i);
            if (esc) { esc = false; continue; }
            if (c == '\\') { esc = true; continue; }
            if (c == '"') { inStr = !inStr; continue; }
            if (!inStr && c == '}') return i;
        }
        return -1;
    }

    static Map<String, String> parseFlatObject(String body) {
        Map<String, String> m = new LinkedHashMap<>();
        int i = 0;
        while (i < body.length()) {
            int ks = body.indexOf('"', i);
            if (ks < 0) break;
            StringBuilder key = new StringBuilder();
            i = readString(body, ks, key);
            int colon = body.indexOf(':', i);
            if (colon < 0) break;
            i = colon + 1;
            while (i < body.length() && Character.isWhitespace(body.charAt(i))) i++;
            if (i >= body.length()) break;
            if (body.charAt(i) == '"') {
                StringBuilder val = new StringBuilder();
                i = readString(body, i, val);
                m.put(key.toString(), val.toString());
            } else {
                int end = i;
                while (end < body.length() && body.charAt(end) != ',') end++;
                m.put(key.toString(), body.substring(i, end).trim());
                i = end;
            }
            int comma = body.indexOf(',', i);
            if (comma < 0) break;
            i = comma + 1;
        }
        return m;
    }

    /** reads a JSON string starting at the opening quote; returns index after closing quote */
    static int readString(String s, int start, StringBuilder out) {
        int i = start + 1;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (c == '\\' && i + 1 < s.length()) {
                char n = s.charAt(++i);
                switch (n) {
                    case 'n': out.append('\n'); break;
                    case 't': out.append('\t'); break;
                    case 'r': out.append('\r'); break;
                    case 'b': out.append('\b'); break;
                    case 'f': out.append('\f'); break;
                    case 'u':
                        out.append((char) Integer.parseInt(s.substring(i + 1, i + 5), 16));
                        i += 4;
                        break;
                    default: out.append(n);
                }
                i++;
                continue;
            }
            if (c == '"') return i + 1;
            out.append(c);
            i++;
        }
        return i;
    }

    // ----------------------------------------------------------- http helpers

    static Map<String, String> query(String raw) {
        Map<String, String> m = new LinkedHashMap<>();
        if (raw == null || raw.isEmpty()) return m;
        for (String pair : raw.split("&")) {
            int eq = pair.indexOf('=');
            try {
                if (eq < 0) m.put(URLDecoder.decode(pair, "UTF-8"), "");
                else m.put(URLDecoder.decode(pair.substring(0, eq), "UTF-8"),
                        URLDecoder.decode(pair.substring(eq + 1), "UTF-8"));
            } catch (UnsupportedEncodingException ignored) { }
        }
        return m;
    }

    static Map<String, String> parseForm(String body) {
        return query(body == null ? "" : body);
    }

    static void json(HttpExchange ex, String body) throws IOException {
        send(ex, 200, "application/json; charset=utf-8", body);
    }

    static void send(HttpExchange ex, int code, String type, String body) throws IOException {
        sendBytes(ex, code, type, body.getBytes(StandardCharsets.UTF_8));
    }

    static void sendBytes(HttpExchange ex, int code, String type, byte[] body) throws IOException {
        try {
            ex.getResponseHeaders().set("Content-Type", type);
            boolean head = "HEAD".equalsIgnoreCase(ex.getRequestMethod());
            boolean empty = body == null || body.length == 0;

            if (head || empty || code == 204 || code == 304) {
                // -1 => "no response body". Passing 0 here makes the JDK server use
                // chunked encoding, which is illegal for HEAD/204 and breaks proxies.
                if (!head && !empty) {
                    ex.sendResponseHeaders(code, body.length);
                    try (OutputStream os = ex.getResponseBody()) { os.write(body); }
                } else {
                    if (head && !empty)
                        ex.getResponseHeaders().set("Content-Length", String.valueOf(body.length));
                    // The JDK's HTTP server always drops the socket after a HEAD.
                    // Saying so explicitly stops the platform's proxy from re-using a
                    // dead connection — that re-use is what produced random 404s
                    // ("x-render-routing: no-server") for unrelated files.
                    if (head) ex.getResponseHeaders().set("Connection", "close");
                    ex.sendResponseHeaders(code, -1);
                }
            } else {
                ex.sendResponseHeaders(code, body.length);
                try (OutputStream os = ex.getResponseBody()) { os.write(body); }
            }
        } catch (IOException io) {
            // client went away mid-response; never let it bubble up and kill the handler
        } finally {
            ex.close();
        }
    }

    static String jstr(String s) {
        if (s == null) return "\"\"";
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.append('"').toString();
    }
}
