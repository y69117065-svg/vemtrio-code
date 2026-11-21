/* VEMTRIO Code — Kod Öğretmeni (ücretsiz, çevrimdışı, model gerektirmez).
 * Programlama kavramlarını açıklar: ne olduğu, ne zaman kullanılır, sık hatalar ve birden çok dilde örnek
 * (JavaScript, Python, C#, Java, C++). "for ile while farkı" gibi karşılaştırmaları ve "python'da while" gibi
 * dile özel soruları anlar. Kavram sorusu değilse soruyu bir önceki asistana (hata açıklayıcı, Kod Havuzu) bırakır.
 * Yeni kavram eklemek için aşağıdaki K listesine bir nesne ekle; anahtar kelimeler Türkçe karakter olmadan yazılır. */
(() => {
    const VS = window.VS;
    if (!VS) return;
    const fold = s => String(s || "").toLocaleLowerCase("tr").replace(/[çğıöşüâîû]/g, c => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" })[c]);

    const DIL = { js: "JavaScript", py: "Python", cs: "C#", java: "Java", cpp: "C++", html: "HTML", css: "CSS" };
    const DIL_ANAHTAR = [[/\bpython\b|\bpy\b|piton/, "py"], [/c#|c sharp|csharp|\bunity\b/, "cs"], [/\bjava\b(?!script)/, "java"], [/c\+\+|\bcpp\b/, "cpp"], [/javascript|\bjs\b|node/, "js"]];

    // k: anahtarlar (fold edilmiş) · ne: ne işe yarar · ne_zaman · hata: sık hatalar · ornek: dile göre kod · kalip: Kod Havuzu id
    const K = [
        { id: "degisken", ad: "Değişken", k: ["degisken", "variable", "let", "const", "var ", "deger tut"],
          ne: "Bir değeri bir isimle saklamaya yarar: puan, oyuncu adı, can sayısı gibi.",
          ne_zaman: "Bir değeri birden çok yerde kullanacaksan ya da zamanla değişecekse.",
          hata: ["JavaScript'te değişecek değerler için `let`, değişmeyecekler için `const` kullan; `var` eski ve kafa karıştırıcı.", "`const` ile tanımlanan değişkene yeniden değer atanamaz (TypeError: Assignment to constant variable)."],
          ornek: { js: "let puan = 0;\nconst isim = \"Ali\";\npuan = puan + 10;\nconsole.log(isim, puan); // Ali 10", py: "puan = 0\nisim = \"Ali\"\npuan += 10\nprint(isim, puan)  # Ali 10", cs: "int puan = 0;\nstring isim = \"Ali\";\npuan += 10;\nConsole.WriteLine($\"{isim} {puan}\");", java: "int puan = 0;\nString isim = \"Ali\";\npuan += 10;\nSystem.out.println(isim + \" \" + puan);", cpp: "int puan = 0;\nstd::string isim = \"Ali\";\npuan += 10;\nstd::cout << isim << \" \" << puan;" }, kalip: "js-degisken" },
        { id: "tip", ad: "Veri tipleri", k: ["veri tip", "tipler", "data type", "string", "number", "boolean", "sayi mi metin", "typeof", "tur donustur", "parseint", "tostring"],
          ne: "Değerlerin türü: sayı (number), metin (string), doğru/yanlış (boolean), dizi, nesne, boş (null/undefined).",
          ne_zaman: "Bir değerle ne yapabileceğin türüne bağlıdır: sayılar toplanır, metinler birleştirilir.",
          hata: ["`\"5\" + 3` JavaScript'te `\"53\"` olur (metin birleştirme). Önce sayıya çevir: `Number(\"5\") + 3` → 8.", "Kutudan (input) okunan değer her zaman metindir; sayı istiyorsan `Number(...)` ya da `parseInt(...)` kullan."],
          ornek: { js: "typeof 42        // \"number\"\ntypeof \"merhaba\" // \"string\"\ntypeof true      // \"boolean\"\nNumber(\"5\") + 3  // 8\nString(42)       // \"42\"", py: "type(42)        # <class 'int'>\ntype(\"merhaba\") # <class 'str'>\nint(\"5\") + 3    # 8\nstr(42)         # '42'" } },
        { id: "if", ad: "Koşul (if / else)", k: ["if", "else", "kosul", "eger", "condition", "karar ver", "elif", "else if"],
          ne: "Bir şart doğruysa bir şeyi, değilse başka bir şeyi yapar.",
          ne_zaman: "Oyunda can bittiyse 'Oyun bitti' demek, puan rekoru geçtiyse kaydetmek gibi karar anlarında.",
          hata: ["Karşılaştırmada tek `=` değil `===` kullan; tek `=` değer atar ve şart hep doğru gibi çalışabilir.", "Python'da girinti (boşluk) zorunludur; `if` satırının sonuna `:` koymayı unutma."],
          ornek: { js: "if (can <= 0) {\n  console.log(\"Oyun bitti\");\n} else if (can < 3) {\n  console.log(\"Dikkat, canın az!\");\n} else {\n  console.log(\"Devam\");\n}", py: "if can <= 0:\n    print(\"Oyun bitti\")\nelif can < 3:\n    print(\"Dikkat, canın az!\")\nelse:\n    print(\"Devam\")", cs: "if (can <= 0) Console.WriteLine(\"Oyun bitti\");\nelse if (can < 3) Console.WriteLine(\"Dikkat!\");\nelse Console.WriteLine(\"Devam\");", java: "if (can <= 0) System.out.println(\"Oyun bitti\");\nelse if (can < 3) System.out.println(\"Dikkat!\");\nelse System.out.println(\"Devam\");", cpp: "if (can <= 0) std::cout << \"Oyun bitti\";\nelse if (can < 3) std::cout << \"Dikkat!\";\nelse std::cout << \"Devam\";" }, kalip: "js-kosul" },
        { id: "switch", ad: "switch / match", k: ["switch", "case", "match case", "coklu kosul"],
          ne: "Bir değerin birçok olası durumuna göre farklı iş yapar; uzun `if / else if` zincirinin daha okunaklı hâli.",
          ne_zaman: "Basılan tuşa, seçilen menüye ya da bir duruma (state) göre dallanırken.",
          hata: ["JavaScript, C#, Java ve C++'ta her `case` sonunda `break` unutulursa alttaki case'ler de çalışır."],
          ornek: { js: "switch (tus) {\n  case \"ArrowLeft\": x -= 5; break;\n  case \"ArrowRight\": x += 5; break;\n  default: console.log(\"Başka tuş\");\n}", py: "match tus:\n    case \"left\":\n        x -= 5\n    case \"right\":\n        x += 5\n    case _:\n        print(\"Başka tuş\")", cs: "switch (tus) {\n  case \"sol\": x -= 5; break;\n  case \"sag\": x += 5; break;\n  default: break;\n}" } },
        { id: "for", ad: "for döngüsü", k: ["for dongu", "for loop", "for (", "for i", "sayarak tekrar", "belli sayida", "for nedir", "for nasil"],
          ne: "Bir işi **belli sayıda** tekrarlar. Sayaç, şart ve artış tek satırda yazılır.",
          ne_zaman: "Kaç kez döneceğini baştan biliyorsan: 10 düşman oluşturmak, 1'den 100'e saymak, bir dizinin her elemanını gezmek.",
          hata: ["`i <= dizi.length` yazarsan son turda dizinin dışına çıkarsın; doğrusu `i < dizi.length`.", "Sayacı artırmayı (`i++`) unutursan döngü sonsuza kadar döner ve sayfa donar."],
          ornek: { js: "for (let i = 1; i <= 5; i++) {\n  console.log(\"Tur\", i);\n}\n\n// dizinin her elemanı\nconst meyveler = [\"elma\", \"armut\"];\nfor (const m of meyveler) console.log(m);", py: "for i in range(1, 6):\n    print(\"Tur\", i)\n\nmeyveler = [\"elma\", \"armut\"]\nfor m in meyveler:\n    print(m)", cs: "for (int i = 1; i <= 5; i++)\n    Console.WriteLine(\"Tur \" + i);\n\nforeach (var m in meyveler) Console.WriteLine(m);", java: "for (int i = 1; i <= 5; i++)\n    System.out.println(\"Tur \" + i);\n\nfor (String m : meyveler) System.out.println(m);", cpp: "for (int i = 1; i <= 5; i++)\n    std::cout << \"Tur \" << i << \"\\n\";\n\nfor (auto& m : meyveler) std::cout << m << \"\\n\";" }, kalip: "js-dongu" },
        { id: "while", ad: "while döngüsü", k: ["while", "iken", "sart dogru oldukca", "kosul saglandikca", "do while", "do-while", "sonsuz dongu"],
          ne: "Bir **şart doğru olduğu sürece** tekrarlar. Kaç kez döneceği baştan belli değildir.",
          ne_zaman: "Ne zaman biteceğini bilmiyorsan: kullanıcı doğru tahmini bulana kadar sormak, can bitene kadar oyunu sürdürmek, bir değer belli bir sınırı geçene kadar artırmak.",
          hata: ["Şartı değiştiren bir satır yazmayı unutursan döngü **sonsuz** olur ve sayfa/program donar. Döngünün içinde şartı mutlaka bir gün yanlış yapacak bir şey olmalı.", "Tarayıcıda oyun döngüsü için `while(true)` kullanma; sayfa donar. Bunun yerine `requestAnimationFrame` kullan.", "`do { } while (şart)` en az bir kez çalışır; `while (şart) { }` şart baştan yanlışsa hiç çalışmaz."],
          ornek: { js: "let can = 3;\nwhile (can > 0) {\n  console.log(\"Can:\", can);\n  can--;            // şartı değiştiren satır, yoksa sonsuz döngü!\n}\n\n// en az bir kez çalışan hâli\nlet sayi;\ndo {\n  sayi = Math.floor(Math.random() * 10);\n} while (sayi !== 7);", py: "can = 3\nwhile can > 0:\n    print(\"Can:\", can)\n    can -= 1   # şartı değiştiren satır\n\n# Python'da do-while yok; böyle yazılır:\nwhile True:\n    tahmin = int(input(\"Tahmin: \"))\n    if tahmin == 7:\n        break", cs: "int can = 3;\nwhile (can > 0) {\n    Console.WriteLine(\"Can: \" + can);\n    can--;\n}\n\ndo { sayi = rnd.Next(10); } while (sayi != 7);", java: "int can = 3;\nwhile (can > 0) {\n    System.out.println(\"Can: \" + can);\n    can--;\n}\n\ndo { sayi = rnd.nextInt(10); } while (sayi != 7);", cpp: "int can = 3;\nwhile (can > 0) {\n    std::cout << \"Can: \" << can << \"\\n\";\n    can--;\n}\n\ndo { sayi = rand() % 10; } while (sayi != 7);" } },
        { id: "breakcontinue", ad: "break ve continue", k: ["break", "continue", "donguden cik", "donguyu durdur", "atla", "skip"],
          ne: "`break` döngüyü tamamen bitirir. `continue` sadece o turu atlayıp bir sonraki tura geçer.",
          ne_zaman: "Aradığını bulunca aramayı durdurmak (break) ya da bazı elemanları atlamak (continue) için.",
          hata: ["`forEach` içinde `break` çalışmaz; erken çıkmak istiyorsan `for...of` ya da `some/find` kullan."],
          ornek: { js: "for (const sayi of [1, 2, 3, 4, 5]) {\n  if (sayi === 2) continue; // 2'yi atla\n  if (sayi === 4) break;    // 4'te dur\n  console.log(sayi);        // 1, 3\n}", py: "for sayi in [1, 2, 3, 4, 5]:\n    if sayi == 2:\n        continue\n    if sayi == 4:\n        break\n    print(sayi)  # 1, 3" } },
        { id: "fonksiyon", ad: "Fonksiyon", k: ["fonksiyon", "function", "metot", "method", "def ", "return", "parametre", "arguman", "arrow", "ok fonksiyon", "=>"],
          ne: "Bir işi bir isim altında toplar; istediğin yerde, istediğin kadar çağırırsın. Değer alabilir (parametre) ve sonuç döndürebilir (return).",
          ne_zaman: "Aynı kodu birden çok yerde yazıyorsan ya da bir işi adlandırıp kodu okunur yapmak istiyorsan.",
          hata: ["`return` yazmazsan fonksiyon `undefined` döndürür.", "Fonksiyonu çağırırken parantezi unutma: `topla` fonksiyonun kendisi, `topla(2, 3)` sonucu."],
          ornek: { js: "function topla(a, b) {\n  return a + b;\n}\nconst carp = (a, b) => a * b; // kısa (ok) hâli\nconsole.log(topla(2, 3), carp(2, 3)); // 5 6", py: "def topla(a, b):\n    return a + b\n\ncarp = lambda a, b: a * b\nprint(topla(2, 3), carp(2, 3))  # 5 6", cs: "int Topla(int a, int b) { return a + b; }\nConsole.WriteLine(Topla(2, 3));", java: "static int topla(int a, int b) { return a + b; }\nSystem.out.println(topla(2, 3));", cpp: "int topla(int a, int b) { return a + b; }\nstd::cout << topla(2, 3);" }, kalip: "js-fonksiyon" },
        { id: "dizi", ad: "Dizi (array / liste)", k: ["dizi", "array", "liste", "list", "push", "eleman ekle", "eleman sil", "splice", "length", "uzunluk"],
          ne: "Birden çok değeri sıralı olarak tek değişkende tutar. Her elemanın bir sırası (index) vardır ve sıra **0'dan** başlar.",
          ne_zaman: "Düşmanlar, mermiler, skor listesi gibi aynı türden birçok şeyi tutarken.",
          hata: ["İlk eleman `dizi[0]`, son eleman `dizi[dizi.length - 1]`.", "Döngü içinde diziden eleman silmek elemanları kaydırır; tersten dön ya da `filter` kullan."],
          ornek: { js: "const liste = [\"elma\", \"armut\"];\nliste.push(\"kiraz\");      // sona ekle\nliste.unshift(\"muz\");      // başa ekle\nliste.splice(1, 1);        // 1. sıradakini sil\nconsole.log(liste.length, liste[0]);", py: "liste = [\"elma\", \"armut\"]\nliste.append(\"kiraz\")\nliste.insert(0, \"muz\")\ndel liste[1]\nprint(len(liste), liste[0])", cs: "var liste = new List<string> { \"elma\", \"armut\" };\nliste.Add(\"kiraz\");\nliste.RemoveAt(1);\nConsole.WriteLine(liste.Count);", java: "List<String> liste = new ArrayList<>(List.of(\"elma\", \"armut\"));\nliste.add(\"kiraz\");\nliste.remove(1);", cpp: "std::vector<std::string> liste = {\"elma\", \"armut\"};\nliste.push_back(\"kiraz\");\nliste.erase(liste.begin() + 1);" }, kalip: "js-dizi" },
        { id: "diziMetot", ad: "map, filter, find, reduce, sort", k: ["map", "filter", "find", "reduce", "sort", "sirala", "filtrele", "foreach", "some", "every", "includes"],
          ne: "Dizilerle döngü yazmadan iş yapan hazır fonksiyonlar. `map` her elemanı dönüştürür, `filter` şarta uyanları seçer, `find` ilk uyanı bulur, `reduce` hepsini tek değere indirir, `sort` sıralar.",
          ne_zaman: "Skorları sıralamak, yaşayan düşmanları seçmek, toplam puanı hesaplamak gibi işlerde.",
          hata: ["`sort` sayıları metin gibi sıralar: `[10, 9, 1].sort()` → `[1, 10, 9]`. Sayılar için `sort((a, b) => a - b)`.", "`map` yeni dizi döndürür; sonucu bir değişkene atamazsan kaybolur. Sadece döngü istiyorsan `forEach`."],
          ornek: { js: "const puanlar = [40, 90, 15, 70];\nconst iki_kat = puanlar.map(p => p * 2);\nconst yuksek = puanlar.filter(p => p >= 50);   // [90, 70]\nconst ilk = puanlar.find(p => p > 60);          // 90\nconst toplam = puanlar.reduce((t, p) => t + p, 0); // 215\nconst sirali = [...puanlar].sort((a, b) => b - a); // büyükten küçüğe", py: "puanlar = [40, 90, 15, 70]\niki_kat = [p * 2 for p in puanlar]\nyuksek = [p for p in puanlar if p >= 50]\ntoplam = sum(puanlar)\nsirali = sorted(puanlar, reverse=True)" } },
        { id: "nesne", ad: "Nesne (object / sözlük)", k: ["nesne", "object", "obje", "sozluk", "dictionary", "dict", "anahtar deger", "key value", "json"],
          ne: "Bir şeyin özelliklerini isim–değer çiftleri olarak bir arada tutar: oyuncunun adı, canı, konumu gibi.",
          ne_zaman: "Birbirine ait bilgileri tek bir yerde toplamak istediğinde (oyuncu, ayarlar, ürün).",
          hata: ["Olmayan bir özelliği okumak `undefined` verir; daha derine inersen hata alırsın. Güvenli okuma: `oyuncu?.envanter?.kilic`.", "Nesneyi `localStorage`'a kaydetmeden önce `JSON.stringify`, okurken `JSON.parse` kullan."],
          ornek: { js: "const oyuncu = { isim: \"Ali\", can: 3, konum: { x: 10, y: 20 } };\noyuncu.can -= 1;\nconsole.log(oyuncu.isim, oyuncu.konum.x);\nconst metin = JSON.stringify(oyuncu); // kaydetmek için\nconst geri = JSON.parse(metin);", py: "oyuncu = {\"isim\": \"Ali\", \"can\": 3}\noyuncu[\"can\"] -= 1\nprint(oyuncu[\"isim\"], oyuncu.get(\"skor\", 0))" } },
        { id: "class", ad: "Sınıf (class) ve nesne yönelimli programlama", k: ["class", "sinif", "oop", "nesne yonelimli", "constructor", "kalitim", "inheritance", "extends", "this", "self", "yapici"],
          ne: "Aynı türden birçok nesne üretmek için bir kalıp. Özellikleri (veri) ve davranışları (metotlar) bir arada tutar. `extends` ile bir sınıf diğerinden özellik miras alır.",
          ne_zaman: "Oyunda çok sayıda düşman, mermi, karakter varsa; her birinin kendi verisi ve davranışı olacaksa.",
          hata: ["Metot içinde nesnenin kendi verisine `this.` (Python'da `self.`) ile eriş.", "Alt sınıfın constructor'ında önce `super(...)` çağrılmalı."],
          ornek: { js: "class Dusman {\n  constructor(x, can) { this.x = x; this.can = can; }\n  vur(hasar) { this.can -= hasar; return this.can <= 0; }\n}\nclass Boss extends Dusman {\n  constructor(x) { super(x, 100); }\n}\nconst d = new Dusman(50, 3);\nd.vur(1);", py: "class Dusman:\n    def __init__(self, x, can):\n        self.x = x\n        self.can = can\n    def vur(self, hasar):\n        self.can -= hasar\n        return self.can <= 0\n\nclass Boss(Dusman):\n    def __init__(self, x):\n        super().__init__(x, 100)", cs: "class Dusman {\n    public int Can;\n    public Dusman(int can) { Can = can; }\n    public bool Vur(int h) { Can -= h; return Can <= 0; }\n}\nclass Boss : Dusman { public Boss() : base(100) {} }", java: "class Dusman {\n    int can;\n    Dusman(int can) { this.can = can; }\n    boolean vur(int h) { can -= h; return can <= 0; }\n}\nclass Boss extends Dusman { Boss() { super(100); } }" } },
        { id: "string", ad: "Metin (string) işlemleri", k: ["string", "metin", "yazi birlestir", "template", "backtick", "split", "replace", "trim", "buyuk harf", "kucuk harf", "uppercase", "substring", "slice"],
          ne: "Metinleri birleştirme, bölme, değiştirme, kırpma ve harf büyüklüğünü değiştirme.",
          ne_zaman: "Kullanıcı adını göstermek, mesajları biçimlendirmek, girilen metni temizlemek için.",
          hata: ["Değişkeni metnin içine koymak için ters tırnak (backtick) kullan: `` `Puan: ${puan}` ``. Normal tırnakla `${}` çalışmaz.", "Türkçe büyük harf için `toLocaleUpperCase(\"tr\")` (yoksa i → I olur, İ olmaz)."],
          ornek: { js: "const ad = \"  ali  \";\nconst temiz = ad.trim();                    // \"ali\"\nconst mesaj = `Merhaba ${temiz}, puanın ${10 * 3}`;\n\"a,b,c\".split(\",\");                         // [\"a\",\"b\",\"c\"]\n\"kedi\".replace(\"k\", \"m\");                   // \"medi\"\n\"istanbul\".toLocaleUpperCase(\"tr\");         // \"İSTANBUL\"", py: "ad = \"  ali  \".strip()\nmesaj = f\"Merhaba {ad}, puanın {10 * 3}\"\n\"a,b,c\".split(\",\")\n\"kedi\".replace(\"k\", \"m\")\nad.upper()" } },
        { id: "esitlik", ad: "== ile === farkı", k: ["== ile ===", "===", "esittir esittir", "uc esittir", "iki esittir", "strict equal"],
          ne: "`===` hem değeri hem türü karşılaştırır. `==` karşılaştırmadan önce türleri dönüştürmeye çalışır ve şaşırtıcı sonuçlar verir.",
          ne_zaman: "JavaScript'te **her zaman `===`** (ve `!==`) kullan.",
          hata: ["`0 == \"\"` → true, `null == undefined` → true, `\"5\" == 5` → true. `===` ile hepsi false."],
          ornek: { js: "\"5\" == 5   // true  (tür dönüştürüldü)\n\"5\" === 5  // false (biri metin, biri sayı)\n0 == false  // true\n0 === false // false" } },
        { id: "kapsam", ad: "Kapsam (scope) ve let/const/var farkı", k: ["scope", "kapsam", "let ile var", "var ile let", "let const var", "global degisken", "yerel degisken", "is not defined"],
          ne: "Bir değişkenin kodun hangi kısmında görülebildiği. `let` ve `const` sadece tanımlandıkları `{ }` blok içinde geçerlidir; `var` bütün fonksiyonda geçerlidir.",
          ne_zaman: "\"X is not defined\" hatası alıyorsan değişken büyük ihtimalle başka bir blokta tanımlıdır.",
          hata: ["Fonksiyon içinde tanımladığın değişkeni dışarıda kullanamazsın; dışarıda tanımlayıp içeride değiştir.", "`var` döngülerde beklenmedik davranır; `let` kullan."],
          ornek: { js: "let puan = 0;          // her yerden görülür (dış kapsam)\nfunction artir() {\n  let gecici = 5;      // sadece bu fonksiyonda\n  puan += gecici;\n}\nif (true) { const x = 1; }\n// console.log(x);     // HATA: x is not defined" } },
        { id: "olay", ad: "Olaylar (event): tıklama, tuş, fare", k: ["olay", "event", "addeventlistener", "onclick", "tikla", "click", "tusa bas", "keydown", "keyup", "mouse", "fare"],
          ne: "Kullanıcı bir şey yaptığında (tıklama, tuşa basma, fare hareketi) çalışacak kodu bağlar.",
          ne_zaman: "Butonlar, klavye kontrolleri, sürükle-bırak, form gönderme.",
          hata: ["Fonksiyonu verirken çağırma: `addEventListener(\"click\", basla)` doğru, `basla()` yanlış (hemen çalışır).", "Eleman sayfada oluşmadan önce seçersen `null` gelir; script'i `</body>`'den önce koy ya da `defer` kullan."],
          ornek: { js: "const btn = document.querySelector(\"#basla\");\nbtn.addEventListener(\"click\", () => {\n  console.log(\"Tıklandı!\");\n});\n\naddEventListener(\"keydown\", e => {\n  if (e.key === \"ArrowLeft\") x -= 5;\n  if (e.key === \" \") ziplat();\n});" }, kalip: "oyun-klavye" },
        { id: "dom", ad: "DOM: sayfadaki elemanları seçme ve değiştirme", k: ["dom", "queryselector", "getelementbyid", "innerhtml", "textcontent", "classlist", "eleman olustur", "createelement", "sayfayi degistir", "html degistir"],
          ne: "JavaScript ile sayfadaki HTML elemanlarını bulup yazılarını, stillerini, sınıflarını değiştirmek ya da yeni eleman eklemek.",
          ne_zaman: "Skor yazısını güncellemek, bir paneli gizleyip göstermek, listeye yeni satır eklemek.",
          hata: ["Kullanıcıdan gelen metni `innerHTML`'e koyma (güvenlik açığı); `textContent` kullan.", "`getElementById(\"x\")` için başına `#` konmaz; `querySelector(\"#x\")` için konur."],
          ornek: { js: "const skor = document.querySelector(\"#skor\");\nskor.textContent = \"Puan: 10\";\nskor.classList.add(\"parla\");\nskor.style.color = \"gold\";\n\nconst li = document.createElement(\"li\");\nli.textContent = \"Yeni rekor!\";\ndocument.querySelector(\"#liste\").append(li);" } },
        { id: "async", ad: "async / await, Promise ve fetch", k: ["async", "await", "promise", "fetch", "api", "istek at", "veri cek", "then", "asenkron", "json cek"],
          ne: "Zaman alan işleri (internetten veri çekme, bekleme) sayfayı dondurmadan yapmanın yolu. `await` sonucun gelmesini bekler; sadece `async` fonksiyon içinde kullanılır.",
          ne_zaman: "Bir API'den veri almak, dosya yüklemek, bir süre beklemek.",
          hata: ["`await is only valid in async functions` hatası: fonksiyonun başına `async` ekle.", "İnternet isteği başarısız olabilir; `try/catch` ile yakala.", "Topluluktaki oyunlar kum havuzunda çalışır; dış internete istek atamaz."],
          ornek: { js: "async function veriGetir() {\n  try {\n    const cevap = await fetch(\"https://api.example.com/skorlar\");\n    const veri = await cevap.json();\n    console.log(veri);\n  } catch (hata) {\n    console.log(\"Veri alınamadı:\", hata);\n  }\n}\n\nconst bekle = ms => new Promise(r => setTimeout(r, ms));\nawait bekle(1000); // 1 sn bekle (async içinde)", py: "import asyncio\n\nasync def ana():\n    await asyncio.sleep(1)\n    print(\"1 saniye geçti\")\n\nasyncio.run(ana())" } },
        { id: "trycatch", ad: "Hata yakalama (try / catch)", k: ["try", "catch", "except", "hata yakala", "exception", "throw", "finally"],
          ne: "Hata çıkabilecek kodu korur: hata olursa program çökmez, `catch` bloğu çalışır.",
          ne_zaman: "İnternet istekleri, kullanıcıdan gelen veriyi işleme, `JSON.parse` gibi bozuk veride hata verebilecek işler.",
          hata: ["Hatayı yakalayıp hiçbir şey yapmamak (boş catch) sorunu gizler; en azından `console.error` yaz."],
          ornek: { js: "try {\n  const ayar = JSON.parse(localStorage.getItem(\"ayar\"));\n} catch (e) {\n  console.error(\"Ayar bozuk:\", e.message);\n} finally {\n  console.log(\"Her durumda çalışır\");\n}", py: "try:\n    sayi = int(input(\"Sayı: \"))\nexcept ValueError:\n    print(\"Bu bir sayı değil\")\nfinally:\n    print(\"Bitti\")", cs: "try { int.Parse(metin); }\ncatch (FormatException e) { Console.WriteLine(e.Message); }", java: "try { Integer.parseInt(metin); }\ncatch (NumberFormatException e) { System.out.println(e.getMessage()); }" } },
        { id: "zaman", ad: "setTimeout ve setInterval", k: ["settimeout", "setinterval", "zamanlayici", "timer", "geri sayim", "her saniye", "bekle", "gecikme", "delay"],
          ne: "`setTimeout` bir işi bir kez, belli bir süre sonra yapar. `setInterval` bir işi belli aralıklarla tekrar tekrar yapar.",
          ne_zaman: "Geri sayım, her saniye düşman çıkarma, bir mesajı 3 saniye sonra gizleme.",
          hata: ["Süreler milisaniyedir: 1 saniye = 1000.", "`setInterval`'ı durdurmazsan sonsuza kadar çalışır: `const id = setInterval(...)` sonra `clearInterval(id)`.", "Akıcı animasyon için `setInterval` yerine `requestAnimationFrame` kullan."],
          ornek: { js: "setTimeout(() => console.log(\"3 sn geçti\"), 3000);\n\nlet sure = 10;\nconst id = setInterval(() => {\n  sure--;\n  console.log(sure);\n  if (sure === 0) clearInterval(id);\n}, 1000);" }, kalip: "js-zamanlayici" },
        { id: "rastgele", ad: "Rastgele sayı", k: ["rastgele", "random", "zar", "sans", "rasgele"],
          ne: "Belli bir aralıkta rastgele sayı üretmek.",
          ne_zaman: "Zar atmak, düşmanı rastgele yere koymak, rastgele renk ya da ödül seçmek.",
          hata: ["`Math.random()` 0 ile 1 arasında (1 hariç) ondalık sayı verir; tam sayı için `Math.floor` kullan."],
          ornek: { js: "const zar = Math.floor(Math.random() * 6) + 1;      // 1-6\nconst arasi = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;\nconst sec = liste => liste[Math.floor(Math.random() * liste.length)];", py: "import random\nzar = random.randint(1, 6)\nsecim = random.choice([\"taş\", \"kağıt\", \"makas\"])", cs: "var rnd = new Random();\nint zar = rnd.Next(1, 7); // 1-6", java: "int zar = new Random().nextInt(6) + 1;", cpp: "int zar = rand() % 6 + 1; // başta srand(time(0));" }, kalip: "js-rastgele" },
        { id: "localstorage", ad: "Kaydetme (localStorage)", k: ["localstorage", "kaydet", "kayit", "rekor sakla", "hafiza", "sayfa yenilenince", "save"],
          ne: "Tarayıcıya küçük veriler kaydeder; sayfa kapansa da silinmez.",
          ne_zaman: "Rekor, ayarlar, oyun ilerlemesi gibi şeyleri saklamak için.",
          hata: ["Sadece metin saklar; nesne ve dizileri `JSON.stringify` ile kaydet, `JSON.parse` ile oku.", "Okunan değer metindir: sayı olarak kullanmak için `Number(...)`."],
          ornek: { js: "localStorage.setItem(\"rekor\", 120);\nconst rekor = Number(localStorage.getItem(\"rekor\") || 0);\n\nlocalStorage.setItem(\"oyuncu\", JSON.stringify({ isim: \"Ali\", seviye: 3 }));\nconst oyuncu = JSON.parse(localStorage.getItem(\"oyuncu\") || \"{}\");" }, kalip: "js-kayit" },
        { id: "oyundongu", ad: "Oyun döngüsü ve canvas", k: ["oyun dongu", "game loop", "requestanimationframe", "canvas", "ciz", "animasyon", "fps", "kare kare"],
          ne: "Oyunlar her saniye ~60 kez aynı şeyi yapar: girdileri oku, durumu güncelle, ekranı çiz. Bunu `requestAnimationFrame` ile yaparsın.",
          ne_zaman: "Hareket eden her şeyde: platform, yılan, uzay oyunu.",
          hata: ["Her karede ekranı temizlemeyi unutursan (`clearRect`) iz kalır.", "Hızları kare sayısına değil geçen süreye göre ayarla, yoksa hızlı bilgisayarda oyun hızlanır."],
          ornek: { js: "const c = document.querySelector(\"canvas\"), ctx = c.getContext(\"2d\");\nlet x = 0, onceki = 0;\nfunction dongu(zaman) {\n  const dt = (zaman - onceki) / 1000; onceki = zaman;\n  x += 120 * dt;                       // saniyede 120 piksel\n  ctx.clearRect(0, 0, c.width, c.height);\n  ctx.fillStyle = \"tomato\";\n  ctx.fillRect(x % c.width, 50, 30, 30);\n  requestAnimationFrame(dongu);\n}\nrequestAnimationFrame(dongu);" }, kalip: "oyun-dongu" },
        { id: "carpisma", ad: "Çarpışma kontrolü", k: ["carpis", "temas", "degdi", "collision", "hitbox", "ust uste"],
          ne: "İki nesnenin birbirine değip değmediğini anlamak.",
          ne_zaman: "Mermi düşmana çarptı mı, oyuncu duvara değdi mi.",
          hata: ["Kutular için 4 şartın hepsi doğru olmalı; biri eksikse uzaktaki nesneler de çarpışmış sayılır."],
          ornek: { js: "// iki dikdörtgen (x, y, w, h)\nconst carpisti = (a, b) =>\n  a.x < b.x + b.w && a.x + a.w > b.x &&\n  a.y < b.y + b.h && a.y + a.h > b.y;\n\n// iki daire\nconst daire = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r;" }, kalip: "oyun-carpisma" },
        { id: "ozyineleme", ad: "Özyineleme (recursion)", k: ["ozyineleme", "recursion", "recursive", "kendini cagir", "faktoriyel", "fibonacci"],
          ne: "Bir fonksiyonun kendini çağırması. Büyük bir problemi aynı türden küçük problemlere böler.",
          ne_zaman: "Faktöriyel, ağaç/klasör gezme, labirent çözme gibi iç içe yapılarda.",
          hata: ["Mutlaka bir **durma şartı** olmalı; yoksa \"Maximum call stack size exceeded\" hatası alırsın."],
          ornek: { js: "function faktoriyel(n) {\n  if (n <= 1) return 1;        // durma şartı\n  return n * faktoriyel(n - 1);\n}\nfaktoriyel(5); // 120", py: "def faktoriyel(n):\n    if n <= 1:\n        return 1\n    return n * faktoriyel(n - 1)" } },
        { id: "flex", ad: "CSS Flexbox ve ortalama", k: ["flex", "flexbox", "ortala", "ortalama", "center", "hizala", "justify", "align-items", "yan yana diz"],
          ne: "Elemanları bir satır ya da sütun boyunca dizip hizalamanın en kolay yolu.",
          ne_zaman: "Menü çubukları, butonları yan yana koymak, bir şeyi tam ortaya almak.",
          hata: ["`display:flex` çocuklara değil, **kapsayıcı** elemana yazılır.", "Dikey ortalamak için kapsayıcının bir yüksekliği olmalı (ör. `min-height:100vh`)."],
          ornek: { css: ".kapsayici {\n  display: flex;\n  justify-content: center;   /* yatay */\n  align-items: center;       /* dikey */\n  gap: 12px;\n  min-height: 100vh;\n}" } },
        { id: "gridcss", ad: "CSS Grid", k: ["grid", "izgara", "kart dizisi", "grid-template", "sutun"],
          ne: "Elemanları satır ve sütunlardan oluşan bir ızgaraya dizer.",
          ne_zaman: "Kart listeleri, galeri, oyun tahtası (satranç, mayın tarlası).",
          hata: ["Ekran daralınca otomatik alta inmesi için `repeat(auto-fill, minmax(200px, 1fr))` kullan."],
          ornek: { css: ".galeri {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n  gap: 16px;\n}\n.tahta { display: grid; grid-template-columns: repeat(8, 1fr); }" }, kalip: "css-grid" },
        { id: "animasyoncss", ad: "CSS animasyon ve geçiş", k: ["transition", "animation", "keyframes", "css animasyon", "gecis efekti", "hover efekti"],
          ne: "`transition` bir özellik değişince yumuşak geçiş yapar; `@keyframes` + `animation` kendi kendine tekrar eden animasyon yapar.",
          ne_zaman: "Buton üstüne gelince büyüme, yanıp sönen yazı, dönen yükleniyor simgesi.",
          hata: ["`transition`'ı değişen duruma değil, elemanın normal hâline yaz."],
          ornek: { css: ".buton { transition: transform .2s; }\n.buton:hover { transform: scale(1.1); }\n\n@keyframes don { to { transform: rotate(360deg); } }\n.yukleniyor { animation: don 1s linear infinite; }" } },
    ];

    // Karşılaştırmalar: iki kavram aynı soruda geçerse önce farkı anlat
    const FARK = {
        "for|while": "**for** kaç kez döneceğini baştan bildiğinde kullanılır (sayaç tek satırda). **while** ne zaman biteceği belli olmayan, bir şart doğru olduğu sürece süren tekrarlar içindir. Her `for` döngüsü `while` ile de yazılabilir; okunurluğa göre seç.",
        "for|diziMetot": "`for`/`for...of` her işi yapabilen genel döngüdür; `break` ile erken çıkabilirsin. `map/filter/forEach` dizilere özel, daha kısa ve okunaklıdır ama `break` çalışmaz. Yeni dizi üretiyorsan `map/filter`, sadece gezip iş yapıyorsan `for...of` ya da `forEach`.",
        "fonksiyon|class": "**Fonksiyon** bir işi yapar. **Sınıf** ise veriyi ve o veriyle ilgili fonksiyonları (metotları) bir arada tutan bir kalıptır; aynı türden çok nesne üreteceksen sınıf kullan.",
        "dizi|nesne": "**Dizi** sıralı bir listedir, elemanlara sıra numarasıyla (`liste[0]`) erişilir. **Nesne** isimli özellikler tutar, değerlere adla (`oyuncu.can`) erişilir. Aynı türden çok şey → dizi; bir şeyin özellikleri → nesne.",
        "zaman|oyundongu": "`setInterval` sabit aralıklarla çalışır ama ekranla senkron değildir, takılabilir. `requestAnimationFrame` ekran her yenilendiğinde çalışır, sekme gizlenince durur ve animasyonlar için doğru olanıdır.",
        "if|switch": "Az sayıda ya da karmaşık şart için `if/else`. Tek bir değerin birçok sabit durumu varsa (`tuş`, `menü seçimi`) `switch` daha okunaklıdır.",
        "flex|gridcss": "**Flexbox** tek boyutludur: bir satır ya da bir sütun boyunca hizalar (menü, buton grubu). **Grid** iki boyutludur: satır ve sütunları birlikte yönetir (kart ızgarası, oyun tahtası).",
    };

    const isCode = f => /\b(nedir|ne demek|nasil|nasıl|ornek|örnek|kullan|yaz|farki|fark|neden|ne zaman|anlat|ogren|ogret|acikla|aciklar|what is|how to|how do|example|difference|vs|explain)\b/.test(f);

    function puanla(f) {
        return K.map(c => {
            let p = 0;
            for (const a of c.k) if (f.includes(a)) p += a.length >= 5 ? 3 : 2;
            if (f.includes(fold(c.ad))) p += 3;
            return { c, p };
        }).filter(x => x.p > 0).sort((a, b) => b.p - a.p);
    }

    function kodBlok(c, dil) {
        const o = c.ornek || {};
        const sira = dil ? [dil] : ["js", "css", "py"];
        const secili = sira.filter(d => o[d]);
        if (dil && !o[dil]) {
            const var_olan = Object.keys(o).map(d => DIL[d]).join(", ");
            return `_${DIL[dil]} örneğim yok; ${var_olan} örneği:_\n` + Object.keys(o).slice(0, 1).map(d => `\`\`\`${d === "py" ? "python" : d === "cs" ? "csharp" : d}\n${o[d]}\n\`\`\``).join("\n");
        }
        // varsayılan: JS (ya da CSS) + varsa Python
        const goster = dil ? secili : secili.slice(0, 2);
        return goster.map(d => `**${DIL[d]}**\n\`\`\`${d === "py" ? "python" : d === "cs" ? "csharp" : d}\n${o[d]}\n\`\`\``).join("\n");
    }

    function anlat(c, dil, kisa) {
        const diller = Object.keys(c.ornek || {}).map(d => DIL[d]);
        let s = `### ${c.ad}\n${c.ne}\n\n**Ne zaman kullanılır?** ${c.ne_zaman}\n\n${kodBlok(c, dil)}`;
        if (!kisa && c.hata && c.hata.length) s += `\n\n**Dikkat:**\n` + c.hata.map(h => "• " + h).join("\n");
        if (!dil && diller.length > 2) s += `\n\n_Başka dilde görmek için sor: ${diller.filter(d => d !== "JavaScript" && d !== "CSS").map(d => `"${d}'da ${c.ad.split(" ")[0].toLocaleLowerCase("tr")}"`).slice(0, 2).join(", ")}_`;
        const p = c.kalip && VS.codePool && VS.codePool.find(x => x.id === c.kalip);
        if (p && !kisa) s += `\n\nKod Havuzu'nda hazır kalıp: **${p.title}**\n[[ekle:${p.id}]]`;
        return s;
    }

    function ogretmen(soru) {
        const f = fold(soru);
        if (f.length < 2) return null;
        let dil = null;
        for (const [re, d] of DIL_ANAHTAR) if (re.test(f)) { dil = d; break; }
        const bulunan = puanla(f);
        if (!bulunan.length) return null;
        // kısa ve tek kelimelik sorularda bile kavram açıkça geçiyorsa cevapla; uzun cümlede soru kalıbı ara
        if (bulunan[0].p < 3 && !isCode(f) && f.split(" ").length > 3) return null;
        // karşılaştırma
        if (/fark|vs|ile .* arasi|difference|hangisi|karsilastir/.test(f) && bulunan.length >= 2) {
            const a = bulunan[0].c, b = bulunan[1].c, anahtar = [a.id + "|" + b.id, b.id + "|" + a.id].find(x => FARK[x]);
            const ozet = anahtar ? FARK[anahtar] : `**${a.ad}**: ${a.ne}\n\n**${b.ad}**: ${b.ne}`;
            return `### ${a.ad} ile ${b.ad} farkı\n${ozet}\n\n---\n${anlat(a, dil, true)}\n\n---\n${anlat(b, dil, true)}`;
        }
        return anlat(bulunan[0].c, dil, false);
    }

    // Önceki asistana bağlan: hata soruları ve Kod Havuzu cevapları onda kalır
    const onceki = VS.assistAnswer;
    VS.assistAnswer = (soru) => {
        const f = fold(soru);
        const hataSorusu = /hata|calismiyor|bozuk|olmuyor|sorun ne|kontrol et|error|uncaught|undefined is not|is not defined|syntaxerror|typeerror/.test(f) && !/nedir|ne demek|farki/.test(f);
        if (!hataSorusu) { try { const c = ogretmen(soru); if (c) return c; } catch (e) { console.warn("[Kod Öğretmeni]", e); } }
        return onceki ? onceki(soru) : null;
    };
    VS.codeTeacher = { konular: () => K.map(c => c.ad), sor: ogretmen };
})();
