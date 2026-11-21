/* VEMTRIO Code — Kod Havuzu: hazır kod kalıpları ve başlangıç projeleri.
 * Proje boş başlar; isteyen buradan kalıp ekler, kopyalar ya da önizlemede dener. */
(() => {
    const VS = window.VS, t = VS.t, esc = VS.esc, $ = VS.$;
    const P = [];
    const add = (cat, id, title, desc, lang, code) => P.push({ cat, id, title, desc, lang, code });

    // ---------- HTML ----------
    add("HTML", "html-iskelet", "Sayfa iskeleti", "Her HTML dosyasının temeli. Kısayolu: boş dosyada ! yazıp Enter.", "html",
`<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sayfam</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <script src="app.js"></script>
</body>
</html>
`);
    add("HTML", "html-buton", "Buton ve tıklama", "Butona basınca yazı değişir.", "html",
`<button id="btn">Bana tıkla</button>
<p id="yazi">Henüz tıklanmadı.</p>
<script>
    let sayac = 0;
    document.getElementById("btn").addEventListener("click", () => {
        sayac++;
        document.getElementById("yazi").textContent = sayac + " kez tıklandı.";
    });
</script>
`);
    add("HTML", "html-form", "Form ve doğrulama", "İsim ve e-posta formu; boş bırakılırsa uyarır.", "html",
`<form id="form">
    <input id="isim" placeholder="Adın" required>
    <input id="eposta" type="email" placeholder="E-posta" required>
    <button type="submit">Gönder</button>
</form>
<p id="sonuc"></p>
<script>
    document.getElementById("form").addEventListener("submit", (e) => {
        e.preventDefault(); // sayfa yenilenmesin
        const isim = document.getElementById("isim").value.trim();
        document.getElementById("sonuc").textContent = "Teşekkürler " + isim + "!";
    });
</script>
`);
    add("HTML", "html-liste", "Listeye eleman ekleme", "Yazdığın şeyi listeye ekler (yapılacaklar listesi).", "html",
`<input id="giris" placeholder="Yapılacak iş">
<button id="ekle">Ekle</button>
<ul id="liste"></ul>
<script>
    document.getElementById("ekle").onclick = () => {
        const giris = document.getElementById("giris");
        if (!giris.value.trim()) return;
        const li = document.createElement("li");
        li.textContent = giris.value;
        li.onclick = () => li.remove(); // tıklayınca sil
        document.getElementById("liste").appendChild(li);
        giris.value = "";
    };
</script>
`);
    add("HTML", "html-gorsel", "Görsel ve bağlantı", "Resim, bağlantı ve yeni sekmede açma.", "html",
`<img src="https://picsum.photos/300/200" alt="Örnek görsel" width="300">
<a href="https://vemtriotr.vercel.app" target="_blank" rel="noopener">VEMTRIO'ya git</a>
`);

    // ---------- CSS ----------
    add("CSS", "css-ortala", "Bir şeyi tam ortalamak", "Sayfanın tam ortasına yerleştirir (flexbox).", "css",
`body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;      /* dikey ortala */
    justify-content: center;  /* yatay ortala */
}
`);
    add("CSS", "css-kart", "Kart tasarımı", "Gölgeli, yuvarlak köşeli kart.", "css",
`.kart {
    max-width: 320px;
    padding: 20px;
    border-radius: 12px;
    background: #1b1e24;
    color: #eee;
    box-shadow: 0 10px 30px rgba(0, 0, 0, .35);
    transition: transform .2s;
}
.kart:hover { transform: translateY(-4px); }
`);
    add("CSS", "css-grid", "Izgara (grid) düzen", "Kutuları ekrana göre otomatik sütunlara dizer.", "css",
`.izgara {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
}
`);
    add("CSS", "css-buton", "Güzel buton", "Üzerine gelince renk değiştiren buton.", "css",
`button {
    padding: 10px 18px;
    border: 0;
    border-radius: 8px;
    background: #86b2dc;
    color: #0b0d10;
    font-weight: 600;
    cursor: pointer;
    transition: background .2s, transform .1s;
}
button:hover { background: #a6c8e8; }
button:active { transform: scale(.97); }
`);
    add("CSS", "css-animasyon", "Animasyon", "Yanıp sönen ve dönen öğe.", "css",
`@keyframes don { to { transform: rotate(360deg); } }
@keyframes nabiz { 50% { opacity: .4; } }
.donen { animation: don 2s linear infinite; }
.nabiz { animation: nabiz 1.2s ease-in-out infinite; }
`);
    add("CSS", "css-mobil", "Telefona uyum (responsive)", "Ekran daralınca düzeni değiştirir.", "css",
`.kutu { display: flex; gap: 20px; }
@media (max-width: 600px) {
    .kutu { flex-direction: column; } /* telefonda alt alta */
}
`);

    // ---------- JavaScript ----------
    add("JavaScript", "js-degisken", "Değişkenler", "let, const ve temel türler.", "javascript",
`const isim = "Ali";      // değişmez
let puan = 0;           // değişebilir
puan = puan + 10;
const liste = [1, 2, 3];
const oyuncu = { ad: "Ali", can: 3 };
console.log(isim, puan, liste.length, oyuncu.ad);
`);
    add("JavaScript", "js-kosul", "Koşullar (if / else)", "Karar verme.", "javascript",
`const puan = 75;
if (puan >= 90) {
    console.log("Mükemmel");
} else if (puan >= 50) {
    console.log("Geçtin");
} else {
    console.log("Tekrar dene");
}
`);
    add("JavaScript", "js-dongu", "Döngüler", "for, for...of ve forEach.", "javascript",
`for (let i = 1; i <= 5; i++) console.log("Sayı:", i);

const meyveler = ["elma", "armut", "kiraz"];
for (const m of meyveler) console.log(m);
meyveler.forEach((m, sira) => console.log(sira, m));
`);
    add("JavaScript", "js-fonksiyon", "Fonksiyonlar", "Normal ve ok (arrow) fonksiyon.", "javascript",
`function topla(a, b) {
    return a + b;
}
const carp = (a, b) => a * b;
console.log(topla(2, 3), carp(4, 5));
`);
    add("JavaScript", "js-rastgele", "Rastgele sayı", "min ile max arasında tam sayı.", "javascript",
`function rastgele(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
console.log("Zar:", rastgele(1, 6));
`);
    add("JavaScript", "js-zamanlayici", "Zamanlayıcı", "Bir kez ya da sürekli çalışan zamanlayıcı.", "javascript",
`setTimeout(() => console.log("3 saniye geçti"), 3000);

let saniye = 0;
const id = setInterval(() => {
    saniye++;
    console.log("Saniye:", saniye);
    if (saniye === 5) clearInterval(id); // durdur
}, 1000);
`);
    add("JavaScript", "js-kayit", "Tarayıcıya kaydetme", "localStorage ile veriyi sayfa kapansa da sakla.", "javascript",
`// kaydet
localStorage.setItem("enYuksek", "120");
// oku (yoksa null döner)
const rekor = Number(localStorage.getItem("enYuksek") || 0);
console.log("Rekor:", rekor);
// nesne kaydetmek için JSON kullan
localStorage.setItem("ayarlar", JSON.stringify({ ses: true }));
const ayarlar = JSON.parse(localStorage.getItem("ayarlar"));
`);
    add("JavaScript", "js-dizi", "Dizi işlemleri", "filter, map, find, sort.", "javascript",
`const oyuncular = [{ ad: "Ali", puan: 40 }, { ad: "Ayşe", puan: 90 }, { ad: "Can", puan: 65 }];
const gecenler = oyuncular.filter(o => o.puan >= 50);
const isimler = oyuncular.map(o => o.ad);
const ayse = oyuncular.find(o => o.ad === "Ayşe");
const sirali = [...oyuncular].sort((a, b) => b.puan - a.puan);
console.log(gecenler, isimler, ayse, sirali[0].ad);
`);
    add("JavaScript", "js-hata", "Hata yakalama", "try / catch ile programın çökmesini önle.", "javascript",
`try {
    const veri = JSON.parse("{bozuk json}");
} catch (hata) {
    console.log("Bir sorun oldu:", hata.message);
}
`);

    // ---------- Oyun ----------
    add("Oyun", "oyun-dongu", "Oyun döngüsü (canvas)", "Her karede çizim yapan temel döngü.", "html",
`<canvas id="c" width="480" height="320" style="background:#111"></canvas>
<script>
    const c = document.getElementById("c"), x = c.getContext("2d");
    let topX = 50, hiz = 3;
    function dongu() {
        topX += hiz;
        if (topX > 470 || topX < 10) hiz = -hiz;   // kenarda geri dön
        x.clearRect(0, 0, 480, 320);
        x.fillStyle = "#86b2dc";
        x.beginPath(); x.arc(topX, 160, 10, 0, Math.PI * 2); x.fill();
        requestAnimationFrame(dongu);
    }
    dongu();
</script>
`);
    add("Oyun", "oyun-klavye", "Klavye ile hareket", "Ok tuşları ya da WASD ile kare hareket eder.", "html",
`<canvas id="c" width="480" height="320" style="background:#111"></canvas>
<script>
    const c = document.getElementById("c"), x = c.getContext("2d");
    const tus = {}, oyuncu = { x: 220, y: 140, boy: 30, hiz: 4 };
    addEventListener("keydown", e => tus[e.key.toLowerCase()] = true);
    addEventListener("keyup", e => tus[e.key.toLowerCase()] = false);
    function dongu() {
        if (tus.arrowleft || tus.a) oyuncu.x -= oyuncu.hiz;
        if (tus.arrowright || tus.d) oyuncu.x += oyuncu.hiz;
        if (tus.arrowup || tus.w) oyuncu.y -= oyuncu.hiz;
        if (tus.arrowdown || tus.s) oyuncu.y += oyuncu.hiz;
        x.clearRect(0, 0, 480, 320);
        x.fillStyle = "#8fe3a0";
        x.fillRect(oyuncu.x, oyuncu.y, oyuncu.boy, oyuncu.boy);
        requestAnimationFrame(dongu);
    }
    dongu();
</script>
`);
    add("Oyun", "oyun-carpisma", "Çarpışma kontrolü", "İki dikdörtgen birbirine değiyor mu?", "javascript",
`// a ve b: { x, y, w, h }
function carpisiyor(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}
// daire için: merkezler arası mesafe yarıçapların toplamından küçükse
function daireCarpisma(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r;
}
`);
    add("Oyun", "oyun-fare", "Fare / dokunma ile tıklama", "Canvas üzerinde tıklanan yeri bul.", "javascript",
`const canvas = document.querySelector("canvas");
canvas.addEventListener("pointerdown", (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top) * (canvas.height / r.height);
    console.log("Tıklanan nokta:", Math.round(x), Math.round(y));
});
`);
    add("Oyun", "oyun-ses", "Ses çal (dosyasız)", "Web Audio ile kısa bip sesi.", "javascript",
`function bip(frekans = 440, sure = 0.1) {
    const ses = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ses.createOscillator(), kazanc = ses.createGain();
    osc.frequency.value = frekans;
    kazanc.gain.value = 0.1;
    osc.connect(kazanc).connect(ses.destination);
    osc.start(); osc.stop(ses.currentTime + sure);
}
document.addEventListener("click", () => bip(660));
`);
    add("Oyun", "oyun-skor", "Skoru VEMTRIO'ya kaydet", "Toplulukta oyunun altında liderlik tablosu oluşur.", "html",
`<!-- VEMTRIO Game SDK: toplulukta paylaşınca oyunun altında liderlik tablosu çıkar -->
<script src="/vemtrio.js"></script>
<script>
    async function oyunBitti(skor) {
        const oyuncu = await Vemtrio.getPlayer();        // giriş yapmadıysa null
        const sonuc = await Vemtrio.saveScore(skor);     // { ok, best, rank, total }
        console.log(oyuncu ? oyuncu.username : "misafir", sonuc);
    }
    oyunBitti(120);
</script>
`);

    // ---------- Başlangıç projeleri (eski şablonlar) ----------
    for (const tp of VS.TEMPLATES || []) P.push({ cat: "Başlangıç projeleri", id: "proje-" + tp.id, title: tp.name(), desc: tp.desc(), lang: "proje", project: tp.id });

    VS.codePool = P;
    const CATS = () => [...new Set(P.map(p => p.cat))];
    let q = "", acik = new Set(VS.store.get("poolOpen", ["HTML", "JavaScript", "Oyun"]));

    // ---------- işlemler ----------
    async function ekle(p) {
        if (p.project) return VS.newFromTemplate(p.project);
        const tab = VS.activeTab();
        if (tab && tab.model && VS.editor) {
            const ed = VS.editor; ed.focus();
            const sel = ed.getSelection();
            ed.executeEdits("pool", [{ range: sel, text: p.code, forceMoveMarkers: true }]);
            VS.toast(t(`"${p.title}" eklendi.`, `"${p.title}" inserted.`), "ok", 2500);
            const dil = tab.model.getLanguageId();
            if ((p.lang === "css" && dil === "html") || (p.lang === "javascript" && dil === "html")) VS.toast(t("İpucu: bu kalıp " + (p.lang === "css" ? "<style>" : "<script>") + " etiketinin içine ya da ayrı bir ." + (p.lang === "css" ? "css" : "js") + " dosyasına yazılmalı.", "Tip: this snippet belongs inside a " + (p.lang === "css" ? "<style>" : "<script>") + " tag or a separate file."), "warn", 7000);
            return;
        }
        // açık dosya yoksa yeni dosya olarak aç
        if (!VS.ws) await VS.openWorkspace(new VS.MemFS("default"), { quiet: true });
        const ext = { html: "html", css: "css", javascript: "js" }[p.lang] || "txt";
        let ad = p.id + "." + ext, i = 2; while (VS.ws.files.includes(ad)) ad = p.id + "-" + (i++) + "." + ext;
        await VS.ws.fs.write(ad, p.code); await VS.refreshTree(); VS.openFile(ad);
    }
    function dene(p) {
        // HTML ise olduğu gibi, JS ise konsol çıktısını gösteren küçük bir sayfa, CSS ise örnek öğelerle
        const html = p.lang === "html" ? p.code
            : p.lang === "css" ? `<!DOCTYPE html><html><head><style>body{font-family:system-ui;color:#eee;background:#0f1115;padding:20px}${p.code}</style></head><body><div class="kart kutu izgara"><button>Buton</button><div class="donen" style="width:40px;height:40px;background:#86b2dc"></div><div class="nabiz">Merhaba</div></div></body></html>`
            : `<!DOCTYPE html><html><body style="font:13px monospace;background:#0f1115;color:#d4d7dc;padding:14px"><div id="o"></div><script>const o=document.getElementById("o");["log","warn","error"].forEach(k=>{const f=console[k];console[k]=(...a)=>{const d=document.createElement("div");d.style.color=k==="error"?"#ff8a8a":k==="warn"?"#e8c46a":"";d.textContent=a.map(x=>typeof x==="object"?JSON.stringify(x):String(x)).join(" ");o.appendChild(d);f.apply(console,a)}});<\/script><script>${p.code.replace(/<\/script/gi, "<\\/script")}<\/script></body></html>`;
        const ui = VS.showAux("pool", t("DENE · ", "TRY · ") + p.title, true);
        ui.head.innerHTML = `<button class="ib" data-a="x" title="${t("Kapat", "Close")}">✕</button>`;
        ui.head.onclick = () => VS.closeAux();
        const fr = document.createElement("iframe"); fr.setAttribute("sandbox", "allow-scripts allow-modals"); ui.body.appendChild(fr); fr.srcdoc = html;
    }
    function goster(p) {
        VS.openCustom("pool:" + p.id, p.title, el => {
            el.innerHTML = `<div class="runner"><div><div class="hint">${t("KOD HAVUZU", "CODE POOL")} · ${esc(p.cat)}</div><h2 style="font-family:var(--font)">${esc(p.title)}</h2><p class="hint" style="margin-top:6px">${esc(p.desc)}</p></div>
                <div class="row"><button class="btn" data-a="ekle">${p.project ? t("Projeyi aç", "Open project") : t("Koda ekle", "Insert")}</button>${p.code ? `<button class="btn sec" data-a="kopya">${t("Kopyala", "Copy")}</button><button class="btn sec" data-a="dene">${t("Dene", "Try it")}</button>` : ""}</div>
                ${p.code ? `<pre>${esc(p.code)}</pre>` : ""}</div>`;
            el.onclick = e => { const a = e.target.closest("[data-a]"); if (!a) return; if (a.dataset.a === "ekle") ekle(p); if (a.dataset.a === "kopya") { navigator.clipboard.writeText(p.code); VS.toast(t("Kopyalandı.", "Copied."), "ok", 1800); } if (a.dataset.a === "dene") dene(p); };
            if (VS.monaco && p.code) { const pre = el.querySelector("pre"); VS.monaco.editor.colorize(p.code, p.lang === "html" ? "html" : p.lang, { tabSize: 4 }).then(h => { pre.innerHTML = h; }); }
        });
    }
    VS.viewDefs = VS.viewDefs || [];
    VS.viewDefs.push({ id: "pool", title: () => t("KOD HAVUZU", "CODE POOL"), order: 2, key: "ctrl+alt+k",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 7 3 12l5 5M16 7l5 5-5 5M13.5 4l-3 16"/></svg>',
        render(body) {
            body.innerHTML = `<div class="pad col"><input id="pool-q" placeholder="${t("Kalıp ara (ör. buton, ortala, klavye)", "Search snippets (e.g. button, center)")}" value="${esc(q)}"><p class="hint" style="font-size:11px">${t("Tıkla: incele · Ekle: imlecin olduğu yere yazar · Dene: hemen çalıştırır.", "Click to view · Insert at cursor · Try runs it instantly.")}</p></div><div id="pool-list"></div>`;
            const inp = $("#pool-q"); inp.oninput = () => { q = inp.value.trim().toLowerCase(); ciz(); };
            const ciz = () => {
                const eslesen = p => !q || (p.title + " " + p.desc + " " + p.cat).toLowerCase().includes(q);
                $("#pool-list").innerHTML = (VS.poolTopluluk ? VS.poolTopluluk(q) : "") + CATS().map(c => { const ps = P.filter(p => p.cat === c && eslesen(p)); if (!ps.length) return ""; const open = q || acik.has(c); return `<div class="sb-sec"><h4 data-c="${esc(c)}">${open ? "▾" : "▸"} ${esc(c)} <small style="margin-left:auto;font-weight:400">${ps.length}</small></h4>${open ? ps.map(p => `<div class="post" data-p="${esc(p.id)}" style="cursor:pointer"><b>${esc(p.title)}</b><p>${esc(p.desc)}</p><div class="row"><button class="btn" style="height:22px;font-size:11px" data-ekle="${esc(p.id)}">${p.project ? t("Aç", "Open") : t("Ekle", "Insert")}</button>${p.code ? `<button class="btn sec" style="height:22px;font-size:11px" data-dene="${esc(p.id)}">${t("Dene", "Try")}</button>` : ""}</div></div>`).join("") : ""}</div>`; }).join("") || `<p class="pad hint">${t("Sonuç yok.", "No results.")}</p>`;
            };
            body.onclick = e => {
                if (VS.poolToplulukClick && VS.poolToplulukClick(e)) return;
                const h = e.target.closest("[data-c]"); if (h) { const c = h.dataset.c; acik.has(c) ? acik.delete(c) : acik.add(c); VS.store.set("poolOpen", [...acik]); return ciz(); }
                const bul = id => P.find(p => p.id === id);
                const ek = e.target.closest("[data-ekle]"); if (ek) return ekle(bul(ek.dataset.ekle));
                const dn = e.target.closest("[data-dene]"); if (dn) return dene(bul(dn.dataset.dene));
                const pp = e.target.closest("[data-p]"); if (pp) goster(bul(pp.dataset.p));
            };
            ciz();
        } });
    VS.cmd("pool.show", () => t("Kod Havuzunu Aç", "Open Code Pool"), () => VS.showView("pool"), null, "VEMTRIO");
    VS.cmd("pool.insert", () => t("Kod Havuzundan Ekle…", "Insert from Code Pool…"), async () => { const p = await VS.pick(P.map(p => ({ label: p.title, detail: p.cat + " · " + p.desc, value: p.id }))); if (p) ekle(P.find(x => x.id === p)); }, "ctrl+alt+j", "VEMTRIO");
})();
