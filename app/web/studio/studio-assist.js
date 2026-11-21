/* VEMTRIO Code — Kod Asistanı (ücretsiz, çevrimdışı, API anahtarı gerektirmez).
 * 1) Hata açıklayıcı: editördeki sorunları ve önizleme konsolundaki hataları Türkçe anlatır: ne demek, genelde neden olur, nasıl düzelir.
 * 2) Kod kontrolü: sık yapılan yazım hatalarını (documnet, lenght, getElementByID…) ve eksik kapanan parantezleri bulur.
 * 3) Temel sorular: "buton nasıl yapılır", "div nasıl ortalanır" gibi sorulara kısa cevap + Kod Havuzu kalıbı.
 * Claude API anahtarı girilmişse AI sohbeti Claude'a da sorabilir; anahtar yoksa bu asistan cevaplar. */
(() => {
    const VS = window.VS, t = VS.t, esc = VS.esc;
    const fold = s => String(s || "").toLocaleLowerCase("tr").replace(/[çğıöşü]/g, c => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c]);

    // ---------- hata bilgi tabanı ----------
    // re: hata mesajına uyan desen · ne: anlamı · neden: genelde neden olur · coz: nasıl düzelir (kısa örnek)
    const HATALAR = [
        { re: /(\S+) is not defined|Cannot find name '([^']+)'/i, ad: "Tanımsız isim", ne: m => `"${m[1] || m[2]}" diye bir değişken ya da fonksiyon bulunamadı.`,
          neden: ["İsmi yanlış yazmış olabilirsin (büyük/küçük harf önemli: Puan ≠ puan).", "Değişkeni let/const ile tanımlamayı unuttun ya da kullandıktan SONRA tanımladın.", "Başka bir dosyada tanımlı ve o dosya bu dosyadan sonra yükleniyor (script sırası).", "Bir fonksiyonun içinde tanımlayıp dışarıda kullanıyorsun (kapsam / scope)."],
          coz: "Tanımı kullanmadan önce yap:\nlet puan = 0;\nconsole.log(puan);" },
        { re: /Cannot read propert(?:y|ies) of (undefined|null)(?: \(reading '([^']+)'\))?/i, ad: "Boş değerin özelliğine erişim", ne: m => `${m[1]} bir değerin${m[2] ? ` "${m[2]}"` : ""} özelliğini okumaya çalıştın; ortada nesne yok.`,
          neden: ["document.getElementById(\"...\") yanlış id ile çağrıldı ya da öğe henüz sayfada yok → null döner.", "Script, HTML öğelerinden ÖNCE çalışıyor (script'i </body>'den hemen önce koy ya da defer ekle).", "Dizide olmayan bir sıraya erişiyorsun (liste[5] ama liste 3 elemanlı).", "Bir fonksiyon değer döndürmüyor (return unutulmuş)."],
          coz: "Öğenin var olduğundan emin ol:\nconst btn = document.getElementById(\"btn\");\nif (btn) btn.onclick = ...;" },
        { re: /Cannot set propert(?:y|ies) of (undefined|null)/i, ad: "Boş değere atama", ne: m => `${m[1]} bir değere özellik atamaya çalıştın.`,
          neden: ["getElementById/querySelector öğeyi bulamadı (id/class yanlış).", "Script HTML'den önce yükleniyor."], coz: "<script src=\"app.js\" defer></script> kullan ya da id'yi kontrol et." },
        { re: /(\S+) is not a function|This expression is not callable/i, ad: "Fonksiyon olmayan şeyi çağırma", ne: m => `"${m[1] || "bu ifade"}" bir fonksiyon değil ama () ile çağrıldı.`,
          neden: ["Fonksiyon adını yanlış yazdın (getElementByID değil getElementById, addEventlistener değil addEventListener).", "Aynı isimde bir değişken fonksiyonun üstüne yazıldı.", "Dizi yerine başka bir şeyde forEach/map çağırıyorsun (ör. NodeList değil sayı)."],
          coz: "Yazımı kontrol et: document.getElementById, addEventListener, querySelector." },
        { re: /Assignment to constant variable|Cannot assign to '([^']+)' because it is a constant/i, ad: "Sabit değiştirilemez", ne: () => "const ile tanımlanan bir değişkene yeni değer verdin.",
          neden: ["Değişecek değerleri const ile tanımladın (puan, sayaç gibi)."], coz: "Değişecekse let kullan:\nlet puan = 0;\npuan++;" },
        { re: /Identifier '([^']+)' has already been declared|Cannot redeclare block-scoped variable '([^']+)'/i, ad: "Aynı isim iki kez tanımlandı", ne: m => `"${m[1] || m[2]}" iki kere let/const ile tanımlandı.`,
          neden: ["Aynı değişkeni iki yerde let ile yazdın.", "İki farklı script dosyası aynı ismi kullanıyor."], coz: "İkinci tanımdaki let/const'u sil, sadece değer ata: puan = 5;" },
        { re: /Unexpected end of input|'\}' expected|Unexpected end of JSON/i, ad: "Kod yarıda bitti", ne: () => "Kod bitmeden dosya sona erdi: bir parantez ya da süslü parantez kapanmamış.",
          neden: ["Bir { açıp } ile kapatmayı unuttun (if, fonksiyon, döngü).", "Bir ( açıp ) kapatmadın.", "Tırnak (\" veya ') kapanmamış."], coz: "Her { için bir } olmalı. Editör parantezleri renklendirir; eşini bulamayan parantezi ara." },
        { re: /Unexpected token '?([^'\s]*)'?|Expression expected|Declaration or statement expected|Unexpected identifier/i, ad: "Beklenmeyen işaret", ne: m => `JavaScript burada${m[1] ? ` "${m[1]}"` : " bu ifadeyi"} beklemiyordu: yazım (sözdizimi) hatası.`,
          neden: ["Bir önceki satırda ) , } ya da , eksik.", "Fazladan bir } var (bir bloğu iki kez kapatmışsın).", "JS dosyasına HTML yazmışsın (<div> gibi) ya da tersi.", "Nesne içinde virgül unutulmuş: { a: 1 b: 2 }."], coz: "Hatanın gösterildiği satırın BİR ÖNCEKİ satırına da bak; asıl eksik çoğu zaman oradadır." },
        { re: /missing \) after argument list|'\)' expected/i, ad: "Parantez kapanmamış", ne: () => "Bir fonksiyon çağrısında ( açıldı ama ) ile kapanmadı.",
          neden: ["console.log(\"merhaba\" gibi kapanışı unutmak.", "Metnin içinde kaçırılmamış tırnak: \"O \"süper\" dedi\"."], coz: "console.log(\"merhaba\");  ← ) ve ; ile bitir." },
        { re: /';' expected/i, ad: "Noktalı virgül / ayırıcı bekleniyor", ne: () => "İki ifade arasında ayırıcı eksik.", neden: ["Aynı satıra iki komut yazdın.", "Değişken adında boşluk var (let benim puanim)."], coz: "Değişken adlarında boşluk olmaz: let benimPuanim = 0;" },
        { re: /Invalid or unexpected token|Unterminated string literal/i, ad: "Geçersiz karakter / kapanmayan metin", ne: () => "Tırnak kapanmamış ya da kodda geçersiz bir karakter var.",
          neden: ["Bir metnin tırnağı kapanmamış.", "Word/telefon gibi yerlerden kopyalanan “akıllı tırnaklar” kullanılmış.", "Satır sonunda tırnak açık kalmış (çok satırlı metin için ` kullan)."], coz: "Düz tırnak kullan: \"metin\" ya da `çok satırlı metin`" },
        { re: /Maximum call stack size exceeded/i, ad: "Sonsuz döngü (özyineleme)", ne: () => "Bir fonksiyon kendini durmadan çağırıyor.", neden: ["Kendi kendini çağıran fonksiyonda durma koşulu yok.", "Bir olay başka bir olayı tetikliyor, o da ilkini (döngü)."], coz: "function say(n) { if (n <= 0) return; say(n - 1); }  ← durma koşulu" },
        { re: /await is only valid in async/i, ad: "async olmadan await", ne: () => "await sadece async fonksiyonların içinde kullanılabilir.", neden: ["Fonksiyonun başına async yazmayı unuttun."], coz: "async function yukle() { const r = await fetch(url); }" },
        { re: /Failed to fetch|NetworkError|CORS|net::ERR/i, ad: "İnternet isteği başarısız", ne: () => "fetch ile yapılan istek tamamlanamadı.",
          neden: ["Önizleme güvenlik için internetsiz bir kum havuzunda çalışır; dış adreslere istek atılamaz.", "Adres yanlış ya da sunucu CORS izni vermiyor."], coz: "Veriyi dosyanın içine koy (ör. const veri = [...]) ya da masaüstü uygulamasında dene." },
        { re: /Unexpected token .* in JSON|is not valid JSON|JSON\.parse/i, ad: "Bozuk JSON", ne: () => "JSON.parse'a geçerli olmayan bir metin verildi.", neden: ["Anahtarlar çift tırnaklı değil ({ad: 1} yerine {\"ad\": 1}).", "Sonda fazladan virgül var.", "localStorage'da hiç veri yok ve null parse ediliyor."], coz: "const v = JSON.parse(localStorage.getItem(\"x\") || \"{}\");" },
        { re: /localStorage|SecurityError/i, ad: "Depolama erişimi", ne: () => "Tarayıcı depolamasına erişilemedi.", neden: ["Bazı gizli pencerelerde ya da kum havuzunda localStorage kapalıdır."], coz: "try { localStorage.setItem(\"a\", \"1\"); } catch (e) { }" },
        { re: /colon expected|semi-colon expected|\{ expected|at-rule or selector expected|property value expected/i, ad: "CSS yazım hatası", ne: () => "CSS kuralının yazımında eksik var.", neden: ["özellik: değer; arasında : ya da ; unutulmuş.", "Bir { açılıp } ile kapanmamış.", "CSS dosyasına JS ya da HTML yazılmış."], coz: ".kutu {\n    color: red;\n    margin: 10px;\n}" },
        { re: /Unknown property/i, ad: "Bilinmeyen CSS özelliği", ne: () => "Böyle bir CSS özelliği yok.", neden: ["Yazım hatası (colour değil color, bacground değil background)."], coz: "Doğru yazım: color, background, margin, padding, border, font-size" },
        { re: /Unreachable code/i, ad: "Hiç çalışmayacak kod", ne: () => "Bu satıra asla ulaşılmaz.", neden: ["return'den sonra kod yazılmış."], coz: "return en sonda olmalı." },
        { re: /declared but (its value is )?never (read|used)/i, ad: "Kullanılmayan tanım", ne: () => "Tanımladığın bir şeyi hiç kullanmamışsın. Hata değil, sadece uyarı.", neden: ["Unutulmuş ya da yanlış isimle kullanılmış değişken."], coz: "Ya kullan ya da sil." },
    ];
    // Python hataları (JS kalıplarından ÖNCE denenir)
    HATALAR.unshift(
        { re: /NameError: name '(\w+)' is not defined/, ad: "Python: tanımsız isim", ne: m => `"${m[1]}" adında bir değişken ya da fonksiyon yok.`, neden: ["İsmi yanlış yazdın (Python büyük/küçük harfe duyarlı: Puan ≠ puan).", "Değişkene değer vermeden önce kullandın.", "Metni tırnak içine almayı unuttun: print(merhaba) yerine print(\"merhaba\")."], coz: "puan = 0\nprint(puan)" },
        { re: /IndentationError|expected an indented block|unexpected indent|unindent does not match/, ad: "Python: girinti hatası", ne: () => "Python'da satır başındaki boşluklar (girinti) kodun hangi bloğa ait olduğunu belirler; burada girinti yanlış.", neden: ["if, for, def satırından sonra alttaki satırı içeri (4 boşluk) almadın.", "Aynı blokta bazı satırlar 4, bazıları 2 boşlukla başlıyor.", "Tab ve boşluk karışık kullanılmış."], coz: "if puan > 10:\n    print(\"Kazandın\")   # 4 boşluk içeride" },
        { re: /SyntaxError: (invalid syntax|expected ':'|.*was never closed|unterminated string literal|invalid character|Missing parentheses|EOL while scanning)/, ad: "Python: yazım hatası", ne: () => "Python bu satırı anlayamadı (sözdizimi hatası).", neden: ["if, for, while, def satırının sonuna : koymayı unuttun.", "Bir parantez ya da tırnak kapanmamış.", "print \"merhaba\" gibi eski Python 2 yazımı (Python 3'te print(\"merhaba\")).", "Türkçe tırnak/karakter kopyalanmış (“ ” yerine \" kullan)."], coz: "for i in range(3):\n    print(i)" },
        { re: /TypeError: can only concatenate str|unsupported operand type|must be str, not int/, ad: "Python: tür uyuşmazlığı", ne: () => "Metin (str) ile sayıyı (int) doğrudan birleştirmeye ya da toplamaya çalıştın.", neden: ["\"Puan: \" + puan yazdın ama puan sayı.", "input() her zaman metin döndürür; sayı gibi kullanmadan önce int() ile çevir."], coz: "print(\"Puan: \" + str(puan))\n# ya da\nprint(f\"Puan: {puan}\")\nyas = int(input(\"Yaşın: \"))" },
        { re: /'(\w+)' object is not callable/, ad: "Python: çağrılamayan nesne", ne: m => `"${m[1]}" türünde bir değeri fonksiyon gibi () ile çağırdın.`, neden: ["Bir değişkene fonksiyonla aynı adı verdin (ör. list = [1,2] sonra list(...)).", "Parantez yerine köşeli parantez kullanman gerekiyordu: liste[0]."], coz: "Değişken adını değiştir: sayilar = [1, 2]" },
        { re: /IndexError: (list|string|tuple) index out of range/, ad: "Python: sıra dışı", ne: () => "Listede olmayan bir sıraya eriştin.", neden: ["Liste 3 elemanlıysa sıralar 0, 1, 2'dir; liste[3] yoktur.", "Boş listeden eleman almaya çalıştın."], coz: "if len(liste) > 3:\n    print(liste[3])" },
        { re: /KeyError: (.+)/, ad: "Python: sözlükte olmayan anahtar", ne: m => `Sözlükte ${m[1]} anahtarı yok.`, neden: ["Anahtarı yanlış yazdın.", "Anahtar henüz eklenmedi."], coz: "deger = sozluk.get(\"anahtar\", 0)" },
        { re: /ZeroDivisionError/, ad: "Python: sıfıra bölme", ne: () => "Bir sayıyı sıfıra böldün.", neden: ["Bölen değişken 0 oldu (ör. hiç eleman yokken ortalama)."], coz: "if adet != 0:\n    ortalama = toplam / adet" },
        { re: /ModuleNotFoundError: No module named '([\w.]+)'/, ad: "Python: modül bulunamadı", ne: m => `"${m[1]}" modülü yok.`, neden: ["Modül adını yanlış yazdın.", "Kendi dosyanı içe aktarıyorsan adı ve uzantısı doğru mu? (oyun.py → import oyun)", "Tarayıcıdaki Python'da bazı paketler (ör. pygame, tkinter) yoktur; masaüstü uygulamasında gerçek Python kullan."], coz: "import random\nprint(random.randint(1, 6))" },
        { re: /AttributeError: '(\w+)' object has no attribute '(\w+)'/, ad: "Python: olmayan özellik", ne: m => `${m[1]} türünde "${m[2]}" diye bir özellik/metot yok.`, neden: ["Metot adını yanlış yazdın (append yerine add gibi).", "Değişken beklediğin türde değil (liste sandığın şey metin olabilir)."], coz: "liste = []\nliste.append(5)" },
        { re: /ValueError: invalid literal for int\(\)/, ad: "Python: sayıya çevrilemedi", ne: () => "int() ile sayıya çevrilemeyen bir metni çevirmeye çalıştın.", neden: ["input()'a sayı yerine harf/boşluk girildi."], coz: "giris = input(\"Sayı: \")\nif giris.isdigit():\n    sayi = int(giris)" },
        { re: /EOFError/, ad: "Python: girdi bitti", ne: () => "Program input() ile bilgi istedi ama verilecek girdi kalmadı.", neden: ["Çalıştırırken açılan Girdiler penceresine yeterli satır yazmadın (her input() için bir satır)."], coz: "Tekrar çalıştır ve her input() için bir satır yaz." },
        { re: /RecursionError/, ad: "Python: sonsuz özyineleme", ne: () => "Bir fonksiyon kendini durmadan çağırdı.", neden: ["Durma koşulu yok."], coz: "def say(n):\n    if n <= 0:\n        return\n    say(n - 1)" },
    );
    // Sık yazım hataları (kelime → doğrusu)
    const YAZIM = { documnet: "document", docuemnt: "document", dokument: "document", getElementByID: "getElementById", getElementbyId: "getElementById", getElementsById: "getElementById", querySelectorall: "querySelectorAll", addEventlistener: "addEventListener", addeventlistener: "addEventListener", AddEventListener: "addEventListener", lenght: "length", innerHtml: "innerHTML", innerhtml: "innerHTML", innertext: "innerText", textcontent: "textContent", funtion: "function", fucntion: "function", fonction: "function", retrun: "return", consloe: "console", cosnole: "console", "console.log(": null, Math_random: "Math.random", "math.random": "Math.random", "math.floor": "Math.floor", onclik: "onclick", Onclick: "onclick", "setTimeOut": "setTimeout", setinterval: "setInterval", appendchild: "appendChild", createelement: "createElement", JSON_parse: "JSON.parse", localstorage: "localStorage", requestanimationframe: "requestAnimationFrame", eventlistener: "EventListener" };

    function acikla(mesaj) {
        const h = HATALAR.find(x => x.re.test(mesaj)); if (!h) return null;
        const m = mesaj.match(h.re) || [];
        return { ad: h.ad, ne: h.ne(m), neden: h.neden, coz: h.coz };
    }
    VS.explainError = acikla;
    const kart = (baslik, a, yer) => `**${baslik}${yer ? " — " + yer : ""}**\n${a.ne}\n\nGenelde şundan olur:\n${a.neden.map(n => "• " + n).join("\n")}\n\nÇözüm:\n\`\`\`\n${a.coz}\n\`\`\``;

    // Kendi basit kontrolümüz: yazım hataları, parantez dengesi, HTML'de kapanmayan etiketler, sık mantık hataları
    function kontrol(model) {
        const out = [], text = model.getValue(), dil = model.getLanguageId(), lines = text.split("\n");
        const jsli = dil === "javascript" || dil === "typescript" || dil === "html";
        if (jsli) lines.forEach((l, i) => {
            for (const [yanlis, dogru] of Object.entries(YAZIM)) if (dogru && new RegExp("\\b" + yanlis.replace(/[.(]/g, "\\$&") + "\\b").test(l)) out.push({ line: i + 1, text: `"${yanlis}" yazmışsın, doğrusu "${dogru}". JavaScript büyük/küçük harfe duyarlıdır.` });
            if (/\bif\s*\([^=!<>]*[^=!<>]=[^=][^)]*\)/.test(l) && !/[<>!]=/.test(l)) out.push({ line: i + 1, text: "if içinde tek = kullanılmış. Tek = değer ATAR; karşılaştırma için === kullan: if (puan === 10)" });
            if (/<\/?(div|p|span|h1|button|body)\b[^>]*>/.test(l) && dil !== "html") out.push({ line: i + 1, text: "JavaScript dosyasına HTML etiketi yazılmış. HTML, .html dosyasına; JS, <script> içine ya da .js dosyasına yazılır." });
        });
        // parantez dengesi (metin/yorum içleri kaba olarak atlanır)
        if (dil === "javascript" || dil === "css" || dil === "typescript") {
            const temiz = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, "\"\"");
            for (const [a, b, ad] of [["{", "}", "süslü parantez { }"], ["(", ")", "parantez ( )"], ["[", "]", "köşeli parantez [ ]"]]) {
                const fark = temiz.split(a).length - temiz.split(b).length;
                if (fark > 0) out.push({ line: 0, text: `${fark} tane ${ad} açılmış ama kapanmamış. Her ${a} için bir ${b} olmalı.` });
                if (fark < 0) out.push({ line: 0, text: `${-fark} tane fazladan ${b} var (açılmadan kapatılmış).` });
            }
        }
        if (dil === "html") {
            const stack = [], VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr|!doctype)$/i;
            const temiz = text.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "<$1></$1>");
            const re = /<\/?([a-zA-Z][\w-]*|!doctype)\b[^>]*?(\/?)>/g; let m;
            while ((m = re.exec(temiz))) {
                const tag = m[1].toLowerCase(), kapanis = m[0][1] === "/";
                if (VOID.test(tag) || m[2]) continue;
                if (!kapanis) stack.push(tag);
                else { const i = stack.lastIndexOf(tag); if (i < 0) out.push({ line: temiz.slice(0, m.index).split("\n").length, text: `</${tag}> kapanış etiketi var ama <${tag}> açılmamış.` }); else stack.splice(i); }
            }
            for (const tg of stack.slice(-4)) out.push({ line: 0, text: `<${tg}> etiketi açılmış ama </${tg}> ile kapanmamış.` });
            if (/<script[^>]*src=/.test(text) && !/<\/body>/i.test(text.slice(text.search(/<script[^>]*src=/))) && /<head>[\s\S]*<script[^>]*src=(?![^>]*defer)/i.test(text)) out.push({ line: 0, text: "Script <head> içinde ve defer yok: HTML öğeleri henüz oluşmadan çalışır, getElementById null döner. defer ekle ya da script'i </body>'den önce koy." });
            if (!text.trim()) out.push({ line: 0, text: "Dosya boş. ! yazıp Enter'a bas, sayfa iskeleti gelsin." });
        }
        return out;
    }
    VS.codeCheck = kontrol;

    // ---------- "koddaki hata ne?" ----------
    function dosyaRaporu() {
        const tab = VS.activeTab();
        if (!tab || !tab.model) return "Açık bir dosya yok. Bir dosya aç, sonra tekrar sor.";
        const monaco = VS.monaco, model = tab.model;
        const markers = monaco.editor.getModelMarkers({ resource: model.uri }).filter(m => m.severity >= 4 && m.owner !== "vcode-assist").slice(0, 6);
        const kendi = kontrol(model).slice(0, 8);
        if (!markers.length && !kendi.length) return `**${tab.title}** içinde bir hata bulamadım.\n\nSayfa yine de çalışmıyorsa önizlemeyi aç (Ctrl+Shift+V) ve Çıktı panelindeki "Önizleme Konsolu"na bak; çalışırken çıkan hataları da burada açıklarım.`;
        let s = `**${tab.title}** dosyasında ${markers.length + kendi.length} şey buldum:\n`;
        for (const m of markers) { const a = acikla(m.message); s += "\n" + (a ? kart(a.ad, a, `satır ${m.startLineNumber}`) : `**Satır ${m.startLineNumber}:** ${m.message}`) + "\n"; }
        for (const k of kendi) s += `\n• ${k.line ? "Satır " + k.line + ": " : ""}${k.text}`;
        return s;
    }

    // ---------- temel sorular ----------
    const SSS = [
        [/emmet|! (ile|yaz)|iskelet|sablon|boilerplate|html nasil baslar/, "HTML iskeleti için boş bir .html dosyasında **!** yaz ve **Enter** ya da **Tab**'a bas. Kısaltmalar da çalışır: `ul>li*3`, `div.kart`, `button#btn` yazıp Tab'a bas.", "html-iskelet"],
        [/buton|button|tikla/, "Buton: `<button id=\"btn\">Tıkla</button>`. Tıklanınca bir şey olsun diye: `document.getElementById(\"btn\").addEventListener(\"click\", () => { ... });`", "html-buton"],
        [/ortala|ortaya|center/, "Bir şeyi ortalamanın en kolay yolu flexbox: kapsayıcıya `display:flex; align-items:center; justify-content:center;` ver.", "css-ortala"],
        [/renk|color|arka ?plan|background/, "Yazı rengi: `color: red;` · arka plan: `background: #222;` · CSS dosyasında ya da `<style>` içinde yazılır.", "css-kart"],
        [/css (nasil|nereye)|style.css|stil (dosyasi|ekle)/, "CSS'i ayrı dosyaya yaz ve HTML'in `<head>` kısmına ekle: `<link rel=\"stylesheet\" href=\"style.css\">`. Ya da `<style>...</style>` içine yaz.", "html-iskelet"],
        [/js (nasil|nereye)|script (ekle|nasil)|app.js|javascript (nasil|nereye)/, "JavaScript'i ayrı dosyaya yaz ve `</body>`'den hemen önce ekle: `<script src=\"app.js\"></script>`.", "html-iskelet"],
        [/degisken|let|const|var /, "Değişken: değişecekse `let puan = 0;`, değişmeyecekse `const isim = \"Ali\";`. `var` eski yöntemdir, kullanma.", "js-degisken"],
        [/if|kosul|eger/, "Koşul: `if (puan > 10) { ... } else { ... }`. Karşılaştırma için `===` kullan, tek `=` değer atar.", "js-kosul"],
        [/dongu|for|while|tekrar/, "Döngü: `for (let i = 0; i < 5; i++) { ... }` · diziler için `for (const x of liste) { ... }`", "js-dongu"],
        [/fonksiyon|function/, "Fonksiyon: `function topla(a, b) { return a + b; }` ya da kısa hâli `const topla = (a, b) => a + b;`", "js-fonksiyon"],
        [/rastgele|random|zar/, "Rastgele tam sayı: `Math.floor(Math.random() * 6) + 1` (1-6 arası).", "js-rastgele"],
        [/zamanlayici|bekle|saniye|timer|settimeout|setinterval/, "Bir kez: `setTimeout(fn, 1000)` · sürekli: `setInterval(fn, 1000)` · durdurmak için `clearInterval(id)`.", "js-zamanlayici"],
        [/kaydet|localstorage|hafiza|rekor sakla/, "Tarayıcıya kaydet: `localStorage.setItem(\"rekor\", 100)` · oku: `localStorage.getItem(\"rekor\")`.", "js-kayit"],
        [/dizi|array|liste/, "Dizi: `const l = [1, 2, 3]` · ekle `l.push(4)` · uzunluk `l.length` · filtre `l.filter(x => x > 1)`.", "js-dizi"],
        [/klavye|tus|ok tus|wasd|hareket/, "Klavye: `addEventListener(\"keydown\", e => { if (e.key === \"ArrowLeft\") ... })`. Akıcı hareket için tuşları bir nesnede tutup oyun döngüsünde oku.", "oyun-klavye"],
        [/oyun dongu|canvas|ciz|animasyon(?! css)/, "Canvas oyunlarında her karede çizim için `requestAnimationFrame(dongu)` kullanılır.", "oyun-dongu"],
        [/carpis|temas|degdi/, "İki kutu çarpışıyor mu: `a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y`", "oyun-carpisma"],
        [/ses|muzik|sound/, "Dosyasız kısa ses için Web Audio kullanılabilir; dosya varsa `new Audio(\"ses.mp3\").play()`.", "oyun-ses"],
        [/skor|liderlik|leaderboard|puan kaydet/, "Toplulukta liderlik tablosu için `<script src=\"/vemtrio.js\"></script>` ekle ve oyun bitince `Vemtrio.saveScore(skor)` çağır.", "oyun-skor"],
        [/form|input|giris kutusu/, "Form: `<input id=\"isim\">` değeri `document.getElementById(\"isim\").value` ile okunur. Gönderince sayfa yenilenmesin diye `e.preventDefault()`.", "html-form"],
        [/resim|gorsel|img|foto/, "Görsel: `<img src=\"adres.png\" alt=\"açıklama\" width=\"300\">`", "html-gorsel"],
        [/mobil|telefon|responsive/, "Telefona uyum için `@media (max-width: 600px) { ... }` içinde küçük ekran stillerini yaz.", "css-mobil"],
        [/grid|izgara|yan yana/, "Kutuları yan yana dizmek için: `display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px;`", "css-grid"],
        [/onizle|calistir|nasil gorurum|preview/, "Canlı önizleme: **Ctrl+Shift+V** ya da **F5**. Kaydettikçe (Ctrl+S) yenilenir. JS dosyası çalıştırmak için terminalde `node dosya.js`.", null],
        [/paylas|topluluk|yayinla/, "Projeni paylaşmak için **Ctrl+Alt+U** ya da sol çubuktaki Topluluk simgesi. Dosyaların Guard ile taranır, sonra toplulukta herkes oynayabilir.", null],
        [/kisayol|tus kombinasyon|shortcut/, "En çok kullanılanlar: **Ctrl+Shift+P** komutlar · **Ctrl+P** dosya bul · **Ctrl+S** kaydet · **Ctrl+/** yorum satırı · **Alt+↑/↓** satır taşı · **Ctrl+D** aynı kelimeyi seç · Tüm liste: **Ctrl+K Ctrl+S**", null],
        [/konsol|console|log/, "Değerleri görmek için `console.log(deger)`. Çıktı, önizlemedeyken alttaki Çıktı panelinde \"Önizleme Konsolu\"nda görünür.", null],
    ];
    const SELAM = /^(selam|merhaba|sa|hey|naber|nasilsin|selamlar|slm)\b/;
    function cevapla(soru) {
        const f = fold(soru);
        if (SELAM.test(f) && f.length < 25) return "Selam! Ben VEMTRIO Topluluk AI. Kodundaki hataları açıklarım; döngüler, fonksiyonlar, sınıflar, diziler, async/await gibi kavramları JavaScript, Python, C#, Java ve C++ örnekleriyle anlatırım. Dene:\n• \"while döngüsü nedir?\"\n• \"for ile while farkı ne?\"\n• \"python'da sınıf nasıl yazılır?\"\n• \"koddaki hata ne?\"\n• \"buton nasıl yapılır?\"\n• \"div nasıl ortalanır?\"\n• bir hata mesajını yapıştır (ör. Cannot read properties of null)";
        if (/hata|calismiyor|bozuk|olmuyor|neden calis|sorun ne|yanlis ne|kontrol et|bak bakalim|error/.test(f) && !acikla(soru)) return dosyaRaporu();
        const a = acikla(soru); if (a) return kart(a.ad, a);
        for (const [re, cev, kalip] of SSS) if (re.test(f)) {
            const p = kalip && VS.codePool && VS.codePool.find(x => x.id === kalip);
            return cev + (p ? `\n\nKod Havuzu'nda hazır kalıp var: **${p.title}**\n\`\`\`\n${p.code.split("\n").slice(0, 14).join("\n")}${p.code.split("\n").length > 14 ? "\n…" : ""}\n\`\`\`\n[[ekle:${p.id}]]` : "");
        }
        return "Bunu tam anlayamadım. Şunları sorabilirsin:\n• \"koddaki hata ne?\" (açık dosyayı kontrol ederim)\n• bir hata mesajını yapıştır\n• \"buton nasıl yapılır\", \"div nasıl ortalanır\", \"rastgele sayı\", \"klavye ile hareket\", \"skor kaydetme\"\n\nDaha zor sorular için 🔑 ile Claude API anahtarı girebilirsin.".replace("🔑 ile ", "");
    }
    VS.assistAnswer = cevapla;

    // ---------- editör entegrasyonu ----------
    VS.on("monaco-ready", monaco => {
        // Ampul menüsü: "Kod Asistanı: Bu hatayı açıkla"
        for (const lang of ["javascript", "typescript", "html", "css", "scss", "less", "json"]) monaco.languages.registerCodeActionProvider(lang, {
            provideCodeActions: (model, range, ctx) => ({ actions: ctx.markers.filter(m => acikla(m.message)).slice(0, 1).map(m => ({ title: t("Topluluk AI: Bu hatayı açıkla", "Community AI: Explain this error"), kind: "quickfix", command: { id: "vcode.explain", title: "explain", arguments: [m.message, m.startLineNumber] } })), dispose() { } }),
        });
        monaco.editor.registerCommand("vcode.explain", (acc, msg, line) => VS.assistAsk(msg, line));
        // Kendi kontrolümüzün bulduklarını da editörde dalgalı çizgiyle göster
        const isaretle = VS.debounce(() => {
            const tab = VS.activeTab(); if (!tab || !tab.model) return;
            const model = tab.model;
            monaco.editor.setModelMarkers(model, "vcode-assist", kontrol(model).filter(k => k.line).map(k => ({ severity: monaco.MarkerSeverity.Warning, message: "Topluluk AI: " + k.text, startLineNumber: k.line, startColumn: 1, endLineNumber: k.line, endColumn: model.getLineMaxColumn(k.line) })));
        }, 700);
        VS.on("change", isaretle); VS.on("active", isaretle);
    });
    // Önizlemede çalışırken çıkan hatayı yakala ve açıklamayı öner
    let sonUyari = 0;
    window.addEventListener("message", e => {
        const m = e.data; if (!m || !m.__vprev || m.t !== "error") return;
        if (Date.now() - sonUyari < 4000 || !acikla(m.text)) return; sonUyari = Date.now();
        VS.toast(t("Önizlemede hata: ", "Preview error: ") + String(m.text).slice(0, 120), "err", 9000, [{ label: t("Açıkla", "Explain"), run: () => VS.assistAsk(m.text) }]);
    });
    VS.cmd("assist.check", () => t("Topluluk AI: Bu Dosyayı Kontrol Et", "Community AI: Check This File"), () => VS.assistAsk(t("koddaki hata ne?", "what's wrong in my code?")), "ctrl+alt+h", "Topluluk AI");
})();
