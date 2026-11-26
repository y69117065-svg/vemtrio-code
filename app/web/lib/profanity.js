// VEMTRIO küfür filtresi (Türkçe + İngilizce). Hem sunucuda (require) hem tarayıcıda (window.VProfanity) çalışır.
//   check(text) -> { clean, hits:[{s,e}], unlocated }   mask(text) -> "***" ile maskeli metin
// Kandırmalara dayanıklı: büyük/küçük harf, 0r0spu / s1kt1r (sayı-simge), ammmk (harf tekrarı), s.i.k.t.i.r (ayrık harf).
// Masum kelimeleri yakalamamak için kısa kelimeler sadece TAM kelime olarak, uzunlar kelime BAŞI olarak aranır.
// Listeye ekleme: TR_PREFIX / EN_PREFIX (kelime başı), EXACT (tam kelime). Harfler katlanmış yazılır (ç->c, ş->s, ö->o, ü->u, ğ->g; ı korunur) ve tekrarlar tek harf.
(function (root, factory) {
    if (typeof module === "object" && module.exports) module.exports = factory();
    else root.VProfanity = factory();
})(typeof self !== "undefined" ? self : this, function () {
    const TR_PREFIX = ["orospu", "orosbu", "orspu", "oruspu", "orusbu", "siktir", "sikerim", "sikeyim", "siktim", "sikim", "sikik", "sikis", "sikiyim", "yarak", "dalyarak",
        "amcik", "amina", "aminako", "pezevenk", "gavat", "kahpe", "kaltak", "fahise", "surtuk", "yavsak", "ibne", "serefsiz", "gerizekali",
        "tasak", "gotveren", "gotlek", "pezeveng", "anani", "avradini", "bacini", "sokayim", "sokarim", "yarag"];
    const EN_PREFIX = ["fuck", "fck", "motherf", "bitch", "biatch", "shit", "cunt", "ashole", "bastard", "whore", "slut", "retard", "wanker", "pusy", "dildo", "porn",
        // müstehcen / cinsel içerik
        "vajina", "vagina", "masturb", "mastrb", "orgazm", "orgasm", "erotik", "erotic", "hentai", "nudes", "titty", "blowjob", "handjob", "cumshot", "onlyfans", "pornhub", "xvideos", "xhamster"];
    const RAW_TR_PREFIX = ["piç", "götveren", "götlek"];                         // Türkçe harfiyle (piçlik)
    const RAW_TR_EXACT = new Set(["göt", "götü", "götün", "götünü", "götüne", "göte", "götte", "götten", "götlü"]);   // "götürdü" masum kalsın
    const ASCII_TR_EXACT = new Set(["pici", "picin", "pice", "picler", "piclik", "piclikler", "gotu", "gotun", "gotunu", "gotune", "gotlu", "gote", "gotte", "gotune", "gotunden"]);
    const RAW_PREFIX = ["nigger", "nigga", "faggot"];        // harf tekrarı silinmeden bakılır (Niger masum kalsın)
    const ALLOW = new Set(["shitake", "shiitake", "sikke", "sikkeler", "dickens", "cocktail", "cockpit"]);
    const EXACT = new Set(["amk", "aq", "amq", "mk", "sg", "sik", "dick", "cock", "twat", "kys", "fag", "fu", "stfu", "wtf",
        // müstehcen (tam kelime: "seksen", "seksek", "saksofon", "penisilin", "Essex" masum kalsın)
        "seks", "seksi", "sekse", "seksin", "sekste", "seksten", "seksle", "sex", "sexy", "seksuel", "sexual", "nude", "nsfw", "tits", "boob", "boobs", "horny", "sakso", "saksocu", "penis", "penisi", "penise", "penisin", "memeler", "memelerini", "goguslerini"]);
    const SUBSTR = ["fuck", "orospu", "siktir", "amcik", "pezevenk", "motherf"];     // harfler bitişik yazılmış uzun hileler için

    // Görünmez karakterler (sıfır genişlik, yön işaretleri, yumuşak tire, varyasyon seçicileri, Hangul dolgu) ve
    // Kiril/Yunan harf taklitleri: "оrospu" (Kiril о), "s\u200Biktir" gibi hileler için
    const INVIS = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0]/g;
    const HOMO = { "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "к": "k", "м": "m", "т": "t", "н": "h", "в": "b", "і": "i", "ї": "i", "ј": "j", "ѕ": "s", "һ": "h", "ԁ": "d", "ɡ": "g",
        "А": "A", "Е": "E", "О": "O", "Р": "P", "С": "C", "У": "Y", "Х": "X", "К": "K", "М": "M", "Т": "T", "Н": "H", "В": "B", "І": "I", "Ј": "J", "Ѕ": "S",
        "α": "a", "ε": "e", "ο": "o", "ρ": "p", "τ": "t", "υ": "u", "ν": "v", "κ": "k", "ι": "i", "χ": "x", "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X" };
    const HOMO_RE = new RegExp("[" + Object.keys(HOMO).join("") + "]", "g");
    // Metni normalleştirir ve her karakterin asıl metindeki yerini tutar (maskeleme doğru yere yapılsın)
    function norm(s) {
        let t = "", idx = [];
        for (let i = 0; i < s.length; i++) {
            const c = s[i];
            if (INVIS.test(c)) { INVIS.lastIndex = 0; continue; }
            INVIS.lastIndex = 0;
            let n = HOMO[c] || c;
            // tam genişlikli harfler (ｓｉｋ) ve benzer uyumluluk biçimleri — tek karaktere dönüşüyorsa
            if (!HOMO[c] && c.charCodeAt(0) > 127) { const k = c.normalize("NFKC"); if (k.length === 1) n = k; }
            t += n; idx.push(i);
        }
        idx.push(s.length);
        return { t, idx };
    }
    const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i", "|": "i" };
    const FOLD = { "ç": "c", "ğ": "g", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u" };
    const lower = (w) => w.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
    const fold = (w) => w.replace(/[0134578@$!|]/g, c => LEET[c]).replace(/[çğöşüâîû]/g, c => FOLD[c]);
    const collapse = (w) => w.replace(/(.)\1+/g, "$1");
    // Türkçe klavyesi olmayanlar ı yerine i yazar; bu yüzden ı da i kabul edilir AMA "sıkıntı" gibi kelimeler listede olmadığı için güvenli.
    const keyOf = (w) => collapse(fold(lower(w)).replace(/ı/g, "i"));
    const collapsedList = (arr) => arr.map(p => collapse(p));
    const TRP = collapsedList(TR_PREFIX), ENP = collapsedList(EN_PREFIX), SUB = collapsedList(SUBSTR);

    function badWord(w) {
        const raw = lower(w), k = keyOf(w), rf = fold(raw).replace(/ı/g, "i");
        if (ALLOW.has(k) || ALLOW.has(rf)) return false;
        if (k.length < 2 && !EXACT.has(k)) return false;
        if (EXACT.has(k) || EXACT.has(rf)) return true;
        if (RAW_TR_EXACT.has(raw) || RAW_TR_PREFIX.some(p => raw.startsWith(p))) return true;
        if (ASCII_TR_EXACT.has(raw) || ASCII_TR_EXACT.has(rf)) return true;
        if (RAW_PREFIX.some(p => rf.startsWith(p))) return true;
        return TRP.some(p => k.startsWith(p)) || ENP.some(p => k.startsWith(p));
    }

    function check(text) {
        const orig = String(text || ""), N = norm(orig), s = N.t;
        const tokRe = /[A-Za-z0-9ÇĞİÖŞÜçğıöşüÂÎÛâîû@$!|]+/g;
        const toks = [];
        let m;
        while ((m = tokRe.exec(s))) toks.push({ s: m.index, e: m.index + m[0].length, w: m[0] });
        const hits = [];
        toks.forEach(t => { if (badWord(t.w)) hits.push({ s: t.s, e: t.e }); });
        // "s i k t i r", "o.r.o.s.p.u": art arda tek harflik parçaları birleştirip bak
        for (let i = 0; i < toks.length;) {
            let j = i;
            while (j < toks.length && toks[j].w.length === 1 && (j === i || toks[j].s - toks[j - 1].e <= 3)) j++;
            if (j - i >= 3) {
                const joined = toks.slice(i, j).map(t => t.w).join("");
                if (badWord(joined) || SUB.some(p => keyOf(joined).includes(p))) hits.push({ s: toks[i].s, e: toks[j - 1].e });
                i = j;
            } else i++;
        }
        // Bitişik yazılmış uzun hileler ("fuckyou", "siktirgit")
        let unlocated = false;
        if (!hits.length) {
            const squashed = keyOf(s.replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşüÂÎÛâîû@$!|]/g, ""));
            if (SUB.some(p => squashed.includes(p))) unlocated = true;
        }
        // konumları asıl metne çevir (görünmez karakterler atlanmıştı)
        const back = hits.map(h => ({ s: N.idx[h.s], e: N.idx[h.e - 1] + 1 }));
        return { clean: !back.length && !unlocated, hits: back, unlocated };
    }

    function mask(text) {
        const s = String(text || ""), r = check(s);
        if (r.clean) return s;
        if (r.unlocated) return s.replace(/[^\s]/g, "*");
        let out = "", last = 0;
        r.hits.sort((a, b) => a.s - b.s).forEach(h => {
            if (h.s < last) return;
            out += s.slice(last, h.s) + "*".repeat(h.e - h.s);
            last = h.e;
        });
        return out + s.slice(last);
    }

    // Kullanıcı adları için sıkı mod: kelimeler bitişik yazıldığından ("amkcocugu", "xfuckx") parça olarak da aranır
    // Sadece masum kelimelerin içinde geçmeyecek kadar ayırt edici parçalar (kayarak, tamamına, Scunthorpe serbest kalsın)
    const STRICT_SUB = ["orosp", "orsp", "orusp", "orusb", "siktir", "sikerim", "sikeyim", "yarrak", "pezeven", "amcik", "gotveren", "fuck", "bitch", "nigger", "nigga", "whore", "asshole", "faggot"];
    const STRICT_EDGE = ["amk", "amq"];   // kısa olanlar sadece ismin başında ya da sonunda ("amkcocugu", "selamk"... değil)
    function isCleanName(name) {
        if (!check(name).clean) return false;
        const raw = fold(lower(norm(String(name || "")).t)).replace(/ı/g, "i").replace(/[^a-z0-9]/g, "");
        if (STRICT_SUB.some(p => raw.includes(p) || collapse(p).length >= 6 && collapse(raw).includes(collapse(p)))) return false;
        // başta ve sonda her zaman (uzun isimlerin sonuna "amk" eklemek de engellenir); collapse ile "ammk" de yakalanır
        const cr = collapse(raw);
        return !STRICT_EDGE.some(p => raw.startsWith(p) || raw.endsWith(p) || cr.startsWith(p) || cr.endsWith(p));
    }
    return { check, mask, isClean: (t) => check(t).clean, isCleanName, normalize: (t) => norm(String(t || "")).t };
});
