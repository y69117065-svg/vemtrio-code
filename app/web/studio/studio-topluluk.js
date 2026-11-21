/* VEMTRIO Topluluk AI — topluluktaki projelerin kodunu tanır, nasıl çalıştıklarını anlatır, parçalarını kaynak göstererek ekletir.
 * Ayrıca VEMTRIO Code'un kullanımını bilir ve konu dışına (matematik, genel kültür…) çıkmaz.
 * Model gerektirmez: sunucudaki analiz (lib/topluluk-ai.js) + buradaki kurallar. Guard AI'dan (sitenin güvenlik AI'ı) tamamen ayrıdır. */
(() => {
    const VS = window.VS, t = VS.t, esc = VS.esc;
    const AD = "VEMTRIO Topluluk AI";
    const fold = s => String(s || "").toLocaleLowerCase("tr").replace(/[çğıöşüâîû]/g, c => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" })[c]);
    let INDEX = null, yukleniyor = null;
    VS.communityIndex = () => INDEX || [];
    VS.loadCommunityIndex = (force) => {
        if (INDEX && !force) return Promise.resolve(INDEX);
        if (!yukleniyor || force) yukleniyor = VS.apiHub("community_ai_index").then(j => { INDEX = j && j.ok ? j.items : []; return INDEX; }).catch(() => (INDEX = []));
        return yukleniyor;
    };
    setTimeout(() => VS.loadCommunityIndex(), 1500);
    const proje = id => (INDEX || []).find(p => p.id === id);
    const TEK_RE = { canvas: /getContext|fillRect|drawImage|\.arc\(/, dongu: /requestAnimationFrame/, klavye: /keydown|keyup|\.key\b/, fare: /click|pointer|touch|mouse/, carpisma: /\.x\s*<|Math\.hypot|carp|collid|intersect/i, skor: /score|skor|puan/i, sdk: /Vemtrio\./, kayit: /localStorage/, ses: /Audio|oscillator|\.play\(/i, rastgele: /Math\.random/, zaman: /setTimeout|setInterval/, fizik: /gravity|vy|vx|velocity|hiz/i, dom: /getElementById|querySelector|createElement/ };
    const TEK_SOZ = [["carpisma", /carpis|temas|deg(di|me)|collision/], ["klavye", /klavye|tus|ok tus|wasd|keyboard/], ["dongu", /oyun dongu|game loop|dongu/], ["canvas", /canvas|ciz/], ["skor", /skor|puan|score/], ["sdk", /liderlik|leaderboard|vemtrio sdk|savescore/], ["kayit", /localstorage|kaydet|rekor sakla/], ["ses", /\bses\b|muzik|sound|audio/], ["rastgele", /rastgele|random/], ["fizik", /yercekimi|fizik|zipla|gravity|jump/], ["fare", /fare|tikla|dokun|mouse|touch/], ["zaman", /zamanlayici|sure|timer|geri sayim/]];
    const kredi = (p, dil) => { const s = `Kaynak: "${p.title}" · @${p.author} (VEMTRIO Topluluk)`; return dil === "css" ? `/* ${s} */` : dil === "html" ? `<!-- ${s} -->` : `// ${s}`; };

    // ---------- kod ekleme ----------
    function fonksiyonEkle(pid, ad) {
        const p = proje(pid); const f = p && p.fonksiyonlar.find(x => x.ad === ad); if (!f) return;
        const tab = VS.activeTab(); const dil = tab && tab.model ? tab.model.getLanguageId() : "javascript";
        const metin = (dil === "html" ? "<script>\n" + kredi(p, "js") + "\n" + f.kod + "\n</script>\n" : kredi(p, "js") + "\n" + f.kod + "\n");
        if (tab && tab.model && VS.editor) { VS.editor.focus(); VS.editor.executeEdits("cai", [{ range: VS.editor.getSelection(), text: metin, forceMoveMarkers: true }]); VS.toast(t(`${ad}() eklendi; kaynak yorum satırına yazıldı.`, `${ad}() inserted with credit.`), "ok", 3500); }
        else { navigator.clipboard.writeText(metin); VS.toast(t("Açık dosya yok; kod panoya kopyalandı.", "No open file; code copied."), "warn"); }
    }
    VS.caiInsert = fonksiyonEkle;
    // ---------- proje analiz sayfası ----------
    VS.openCommunityProject = (pid) => {
        const p = proje(pid); if (!p) return VS.toast(t("Proje bulunamadı.", "Project not found."), "warn");
        VS.openCustom("cai:" + p.id, p.title, el => {
            el.innerHTML = `<div class="runner" style="max-width:1000px"><div><div class="hint">${AD} · ${t("TOPLULUK PROJESİ", "COMMUNITY PROJECT")}</div><h2 style="font-family:var(--font)">${esc(p.title)}</h2><p class="hint" style="margin-top:4px">@${esc(p.author)} · ${esc(p.summary || "")}</p></div>
                <div class="contrib">${p.teknikler.map(x => `<span class="ok" title="${esc(x.ne)}">${esc(x.ad)}</span>`).join("")}</div>
                <div class="row"><button class="btn" data-a="remix">${t("Remix olarak aç", "Open as Remix")}</button><button class="btn sec" data-a="site">${t("Toplulukta gör", "View in community")}</button></div>
                <div><h3 style="font-size:14px;margin-bottom:6px">${t("Nasıl çalışıyor?", "How does it work?")}</h3><p style="line-height:1.7">${esc(p.ozet)}</p></div>
                <div><h3 style="font-size:14px;margin-bottom:6px">${t("Dosyalar", "Files")}</h3><div class="contrib">${p.dosyalar.map(d => `<span>${esc(d.ad)} · ${esc(d.tur)} · ${d.satir} ${t("satır", "lines")}</span>`).join("")}</div></div>
                <div><h3 style="font-size:14px;margin-bottom:8px">${t("Fonksiyonlar", "Functions")} (${p.fonksiyonlar.length})</h3>${p.fonksiyonlar.map(f => `<div style="margin-bottom:14px"><div class="row" style="justify-content:space-between"><b style="font-family:var(--mono);font-size:13px">${esc(f.ad)}() <small class="hint" style="font-family:var(--font)">${esc(f.dosya)}:${f.satir} · ${f.uzunluk} ${t("satır", "lines")}</small></b><div class="row"><button class="btn sec" style="height:22px;font-size:11px" data-copy="${esc(f.ad)}">${t("Kopyala", "Copy")}</button><button class="btn" style="height:22px;font-size:11px" data-ins="${esc(f.ad)}">${t("Koda ekle", "Insert")}</button></div></div><pre data-code="${esc(f.ad)}" style="margin-top:6px">${esc(f.kod)}</pre></div>`).join("") || `<p class="hint">${t("Ayrıştırılabilir fonksiyon bulunamadı.", "No functions found.")}</p>`}</div>
                <p class="hint" style="font-size:11px">${t("Bu analiz yazarın izniyle gösteriliyor. Kod eklerken kaynak yorum satırı otomatik yazılır.", "Shown with the author's permission. Credit is added automatically when you insert code.")}</p></div>`;
            if (VS.monaco) el.querySelectorAll("pre[data-code]").forEach(pre => { const f = p.fonksiyonlar.find(x => x.ad === pre.dataset.code); VS.monaco.editor.colorize(f.kod, "javascript", { tabSize: 4 }).then(h => { pre.innerHTML = h; }); });
            el.onclick = e => {
                const a = e.target.closest("[data-a]"); if (a) { if (a.dataset.a === "remix") VS.remix(p.id); else { const u = "https://vemtriotr.vercel.app/topluluk#/p/" + p.id; VS.native ? VS.native.openExternal(u) : window.open("/topluluk#/p/" + p.id, "_blank"); } return; }
                const i = e.target.closest("[data-ins]"); if (i) return fonksiyonEkle(p.id, i.dataset.ins);
                const c = e.target.closest("[data-copy]"); if (c) { const f = p.fonksiyonlar.find(x => x.ad === c.dataset.copy); navigator.clipboard.writeText(kredi(p, "js") + "\n" + f.kod); VS.toast(t("Kopyalandı (kaynakla).", "Copied with credit."), "ok", 1800); }
            };
        }, { icon: "◆" });
    };
    // ---------- Kod Havuzu: "Topluluktan" bölümü ----------
    VS.poolTopluluk = (q) => {
        if (!INDEX) { VS.loadCommunityIndex().then(() => VS.currentView() === "pool" && VS.renderSide()); return `<div class="sb-sec"><h4>▾ ${t("TOPLULUKTAN", "FROM COMMUNITY")}</h4><p class="pad hint">…</p></div>`; }
        const ql = fold(q || "");
        const ps = INDEX.filter(p => !ql || fold(p.title + " " + p.author + " " + p.teknikler.map(x => x.ad).join(" ") + " " + p.fonksiyonlar.map(f => f.ad).join(" ")).includes(ql));
        if (!ps.length) return q ? "" : `<div class="sb-sec"><h4>▾ ${t("TOPLULUKTAN", "FROM COMMUNITY")}</h4><p class="pad hint">${t("Henüz analiz edilmiş topluluk projesi yok.", "No community projects analyzed yet.")}</p></div>`;
        return `<div class="sb-sec"><h4>▾ ${t("TOPLULUKTAN", "FROM COMMUNITY")} <small style="margin-left:auto;font-weight:400">${ps.length}</small></h4><p class="hint" style="font-size:11px;padding:2px 12px 6px">${AD} ${t("bu projelerin nasıl çalıştığını çıkardı.", "analyzed how these projects work.")}</p>${ps.map(p => `<div class="post" data-cai="${esc(p.id)}" style="cursor:pointer"><b>${esc(p.title)}</b><p>@${esc(p.author)} · ${esc(p.teknikler.slice(0, 3).map(x => x.ad).join(", "))}</p><div class="row"><button class="btn" style="height:22px;font-size:11px" data-cai="${esc(p.id)}">${t("İncele", "Explore")}</button><button class="btn sec" style="height:22px;font-size:11px" data-remix="${esc(p.id)}">Remix</button></div></div>`).join("")}</div>`;
    };
    VS.poolToplulukClick = e => {
        const r = e.target.closest("[data-remix]"); if (r) { e.stopPropagation(); VS.remix(r.dataset.remix); return true; }
        const c = e.target.closest("[data-cai]"); if (c) { VS.openCommunityProject(c.dataset.cai); return true; }
        return false;
    };

    // ---------- sohbet: konu dışı / matematik ----------
    const KOD = /\bkod|javascript|\bjs\b|html|css|math\.|fonksiyon|function|console|program|algoritma|dongu|degisken|oyun|vemtrio|editor|proje|hata|buton|canvas|topluluk/;
    function matematikMi(f) {
        if (/^[\s\d+\-*/x×÷^().,=%?]+$/.test(f) && /\d/.test(f) && /[+\-*/x×÷^%]/.test(f)) return true;
        return /kac eder|sonucu (kac|ne)|hesapla|toplami kac|carpimi|karekok|kare koku|turev|integral|denklem|logaritma|faktoriyel|yuzde kac|bolu|asal mi|cozer misin|cevre(si)? (kac|nedir)|alani (kac|nedir)|matematik/.test(f) && !/math\.|javascript|\bjs\b|kod|fonksiyon|console/.test(f);
    }
    function konuDisi(f) {
        if (KOD.test(f)) return false;
        return /hava durumu|haber|siyaset|secim|futbol|mac (sonucu|skoru)|tarif|yemek|baskent|kimdir|tarihte|savas|sarki sozu|siir|hikaye yaz|odev|cevir|ne demek|kac yasinda|burc|\bfal\b|saglik|ilac|doktor|para kazan|borsa|kripto|bitcoin|dolar|sevgili|film oner|dizi oner|nerede|ne zaman/.test(f);
    }
    // ---------- VEMTRIO Code bilgisi ----------
    const VC = [
        [/vemtrio code nedir|bu (editor|program|uygulama) ne|ne ise yarar/, "VEMTRIO Code, tarayıcıda (ve masaüstünde) çalışan VS Code tarzı bir kod editörü. Proje açar, kod yazar, canlı önizler ve yaptığını tek tıkla VEMTRIO topluluğunda paylaşırsın. Ben de içindeki yardımcıyım: hatalarını açıklar, topluluk projelerinden örnek gösteririm."],
        [/yeni proje|proje (ac|olustur|baslat)|nasil baslarim|nereden baslay/, "Yeni proje için Dosya → Yeni Proje (Ctrl+Alt+P). Boş bir index.html açılır; ! yazıp Enter'a basınca sayfa iskeleti gelir. Eski projelerin Dosya → Projelerim'de."],
        [/onizle|calistir|nasil gorurum|preview|sonucu gor/, "Canlı önizleme: Ctrl+Shift+V ya da F5. Kaydettikçe (Ctrl+S) kendiliğinden yenilenir. console.log çıktıları alttaki Çıktı panelinde \"Önizleme Konsolu\"nda görünür."],
        [/paylas|yayinla|topluluga (koy|gonder)/, "Paylaşmak için Ctrl+Alt+U ya da sol çubuktaki Topluluk simgesi → \"Bu çalışma alanını paylaş\". Dosyaların VEMTRIO Guard ile taranır; temizse toplulukta yayınlanır, index.html'in varsa herkes oynayabilir."],
        [/kod havuzu|hazir kod|kalip/, "Kod Havuzu (sol çubuk, Ctrl+Alt+K): HTML, CSS, JavaScript ve oyun için hazır kalıplar + \"Topluluktan\" bölümünde topluluk projelerinin analizleri. Ekle imlecin olduğu yere yazar, Dene hemen çalıştırır."],
        [/kisayol|tus kombinasyon|shortcut|komut paleti/, "En çok kullanılanlar: Ctrl+Shift+P komutlar · Ctrl+P dosya bul · Ctrl+S kaydet · Ctrl+/ yorum satırı · Alt+↑/↓ satır taşı · Ctrl+D aynı kelimeyi seç · Ctrl+Shift+V önizleme · Ctrl+` terminal. Tam liste: Ctrl+K Ctrl+S."],
        [/emmet|! (yaz|enter|tab)|iskelet/, "Boş bir .html dosyasında ! yazıp Enter (ya da Tab) → HTML iskeleti. Kısaltmalar da çalışır: ul>li*3, div.kart#ana, button.btn yazıp Tab."],
        [/tema|renk temasi|karanlik|aydinlik/, "Tema değiştirmek için Ctrl+K Ctrl+T. Eklentiler bölümünden (Ctrl+Shift+X) Open VSX'teki temaları da kurabilirsin."],
        [/eklenti|extension|open vsx/, "Eklentiler (Ctrl+Shift+X): Open VSX'ten tema, snippet ve dil desteği kurabilirsin. Kod çalıştıran eklentiler güvenlik için etkin olmaz."],
        [/\bmcp\b/, "MCP, yapay zekâya araç bağlama standardı. VEMTRIO Code'da MCP görünümünden sunucu ekleyip araçlarını çalıştırabilirsin; komutla çalışanlar (npx, uvx) masaüstü uygulamasında çalışır."],
        [/terminal|komut satiri/, "Terminal: Ctrl+`. Tarayıcıda mini kabuk var (ls, cat, node dosya.js…); masaüstü uygulamasında gerçek PowerShell/cmd/bash."],
        [/remix/, "Remix: topluluktaki bir projeyi kendi projen olarak açarsın. Kod Havuzu → Topluluktan → Remix ya da gönderi sayfasındaki REMIX butonu. Değiştirip kendi adınla paylaşabilirsin."],
        [/masaustu|indir|exe|windows/, "Masaüstü sürümü vemtriotr.vercel.app/indir sayfasından indirilir: gerçek terminal, diskteki klasörler ve stdio MCP sunucuları ekstra."],
        [/dosya (olustur|ekle|ac)|yeni dosya/, "Yeni dosya: Ctrl+N ya da Gezgin'deki + simgesi. Dosya adını uzantısıyla yaz (oyun.js, stil.css)."],
        [/kaydet|kayit(li)? mi|kaybolur mu/, "Otomatik kaydetme açık; Ctrl+S ile de kaydedebilirsin. Tarayıcı projeleri bu cihazda saklanır; kalıcı yedek için Topluluk → ZIP olarak indir."],
        [/sen kimsin|kimsin|adin ne|nesin/, `Ben ${AD}. VEMTRIO Code'un içindeki yardımcıyım: topluluktaki projelerin nasıl çalıştığını anlatır, örnek kod gösterir, kodundaki hataları açıklarım. Sitenin güvenliğine bakan Guard AI'dan ayrı bir yapay zekâyım.`],
    ];
    // ---------- topluluk soruları ----------
    function projeBul(f) { let en = null, puan = 0; for (const p of INDEX || []) { const w = fold(p.title).split(/\s+/).filter(x => x.length > 2); const s = w.filter(x => f.includes(x)).length / Math.max(1, w.length); if (s > puan) { puan = s; en = p; } } return puan >= 0.5 ? en : null; }
    function toplulukCevap(f) {
        if (!INDEX || !INDEX.length) return null;
        if (/topluluk(ta|taki)? (hangi|neler|ne var)|topluluk projeleri|topluluktaki (oyun|proje)|hangi (oyunlar|projeler) var/.test(f)) {
            const oyun = /oyun/.test(f); const ps = INDEX.filter(p => !oyun || p.cat === "game");
            return `Toplulukta incelediğim ${ps.length} ${oyun ? "oyun" : "proje"} var:\n` + ps.slice(0, 10).map(p => `• **${p.title}** (@${p.author}) — ${p.teknikler.slice(0, 3).map(x => x.ad.toLowerCase()).join(", ")}`).join("\n") + `\n\nBirinin nasıl çalıştığını sor, örneğin: "${ps[0].title} nasıl çalışıyor?"` + ps.slice(0, 3).map(p => ` [[cai:${p.id}]]`).join("");
        }
        const p = projeBul(f);
        if (p) {
            const ana = p.fonksiyonlar.find(x => /loop|dongu|update|guncelle|step|tick/i.test(x.ad)) || p.fonksiyonlar.sort((a, b) => b.uzunluk - a.uzunluk)[0];
            return `**${p.title} nasıl çalışıyor?**\n${p.ozet}` + (ana ? `\n\nKalbi olan fonksiyon **${ana.ad}()** (${ana.dosya}:${ana.satir}):\n\`\`\`\n${ana.kod.split("\n").slice(0, 18).join("\n")}\n\`\`\`` : "") + `\n[[cai:${p.id}]] [[remix:${p.id}]]` + (ana ? ` [[eklefn:${p.id}:${ana.ad}]]` : "");
        }
        const tek = TEK_SOZ.find(([, re]) => re.test(f));
        if (tek && /ornek|toplulukta|nasil|goster|kim yap|nerede kullan/.test(f)) {
            const re = TEK_RE[tek[0]]; const adaylar = [];
            for (const pp of INDEX) if (pp.teknikler.some(x => x.id === tek[0])) for (const fn of pp.fonksiyonlar) if (re && re.test(fn.kod)) adaylar.push([pp, fn]);
            if (!adaylar.length) return null;
            adaylar.sort((a, b) => a[1].uzunluk - b[1].uzunluk);
            const [pp, fn] = adaylar.find(([, x]) => x.uzunluk >= 3) || adaylar[0];
            const ad = (TEKNIK_AD[tek[0]] || tek[0]);
            return `Toplulukta **${ad}** için güzel bir örnek: **${pp.title}** (@${pp.author}) projesindeki **${fn.ad}()**:\n\`\`\`\n${fn.kod.split("\n").slice(0, 20).join("\n")}\n\`\`\`\nBu teknik ${adaylar.length > 1 ? `${new Set(adaylar.map(a => a[0].id)).size} projede` : "bu projede"} kullanılıyor. Eklersen kaynak yorum satırı otomatik yazılır. [[eklefn:${pp.id}:${fn.ad}]] [[cai:${pp.id}]]`;
        }
        return null;
    }
    const TEKNIK_AD = { carpisma: "çarpışma kontrolü", klavye: "klavye kontrolü", dongu: "oyun döngüsü", canvas: "canvas çizimi", skor: "skor sistemi", sdk: "VEMTRIO liderlik tablosu", kayit: "tarayıcıya kayıt", ses: "ses", rastgele: "rastgelelik", fizik: "basit fizik", fare: "fare/dokunma", zaman: "zamanlayıcı" };

    // ---------- ana cevap fonksiyonu (Kod Asistanı'nı sarar) ----------
    const eski = VS.assistAnswer;
    VS.assistAnswer = (soru) => {
        const f = fold(soru).replace(/[!?.,]+$/g, "").trim();
        if (!f) return "";
        if (matematikMi(f)) return `Ben ${AD}'yım ve matematik işlemleri için tasarlanmadım; o yüzden hesap yapmıyorum. Kod yazma, VEMTRIO Code ve topluluk projeleri konusunda yardımcı olabilirim.\n\nİpucu: Hesabı bilgisayara yaptırmak istersen bir .js dosyasına \`console.log(12 * 7)\` yazıp terminalde \`node dosya.js\` ile çalıştırabilirsin.`;
        if (konuDisi(f)) return `Bu konu benim alanımın dışında. Ben ${AD}'yım; sadece kodlama, VEMTRIO Code ve topluluk projeleri hakkında konuşurum.\n\nŞunları sorabilirsin:\n• "Toplulukta hangi projeler var?"\n• "Çarpışma kontrolü örneği göster"\n• "koddaki hata ne?"`;
        if (/^(selam|merhaba|sa|hey|naber|nasilsin|selamlar|slm|iyi gunler|gunaydin)\b/.test(f) && f.length < 30) return `Selam! Ben ${AD}. Topluluktaki projelerin nasıl çalıştığını anlatırım, oradan örnek kod gösteririm, kodundaki hataları açıklarım ve VEMTRIO Code'un kullanımını bilirim. Aşağıdaki hazır sorulardan birini seçebilir ya da kendin yazabilirsin.`;
        const tc = toplulukCevap(f); if (tc) return tc;
        for (const [re, cev] of VC) if (re.test(f)) return cev;
        const a = eski ? eski(soru) : null;
        if (a && !/^Bunu tam anlayamadım/.test(a)) return a;
        return `Bunu tam anlayamadım. Ben ${AD}'yım; kodlama, VEMTRIO Code ve topluluk projeleri hakkında yardımcı olurum. Şunları dene:\n• "Toplulukta hangi oyunlar var?"\n• "Klavye ile hareket örneği göster"\n• "koddaki hata ne?"\n• "Projemi nasıl paylaşırım?"`;
    };
    VS.assistChips = () => {
        const ilk = (INDEX || []).find(p => p.cat === "game") || (INDEX || [])[0];
        return [t("Toplulukta hangi projeler var?", "What projects are in the community?"), ...(ilk ? [ilk.title + t(" nasıl çalışıyor?", " — how does it work?")] : []), t("Çarpışma kontrolü örneği göster", "Show a collision example"), t("koddaki hata ne?", "what's wrong in my code?"), t("Önizleme nasıl açılır?", "How do I open preview?"), t("Projemi nasıl paylaşırım?", "How do I share my project?")];
    };
    VS.AI_NAME = AD;
})();
