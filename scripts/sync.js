// Editör arayüzü app/web klasöründedir. Geliştirici bilgisayarında tek kaynak sitedeki /studio klasörüdür:
// site klasörü varsa oradan kopyalanır; yoksa (ör. GitHub'dan indirilen kopya) depodaki app/web olduğu gibi kullanılır.
// Monaco her durumda node_modules'tan yerel olarak eklenir.
const fs = require("fs"), path = require("path");
const SITE = process.env.VEMTRIO_SITE || path.join(__dirname, "..", "..", "VEMTRIO Site");
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "app", "web");
const cp = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.cpSync(from, to, { recursive: true }); };

if (fs.existsSync(path.join(SITE, "studio"))) {
    fs.rmSync(OUT, { recursive: true, force: true });
    cp(path.join(SITE, "studio"), path.join(OUT, "studio"));
    cp(path.join(SITE, "img", "logo.png"), path.join(OUT, "img", "logo.png"));
    for (const f of ["guard.js", "profanity.js", "guard-rules.json"]) if (fs.existsSync(path.join(SITE, "lib", f))) cp(path.join(SITE, "lib", f), path.join(OUT, "lib", f));
    cp(path.join(SITE, "vemtrio.js"), path.join(OUT, "vemtrio.js"));
    // Uygulama simgesi build/icon.png'de ayrı tutulur (koyu zeminli; beyaz logo açık masaüstünde görünmüyordu). Sadece yoksa logodan oluşur.
    if (!fs.existsSync(path.join(ROOT, "build", "icon.png"))) cp(path.join(SITE, "img", "logo.png"), path.join(ROOT, "build", "icon.png"));
    console.log("site → app/web kopyalandı");
} else if (!fs.existsSync(path.join(OUT, "studio"))) {
    console.error("app/web/studio bulunamadı ve site klasörü yok: " + SITE); process.exit(1);
} else console.log("site klasörü yok; depodaki app/web kullanılıyor");

const mon = path.join(ROOT, "node_modules", "monaco-editor", "min", "vs");
if (fs.existsSync(mon)) {
    fs.rmSync(path.join(OUT, "monaco"), { recursive: true, force: true });
    cp(mon, path.join(OUT, "monaco", "vs"));
    // Masaüstünde Monaco yerelden yüklensin (bir kez eklenir)
    const idx = path.join(OUT, "studio", "index.html"), html = fs.readFileSync(idx, "utf8");
    if (!html.includes('"app://vemtrio/monaco/vs"')) fs.writeFileSync(idx, html.replace('<script>window.MONACO_BASE = window.MONACO_BASE ||', '<script>window.MONACO_BASE = "app://vemtrio/monaco/vs"; window.MONACO_BASE = window.MONACO_BASE ||'));
} else console.warn("monaco-editor bulunamadı (npm install çalıştır); CDN kullanılacak");
console.log("sync ok →", OUT);
