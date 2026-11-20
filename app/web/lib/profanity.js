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
    const EN_PREFIX = ["fuck", "fck", "motherf", "bitch", "biatch", "shit", "cunt", "ashole", "bastard", "whore", "slut", "retard", "wanker", "pusy", "dildo", "porn"];
    const RAW_TR_PREFIX = ["piç", "götveren", "götlek"];                         // Türkçe harfiyle (piçlik)
    const RAW_TR_EXACT = new Set(["göt", "götü", "götün", "götünü", "götüne", "göte", "götte", "götten", "götlü"]);   // "götürdü" masum kalsın
    const RAW_PREFIX = ["nigger", "nigga", "faggot"];        // harf tekrarı silinmeden bakılır (Niger masum kalsın)
    const ALLOW = new Set(["shitake", "shiitake", "sikke", "sikkeler", "dickens", "cocktail", "cockpit"]);
    const EXACT = new Set(["amk", "aq", "amq", "mk", "sg", "sik", "dick", "cock", "twat", "kys", "fag", "fu", "stfu", "wtf"]);
    const SUBSTR = ["fuck", "orospu", "siktir", "amcik", "pezevenk", "motherf"];     // harfler bitişik yazılmış uzun hileler için

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
        if (RAW_PREFIX.some(p => rf.startsWith(p))) return true;
        return TRP.some(p => k.startsWith(p)) || ENP.some(p => k.startsWith(p));
    }

    function check(text) {
        const s = String(text || "");
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
        return { clean: !hits.length && !unlocated, hits, unlocated };
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
        const raw = fold(lower(String(name || ""))).replace(/ı/g, "i").replace(/[^a-z0-9]/g, "");
        if (STRICT_SUB.some(p => raw.includes(p) || collapse(p).length >= 6 && collapse(raw).includes(collapse(p)))) return false;
        return !STRICT_EDGE.some(p => raw.startsWith(p) || (raw.endsWith(p) && raw.length <= p.length + 3));   // başta: her zaman; sonda: sadece kısa isimlerde
    }
    return { check, mask, isClean: (t) => check(t).clean, isCleanName };
});
