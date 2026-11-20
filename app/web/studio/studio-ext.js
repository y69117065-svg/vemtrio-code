/* VEMTRIO Code — eklentiler: Open VSX'ten (VS Code eklenti pazarı) arama, kurma, kaldırma.
 * Çalışan katkılar: renk temaları, snippet'ler, dil tanımları (uzantı + yorum/parantez ayarları), ayar varsayılanları.
 * Kod çalıştıran eklentiler (extension host) tarayıcıda güvenli çalıştırılamadığı için etkinleştirilmez; açıkça belirtilir. */
(() => {
    const VS = window.VS, t = VS.t, esc = VS.esc, $ = VS.$;
    const API = "https://open-vsx.org/api";
    const DB = "extensions";                           // { id: {meta, contrib:{themes:[{label,base,data}], snippets:[{language,data}], languages:[...]}, enabled} }
    let installed = VS.store.get(DB, {});
    const save = () => VS.store.set(DB, installed);
    VS.installedExtensions = () => installed;
    VS.extraLangs = {};
    const disposers = {};
    const LANGMAP = { javascriptreact: "javascript", typescriptreact: "typescript", shellscript: "shell", "objective-c": "objective-c", jsonc: "json", vue: "html" };

    // ---- VS Code temasını Monaco'ya çevir ----
    const SCOPE = [["comment", "comment"], ["string.regexp", "regexp"], ["string", "string"], ["constant.numeric", "number"], ["constant.language", "keyword"], ["constant", "number"], ["keyword.operator", "operator"], ["keyword", "keyword"], ["storage.type", "keyword"], ["storage", "keyword"], ["entity.name.tag", "tag"], ["entity.other.attribute-name", "attribute.name"], ["entity.name.type", "type"], ["entity.name.class", "type"], ["support.type", "type"], ["support.class", "type"], ["entity.name.function", "identifier"], ["variable", "variable"], ["punctuation", "delimiter"], ["meta.tag", "tag"], ["markup.heading", "keyword"], ["invalid", "invalid"]];
    function convertTheme(json, uiTheme) {
        const base = uiTheme === "vs" ? "vs" : uiTheme === "hc-black" ? "hc-black" : uiTheme === "hc-light" ? "hc-light" : "vs-dark";
        const rules = [], seen = new Set();
        for (const tc of json.tokenColors || []) {
            const st = tc.settings || {}; if (!st.foreground && !st.fontStyle) continue;
            const scopes = [].concat(tc.scope || "").flatMap(s => String(s).split(",")).map(s => s.trim()).filter(Boolean);
            for (const sc of scopes) {
                const hit = SCOPE.find(([p]) => sc === p || sc.startsWith(p + ".")); if (!hit) continue;
                const key = hit[1] + "|" + (hit[0] === sc ? 0 : 1); if (seen.has(hit[1]) && hit[0] !== sc) continue; seen.add(hit[1]); seen.add(key);
                const r = { token: hit[1] }; if (st.foreground) r.foreground = st.foreground.replace("#", "").slice(0, 6); if (st.fontStyle) r.fontStyle = st.fontStyle; rules.push(r);
                if (hit[1] === "attribute.name") { const v = { ...r, token: "attribute.value" }; }
            }
        }
        // attribute.value = string rengi
        const str = rules.find(r => r.token === "string"); if (str) rules.push({ ...str, token: "attribute.value" });
        return { base, colors: json.colors || {}, rules };
    }
    async function readThemeJson(zip, path, depth = 0) {
        const f = zip.file(path); if (!f) throw new Error("missing " + path);
        const j = VS.parseJSONC(await f.async("string"));
        if (j.include && depth < 4) { const inc = await readThemeJson(zip, VS.join(VS.dirname(path), j.include).replace(/[^/]+\/\.\.\//g, ""), depth + 1); j.colors = { ...(inc.colors || {}), ...(j.colors || {}) }; j.tokenColors = [...(inc.tokenColors || []), ...(Array.isArray(j.tokenColors) ? j.tokenColors : [])]; }
        return j;
    }
    // ---- katkıları uygula / kaldır ----
    function activate(id) {
        const e = installed[id]; if (!e || !e.enabled || !VS.monaco) return;
        const monaco = VS.monaco, d = disposers[id] = [];
        for (const th of e.contrib.themes || []) { VS.themes[th.label] = { ...th.data, label: th.label, ext: e.meta.displayName || id }; }
        for (const lg of e.contrib.languages || []) {
            if (!lg.id) continue;
            if (!monaco.languages.getLanguages().some(l => l.id === lg.id)) monaco.languages.register({ id: lg.id, extensions: lg.extensions, aliases: lg.aliases });
            for (const x of lg.extensions || []) VS.extraLangs[x.replace(/^\./, "").toLowerCase()] = lg.id;
            if (lg.conf) { try { d.push(monaco.languages.setLanguageConfiguration(lg.id, lg.conf)); } catch (er) { } }
        }
        for (const sn of e.contrib.snippets || []) {
            const lang = LANGMAP[sn.language] || sn.language;
            const items = Object.entries(sn.data || {}).filter(([, v]) => v && v.prefix && v.body);
            d.push(monaco.languages.registerCompletionItemProvider(lang, {
                provideCompletionItems: (model, pos) => {
                    const w = model.getWordUntilPosition(pos); const range = { startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber, startColumn: w.startColumn, endColumn: w.endColumn };
                    return { suggestions: items.flatMap(([name, v]) => [].concat(v.prefix).map(p => ({ label: { label: p, description: name }, kind: monaco.languages.CompletionItemKind.Snippet, insertText: [].concat(v.body).join("\n"), insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: (v.description || "") + "\n— " + (e.meta.displayName || id), range }))) };
                },
            }));
        }
    }
    function deactivate(id) { (disposers[id] || []).forEach(x => { try { x.dispose(); } catch (e) { } }); delete disposers[id]; for (const [k, v] of Object.entries(VS.themes)) if (v.ext && installed[id] && v.ext === (installed[id].meta.displayName || id)) delete VS.themes[k]; }
    VS.on("monaco-ready", () => { Object.keys(installed).forEach(activate); VS.applyTheme(VS.settings["workbench.colorTheme"]); });

    // ---- kur ----
    async function install(id, version) {
        id = id.trim(); const [ns, name] = id.split(".");
        if (!ns || !name) return VS.toast(t("Eklenti kimliği yayıncı.ad biçiminde olmalı", "Extension id must be publisher.name"), "err");
        const L = t("Eklentiler", "Extensions");
        VS.log(L, `${t("Kuruluyor", "Installing")} ${id}…`);
        const tt = VS.toast(`⏳ ${id} ${t("indiriliyor…", "downloading…")}`, "", 0);
        try {
            const meta = await (await fetch(`${API}/${ns}/${name}${version ? "/" + version : ""}`)).json();
            if (meta.error) throw new Error(meta.error);
            const buf = await (await fetch(meta.files.download)).arrayBuffer();
            VS.log(L, `${id}: ${VS.kb(buf.byteLength)} ${t("indirildi", "downloaded")}`);
            const zip = await JSZip.loadAsync(buf);
            const pkg = VS.parseJSONC(await zip.file("extension/package.json").async("string"));
            const c = pkg.contributes || {}, contrib = { themes: [], snippets: [], languages: [] }, unsupported = [];
            // yerelleştirme (%anahtar%)
            let nls = {}; try { const nf = zip.file("extension/package.nls.json"); if (nf) nls = VS.parseJSONC(await nf.async("string")); } catch (e) { }
            const L10 = s => typeof s === "string" ? s.replace(/^%(.+)%$/, (m, k) => nls[k] || m) : s;
            for (const th of c.themes || []) { try { const j = await readThemeJson(zip, VS.join("extension", th.path.replace(/^\.\//, ""))); contrib.themes.push({ label: L10(th.label) || th.id || j.name, data: convertTheme(j, th.uiTheme) }); } catch (e) { VS.log(L, `${id}: ${t("tema okunamadı", "theme failed")} ${th.path}: ${e.message}`, "w"); } }
            for (const sn of c.snippets || []) { try { contrib.snippets.push({ language: sn.language, data: VS.parseJSONC(await zip.file(VS.join("extension", sn.path.replace(/^\.\//, ""))).async("string")) }); } catch (e) { VS.log(L, `${id}: snippet ${sn.path}: ${e.message}`, "w"); } }
            for (const lg of c.languages || []) {
                const o = { id: lg.id, extensions: lg.extensions, aliases: lg.aliases };
                if (lg.configuration) { try { const cf = VS.parseJSONC(await zip.file(VS.join("extension", lg.configuration.replace(/^\.\//, ""))).async("string")); o.conf = { comments: cf.comments, brackets: cf.brackets, autoClosingPairs: (cf.autoClosingPairs || []).map(p => Array.isArray(p) ? { open: p[0], close: p[1] } : p), surroundingPairs: (cf.surroundingPairs || []).map(p => Array.isArray(p) ? { open: p[0], close: p[1] } : p) }; } catch (e) { } }
                contrib.languages.push(o);
            }
            if (pkg.main || pkg.browser) unsupported.push(t("kod (extension host)", "code (extension host)"));
            for (const k of ["grammars", "iconThemes", "commands", "debuggers", "views", "keybindings"]) if (c[k]) unsupported.push(k);
            const icon = meta.files.icon || "";
            installed[id] = { meta: { id, displayName: L10(pkg.displayName) || meta.displayName || name, version: meta.version, description: L10(pkg.description) || meta.description, icon, publisher: ns }, contrib, unsupported, enabled: true, at: Date.now() };
            deactivate(id); if (!save()) { delete installed[id]; throw new Error(t("depolama dolu", "storage full")); }
            activate(id);
            tt.remove();
            const got = [contrib.themes.length && contrib.themes.length + t(" tema", " theme(s)"), contrib.snippets.length && contrib.snippets.length + " snippet", contrib.languages.length && contrib.languages.length + t(" dil", " language(s)")].filter(Boolean).join(", ");
            VS.log(L, `✓ ${id} ${meta.version} — ${got || t("uygulanabilir katkı yok", "no applicable contributions")}${unsupported.length ? " · " + t("desteklenmeyen: ", "unsupported: ") + unsupported.join(", ") : ""}`, "o");
            if (contrib.themes.length) VS.toast(`✓ ${installed[id].meta.displayName} ${t("kuruldu.", "installed.")}`, "ok", 9000, [{ label: t("Temayı uygula", "Set Color Theme"), run: () => VS.setSetting("workbench.colorTheme", contrib.themes[0].label) }, { label: t("Tüm temalar", "All themes"), sec: true, run: () => VS.run("workbench.action.selectTheme") }]);
            else VS.toast(`✓ ${installed[id].meta.displayName} ${t("kuruldu", "installed")}${got ? " (" + got + ")" : ""}.${!got && unsupported.length ? " " + t("Bu eklenti kod çalıştırıyor; VEMTRIO Code'da şimdilik etkin olamaz.", "This extension runs code; it can't be active in VEMTRIO Code yet.") : ""}`, got ? "ok" : "warn", 7000);
            VS.renderActivity(); if (VS.currentView() === "extensions") VS.renderSide();
            const tab = VS.activeTab(); if (tab && tab.path === "ext:" + id) VS.openExtension(id);
        } catch (e) { tt.remove(); VS.log(L, `✗ ${id}: ${e.message}`, "e"); VS.toast(`${id}: ${e.message}`, "err"); }
    }
    VS.installExtension = install;
    function uninstall(id) { deactivate(id); const th = VS.themes[VS.settings["workbench.colorTheme"]]; delete installed[id]; save(); if (!th || th.ext) VS.applyTheme(VS.settings["workbench.colorTheme"]); VS.toast(`${id} ${t("kaldırıldı.", "uninstalled.")}`); VS.renderActivity(); if (VS.currentView() === "extensions") VS.renderSide(); }
    function toggle(id) { const e = installed[id]; e.enabled = !e.enabled; save(); e.enabled ? activate(id) : deactivate(id); VS.applyTheme(VS.settings["workbench.colorTheme"]); VS.renderSide(); }

    // ---- görünüm ----
    let q = "", results = null, searching = 0;
    async function search(query) {
        const my = ++searching;
        const url = `${API}/-/search?size=40&sortBy=${query ? "relevance" : "downloadCount"}&sortOrder=desc&query=${encodeURIComponent(query)}${query.startsWith("@category:") ? "" : ""}`;
        try { const j = await (await fetch(url)).json(); if (my === searching) { results = j.extensions || []; draw(); } }
        catch (e) { if (my === searching) { results = []; VS.toast("Open VSX: " + e.message, "err"); draw(); } }
    }
    function card(x, inst) {
        const id = inst ? x.meta.id : x.namespace + "." + x.name; const m = inst ? x.meta : x;
        const icon = inst ? m.icon : x.files && x.files.icon;
        return `<div class="ext" data-id="${esc(id)}">${icon ? `<img src="${esc(icon)}" alt="" loading="lazy">` : `<div class="noimg"></div>`}<div class="b"><b>${esc(m.displayName || x.name)}</b><p>${esc(m.description || "")}</p><small>${esc(inst ? m.publisher : x.namespace)}${!inst && x.downloadCount ? ` · ⬇ ${x.downloadCount > 1e6 ? (x.downloadCount / 1e6).toFixed(1) + "M" : x.downloadCount > 1e3 ? Math.round(x.downloadCount / 1e3) + "K" : x.downloadCount}` : ""}${installed[id] ? ` <span class="tag">${installed[id].enabled ? t("KURULU", "INSTALLED") : t("KAPALI", "DISABLED")}</span>` : ` <button class="btn" style="height:18px;padding:0 6px;font-size:10px;margin-left:auto" data-inst="${esc(id)}">${t("Kur", "Install")}</button>`}</small></div></div>`;
    }
    function draw() {
        const el = $("#ext-res"); if (!el) return;
        const inst = Object.values(installed);
        el.innerHTML = (q ? "" : `<div class="sb-sec"><h4>▾ ${t("KURULU", "INSTALLED")} <small style="margin-left:auto;font-weight:400">${inst.length}</small></h4>${inst.map(x => card(x, true)).join("") || `<p class="pad hint">${t("Henüz eklenti yok.", "No extensions yet.")}</p>`}</div>`)
            + `<div class="sb-sec"><h4>▾ ${q ? t("SONUÇLAR", "RESULTS") : t("POPÜLER · OPEN VSX", "POPULAR · OPEN VSX")}</h4>${results === null ? `<p class="pad hint">…</p>` : results.map(x => card(x)).join("") || `<p class="pad hint">${t("Sonuç yok.", "No results.")}</p>`}</div>`;
    }
    VS.viewDefs = VS.viewDefs || [];
    VS.viewDefs.push({ id: "extensions", title: () => t("EKLENTİLER", "EXTENSIONS"), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7.5" height="7.5" rx="1"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1"/><rect x="14.5" y="2" width="7" height="7" rx="1" transform="rotate(12 18 5.5)"/></svg>', order: 3, key: "ctrl+shift+x", badge: () => Object.keys(installed).length || "",
        render(body, actions) {
            actions.innerHTML = `<button title="${t("VSIX dosyasından kur…", "Install from VSIX…")}" data-a="vsix">⋯</button>`;
            actions.onclick = () => VS.run("ext.installVsix");
            body.innerHTML = `<div class="pad col"><input id="ext-q" placeholder="${t("Open VSX'te ara (ör. dracula, snippets, theme)", "Search Open VSX (e.g. dracula, snippets, theme)")}" value="${esc(q)}"><div class="row"><button class="btn sec" style="height:22px;font-size:11px" data-s="theme">${t("Temalar", "Themes")}</button><button class="btn sec" style="height:22px;font-size:11px" data-s="snippets">Snippets</button><button class="btn sec" style="height:22px;font-size:11px" data-s="icon">${t("Diller", "Languages")}</button></div><p class="hint" style="font-size:11px">${t("Temalar, snippet'ler ve dil ayarları çalışır. Kod çalıştıran eklentiler kurulur ama etkin olmaz.", "Themes, snippets and language configs work. Code-running extensions install but stay inactive.")}</p></div><div id="ext-res"></div>`;
            const inp = $("#ext-q"); setTimeout(() => inp.focus(), 0);
            const go = VS.debounce(() => { q = inp.value.trim(); results = null; draw(); search(q); }, 350);
            inp.oninput = go;
            body.onclick = e => {
                const s = e.target.closest("[data-s]"); if (s) { inp.value = { theme: "theme", snippets: "snippets", icon: "language support" }[s.dataset.s]; return go(); }
                const ib = e.target.closest("[data-inst]"); if (ib) { e.stopPropagation(); ib.disabled = true; ib.textContent = "…"; return install(ib.dataset.inst); }
                const c = e.target.closest(".ext"); if (c) VS.openExtension(c.dataset.id);
            };
            draw(); if (results === null) search(q);
        } });

    // ---- eklenti sayfası ----
    VS.openExtension = (id) => VS.openCustom("ext:" + id, (installed[id] ? installed[id].meta.displayName : id), async el => {
        const [ns, name] = id.split(".");
        el.innerHTML = `<div class="extpage hint">…</div>`;
        let meta = {}; try { meta = await (await fetch(`${API}/${ns}/${name}`)).json(); } catch (e) { }
        const inst = installed[id];
        const readme = meta.files && meta.files.readme ? await fetch(meta.files.readme).then(r => r.ok ? r.text() : "").catch(() => "") : "";
        el.innerHTML = `<div class="extpage"><div class="hd">${(meta.files && meta.files.icon) || (inst && inst.meta.icon) ? `<img src="${esc((meta.files && meta.files.icon) || inst.meta.icon)}" alt="">` : ""}<div style="flex:1;min-width:0"><h1>${esc(meta.displayName || (inst && inst.meta.displayName) || id)}</h1>
            <div class="meta"><span>${esc(meta.namespaceDisplayName || ns)}</span><span>v${esc(meta.version || (inst && inst.meta.version) || "")}</span>${meta.downloadCount ? `<span>⬇ ${meta.downloadCount.toLocaleString()}</span>` : ""}${meta.averageRating ? `<span>★ ${meta.averageRating.toFixed(1)}</span>` : ""}${meta.license ? `<span>${esc(meta.license)}</span>` : ""}</div>
            <p>${esc(meta.description || (inst && inst.meta.description) || "")}</p>
            <div class="row" style="margin-top:12px">${inst ? `<button class="btn sec" data-a="toggle">${inst.enabled ? t("Devre Dışı Bırak", "Disable") : t("Etkinleştir", "Enable")}</button><button class="btn danger" data-a="un">${t("Kaldır", "Uninstall")}</button>${inst.contrib.themes.length ? `<button class="btn" data-a="theme">${t("Renk Temasını Ayarla", "Set Color Theme")}</button>` : ""}` : `<button class="btn" data-a="in">${t("Kur", "Install")}</button>`}<code class="hint" style="margin-left:8px">${esc(id)}</code></div>
            ${inst ? `<div class="contrib">${inst.contrib.themes.map(x => `<span class="ok">🎨 ${esc(x.label)}</span>`).join("")}${inst.contrib.snippets.map(x => `<span class="ok">✂ ${esc(x.language)}</span>`).join("")}${inst.contrib.languages.map(x => `<span class="ok">{ } ${esc(x.id)}</span>`).join("")}${(inst.unsupported || []).map(x => `<span title="${t("desteklenmiyor", "unsupported")}">✕ ${esc(x)}</span>`).join("")}</div>` : ""}
            </div></div><div class="readme" id="ext-readme"></div></div>`;
        $("#ext-readme").innerHTML = mdToHtml(readme);
        el.onclick = e => { const a = e.target.closest("[data-a]"); if (!a) return; ({ in: () => { a.disabled = true; a.textContent = "…"; install(id); }, un: () => { uninstall(id); VS.openExtension(id); }, toggle: () => { toggle(id); VS.openExtension(id); }, theme: () => VS.setSetting("workbench.colorTheme", inst.contrib.themes[0].label) })[a.dataset.a](); };
    }, { icon: "🧩" });
    // Basit, güvenli markdown → HTML (README için; ham HTML kaçırılır)
    function mdToHtml(md) {
        if (!md) return `<p class="hint">README yok.</p>`;
        const blocks = []; md = md.replace(/```[^\n]*\n([\s\S]*?)```/g, (m, c) => { blocks.push(`<pre>${esc(c)}</pre>`); return `\u0000${blocks.length - 1}\u0000`; });
        let h = esc(md)
            .replace(/^###### (.*)$/gm, "<h6>$1</h6>").replace(/^##### (.*)$/gm, "<h5>$1</h5>").replace(/^#### (.*)$/gm, "<h4>$1</h4>").replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^# (.*)$/gm, "<h1>$1</h1>")
            .replace(/!\[([^\]]*)\]\((https:[^)\s]+)[^)]*\)/g, '<img alt="$1" src="$2" loading="lazy">')
            .replace(/\[([^\]]+)\]\((https?:[^)\s]+)[^)]*\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>")
            .replace(/\n{2,}/g, "<br><br>");
        return h.replace(/\u0000(\d+)\u0000/g, (m, i) => blocks[+i]);
    }

    VS.cmd("ext.install", () => t("Eklenti Kur (kimlikle)…", "Install Extension by Id…"), async () => { const id = await VS.prompt(t("Eklenti kimliği (yayıncı.ad)", "Extension id (publisher.name)"), "", "dracula-theme.theme-dracula"); if (id) install(id); }, null, "Extensions");
    VS.cmd("ext.installVsix", () => t("VSIX Dosyasından Kur…", "Install from VSIX…"), () => {
        const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".vsix";
        inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const url = URL.createObjectURL(f); const zip = await JSZip.loadAsync(await f.arrayBuffer()); const pkg = VS.parseJSONC(await zip.file("extension/package.json").async("string")); URL.revokeObjectURL(url);
            // VSIX'i yerel olarak işlemek için kurulum akışını taklit et
            const id = (pkg.publisher || "local") + "." + pkg.name; const origFetch = window.fetch; let first = true;
            window.fetch = async (u, o) => { if (String(u).startsWith(API + "/" + id.split(".")[0])) return new Response(JSON.stringify({ version: pkg.version, displayName: pkg.displayName, description: pkg.description, files: { download: "vsix:local" } })); if (u === "vsix:local" && first) { first = false; return new Response(await f.arrayBuffer()); } return origFetch(u, o); };
            try { await install(id); } finally { window.fetch = origFetch; } };
        inp.click();
    }, null, "Extensions");
    VS.cmd("ext.showInstalled", () => t("Kurulu Eklentileri Göster", "Show Installed Extensions"), () => { q = ""; VS.showView("extensions"); }, null, "Extensions");
})();
