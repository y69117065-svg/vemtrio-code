// VEMTRIO Guard: toplulukta paylaşılan kodları zararlı kalıplar için tarayan otomatik tarayıcı (motor).
// Hem sunucuda (require) hem tarayıcıda (window.VGuard) çalışır.
//   scan([{name, content}]) -> { score 0-100, verdict "clean"|"suspicious"|"danger", findings[], stats }
//
// İmzalar (zararlı kalıp listesi) ayrı bir veri dosyasında durur: lib/guard-rules.json
// (antivirüslerin imza veritabanı gibi). Böylece motor kodu sade kalır ve kurallar kod değiştirmeden güncellenir.
// Not: imza dosyası virüs kalıpları içerdiği için bazı antivirüsler onu yanlışlıkla zararlı sanabilir.
// Bu bir antivirüs değildir: kural tabanlıdır, yeni ya da çok iyi gizlenmiş zararlıları kaçırabilir.
(function (root, factory) {
    if (typeof module === "object" && module.exports) module.exports = factory(require("./guard-rules.json"));
    else {
        const G = factory(null);
        G.ready = fetch("/lib/guard-rules.json").then(r => r.json()).then(G.load);
        root.VGuard = G;
    }
})(typeof self !== "undefined" ? self : this, function (data) {
    let RULES = [], NET = /$^/, COOKIE = /$^/, KEY_NET = /$^/, W = { crit: 60, high: 30, med: 12, low: 4 }, version = "0";
    const ALLOWED_EXT = [], LIMITS = { files: 30, fileBytes: 100 * 1024, totalBytes: 300 * 1024 };
    const rx = (o) => new RegExp(o.src, o.flags);
    function load(d) {
        RULES = d.RULES.map(r => [r.id, r.sev, rx(r.re), r.tr, r.en]);
        NET = rx(d.NET); COOKIE = rx(d.COOKIE); KEY_NET = rx(d.KEY_NET);
        W = d.W || W; version = d.version || version;
        ALLOWED_EXT.length = 0; ALLOWED_EXT.push(...d.ALLOWED_EXT);
        Object.assign(LIMITS, d.LIMITS || {});
        return api;
    }
    const extOf = (n) => (String(n).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || "";
    // Uzantısız standart proje dosyaları (README, LICENSE, AUTHORS...) metin sayılır
    const STD_NAMES = /^(README|LICENSE|LICENCE|AUTHORS|CHANGELOG|CONTRIBUTORS|NOTICE|COPYING)$/i;
    const baseName = (n) => String(n).split("/").pop();
    const isAllowed = (n) => ALLOWED_EXT.includes(extOf(n)) || STD_NAMES.test(baseName(n));
    // Güvenilir CDN'ler: sadece "dış script" uyarısından muaf (indirme/yönlendirme kuralları yine çalışır,
    // çünkü jsdelivr/unpkg herkesin yüklediği dosyaları da sunar)
    // jsdelivr/unpkg herkesin paket yükleyebildiği yerler: yalnız sürümü sabitlenmiş npm paketi (paket@1.2.3) muaf; gh/, combine/ vb. değil
    const TRUSTED_CDN = /<script[^>]+src\s*=\s*["']?(https?:)?\/\/(fonts\.googleapis\.com\/|cdnjs\.cloudflare\.com\/ajax\/libs\/|unpkg\.com\/(@[\w.-]+\/)?[\w.-]+@\d+\.\d+\.\d+\/|cdn\.jsdelivr\.net\/npm\/(@[\w.-]+\/)?[\w.-]+@\d+\.\d+\.\d+\/)/i;
    // SVG içinde çalışabilen kod: <script>, olay öznitelikleri (onload= ...), <foreignObject> (HTML gömme), javascript: bağlantıları
    const SVG_ACTIVE = /<script\b|<foreignObject\b|\son[a-z]+\s*=|(href|xlink:href)\s*=\s*["']?\s*javascript:|<(iframe|embed|object)\b|<!ENTITY/i;
    // Oyun hareket tuşları (WASD, oklar, boşluk) karşılaştırması: çok oyunculu oyunlarda normaldir, keylogger değildir
    const GAME_KEYS = /(["'`](Arrow(Up|Down|Left|Right)|Key[WASD]|[wasdWASD ]|Space|Spacebar|Enter|Escape|Shift)["'`])/;
    const CHUNK = 20000, OVERLAP = 400;
    // Çok uzun satırları atlamak yerine örtüşen parçalara böler (kural kaçırmayı engeller)
    const parts = (ln) => { if (ln.length <= CHUNK) return [ln]; const out = []; for (let s = 0; s < ln.length; s += CHUNK - OVERLAP) out.push(ln.slice(s, s + CHUNK)); return out; };

    function scan(files) {
        if (!RULES.length) throw new Error("guard_rules_not_loaded");
        const findings = [];
        let lines = 0, bytes = 0;
        const add = (file, line, rule, sev, tr, en, text) => {
            if (findings.length >= 80) return;
            findings.push({ file, line, rule, sev, tr, en, snippet: String(text || "").trim().slice(0, 160) });
        };
        for (const f of files || []) {
            const name = String(f.name || ""), content = String(f.content || "");
            bytes += content.length;
            const ext = extOf(name);
            if (!isAllowed(name)) { add(name, 0, "bad_ext", "crit", "İzin verilmeyen dosya türü (sadece kod/metin dosyaları).", "File type not allowed (code/text files only).", name); continue; }
            if (/\0/.test(content)) { add(name, 0, "binary", "crit", "Metin değil, ikili (binary) içerik.", "Binary content, not text.", name); continue; }
            const L = content.split(/\r?\n/);
            lines += L.length;
            if (ext === "svg" || (ext === "xml" && /<svg\b/i.test(content))) {
                const m = content.match(SVG_ACTIVE);
                if (m) add(name, content.slice(0, m.index).split("\n").length, "svg_active", "crit", "SVG dosyasında çalışabilir kod var (script / onload / foreignObject / javascript:).", "SVG contains executable content (script / event handler / foreignObject / javascript:).", m[0]);
            }
            const perRule = {};
            const near = (i, re, span = 6) => { for (let j = Math.max(0, i - span); j <= Math.min(L.length - 1, i + span); j++) if (re.test(L[j])) return true; return false; };
            L.forEach((ln, i) => {
                const P = parts(ln);
                const hit = (re) => P.some(p => { re.lastIndex = 0; return re.test(p); });
                for (const [id, sev, re, tr, en] of RULES) {
                    if (id === "remote_script" && TRUSTED_CDN.test(ln) && !/<script[^>]+src[^>]*>[^\n]*<script[^>]+src/i.test(ln)) continue;
                    if (hit(re) && (perRule[id] = (perRule[id] || 0) + 1) <= 3) add(name, i + 1, id, sev, tr, en, ln);
                }
                // Bağlamsal kalıplar: tek başına normal, birlikte tehlikeli
                if (hit(COOKIE) && near(i, NET) && (perRule.cookie = (perRule.cookie || 0) + 1) <= 2)
                    add(name, i + 1, "cookie_exfil", "crit", "Çerez/oturum bilgisini okuyup ağa gönderme (hesap çalma).", "Reads cookies/session tokens and sends them over the network (account theft).", ln);
                if (hit(KEY_NET) && !(GAME_KEYS.test(ln) && !/\bkeylog/i.test(ln)) && (perRule.keylog = (perRule.keylog || 0) + 1) <= 2)
                    add(name, i + 1, "keylog_net", "high", "Basılan tuşları ağa gönderiyor olabilir (keylogger şüphesi).", "May be sending pressed keys over the network (possible keylogger).", ln);
                if (/type\s*=\s*["']password/i.test(ln) && near(i, NET, 25) && (perRule.pw = (perRule.pw || 0) + 1) <= 1)
                    add(name, i + 1, "password_form", "high", "Şifre alanı ve ağ gönderimi birlikte (sahte giriş sayfası şüphesi).", "Password field plus network sending (possible phishing page).", ln);
            });
            // Gizleme ölçümleri
            const b64 = content.match(/[A-Za-z0-9+/]{600,}={0,2}/g);
            if (b64) add(name, 0, "base64_blob", "med", `Çok uzun şifrelenmiş (base64) veri bloğu (${b64.length} adet).`, `Very long base64-encoded blob (${b64.length}).`, b64[0].slice(0, 60) + "…");
            const hex = (content.match(/\\x[0-9a-f]{2}/gi) || []).length;
            if (hex > 80) add(name, 0, "hex_escapes", "med", `Yoğun \\x kaçış dizisi (${hex}): metin gizleme tekniği.`, `Heavy \\x escapes (${hex}): text hiding technique.`, "");
            const fcc = (content.match(/fromCharCode/g) || []).length;
            if (fcc > 10) add(name, 0, "charcode", "med", `Çok sayıda String.fromCharCode (${fcc}): metin gizleme.`, `Many String.fromCharCode calls (${fcc}): text hiding.`, "");
            const longest = L.reduce((m, x) => Math.max(m, x.length), 0);
            if (longest > 5000 && /^(js|mjs|html|htm)$/.test(ext)) add(name, 0, "minified", "low", "Sıkıştırılmış/tek satır kod: okunması zor, dikkatli incele.", "Minified single-line code: hard to review.", "");
        }
        // Puan: her bulgu ağırlığı kadar; aynı kuraldan gelen tekrarlar azalarak eklenir
        const seen = {};
        let score = 0;
        for (const f of findings) { const n = (seen[f.rule] = (seen[f.rule] || 0) + 1); score += W[f.sev] / n; }
        score = Math.min(100, Math.round(score));
        const crit = findings.some(f => f.sev === "crit");
        const verdict = crit || score >= 50 ? "danger" : score >= 20 ? "suspicious" : "clean";
        return { score, verdict, findings, stats: { files: (files || []).length, lines, bytes } };
    }
    const api = { scan, load, ALLOWED_EXT, LIMITS, extOf, isAllowed, get version() { return version; } };
    if (data) load(data);
    return api;
});
