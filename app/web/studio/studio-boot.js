/* VEMTRIO Code — çalışma alanı: editör, gezgin, sekmeler, arama, panel/terminal, önizleme, ayarlar, temalar, topluluk. */
(() => {
    const VS = window.VS, N = VS.native, t = VS.t, esc = VS.esc, $ = VS.$;
    let monaco = null, editor = null;

    // ================= ayarlar =================
    const DEFAULTS = {
        "workbench.colorTheme": "VEMTRIO Dark",
        "workbench.startupEditor": "welcome",
        "editor.fontSize": 14,
        "editor.fontFamily": "'JetBrains Mono', Consolas, 'Courier New', monospace",
        "editor.fontLigatures": true,
        "editor.tabSize": 4,
        "editor.insertSpaces": true,
        "editor.wordWrap": "off",
        "editor.minimap.enabled": true,
        "editor.lineNumbers": "on",
        "editor.cursorBlinking": "smooth",
        "editor.cursorSmoothCaretAnimation": "on",
        "editor.smoothScrolling": true,
        "editor.renderWhitespace": "selection",
        "editor.bracketPairColorization.enabled": true,
        "editor.guides.bracketPairs": true,
        "editor.stickyScroll.enabled": true,
        "editor.formatOnSave": false,
        "editor.linkedEditing": true,
        "files.autoSave": "afterDelay",
        "files.autoSaveDelay": 1000,
        "emmet.enabled": true,
        "preview.autoRefresh": true,
        "terminal.shell": "powershell",
        "ai.model": "claude-opus-5-5",
        "ai.effort": "medium",
        "ai.confirmTools": true,
    };
    const SETTINGS_TEMPLATE = () => `// VEMTRIO Code ${t("kullanıcı ayarları", "user settings")} — VS Code ${t("ile aynı biçim", "compatible format")}.
// ${t("Kaydettiğin anda uygulanır (Ctrl+S).", "Applied as soon as you save (Ctrl+S).")}
{
    "workbench.colorTheme": "VEMTRIO Dark",
    "editor.fontSize": 14,
    "editor.tabSize": 4,
    "editor.wordWrap": "off",
    "editor.minimap.enabled": true,
    "files.autoSave": "afterDelay",
    "emmet.enabled": true
}
`;
    const KEYS_TEMPLATE = () => `// ${t("Kendi kısayolların. Varsayılanı kaldırmak için komutun başına - koy.", "Your keybindings. Prefix a command with - to remove a default.")}
// ${t("Akor (iki adımlı) kısayollar da desteklenir", "Chords are supported too")}: "ctrl+k ctrl+t"
// ${t("Tüm komut kimliklerini görmek için", "To list all command ids")}: Ctrl+K Ctrl+S
[
    // { "key": "ctrl+alt+p", "command": "workbench.action.showCommands" },
    // { "key": "ctrl+shift+v", "command": "-preview.toggle" }
]
`;
    VS.userText = { "settings.json": VS.store.get("settingsText", null) || SETTINGS_TEMPLATE(), "keybindings.json": VS.store.get("keysText", null) || KEYS_TEMPLATE() };
    VS.settings = { ...DEFAULTS };
    function loadSettings() {
        try { VS.settings = { ...DEFAULTS, ...VS.parseJSONC(VS.userText["settings.json"]) }; } catch (e) { VS.toast("settings.json: " + e.message, "err"); }
        try { VS.userKeys = VS.parseJSONC(VS.userText["keybindings.json"]) || []; } catch (e) { VS.toast("keybindings.json: " + e.message, "err"); }
    }
    loadSettings();
    VS.setSetting = (key, value) => {
        let txt = VS.userText["settings.json"];
        const re = new RegExp(`("${key.replace(/\./g, "\\.")}"\\s*:\\s*)([^,\\n}]+|"[^"]*")`);
        const val = JSON.stringify(value);
        if (re.test(txt)) txt = txt.replace(re, `$1${val}`);
        else txt = txt.replace(/\{(\s*)/, (m, sp) => `{${sp}"${key}": ${val},${sp.includes("\n") ? sp : "\n    "}`).replace(/,(\s*)\}/, "$1}");
        VS.userText["settings.json"] = txt; VS.store.set("settingsText", txt);
        const m = monaco && monaco.editor.getModel(monaco.Uri.parse("vcode-user:/settings.json")); if (m && m.getValue() !== txt) { m.setValue(txt); markSaved(tabByPath("user:settings.json")); }
        loadSettings(); applySettings();
    };

    // ================= temalar =================
    VS.themes = {
        "VEMTRIO Dark": { base: "vs-dark", label: "VEMTRIO Dark", colors: { "editor.background": "#0c0d10", "editor.foreground": "#d4d7dc", "editor.lineHighlightBackground": "#ffffff06", "editor.selectionBackground": "#86b2dc38", "editorCursor.foreground": "#86b2dc", "editorLineNumber.foreground": "#3b4048", "editorLineNumber.activeForeground": "#aeb3ba", "editorIndentGuide.background1": "#1d2026", "editorWidget.background": "#101216", "editorSuggestWidget.background": "#101216", "sideBar.background": "#08090b", "activityBar.background": "#060708", "panel.background": "#08090b", "titleBar.activeBackground": "#060708", "statusBar.background": "#060708", "statusBar.foreground": "#a9aeb6", "tab.inactiveBackground": "#08090b", "tab.activeBackground": "#0c0d10", "editorGroup.border": "#1a1d22", "focusBorder": "#86b2dc", "button.background": "#86b2dc", "button.foreground": "#0b0d10", "minimap.background": "#0a0b0d", "input.background": "#060708" },
            rules: [{ token: "comment", foreground: "6b717a", fontStyle: "italic" }, { token: "keyword", foreground: "c8a865" }, { token: "string", foreground: "8fe3a0" }, { token: "number", foreground: "df93a3" }, { token: "type", foreground: "86b2dc" }, { token: "tag", foreground: "86b2dc" }, { token: "attribute.name", foreground: "c8a865" }, { token: "attribute.value", foreground: "8fe3a0" }, { token: "delimiter", foreground: "9aa0a8" }, { token: "regexp", foreground: "e0a060" }] },
        "Dark Modern": { base: "vs-dark", label: "Dark Modern", colors: { "editor.background": "#1f1f1f", "sideBar.background": "#181818", "activityBar.background": "#181818", "panel.background": "#181818", "titleBar.activeBackground": "#181818", "statusBar.background": "#181818", "statusBar.foreground": "#cccccc", "tab.inactiveBackground": "#181818", "tab.activeBackground": "#1f1f1f", "focusBorder": "#0078d4", "button.background": "#0078d4", "button.foreground": "#ffffff", "editorGroup.border": "#2b2b2b", "activityBarBadge.background": "#0078d4" }, rules: [] },
        "Light Modern": { base: "vs", label: "Light Modern", colors: { "editor.background": "#ffffff", "editor.foreground": "#3b3b3b", "foreground": "#3b3b3b", "descriptionForeground": "#717171", "sideBar.background": "#f8f8f8", "activityBar.background": "#f8f8f8", "panel.background": "#f8f8f8", "titleBar.activeBackground": "#f8f8f8", "statusBar.background": "#f8f8f8", "statusBar.foreground": "#3b3b3b", "tab.inactiveBackground": "#f8f8f8", "tab.activeBackground": "#ffffff", "tab.inactiveForeground": "#868686", "tab.activeForeground": "#3b3b3b", "focusBorder": "#005fb8", "button.background": "#005fb8", "button.foreground": "#ffffff", "editorGroup.border": "#e5e5e5", "input.background": "#ffffff", "input.border": "#cecece", "list.hoverBackground": "#0000000a", "list.activeSelectionBackground": "#005fb822", "activityBarBadge.background": "#005fb8" }, rules: [] },
        "High Contrast": { base: "hc-black", label: "High Contrast", colors: { "editor.background": "#000000", "sideBar.background": "#000000", "activityBar.background": "#000000", "panel.background": "#000000", "titleBar.activeBackground": "#000000", "statusBar.background": "#000000", "tab.inactiveBackground": "#000000", "tab.activeBackground": "#000000", "editorGroup.border": "#6fc3df", "focusBorder": "#f38518", "button.background": "#f38518", "button.foreground": "#000000" }, rules: [] },
    };
    const CSSMAP = { "editor.background": "--editor", "sideBar.background": "--side", "activityBar.background": "--act", "panel.background": "--panel", "titleBar.activeBackground": "--title", "statusBar.background": "--status", "statusBar.foreground": "--status-fg", "tab.inactiveBackground": "--tab", "tab.activeBackground": "--tab-act", "tab.inactiveForeground": "--tab-fg", "tab.activeForeground": "--tab-act-fg", "editorGroup.border": "--border", "foreground": "--fg", "descriptionForeground": "--muted", "list.activeSelectionBackground": "--sel", "list.hoverBackground": "--hover", "focusBorder": "--accent", "button.foreground": "--accent-fg", "input.background": "--input", "input.border": "--input-border", "activityBarBadge.background": "--badge" };
    VS.applyTheme = (name) => {
        const th = VS.themes[name] || VS.themes["VEMTRIO Dark"];
        const root = document.documentElement.style;
        Object.values(CSSMAP).forEach(v => root.removeProperty(v));
        root.removeProperty("--bg");
        const light = th.base === "vs";
        if (light) { root.setProperty("--fg", "#3b3b3b"); root.setProperty("--muted", "#717171"); root.setProperty("--border", "#e5e5e5"); root.setProperty("--hover", "rgba(0,0,0,.05)"); root.setProperty("--input", "#fff"); root.setProperty("--input-border", "#cecece"); root.setProperty("--sel", "rgba(0,95,184,.12)"); }
        const c = th.colors || {};
        const pick = (...ks) => ks.map(k => c[k]).find(Boolean);
        const extra = { "--border": pick("editorGroup.border", "panel.border", "sideBar.border", "contrastBorder"), "--fg": pick("foreground", "editor.foreground", "sideBar.foreground"), "--accent": pick("focusBorder", "button.background", "activityBarBadge.background"), "--accent-fg": pick("button.foreground"), "--sel": pick("list.activeSelectionBackground", "editor.selectionBackground"), "--tab-act-fg": pick("tab.activeForeground", "editor.foreground"), "--side": pick("sideBar.background", "editor.background"), "--act": pick("activityBar.background", "sideBar.background", "editor.background"), "--panel": pick("panel.background", "sideBar.background", "editor.background"), "--title": pick("titleBar.activeBackground", "activityBar.background", "sideBar.background"), "--status": pick("statusBar.background", "activityBar.background"), "--status-fg": pick("statusBar.foreground", "foreground"), "--tab": pick("tab.inactiveBackground", "editorGroupHeader.tabsBackground", "sideBar.background"), "--tab-act": pick("tab.activeBackground", "editor.background"), "--input": pick("input.background"), "--bg": pick("editor.background") };
        for (const [k, v] of Object.entries(CSSMAP)) if (c[k]) root.setProperty(v, c[k]);
        for (const [v, val] of Object.entries(extra)) if (val) root.setProperty(v, val);
        if (monaco) {
            const id = "vt-" + name.replace(/[^a-z0-9]/gi, "").toLowerCase();
            const colors = {}; for (const [k, v] of Object.entries(c)) if (/^#[0-9a-f]{3,8}$/i.test(v)) colors[k] = v.length === 4 ? "#" + [...v.slice(1)].map(x => x + x).join("") : v;
            try { monaco.editor.defineTheme(id, { base: th.base || "vs-dark", inherit: true, rules: th.rules || [], colors }); monaco.editor.setTheme(id); }
            catch (e) { console.warn(e); monaco.editor.defineTheme(id, { base: th.base || "vs-dark", inherit: true, rules: th.rules || [], colors: {} }); monaco.editor.setTheme(id); }
        }
        const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue("--title").trim() || "#111316";
        if (N && N.win) N.win.titleColors(getComputedStyle(document.documentElement).getPropertyValue("--title").trim(), getComputedStyle(document.documentElement).getPropertyValue("--fg").trim());
        VS.emit("theme", name);
    };

    // ================= çalışma alanı =================
    VS.ws = null;
    VS.openWorkspace = async (fs, opts = {}) => {
        if (VS.tabs && VS.tabs.some(x => x.dirty) && !opts.force && !(await VS.confirm(t("Kaydedilmemiş değişiklikler var. Yine de çalışma alanı değiştirilsin mi?", "There are unsaved changes. Switch workspace anyway?")))) return;
        closeAllTabs(true);
        VS.ws = { fs, files: [], dirs: [], name: fs.name, expanded: new Set(VS.store.get("exp:" + fs.name, [])) };
        await refreshTree();
        if (fs.kind === "native") { const r = VS.store.get("recentFolders", []).filter(x => x !== fs.root); VS.store.set("recentFolders", [fs.root, ...r].slice(0, 10)); VS.store.set("lastWs", { kind: "native", root: fs.root }); }
        else if (fs.kind === "mem") VS.store.set("lastWs", { kind: "mem", key: fs.key.slice(4) });
        $("#tb-title").textContent = fs.name + " — VEMTRIO Code";
        document.title = fs.name + " — VEMTRIO Code";
        showView("explorer");
        if (!opts.quiet) { const idx = VS.ws.files.find(f => /^index\.html?$/i.test(f)) || VS.ws.files.find(f => /^readme\.md$/i.test(f)); if (idx) VS.openFile(idx); }
        VS.emit("workspace", VS.ws); renderStatus();
    };
    async function refreshTree() {
        if (!VS.ws) return renderExplorer();
        try { const r = await VS.ws.fs.list(); VS.ws.files = r.files; VS.ws.dirs = r.dirs; }
        catch (e) { VS.toast(t("Klasör okunamadı: ", "Could not read folder: ") + e.message, "err"); }
        renderExplorer();
    }
    VS.refreshTree = refreshTree;
    VS.openFolder = async () => {
        if (N) { const root = await N.fs.pick(); if (root) VS.openWorkspace(new VS.NativeFS(root)); return; }
        if (window.showDirectoryPicker) { try { const h = await window.showDirectoryPicker({ mode: "readwrite" }); VS.openWorkspace(new VS.DirFS(h)); } catch (e) { if (e.name !== "AbortError") VS.toast(e.message, "err"); } return; }
        VS.toast(t("Bu tarayıcı yerel klasör açmayı desteklemiyor (Chrome/Edge kullan). Tarayıcı çalışma alanı açılıyor.", "This browser can't open local folders (use Chrome/Edge). Opening the browser workspace."), "warn");
        VS.openWorkspace(new VS.MemFS("default"));
    };

    // ================= sekmeler ve editör =================
    VS.tabs = []; let active = null;
    const tabByPath = p => VS.tabs.find(x => x.path === p);
    const isUser = p => p.startsWith("user:");
    const uriOf = p => isUser(p) ? monaco.Uri.parse("vcode-user:/" + p.slice(5)) : monaco.Uri.parse("file:///" + p.split("/").map(encodeURIComponent).join("/"));
    VS.openFile = async (path, opts = {}) => {
        if (!monaco) { VS.once("monaco-ready", () => VS.openFile(path, opts)); return; }
        let tab = tabByPath(path);
        if (!tab) {
            if (!isUser(path) && VS.isBinaryName(path)) {
                // Resim: içerik data: adresi olarak okunur (masaüstünde file:// adresleri sayfada engellendiği için resim boş çıkıyordu)
                if (/\.(png|jpe?g|gif|webp|svg|ico|bmp)$/i.test(path) && VS.ws.fs.dataUrl) return VS.openCustom("img:" + path, VS.basename(path), async el => {
                    el.innerHTML = `<div style="display:grid;place-items:center;height:100%;color:var(--muted)">…</div>`;
                    let src = null; try { src = await VS.ws.fs.dataUrl(path); } catch (e) { }
                    if (!src && N && N.fs.fileUrl) src = N.fs.fileUrl(VS.ws.fs.root, path);
                    el.innerHTML = src ? `<div style="display:grid;place-items:center;height:100%;background:repeating-conic-gradient(#ffffff08 0 25%,transparent 0 50%) 0 0/16px 16px"><img style="max-width:90%;max-height:90%;image-rendering:auto" src="${esc(src)}" alt=""></div>`
                        : `<div style="display:grid;place-items:center;height:100%;color:var(--muted)">${t("Bu resim bu çalışma alanında görüntülenemiyor.", "This image can't be shown in this workspace.")}</div>`;
                });
                VS.toast(t("İkili dosyalar düzenlenemez.", "Binary files can't be edited."), "warn"); return;
            }
            let text;
            try { text = isUser(path) ? (path === "user:mcp.json" ? VS.mcpText() : VS.userText[path.slice(5)]) : await VS.ws.fs.read(path); }
            catch (e) { VS.toast(t("Açılamadı: ", "Could not open: ") + e.message, "err"); return; }
            let model = monaco.editor.getModel(uriOf(path));
            if (model) model.setValue(text); else model = monaco.editor.createModel(text, isUser(path) ? "json" : VS.langOf(path), uriOf(path));
            if (isUser(path)) monaco.editor.setModelLanguage(model, "json");
            const prev = VS.tabs.find(x => x.preview && !x.dirty);
            tab = { path, kind: "file", title: isUser(path) ? path.slice(5) : VS.basename(path), model, saved: model.getAlternativeVersionId(), dirty: false, preview: !!opts.preview, view: null };
            model.onDidChangeContent(() => { const d = model.getAlternativeVersionId() !== tab.saved; if (d !== tab.dirty) { tab.dirty = d; if (d) tab.preview = false; renderTabs(); renderExplorer(); } if (d) autoSave(tab); VS.emit("change", tab); });
            if (prev && opts.preview) { const i = VS.tabs.indexOf(prev); VS.tabs.splice(i, 1, tab); disposeTab(prev); } else VS.tabs.push(tab);
            if (!isUser(path)) { const r = VS.store.get("recentFiles", []); VS.store.set("recentFiles", [path, ...r.filter(x => x !== path)].slice(0, 30)); }
        } else if (!opts.preview) tab.preview = false;
        activate(tab);
        if (opts.line) { editor.revealLineInCenter(opts.line); editor.setPosition({ lineNumber: opts.line, column: opts.col || 1 }); }
        if (!opts.keepFocus) editor.focus();
        return tab;
    };
    VS.openCustom = (path, title, render, opts = {}) => {
        let tab = tabByPath(path);
        if (!tab) { tab = { path, kind: "custom", title, render, icon: opts.icon }; VS.tabs.push(tab); } else { tab.render = render; tab.title = title; }
        activate(tab); return tab;
    };
    function disposeTab(tab) { if (tab.kind === "file" && tab.model && !isUser(tab.path)) { tab.view = null; tab.model.dispose(); } }
    function activate(tab) {
        if (active && active.kind === "file" && editor) active.view = editor.saveViewState();
        active = tab;
        const cv = $("#custom-view");
        if (!tab) { editor && editor.setModel(null); cv.hidden = false; VS.welcome(cv); renderTabs(); renderCrumbs(); renderStatus(); return; }
        if (tab.kind === "file") { cv.hidden = true; cv.innerHTML = ""; editor.setModel(tab.model); if (tab.view) editor.restoreViewState(tab.view); }
        else { cv.hidden = false; cv.innerHTML = ""; tab.render(cv); }
        renderTabs(); renderCrumbs(); renderStatus(); selectInTree(tab.path);
        VS.emit("active", tab);
    }
    VS.activeTab = () => active;
    VS.closeTab = async (tab, force) => {
        tab = tab || active; if (!tab) return;
        if (tab.dirty && !force) {
            const r = await VS.modal(t(`"${tab.title}" dosyasındaki değişiklikler kaydedilsin mi?`, `Save changes to "${tab.title}"?`), [{ type: "html", html: `<p class="hint">${t("Kaydetmezsen değişikliklerin kaybolur.", "Your changes will be lost if you don't save them.")}</p><div class="row"><button class="btn sec" data-nosave>${t("Kaydetme", "Don't Save")}</button></div>` }], t("Kaydet", "Save"));
            if (r === null && !closeTabNoSave) return;
            if (r) await saveTab(tab);
        }
        closeTabNoSave = false;
        const i = VS.tabs.indexOf(tab); VS.tabs.splice(i, 1); disposeTab(tab);
        if (active === tab) activate(VS.tabs[Math.min(i, VS.tabs.length - 1)] || null); else renderTabs();
    };
    let closeTabNoSave = false;
    document.addEventListener("click", e => { if (e.target.closest("[data-nosave]")) { closeTabNoSave = true; $("#modal").hidden = true; const b = $("#modal-box").querySelector("[data-x]"); if (b) b.click(); } });
    function closeAllTabs(force) { VS.tabs.slice().forEach(x => { if (force) { VS.tabs.splice(VS.tabs.indexOf(x), 1); disposeTab(x); } }); if (force) activate(null); }
    function markSaved(tab) { if (!tab || tab.kind !== "file") return; tab.saved = tab.model.getAlternativeVersionId(); tab.dirty = false; renderTabs(); renderExplorer(); }
    async function saveTab(tab) {
        if (!tab || tab.kind !== "file") return;
        if (VS.settings["editor.formatOnSave"] && active === tab && editor) { try { await editor.getAction("editor.action.formatDocument").run(); } catch (e) { } }
        const text = tab.model.getValue();
        if (isUser(tab.path)) {
            const name = tab.path.slice(5);
            if (name === "mcp.json") { try { VS.parseJSONC(text); } catch (e) { VS.toast("mcp.json: " + e.message, "err"); return; } VS.saveMcpText(text); }
            else { VS.userText[name] = text; VS.store.set(name === "settings.json" ? "settingsText" : "keysText", text); loadSettings(); applySettings(); }
            markSaved(tab); return;
        }
        try { await VS.ws.fs.write(tab.path, text); markSaved(tab); VS.emit("saved", tab); }
        catch (e) { VS.toast(t("Kaydedilemedi: ", "Save failed: ") + e.message, "err"); }
    }
    VS.saveTab = saveTab;
    const autoTimers = new Map();
    function autoSave(tab) {
        if (VS.settings["files.autoSave"] !== "afterDelay" || isUser(tab.path)) return;
        clearTimeout(autoTimers.get(tab)); autoTimers.set(tab, setTimeout(() => tab.dirty && VS.tabs.includes(tab) && saveTab(tab), +VS.settings["files.autoSaveDelay"] || 1000));
    }
    function renderTabs() {
        const el = $("#tabs");
        el.innerHTML = VS.tabs.map((x, i) => { const ic = x.kind === "file" && !isUser(x.path) ? VS.fileIcon(x.path) : `<span class="fic" style="color:var(--accent)">${x.kind === "file" ? VS.ci("settings-gear") : esc(x.icon || "◆")}</span>`; return `<div class="tab ${x === active ? "on" : ""} ${x.dirty ? "dirty" : ""} ${x.preview ? "preview" : ""}" data-i="${i}" draggable="true" title="${esc(x.path)}">${ic}<span class="nm">${esc(x.title)}</span><button class="x" data-close="${i}" aria-label="close"><span>${VS.ci("close")}</span></button></div>`; }).join("");
        const on = el.querySelector(".tab.on"); if (on) on.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    function renderCrumbs() {
        const el = $("#crumbs");
        if (!active) { el.innerHTML = ""; return; }
        el.innerHTML = (active.kind === "file" && !isUser(active.path) ? [VS.ws ? VS.ws.name : "", ...active.path.split("/")] : [active.title]).filter(Boolean).map(s => `<span>${esc(s)}</span>`).join("");
    }

    // ================= gezgin =================
    let treeSel = null;
    function renderExplorer() { if (curView === "explorer") renderSide(); }
    function treeHtml() {
        const ws = VS.ws;
        const kids = (dir) => {
            const pre = dir ? dir + "/" : "";
            const dirs = ws.dirs.filter(d => d.startsWith(pre) && !d.slice(pre.length).includes("/"));
            const files = ws.files.filter(f => f.startsWith(pre) && !f.slice(pre.length).includes("/"));
            return { dirs, files };
        };
        const depthPad = p => (p.split("/").length - 1) * 10 + 8;
        const out = [];
        // pad: bu seviyenin girintisi (birleştirilen klasörler yüzünden yol derinliğinden değil, görünen seviyeden hesaplanır)
        // VS Code gibi girinti çizgileri: açık her klasörün içindekilerin solunda, klasör okunun hizasında ince dikey çizgi
        const guides = gs => gs.map(x => `<i class="ig" style="left:${x}px"></i>`).join("");
        const walk = (dir, pad, gs) => {
            const { dirs, files } = kids(dir);
            for (const d0 of dirs) {
                // VS Code "compact folders": içinde tek klasör olan klasörler tek satırda (a\b) gösterilir
                let d = d0, label = VS.basename(d0);
                for (let k = kids(d); k.dirs.length === 1 && !k.files.length; k = kids(d)) { d = k.dirs[0]; label += "\\" + VS.basename(d); }
                const open = ws.expanded.has(d);
                out.push(`<div class="ti ${treeSel === d ? "sel" : ""}" data-p="${esc(d)}" data-d="1" draggable="true" style="padding-left:${pad}px">${guides(gs)}<span class="tw">${VS.ci(open ? "chevron-down" : "chevron-right")}</span><span class="nm">${esc(label)}</span></div>`);
                if (open) walk(d, pad + 10, [...gs, pad + 8]);
            }
            for (const f of files) {
                const tab = tabByPath(f);
                out.push(`<div class="ti ${treeSel === f ? "sel" : ""}" data-p="${esc(f)}" draggable="true" style="padding-left:${pad}px">${guides(gs)}<span class="tw"></span>${VS.fileIcon(f)}<span class="nm">${esc(VS.basename(f))}</span>${tab && tab.dirty ? `<span class="dirty"></span>` : ""}</div>`);
            }
        };
        walk("", 8, []);
        return out.join("");
    }
    function selectInTree(p) { if (!VS.ws || !p || isUser(p)) return; treeSel = p; const parts = p.split("/"); for (let i = 1; i < parts.length; i++) VS.ws.expanded.add(parts.slice(0, i).join("/")); renderExplorer(); }
    const saveExp = () => VS.ws && VS.store.set("exp:" + VS.ws.name, [...VS.ws.expanded]);
    const targetDir = () => { if (!treeSel) return ""; return VS.ws.dirs.includes(treeSel) ? treeSel : VS.dirname(treeSel); };
    VS.newFile = async (dir) => {
        if (!VS.ws) await VS.openWorkspace(new VS.MemFS("default"), { quiet: true });
        dir = dir ?? targetDir();
        const name = await VS.prompt(t("Yeni dosya adı", "New file name") + (dir ? ` (${dir}/)` : ""), "", "index.html"); if (!name) return;
        const p = VS.join(dir, name.trim());
        if (VS.ws.files.includes(p)) return VS.openFile(p);
        await VS.ws.fs.write(p, ""); await refreshTree(); VS.openFile(p);
    };
    VS.newFolder = async (dir) => {
        if (!VS.ws) return;
        dir = dir ?? targetDir();
        const name = await VS.prompt(t("Yeni klasör adı", "New folder name"), "", "src"); if (!name) return;
        const p = VS.join(dir, name.trim()); await VS.ws.fs.mkdir(p); VS.ws.expanded.add(p); await refreshTree();
    };
    async function renamePath(p) {
        const nn = await VS.prompt(t("Yeni ad", "New name"), VS.basename(p)); if (!nn || nn === VS.basename(p)) return;
        const np = VS.join(VS.dirname(p), nn); await moveTo(p, np);
    }
    async function moveTo(p, np) {
        if (np === p || np.startsWith(p + "/")) return;
        await VS.ws.fs.rename(p, np);
        for (const tab of VS.tabs.slice()) if (tab.path === p || tab.path.startsWith(p + "/")) { const was = active === tab; const nPath = np + tab.path.slice(p.length); const text = tab.model.getValue(); const dirty = tab.dirty; await VS.closeTab(tab, true); const nt = await VS.openFile(nPath, { keepFocus: !was }); if (nt && dirty) nt.model.setValue(text); }
        treeSel = np; await refreshTree();
    }
    async function deletePath(p) {
        if (!(await VS.confirm(t(`"${VS.basename(p)}" silinsin mi? Bu geri alınamaz.`, `Delete "${VS.basename(p)}"? This can't be undone.`)))) return;
        await VS.ws.fs.remove(p);
        for (const tab of VS.tabs.slice()) if (tab.path === p || tab.path.startsWith(p + "/")) await VS.closeTab(tab, true);
        treeSel = null; await refreshTree();
    }
    async function importFiles(fileList, dir) {
        let n = 0;
        for (const f of fileList) { if (f.size > 2e6) continue; const text = await f.text(); if (/\0/.test(text)) continue; await VS.ws.fs.write(VS.join(dir, f.webkitRelativePath || f.name), text); n++; }
        await refreshTree(); VS.toast(n + t(" dosya eklendi.", " files added."), "ok");
    }
    function explorerView(body, actions) {
        actions.innerHTML = VS.ws ? `<button title="${t("Yeni Dosya", "New File")}" data-a="nf">${VS.ci("new-file")}</button><button title="${t("Yeni Klasör", "New Folder")}" data-a="nd">${VS.ci("new-folder")}</button><button title="${t("Yenile", "Refresh")}" data-a="rf">${VS.ci("refresh")}</button><button title="${t("Hepsini Daralt", "Collapse All")}" data-a="ca">${VS.ci("collapse-all")}</button>` : "";
        actions.onclick = e => { const a = e.target.closest("[data-a]"); if (!a) return; ({ nf: () => VS.newFile(), nd: () => VS.newFolder(), rf: refreshTree, ca: () => { VS.ws.expanded.clear(); saveExp(); renderExplorer(); } })[a.dataset.a](); };
        if (!VS.ws) {
            body.innerHTML = `<div class="pad col"><p class="hint">${t("Henüz açık klasör yok.", "You have not yet opened a folder.")}</p>
                <button class="btn w" data-a="new">${t("Yeni Proje Başlat", "Start New Project")}</button>
                <button class="btn sec w" data-a="mine">${t("Projelerim", "My Projects")}</button>
                <button class="btn sec w" data-a="open">${t("Klasör Aç", "Open Folder")}</button>
                <button class="btn sec w" data-a="pool">${t("Kod Havuzu", "Code Pool")}</button>
                ${(VS.store.get("recentFolders", []).length && N) ? `<p class="hint" style="margin-top:10px">${t("SON AÇILANLAR", "RECENT")}</p>${VS.store.get("recentFolders", []).map(r => `<button class="tool" data-r="${esc(r)}" title="${esc(r)}">${esc(r.split(/[\\/]/).pop())} <small>${esc(r)}</small></button>`).join("")}` : ""}</div>`;
            body.onclick = e => { const a = e.target.closest("[data-a]"); const r = e.target.closest("[data-r]"); if (r) return VS.openWorkspace(new VS.NativeFS(r.dataset.r)); if (!a) return; ({ open: VS.openFolder, new: VS.newProject, mine: VS.myProjects, pool: () => VS.showView("pool") })[a.dataset.a](); };
            return;
        }
        body.innerHTML = `<div class="sb-sec"><h4>▾ ${esc(VS.ws.name)} <small style="font-weight:400;opacity:.6;text-transform:none">${VS.ws.fs.kind === "mem" ? t("· tarayıcı", "· browser") : ""}</small></h4><div class="tree" id="tree" tabindex="0">${treeHtml()}</div></div>`;
        const tree = $("#tree");
        tree.onclick = e => {
            const it = e.target.closest(".ti"); if (!it) return;
            const p = it.dataset.p; treeSel = p;
            if (it.dataset.d) { VS.ws.expanded.has(p) ? VS.ws.expanded.delete(p) : VS.ws.expanded.add(p); saveExp(); renderExplorer(); }
            else { VS.openFile(p, { preview: true, keepFocus: true }); }
        };
        tree.ondblclick = e => { const it = e.target.closest(".ti"); if (it && !it.dataset.d) VS.openFile(it.dataset.p); };
        tree.oncontextmenu = e => {
            e.preventDefault(); const it = e.target.closest(".ti"); const p = it ? it.dataset.p : ""; treeSel = p || null; renderExplorer();
            const isDir = !p || (it && it.dataset.d);
            VS.menu(e.clientX, e.clientY, [
                { label: t("Yeni Dosya…", "New File…"), run: () => VS.newFile(isDir ? p : VS.dirname(p)) },
                { label: t("Yeni Klasör…", "New Folder…"), run: () => VS.newFolder(isDir ? p : VS.dirname(p)) },
                "-",
                ...(p ? [{ label: t("Yeniden Adlandır…", "Rename…"), key: "f2", run: () => renamePath(p) }, { label: t("Sil", "Delete"), key: "delete", run: () => deletePath(p) }, "-",
                { label: t("Yolu Kopyala", "Copy Path"), run: () => navigator.clipboard.writeText(VS.ws.fs.root ? VS.ws.fs.root + "\\" + p.replace(/\//g, "\\") : p) },
                { label: t("Göreli Yolu Kopyala", "Copy Relative Path"), run: () => navigator.clipboard.writeText(p) }] : []),
                ...(p && /\.html?$/i.test(p) ? [{ label: t("Önizlemede Aç", "Open in Preview"), run: () => VS.preview(p) }] : []),
                ...(p && /\.(js|mjs)$/i.test(p) ? [{ label: t("Terminalde Çalıştır", "Run in Terminal"), run: () => VS.term.exec("node " + JSON.stringify(p)) }] : []),
                ...(N ? [{ label: t("Dosya Gezgininde Göster", "Reveal in File Explorer"), run: () => N.fs.reveal(VS.ws.fs.root, p || "") }] : []),
                ...(N && isDir ? [{ label: t("Burada Terminal Aç", "Open in Integrated Terminal"), run: () => { VS.term.cd(p); showPanel("terminal"); } }] : []),
            ]);
        };
        tree.onkeydown = e => {
            if (!treeSel) return;
            if (e.key === "F2") { e.preventDefault(); renamePath(treeSel); }
            if (e.key === "Delete") { e.preventDefault(); deletePath(treeSel); }
            if (e.key === "Enter") { e.preventDefault(); VS.ws.dirs.includes(treeSel) ? (VS.ws.expanded.has(treeSel) ? VS.ws.expanded.delete(treeSel) : VS.ws.expanded.add(treeSel), renderExplorer()) : VS.openFile(treeSel); }
        };
        // sürükle-bırak: ağaç içinde taşıma + işletim sisteminden dosya ekleme
        tree.ondragstart = e => { const it = e.target.closest(".ti"); if (it) e.dataTransfer.setData("text/vcode-path", it.dataset.p); };
        tree.ondragover = e => { e.preventDefault(); tree.querySelectorAll(".drop-over").forEach(x => x.classList.remove("drop-over")); const it = e.target.closest(".ti[data-d]"); (it || tree).classList.add("drop-over"); };
        tree.ondragleave = () => tree.querySelectorAll(".drop-over").forEach(x => x.classList.remove("drop-over"));
        tree.ondrop = async e => {
            e.preventDefault(); tree.classList.remove("drop-over"); tree.querySelectorAll(".drop-over").forEach(x => x.classList.remove("drop-over"));
            const it = e.target.closest(".ti"); const dir = it ? (it.dataset.d ? it.dataset.p : VS.dirname(it.dataset.p)) : "";
            const src = e.dataTransfer.getData("text/vcode-path");
            if (src) return moveTo(src, VS.join(dir, VS.basename(src)));
            if (e.dataTransfer.files.length) importFiles(e.dataTransfer.files, dir);
        };
    }

    // ================= arama =================
    const S = { q: "", r: "", case: false, regex: false, word: false, results: [] };
    function searchView(body) {
        body.innerHTML = `<div class="pad col">
            <div class="row" style="flex-wrap:nowrap"><input id="s-q" placeholder="${t("Ara", "Search")}" value="${esc(S.q)}"><button class="ib ${S.case ? "on" : ""}" data-o="case" title="Match Case" style="${S.case ? "color:var(--accent)" : ""}">Aa</button><button class="ib" data-o="word" title="Whole Word" style="${S.word ? "color:var(--accent)" : ""}">ab</button><button class="ib" data-o="regex" title="Regex" style="${S.regex ? "color:var(--accent)" : ""}">.*</button></div>
            <div class="row" style="flex-wrap:nowrap"><input id="s-r" placeholder="${t("Değiştir", "Replace")}" value="${esc(S.r)}"><button class="ib" id="s-ra" title="${t("Tümünü Değiştir", "Replace All")}">⇄</button></div>
            <p class="hint" id="s-sum"></p></div><div id="s-res"></div>`;
        const q = $("#s-q"); setTimeout(() => q.focus(), 0);
        const go = VS.debounce(doSearch, 250);
        q.oninput = () => { S.q = q.value; go(); };
        $("#s-r").oninput = e => { S.r = e.target.value; };
        body.querySelectorAll("[data-o]").forEach(b => b.onclick = () => { S[b.dataset.o] = !S[b.dataset.o]; searchView(body); doSearch(); });
        $("#s-ra").onclick = replaceAll;
        drawResults();
    }
    function mkRe() { if (!S.q) return null; let src = S.regex ? S.q : S.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); if (S.word) src = "\\b" + src + "\\b"; try { return new RegExp(src, S.case ? "g" : "gi"); } catch (e) { return null; } }
    async function textOf(f) { const tab = tabByPath(f); return tab && tab.model ? tab.model.getValue() : VS.ws.fs.read(f); }
    async function doSearch() {
        S.results = []; const re = mkRe(); if (!re || !VS.ws) return drawResults();
        let n = 0;
        for (const f of VS.ws.files) {
            if (VS.isBinaryName(f)) continue;
            let text; try { text = await textOf(f); } catch (e) { continue; }
            const lines = text.split("\n"), hits = [];
            lines.forEach((l, i) => { re.lastIndex = 0; const m = re.exec(l); if (m) hits.push({ line: i + 1, col: m.index + 1, text: l, len: m[0].length }); });
            if (hits.length) { S.results.push({ f, hits }); n += hits.length; }
            if (n > 2000) break;
        }
        drawResults();
    }
    function drawResults() {
        const el = $("#s-res"), sum = $("#s-sum"); if (!el) return;
        const total = S.results.reduce((a, r) => a + r.hits.length, 0);
        sum.textContent = S.q ? `${total} ${t("sonuç", "results")} · ${S.results.length} ${t("dosya", "files")}` : "";
        el.innerHTML = S.results.map(r => `<div class="sb-sec"><h4 style="text-transform:none;font-weight:600"><span style="color:${VS.icon(r.f)[1]};font:700 9px var(--mono)">${esc(VS.icon(r.f)[0])}</span>${esc(VS.basename(r.f))} <small style="color:var(--muted);font-weight:400">${esc(VS.dirname(r.f))}</small><small style="margin-left:auto">${r.hits.length}</small></h4>${r.hits.slice(0, 50).map(h => { const s = Math.max(0, h.col - 30); return `<button class="tool" data-f="${esc(r.f)}" data-l="${h.line}" data-c="${h.col}" style="font-family:var(--font)">${esc(h.text.slice(s, h.col - 1))}<mark style="background:rgba(232,196,106,.35);color:inherit">${esc(h.text.substr(h.col - 1, h.len))}</mark>${esc(h.text.slice(h.col - 1 + h.len, h.col + 80))}</button>`; }).join("")}</div>`).join("");
        el.onclick = e => { const b = e.target.closest("[data-f]"); if (b) VS.openFile(b.dataset.f, { line: +b.dataset.l, col: +b.dataset.c }); };
    }
    async function replaceAll() {
        const re = mkRe(); if (!re || !S.results.length) return;
        if (!(await VS.confirm(t(`${S.results.length} dosyada değiştirilsin mi?`, `Replace in ${S.results.length} files?`)))) return;
        for (const r of S.results) {
            const tab = tabByPath(r.f);
            if (tab && tab.model) tab.model.pushEditOperations([], [{ range: tab.model.getFullModelRange(), text: tab.model.getValue().replace(re, S.r) }], () => null);
            else await VS.ws.fs.write(r.f, (await VS.ws.fs.read(r.f)).replace(re, S.r));
        }
        VS.toast(t("Değiştirildi.", "Replaced."), "ok"); doSearch();
    }

    // ================= görünümler (etkinlik çubuğu) =================
    const ICON = {
        files: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/></svg>',
        ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7.5" height="7.5" rx="1"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1"/><rect x="14.5" y="2" width="7" height="7" rx="1" transform="rotate(12 18 5.5)"/></svg>',
        mcp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 7V3M15 7V3"/><path d="M6 7h12v4a6 6 0 0 1-12 0z"/><path d="M12 17v4"/></svg>',
        community: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/></svg>',
        ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><path d="m12 7 1.6 3.4L17 12l-3.4 1.6L12 17l-1.6-3.4L7 12l3.4-1.6z"/></svg>',
        run: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 4.5v15l12-7.5z"/></svg>',
        gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
        account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>',
    };
    VS.icons = ICON;
    VS.viewDefs = VS.viewDefs || [];
    VS.viewDefs.push(
        { id: "explorer", title: () => t("GEZGİN", "EXPLORER"), icon: ICON.files, order: 0, key: "ctrl+shift+e", render: explorerView },
        { id: "search", title: () => t("ARA", "SEARCH"), icon: ICON.search, order: 1, key: "ctrl+shift+f", render: searchView },
        { id: "community", title: () => t("TOPLULUK", "COMMUNITY"), icon: ICON.community, order: 5, key: "ctrl+shift+y", render: (b, a) => VS.communityView(b, a) },
    );
    let curView = VS.store.get("view", "explorer");
    function renderActivity() {
        const defs = VS.viewDefs.slice().sort((a, b) => a.order - b.order);
        $("#activity").innerHTML = defs.map(v => `<button class="${v.id === curView && !$("#wb").classList.contains("no-side") ? "on" : ""}" data-v="${v.id}" title="${esc(v.title())} (${VS.prettyKey(VS.keyFor("view." + v.id))})">${v.icon}${v.badge && v.badge() ? `<span class="bdg">${v.badge()}</span>` : ""}</button>`).join("")
            + `<div class="grow"></div><button data-acc title="${t("Hesap", "Account")}">${ICON.account}</button><button data-gear title="${t("Yönet", "Manage")}">${ICON.gear}</button>`;
    }
    VS.renderActivity = renderActivity;
    function renderSide() {
        const v = VS.viewDefs.find(x => x.id === curView) || VS.viewDefs[0];
        $("#sb-title").textContent = v.title();
        const body = $("#sb-body"), actions = $("#sb-actions");
        body.onclick = null; actions.onclick = null; actions.innerHTML = "";
        v.render(body, actions);
    }
    VS.renderSide = () => renderSide();
    function showView(id, toggle) {
        const wb = $("#wb");
        if (toggle && curView === id && !wb.classList.contains("no-side")) { wb.classList.add("no-side"); renderActivity(); return; }
        curView = id; VS.store.set("view", id); wb.classList.remove("no-side"); renderActivity(); renderSide();
    }
    VS.showView = showView;
    VS.currentView = () => curView;

    // ================= panel: terminal / çıktı / sorunlar =================
    const panelTabs = [["problems", () => t("SORUNLAR", "PROBLEMS")], ["output", () => t("ÇIKTI", "OUTPUT")], ["terminal", () => t("TERMİNAL", "TERMINAL")]];
    let curPanel = VS.store.get("panel", "terminal");
    const outputs = { "VEMTRIO": [], [t("Önizleme Konsolu", "Preview Console")]: [], "MCP": [], [t("Eklentiler", "Extensions")]: [], "AI": [] };
    let curOut = "VEMTRIO";
    VS.log = (channel, text, cls = "") => {
        (outputs[channel] = outputs[channel] || []).push({ text: `[${new Date().toLocaleTimeString()}] ${text}`, cls });
        if (outputs[channel].length > 1500) outputs[channel].shift();
        if (curPanel === "output" && curOut === channel) renderPanel();
    };
    function showPanel(id) { curPanel = id; VS.store.set("panel", id); $("#wb").classList.remove("no-panel"); renderPanel(); if (id === "terminal") setTimeout(() => VS.term.focus(), 0); }
    VS.showPanel = showPanel;
    function renderPanel() {
        const counts = problemsCount();
        $("#panel-tabs").innerHTML = panelTabs.map(([id, lbl]) => `<button class="pt ${id === curPanel ? "on" : ""}" data-p="${id}">${lbl()}${id === "problems" && counts.e + counts.w ? ` <span style="background:var(--badge);color:var(--accent-fg);border-radius:8px;padding:0 5px;font-size:10px">${counts.e + counts.w}</span>` : ""}</button>`).join("")
            + `<div class="grow"></div>${curPanel === "output" ? `<select id="out-ch" style="width:auto;height:22px;padding:0 4px;font-size:11px">${Object.keys(outputs).map(k => `<option ${k === curOut ? "selected" : ""}>${esc(k)}</option>`).join("")}</select><button class="ib" data-pa="clear" title="Clear">${VS.ci("clear-all")}</button>` : ""}${curPanel === "terminal" ? `<span class="hint" style="font-size:11px;margin-right:6px">${esc(VS.term.label())}</span><button class="ib" data-pa="tclear" title="${t("Temizle", "Clear")}">${VS.ci("clear-all")}</button><button class="ib" data-pa="kill" title="${t("Durdur (Ctrl+C)", "Stop (Ctrl+C)")}">${VS.ci("debug-stop")}</button>` : ""}<button class="ib" data-pa="max" title="${t("Büyüt", "Maximize")}">${VS.ci($("#wb").classList.contains("panel-max") ? "chevron-down" : "chevron-up")}</button><button class="ib" data-pa="close" title="${t("Kapat", "Close")}">${VS.ci("close")}</button>`;
        const body = $("#panel-body");
        if (curPanel === "terminal") { VS.term.mount(body); }
        else { VS.term.unmount(); }
        if (curPanel === "output") {
            body.innerHTML = `<div class="term"><div class="out">${(outputs[curOut] || []).map(l => `<div class="${l.cls}">${esc(l.text)}</div>`).join("")}</div></div>`;
            const tm = body.querySelector(".term"); tm.scrollTop = tm.scrollHeight;
        }
        if (curPanel === "problems") {
            const ms = monaco ? monaco.editor.getModelMarkers({}).filter(m => m.severity >= 4) : [];
            body.innerHTML = `<div class="list">${ms.length ? ms.map(m => `<div class="it" data-u="${esc(m.resource.toString())}" data-l="${m.startLineNumber}" data-c="${m.startColumn}"><span style="color:${m.severity === 8 ? "var(--bad)" : "var(--warn)"}">${m.severity === 8 ? "⊗" : ""}</span><span>${esc(m.message)}</span><small>${esc(decodeURIComponent(m.resource.path.slice(1)))} [${m.startLineNumber}, ${m.startColumn}]</small>${VS.explainError && VS.explainError(m.message) ? `<button class="btn sec" style="height:20px;font-size:11px;margin-left:auto" data-explain="${esc(m.message)}" data-line="${m.startLineNumber}">${t("Açıkla", "Explain")}</button>` : ""}</div>`).join("") : `<div class="it hint">${t("Çalışma alanında sorun bulunamadı.", "No problems have been detected in the workspace.")}</div>`}</div>`;
        }
    }
    VS.renderPanel = renderPanel;
    function problemsCount() { if (!monaco) return { e: 0, w: 0 }; const ms = monaco.editor.getModelMarkers({}); return { e: ms.filter(m => m.severity === 8).length, w: ms.filter(m => m.severity === 4).length }; }

    // ---- terminal ----
    VS.term = (() => {
        let el = null, outEl, inEl, cwd = "", running = null, hist = VS.store.get("termHist", []), hi = -1;
        const lines = [];
        const label = () => N ? (VS.settings["terminal.shell"] || "powershell") : t("vcode kabuğu (tarayıcı)", "vcode shell (browser)");
        const write = (text, cls = "") => { lines.push({ text, cls }); if (lines.length > 3000) lines.splice(0, 500); if (outEl) { const d = document.createElement("span"); if (cls) d.className = cls; d.textContent = text; outEl.appendChild(d); el.scrollTop = el.scrollHeight; } };
        const prompt = () => (N ? (VS.ws && VS.ws.fs.kind === "native" ? "PS " + (VS.ws.fs.root + (cwd ? "\\" + cwd.replace(/\//g, "\\") : "")) + ">" : "PS>") : "vcode:" + (cwd ? "/" + cwd : "~") + "$");
        function mount(body) {
            body.innerHTML = `<div class="term" id="term"><div class="out"></div><div class="ln-in"><span></span><input spellcheck="false" autocomplete="off"></div></div>`;
            el = body.querySelector(".term"); outEl = el.querySelector(".out"); inEl = el.querySelector("input");
            lines.forEach(l => { const d = document.createElement("span"); if (l.cls) d.className = l.cls; d.textContent = l.text; outEl.appendChild(d); });
            if (!lines.length) write(N ? t("VEMTRIO Code terminali. Komutlar gerçek kabukta çalışır. ", "VEMTRIO Code terminal. Commands run in a real shell. ") + t("İpucu: 'vcode help'\n", "Tip: 'vcode help'\n") : t("VEMTRIO tarayıcı kabuğu. 'help' yaz. node dosya.js betikleri kum havuzunda çalıştırır. Gerçek terminal için masaüstü uygulamasını indir.\n", "VEMTRIO browser shell. Type 'help'. node file.js runs scripts in a sandbox. Download the desktop app for a real terminal.\n"), "m");
            el.querySelector(".ln-in span").textContent = prompt();
            el.scrollTop = el.scrollHeight;
            el.onclick = () => { if (!getSelection().toString()) inEl.focus(); };
            inEl.onkeydown = e => {
                if (e.key === "Enter") { const v = inEl.value; inEl.value = ""; hi = -1; exec(v); }
                else if (e.key === "ArrowUp") { e.preventDefault(); if (hi < hist.length - 1) inEl.value = hist[++hi] || ""; }
                else if (e.key === "ArrowDown") { e.preventDefault(); hi = Math.max(-1, hi - 1); inEl.value = hi < 0 ? "" : hist[hi]; }
                else if (e.key === "c" && e.ctrlKey && !inEl.selectionEnd) { e.preventDefault(); kill(); }
                else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); clear(); }
                else if (e.key === "Tab") { e.preventDefault(); complete(); }
            };
        }
        function complete() {
            const v = inEl.value, m = v.match(/(\S*)$/); if (!m || !VS.ws) return;
            const pre = m[1]; const cands = [...VS.ws.files, ...VS.ws.dirs].map(p => cwd && p.startsWith(cwd + "/") ? p.slice(cwd.length + 1) : p).filter(p => p.startsWith(pre));
            if (cands.length === 1) inEl.value = v.slice(0, v.length - pre.length) + cands[0];
            else if (cands.length) write("\n" + cands.slice(0, 40).join("  ") + "\n", "m");
        }
        function unmount() { el = outEl = inEl = null; }
        function clear() { lines.length = 0; if (outEl) outEl.innerHTML = ""; }
        function kill() { if (running && N) { N.term.kill(running); write("^C\n", "w"); } else if (VS.term && VS.term._pyStop) VS.term._pyStop(); }
        const resolve = p => { const parts = (p.startsWith("/") ? [] : cwd ? cwd.split("/") : []); for (const s of p.split("/")) { if (!s || s === ".") continue; if (s === "..") parts.pop(); else parts.push(s); } return parts.join("/"); };
        async function exec(cmd) {
            if (cmd.trim()) { hist = [cmd, ...hist.filter(h => h !== cmd)].slice(0, 100); VS.store.set("termHist", hist); }
            write(prompt() + " " + cmd + "\n", "a");
            const [c0, ...args] = cmd.trim().match(/"[^"]*"|\S+/g)?.map(s => s.replace(/^"|"$/g, "")) || [""];
            if (!c0) return;
            if (c0 === "clear" || c0 === "cls") return clear();
            if (c0 === "vcode") return vcodeCmd(args);
            if (N && VS.ws && VS.ws.fs.kind === "native") {
                if (running) { write(t("Önceki komut hâlâ çalışıyor (■ ile durdur).\n", "Previous command still running (stop with ■).\n"), "w"); return; }
                running = await N.term.run({ cmd, cwd: VS.ws.fs.root + (cwd ? "/" + cwd : ""), shell: VS.settings["terminal.shell"] });
                return;
            }
            if (N && !VS.ws) { write(t("Önce bir klasör aç (Ctrl+K Ctrl+O).\n", "Open a folder first (Ctrl+K Ctrl+O).\n"), "w"); return; }
            return browserShell(c0, args);
        }
        function vcodeCmd(a) {
            const sub = a[0];
            if (!sub || sub === "help") return write(`vcode open <file>     ${t("dosya aç", "open file")}\nvcode preview [file]  ${t("önizleme", "preview")}\nvcode ext <id>        ${t("eklenti kur (ör. dracula-theme.theme-dracula)", "install extension (e.g. dracula-theme.theme-dracula)")}\nvcode mcp             ${t("MCP sunucularını listele", "list MCP servers")}\nvcode theme <name>    ${t("tema değiştir", "change theme")}\nvcode share           ${t("çalışma alanını toplulukta paylaş", "share workspace to community")}\n`, "m");
            if (sub === "open" && a[1]) return VS.openFile(resolve(a[1]));
            if (sub === "preview") return VS.preview(a[1] ? resolve(a[1]) : undefined);
            if (sub === "ext" && a[1]) return VS.installExtension && VS.installExtension(a[1]);
            if (sub === "mcp") return write((VS.mcpSummary ? VS.mcpSummary() : "") + "\n");
            if (sub === "theme") return a[1] ? VS.setSetting("workbench.colorTheme", a.slice(1).join(" ")) : write(Object.keys(VS.themes).join("\n") + "\n");
            if (sub === "share") return VS.run("vemtrio.share");
            write(t("Bilinmeyen alt komut.\n", "Unknown subcommand.\n"), "e");
        }
        async function browserShell(c, a) {
            const ws = VS.ws; if (!ws) { write(t("Önce bir çalışma alanı aç.\n", "Open a workspace first.\n"), "w"); return; }
            const ok = s => write(s + (s.endsWith("\n") ? "" : "\n"));
            try {
                switch (c) {
                    case "help": return ok("ls [dir] · cd <dir> · pwd · cat <f> · touch <f> · mkdir <d> · rm <p> · mv <a> <b> · cp <a> <b> · echo <txt> [> f]\nnode <f.js> · python <f.py> · open <f> · preview [f] · grep <txt> · tree · clear · vcode help");
                    case "pwd": return ok("/" + cwd);
                    case "ls": case "dir": { const d = resolve(a[0] || ""); const pre = d ? d + "/" : ""; const items = [...ws.dirs.filter(x => x.startsWith(pre) && !x.slice(pre.length).includes("/")).map(x => VS.basename(x) + "/"), ...ws.files.filter(x => x.startsWith(pre) && !x.slice(pre.length).includes("/")).map(VS.basename)]; return ok(items.join("  ") || t("(boş)", "(empty)")); }
                    case "tree": return ok([...ws.dirs.map(d => d + "/"), ...ws.files].sort().map(p => "  ".repeat(p.split("/").length - 1) + VS.basename(p.replace(/\/$/, "")) + (p.endsWith("/") ? "/" : "")).join("\n"));
                    case "cd": { const d = resolve(a[0] || "/"); if (d && !ws.dirs.includes(d)) return write(t("Böyle bir klasör yok.\n", "No such directory.\n"), "e"); cwd = d; if (el) el.querySelector(".ln-in span").textContent = prompt(); return; }
                    case "cat": case "type": return ok(await textOf(resolve(a[0])));
                    case "touch": await ws.fs.write(resolve(a[0]), ws.files.includes(resolve(a[0])) ? await ws.fs.read(resolve(a[0])) : ""); return refreshTree();
                    case "mkdir": await ws.fs.mkdir(resolve(a[0])); return refreshTree();
                    case "rm": case "del": await ws.fs.remove(resolve(a[a.length - 1])); return refreshTree();
                    case "mv": case "move": await ws.fs.rename(resolve(a[0]), resolve(a[1])); return refreshTree();
                    case "cp": case "copy": await ws.fs.write(resolve(a[1]), await ws.fs.read(resolve(a[0]))); return refreshTree();
                    case "echo": { const i = a.indexOf(">"); if (i >= 0) { await ws.fs.write(resolve(a[i + 1]), a.slice(0, i).join(" ") + "\n"); return refreshTree(); } return ok(a.join(" ")); }
                    case "open": case "code": return VS.openFile(resolve(a[0]));
                    case "preview": case "start": return VS.preview(a[0] ? resolve(a[0]) : undefined);
                    case "grep": case "findstr": { const re = new RegExp(a[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); for (const f of ws.files) { if (VS.isBinaryName(f)) continue; (await textOf(f)).split("\n").forEach((l, i) => re.test(l) && write(`${f}:${i + 1}: ${l.trim()}\n`)); } return; }
                    case "node": return runJsSandbox(resolve(a[0]));
                    case "python": case "python3": case "py": return runPython(resolve(a[0] || ""));
                    case "npm": case "git": case "pip": return write(t(`'${c}' tarayıcıda çalışmaz. Masaüstü uygulamasında gerçek terminal var.\n`, `'${c}' doesn't run in the browser. The desktop app has a real terminal.\n`), "w");
                    default: return write(`${c}: ${t("komut bulunamadı. 'help' yaz.", "command not found. Type 'help'.")}\n`, "e");
                }
            } catch (e) { write(String(e.message || e) + "\n", "e"); }
        }
        // node dosya.js → internetsiz kum havuzu iframe'inde çalıştır, console çıktısını terminale aktar
        // python dosya.py → Pyodide (tarayıcıda gerçek Python 3), arka planda (Web Worker) çalışır; ■ ile durdurulur.
        // input() için girdiler çalıştırmadan önce sorulur (her satır bir input()).
        const PYO = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
        let pyWorker = null, pyBusy = false;
        function pyWorkerYap() {
            const src = `importScripts("${PYO}pyodide.js");let py=null;
self.onmessage=async e=>{const m=e.data;try{
 if(!py){postMessage({t:"info",s:"loading"});py=await loadPyodide({indexURL:"${PYO}"});}
 const inputs=m.inputs.slice();
 py.setStdout({batched:s=>postMessage({t:"out",s})});py.setStderr({batched:s=>postMessage({t:"err",s})});
 py.setStdin({stdin:()=>{if(!inputs.length)return null;const v=inputs.shift();postMessage({t:"in",s:v});return v;}});
 for(const f of m.files){const p="/home/pyodide/"+f.name;const d=p.slice(0,p.lastIndexOf("/"));try{py.FS.mkdirTree(d)}catch(x){}py.FS.writeFile(p,f.content);}
 py.FS.chdir("/home/pyodide");
 try{await py.loadPackagesFromImports(m.code,{messageCallback:()=>{}})}catch(x){}
 const g=py.globals.get("dict")();g.set("__name__","__main__");
 py.runPython("import sys; sys.path.insert(0, '/home/pyodide')");
 await py.runPythonAsync(m.code,{globals:g,filename:m.file});
 postMessage({t:"end",ok:true});
}catch(err){postMessage({t:"err",s:String(err.message||err)});postMessage({t:"end",ok:false});}};`;
            const w = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
            return w;
        }
        async function runPython(f) {
            if (!f || !VS.ws.files.includes(f)) { write(t("Dosya bulunamadı: ", "File not found: ") + (f || "") + "\n", "e"); return; }
            if (pyBusy) { write(t("Bir Python programı zaten çalışıyor (■ ile durdur).\n", "A Python program is already running (stop with ■).\n"), "w"); return; }
            const code = await textOf(f);
            let inputs = [];
            const nInput = (code.match(/\binput\s*\(/g) || []).length;
            if (nInput) {
                const v = await VS.modal(t("Programın girdileri", "Program input"), [{ type: "html", html: `<p class="hint">${t("Bu program input() ile bilgi istiyor. Vereceğin cevapları her satıra bir tane olacak şekilde yaz (sırayla kullanılır).", "This program asks for input(). Type your answers one per line (used in order).")}</p>` }, { name: "v", label: t("GİRDİLER", "INPUTS"), type: "textarea", rows: Math.min(8, Math.max(3, nInput)) }], t("Çalıştır", "Run"));
                if (!v) return; inputs = v.v.split(/\r?\n/);
            }
            const files = [];
            for (const p of VS.ws.files) if (/\.(py|txt|csv|json)$/i.test(p)) { try { files.push({ name: p, content: await textOf(p) }); } catch (e) { } }
            if (!pyWorker) pyWorker = pyWorkerYap();
            pyBusy = true; let sonHata = "";
            const t0 = performance.now();
            await new Promise(res => {
                pyWorker.onmessage = e => {
                    const m = e.data;
                    if (m.t === "info") write(t("Python hazırlanıyor (ilk seferde birkaç saniye sürer)…\n", "Loading Python (first run takes a few seconds)…\n"), "m");
                    else if (m.t === "out") write(m.s + "\n");
                    else if (m.t === "err") {
                        // Pyodide'in kendi iç satırlarını (/lib/python…, _pyodide) gizle; sadece kullanıcının dosyası kalsın
                        const L = String(m.s).split("\n"), temiz = []; let atla = false;
                        for (const l of L) { if (/^\s*File "(\/lib\/|<exec>)/.test(l) || /_pyodide/.test(l)) { atla = true; continue; } if (/^\s*File "/.test(l) || !/^\s/.test(l)) atla = false; if (!atla) temiz.push(l); }
                        const s2 = temiz.join("\n").replace(/Traceback \(most recent call last\):\n(?=\S)/, "");
                        write(s2 + (s2.endsWith("\n") ? "" : "\n"), "e"); sonHata = s2;
                    }
                    else if (m.t === "end") { write(t(`[çıkış: ${m.ok ? 0 : 1} · ${Math.round(performance.now() - t0)} ms]\n`, `[exit: ${m.ok ? 0 : 1} · ${Math.round(performance.now() - t0)} ms]\n`), "m"); pyBusy = false; res(m.ok); }
                };
                pyWorker.onerror = e => { write(String(e.message || e) + "\n", "e"); pyBusy = false; res(false); };
                pyWorker.postMessage({ code, file: f, files, inputs });
                VS.term._pyStop = () => { if (!pyBusy) return; pyWorker.terminate(); pyWorker = null; pyBusy = false; write(t("^C · program durduruldu\n", "^C · program stopped\n"), "w"); res(false); };
            });
            // Hata varsa Topluluk AI açıklasın
            const satir = String(sonHata).trim().split("\n").filter(Boolean).pop() || "";
            if (satir && VS.explainError && VS.explainError(satir)) VS.toast(t("Python hatası: ", "Python error: ") + satir.slice(0, 110), "err", 9000, [{ label: t("Açıkla", "Explain"), run: () => VS.assistAsk(satir) }]);
        }
        async function runJsSandbox(f) {
            const code = await textOf(f);
            const fr = document.createElement("iframe"); fr.sandbox = "allow-scripts"; fr.style.display = "none";
            const id = "r" + Math.random().toString(36).slice(2);
            const handler = e => { const m = e.data; if (!m || m.__vrun !== id) return; if (m.t === "end") { window.removeEventListener("message", handler); fr.remove(); write(t(`\n[çıkış: ${m.ok ? 0 : 1}]\n`, `\n[exit: ${m.ok ? 0 : 1}]\n`), "m"); } else write(m.text + "\n", m.t === "error" ? "e" : m.t === "warn" ? "w" : ""); };
            window.addEventListener("message", handler);
            fr.srcdoc = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'"><script>(function(){var id=${JSON.stringify(id)};function s(t,a){parent.postMessage({__vrun:id,t:t,text:[].map.call(a,function(x){try{return typeof x==='string'?x:JSON.stringify(x,null,2)}catch(e){return String(x)}}).join(' ')},'*')}
["log","info","warn","error","debug"].forEach(function(k){console[k]=function(){s(k==='debug'||k==='info'?'log':k,arguments)}});
var process={argv:['node',${JSON.stringify(f)}],env:{},platform:'browser',exit:function(){throw{__exit:1}}};var module={exports:{}},exports=module.exports;function require(n){throw new Error("require('"+n+"') tarayıcıda yok / not available in browser")}
window.onerror=function(m){s('error',[m]);parent.postMessage({__vrun:id,t:'end',ok:false},'*')};
setTimeout(async function(){try{await (async function(){${code.replace(/<\/script/gi, "<\\/script")}\n})();parent.postMessage({__vrun:id,t:'end',ok:true},'*')}catch(e){if(!e||!e.__exit)s('error',[e&&e.stack||String(e)]);parent.postMessage({__vrun:id,t:'end',ok:!e||!!e.__exit},'*')}},0)})()<\/script>`;
            document.body.appendChild(fr);
            setTimeout(() => { if (fr.isConnected) { fr.remove(); window.removeEventListener("message", handler); write(t("[zaman aşımı: 15 sn]\n", "[timeout: 15s]\n"), "w"); } }, 15000);
        }
        if (N) {
            N.term.onData((id, chunk, stream) => {
                if (id !== running) return;
                const m = chunk.match(/__VCWD__:(.*)\r?\n?/);
                if (m) { const full = m[1].trim().replace(/\\/g, "/"); const root = VS.ws.fs.root.replace(/\\/g, "/"); if (full.toLowerCase().startsWith(root.toLowerCase())) cwd = full.slice(root.length).replace(/^\//, ""); chunk = chunk.replace(m[0], ""); }
                if (chunk) write(chunk, stream === "err" ? "e" : "");
            });
            N.term.onExit((id, code) => { if (id !== running) return; running = null; if (code) write(`[${t("çıkış kodu", "exit code")} ${code}]\n`, "m"); if (el) el.querySelector(".ln-in span").textContent = prompt(); refreshTree(); });
        }
        return { mount, unmount, exec: (c) => { showPanel("terminal"); exec(c); }, focus: () => inEl && inEl.focus(), label, cd: d => { cwd = d; }, clear, kill, write };
    })();

    // ================= önizleme (sağ panel) =================
    let auxMode = null, previewPath = null, SDK = "";
    fetch("../vemtrio.js").then(r => r.ok ? r.text() : "").then(x => { SDK = x; }).catch(() => { });
    VS.showAux = (mode, title, build) => {
        const aux = $("#aux");
        if (auxMode === mode && !build) { aux.hidden = true; $("#sash-right").hidden = true; auxMode = null; editor && editor.layout(); return; }
        auxMode = mode; aux.hidden = false; $("#sash-right").hidden = false;
        aux.innerHTML = `<div class="aux-head"><span>${esc(title)}</span><div class="row" id="aux-act"></div></div><div class="aux-body" id="aux-body"></div>`;
        setTimeout(() => editor && editor.layout(), 0);
        return { head: $("#aux-act"), body: $("#aux-body") };
    };
    VS.closeAux = () => { $("#aux").hidden = true; $("#sash-right").hidden = true; auxMode = null; editor && editor.layout(); };
    VS.auxMode = () => auxMode;
    async function buildBundle(entry) {
        const files = new Map();
        for (const f of VS.ws.files) if (!VS.isBinaryName(f)) files.set(f.toLowerCase(), f);
        const dir = VS.dirname(entry);
        const resolve = src => { if (/^(?:https:\/\/vemtriotr\.vercel\.app)?\/?(?:\.\/)?vemtrio\.js(?:\?.*)?$/i.test(src) && SDK) return Promise.resolve(SDK); if (/^([a-z]+:)?\/\//i.test(src) || /^data:/i.test(src)) return null; const p = VS.join(dir, src.replace(/^\.\//, "")).split("/").reduce((a, s) => (s === ".." ? a.pop() : a.push(s), a), []).join("/"); const real = files.get(p.toLowerCase()); return real ? textOf(real) : null; };
        let html = await textOf(entry);
        const jobs = [];
        html.replace(/<script([^>]*?)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (m, a, src) => { jobs.push([m, resolve(src), "s", a]); return m; });
        html.replace(/<link([^>]*?)\bhref\s*=\s*["']([^"']+\.css)["']([^>]*)>/gi, (m, a, href) => { jobs.push([m, resolve(href), "c"]); return m; });
        for (const [m, p, kind, attrs] of jobs) { const c = p ? await p : null; if (c == null) continue; html = html.replace(m, kind === "s" ? `<script${attrs.replace(/\btype\s*=\s*["']module["']/i, 'type="module"')}>${c.replace(/<\/script/gi, "<\\/script")}</script>` : `<style>${c.replace(/<\/style/gi, "<\\/style")}</style>`); }
        const SHIM = `<script>(function(){function mk(){var s={};return{getItem:function(k){return k in s?s[k]:null},setItem:function(k,v){s[k]=String(v)},removeItem:function(k){delete s[k]},clear:function(){s={}},key:function(i){return Object.keys(s)[i]||null},get length(){return Object.keys(s).length}}}["localStorage","sessionStorage"].forEach(function(n){try{window[n].setItem("__v","1")}catch(e){Object.defineProperty(window,n,{value:mk()})}});
["log","info","warn","error"].forEach(function(k){var o=console[k];console[k]=function(){try{parent.postMessage({__vprev:1,t:k,text:[].map.call(arguments,function(x){try{return typeof x==="string"?x:JSON.stringify(x)}catch(e){return String(x)}}).join(" ")},"*")}catch(e){}o.apply(console,arguments)}});
window.addEventListener("error",function(e){parent.postMessage({__vprev:1,t:"error",text:e.message+" ("+(e.lineno||"?")+":"+(e.colno||"?")+")"},"*")});})();</script>`;
        html = await inlineAssets(html, dir);
        return html.match(/^\s*<!doctype[^>]*>/i) ? html.replace(/^(\s*<!doctype[^>]*>)/i, "$1" + SHIM) : SHIM + html;
    }
    // Önizlemede resim / ses dosyaları: projedeki dosyalar data: adresine çevrilip HTML, CSS ve JS içindeki
    // göreli yolların yerine yazılır (önizleme kum havuzunda çalıştığı için dosyalara başka türlü ulaşamaz).
    const ASSET = /\.(png|jpe?g|gif|webp|svg|ico|bmp|mp3|wav|ogg|m4a)$/i;
    const relPath = (fromDir, to) => {
        const a = fromDir ? fromDir.split("/").filter(Boolean) : [], b = to.split("/");
        let i = 0; while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
        return "../".repeat(a.length - i) + b.slice(i).join("/");
    };
    const reEsc = x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    async function inlineAssets(html, dir) {
        if (!VS.ws.fs.dataUrl) return html;
        const assets = VS.ws.files.filter(f => ASSET.test(f));
        let budget = 30e6;
        for (const f of assets) {
            const rel = relPath(dir, f), names = [rel, "./" + rel, ...(dir ? [] : ["/" + f])];
            const hit = names.some(n => html.includes(n));
            if (!hit) continue;
            let url = null; try { url = await VS.ws.fs.dataUrl(f); } catch (e) { }
            if (!url || (budget -= url.length) < 0) continue;
            // sadece tırnak ya da url( ) içindeki tam yol değiştirilir: "x.png", 'x.png', `x.png`, url(x.png)
            for (const n of names) html = html.replace(new RegExp("([\"'`(])\\s*" + reEsc(n) + "\\s*([\"'`)])", "g"), (m, a, b) => a + url + b);
        }
        return html;
    }
    VS.preview = async (path) => {
        if (!VS.ws) return VS.toast(t("Önce bir çalışma alanı aç.", "Open a workspace first."), "warn");
        const cand = path || (active && /\.html?$/i.test(active.path) ? active.path : null) || VS.ws.files.find(f => /^index\.html?$/i.test(f)) || VS.ws.files.find(f => /\.html?$/i.test(f));
        if (!cand) return VS.toast(t("Önizlenecek HTML dosyası yok. Yeni bir index.html oluşturup ! yazıp Tab'a bas.", "No HTML file to preview. Create index.html, type ! and press Tab."), "warn");
        previewPath = cand;
        const ui = VS.showAux("preview", t("ÖNİZLEME · ", "PREVIEW · ") + VS.basename(cand), true);
        ui.head.innerHTML = `<button class="ib" data-a="r" title="${t("Yenile", "Reload")}">${VS.ci("refresh")}</button><button class="ib" data-a="w" title="${t("Yeni pencerede aç", "Open in new window")}">${VS.ci("link-external")}</button><button class="ib" data-a="x" title="${t("Kapat", "Close")}">${VS.ci("close")}</button>`;
        ui.head.onclick = async e => { const a = e.target.closest("[data-a]"); if (!a) return; if (a.dataset.a === "r") VS.preview(previewPath); if (a.dataset.a === "x") VS.closeAux(); if (a.dataset.a === "w") { const html = await buildBundle(previewPath); if (N) N.win.preview(html, VS.basename(previewPath)); else {
            // Güvenlik: blob: URL siteyle AYNI origin'de çalışır. Kullanıcı/topluluk kodu doğrudan blob'a yazılırsa
            // localStorage (vcode:aiKey) ve oturumlu /api isteklerine erişir. Bu yüzden blob yalnızca bizim statik
            // sarmalayıcımızı içerir; proje kodu allow-same-origin OLMAYAN sandbox iframe'de (opak origin) çalışır.
            const wrap = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(VS.basename(previewPath))}</title><style>html,body{margin:0;height:100%;background:#fff}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe sandbox="allow-scripts allow-modals allow-pointer-lock allow-forms"></iframe><script>document.querySelector("iframe").srcdoc=${JSON.stringify(html).replace(/</g, "\\u003c")};<\/script></body></html>`;
            const u = URL.createObjectURL(new Blob([wrap], { type: "text/html" })); window.open(u, "_blank", "noopener"); setTimeout(() => URL.revokeObjectURL(u), 60000); } } };
        const fr = document.createElement("iframe");
        fr.setAttribute("sandbox", "allow-scripts allow-modals allow-pointer-lock allow-forms");
        fr.title = "preview"; ui.body.appendChild(fr);
        fr.srcdoc = await buildBundle(cand);
        VS.log(t("Önizleme Konsolu", "Preview Console"), "— " + cand + " —", "m");
    };
    window.addEventListener("message", e => {
        const m = e.data; if (!m) return;
        if (m.__vprev && !(e.source && [...document.querySelectorAll("#aux-body iframe")].some(f => f.contentWindow === e.source))) return;
        if (m.__vprev) VS.log(t("Önizleme Konsolu", "Preview Console"), m.text, m.t === "error" ? "e" : m.t === "warn" ? "w" : "");
        if (m.__vemtrio && e.source) e.source.postMessage({ __vemtrioReply: 1, id: m.id, data: m.type === "player" ? { player: { username: "onizleme", display: "Önizleme", color: "#86b2dc" } } : m.type === "board" ? { rows: [] } : { ok: true, best: (m.data || {}).score, rank: 1, total: 1 } }, "*");
    });
    VS.on("saved", () => { if (auxMode === "preview" && VS.settings["preview.autoRefresh"] && previewPath) VS.preview(previewPath); });

    // ================= durum çubuğu =================
    let chordKey = null;
    VS.on("chord", k => { chordKey = k; renderStatus(); });
    function renderStatus() {
        const pos = editor && active && active.kind === "file" ? editor.getPosition() : null;
        const sel = editor && active && active.kind === "file" ? editor.getSelection() : null;
        const selN = sel && !sel.isEmpty() ? editor.getModel().getValueInRange(sel).length : 0;
        const pc = problemsCount();
        const model = active && active.kind === "file" ? active.model : null;
        const mcpN = VS.mcpConnected ? VS.mcpConnected() : 0;
        $("#statusbar").innerHTML = `<span class="it remote" data-s="remote" title="${t("Çalışma alanı seçenekleri", "Workspace options")}">${N ? "VEMTRIO Desktop" : "VEMTRIO Web"}</span>
            <span class="it" data-s="problems">⊗ ${pc.e} ${pc.w}</span>
            <span class="it" data-s="mcp" title="MCP">MCP: ${mcpN}</span>
            ${chordKey ? `<span class="it" style="color:var(--warn)">(${esc(VS.prettyKey(chordKey))}) ${t("ikinci tuş bekleniyor…", "waiting for second key…")}</span>` : ""}
            <span class="grow"></span>
            ${pos ? `<span class="it" data-s="line">${t("Sat", "Ln")} ${pos.lineNumber}, ${t("Süt", "Col")} ${pos.column}${selN ? ` (${selN} ${t("seçili", "selected")})` : ""}</span>` : ""}
            ${model ? `<span class="it" data-s="indent">${model.getOptions().insertSpaces ? t("Boşluk", "Spaces") : "Tab"}: ${model.getOptions().tabSize}</span><span class="it">UTF-8</span><span class="it" data-s="eol">${model.getEOL() === "\n" ? "LF" : "CRLF"}</span><span class="it" data-s="lang">{ } ${esc(model.getLanguageId())}</span>` : ""}
            ${VS.liveServerOn && VS.liveServerOn() ? `<span class="it" data-s="golive" title="${t("Canlı önizlemeyi aç/kapat (Live Server)", "Toggle live preview (Live Server)")}">◉ Go Live</span>` : ""}
            <span class="it" data-s="theme" title="${t("Renk Teması", "Color Theme")}">◐</span>
            <span class="it" data-s="ai" title="AI">${VS.ci("sparkle")} AI</span>
            <span class="it" data-s="bell" title="${t("Bildirimler", "Notifications")}">${t("Çıktı", "Output")}</span>`;
    }
    VS.renderStatus = renderStatus;

    // ================= hoş geldin =================
    VS.TEMPLATES = [
        { id: "game", icon: "", name: () => t("HTML5 Oyun", "HTML5 Game"), desc: () => t("Canvas, skor ve VEMTRIO liderlik tablosu", "Canvas, score and VEMTRIO leaderboard"), files: {
            "index.html": `<!DOCTYPE html>\n<html lang="tr">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Yıldız Toplayıcı</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <canvas id="c" width="480" height="640"></canvas>\n    <div id="hud">Skor: <b id="s">0</b></div>\n    <script src="/vemtrio.js"></script>\n    <script src="game.js"></script>\n</body>\n</html>\n`,
            "style.css": `body{margin:0;height:100vh;display:grid;place-items:center;background:#0b0d10;color:#fff;font-family:system-ui}\ncanvas{background:radial-gradient(#1b2030,#0b0d10);border:1px solid #2a2d34;max-height:96vh}\n#hud{position:fixed;top:12px;left:16px;font-size:18px}\n`,
            "game.js": `// ← → ya da A D ile hareket et, yıldızları topla, kayalardan kaç!\nconst c = document.getElementById("c"), x = c.getContext("2d");\nconst P = { x: 240, y: 590, w: 40, v: 0 }, keys = {};\nlet items = [], score = 0, over = false, t = 0;\naddEventListener("keydown", e => keys[e.key.toLowerCase()] = true);\naddEventListener("keyup", e => keys[e.key.toLowerCase()] = false);\n\nfunction spawn() {\n    items.push({ x: Math.random() * 460 + 10, y: -20, r: 10, star: Math.random() > .3, s: 2 + Math.random() * 2 + t / 2000 });\n}\nfunction loop() {\n    t++;\n    if (t % 30 === 0) spawn();\n    P.v = (keys.arrowright || keys.d ? 6 : 0) - (keys.arrowleft || keys.a ? 6 : 0);\n    P.x = Math.max(20, Math.min(460, P.x + P.v));\n    x.clearRect(0, 0, 480, 640);\n    x.fillStyle = "#86b2dc"; x.fillRect(P.x - 20, P.y, 40, 14);\n    for (const it of items) {\n        it.y += it.s;\n        x.fillStyle = it.star ? "#f2c94c" : "#ff8a8a";\n        x.beginPath(); x.arc(it.x, it.y, it.r, 0, 7); x.fill();\n        if (Math.abs(it.x - P.x) < 28 && Math.abs(it.y - P.y) < 16) {\n            it.dead = true;\n            if (it.star) score++; else return gameOver();\n        }\n    }\n    items = items.filter(i => !i.dead && i.y < 660);\n    document.getElementById("s").textContent = score;\n    requestAnimationFrame(loop);\n}\nasync function gameOver() {\n    over = true;\n    x.fillStyle = "#fff"; x.font = "bold 32px system-ui"; x.textAlign = "center";\n    x.fillText("Oyun bitti! Skor: " + score, 240, 300);\n    x.font = "16px system-ui"; x.fillText("Yeniden başlamak için tıkla", 240, 340);\n    if (window.Vemtrio) await Vemtrio.saveScore(score); // toplulukta liderlik tablosuna yazar\n    c.onclick = () => { items = []; score = 0; t = 0; over = false; c.onclick = null; loop(); };\n}\nloop();\n` } },
        { id: "web", icon: "", name: () => t("Web Sayfası", "Web Page"), desc: () => t("Modern tek sayfa site iskeleti", "Modern single page scaffold"), files: {
            "index.html": `<!DOCTYPE html>\n<html lang="tr">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Benim Sayfam</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <header><h1>Merhaba</h1><p>Bu sayfayı VEMTRIO Code ile yaptım.</p><button id="b">Tıkla</button></header>\n    <main id="list"></main>\n    <script src="app.js"></script>\n</body>\n</html>\n`,
            "style.css": `:root{--bg:#0f1115;--fg:#e8e8e8;--accent:#86b2dc}\n*{box-sizing:border-box}body{margin:0;font-family:system-ui;background:var(--bg);color:var(--fg)}\nheader{padding:60px 24px;text-align:center}\nbutton{background:var(--accent);border:0;padding:10px 18px;border-radius:6px;font-weight:600;cursor:pointer}\nmain{max-width:640px;margin:0 auto;padding:0 24px;display:grid;gap:10px}\n.card{padding:14px;border:1px solid #2a2d34;border-radius:8px}\n`,
            "app.js": `let n = 0;\ndocument.getElementById("b").onclick = () => {\n    n++;\n    const d = document.createElement("div");\n    d.className = "card";\n    d.textContent = "Kart #" + n;\n    document.getElementById("list").prepend(d);\n    console.log("Kart eklendi", n);\n};\n` } },
        { id: "blank", icon: "", name: () => t("Boş HTML (! + Tab)", "Blank HTML (! + Tab)"), desc: () => t("Boş index.html — ! yaz, Tab'a bas", "Empty index.html — type !, press Tab"), files: { "index.html": "" } },
        { id: "node", icon: "", name: () => t("Node.js Betiği", "Node.js Script"), desc: () => t("node main.js ile terminalde çalıştır", "Run with node main.js in the terminal"), files: {
            "main.js": `// Terminalde çalıştır: node main.js\nconst fib = n => n < 2 ? n : fib(n - 1) + fib(n - 2);\nfor (let i = 0; i < 12; i++) console.log(i, fib(i));\nconsole.log("Bitti!");\n`, "README.md": "# Node.js betiği\n\n`node main.js` ile çalıştır. Tarayıcıda kum havuzunda, masaüstünde gerçek Node.js ile çalışır.\n" } },
        { id: "mcp", icon: "", name: () => t("Kendi MCP Sunucun", "Your own MCP Server"), desc: () => t("Node.js stdio MCP sunucusu (masaüstü)", "Node.js stdio MCP server (desktop)"), files: {
            "server.js": `// Bağımlılıksız, minimal MCP sunucusu (stdio, JSON-RPC 2.0).\n// VEMTRIO Code masaüstünde: MCP görünümü → "+" → tür: stdio, komut: node, argümanlar: server.js\nconst readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nconst send = m => process.stdout.write(JSON.stringify(m) + "\\n");\nconst TOOLS = [\n    { name: "zar_at", description: "N yüzlü bir zar atar", inputSchema: { type: "object", properties: { yuz: { type: "number", description: "Yüz sayısı" } }, required: ["yuz"] } },\n    { name: "saat", description: "Şu anki saati söyler", inputSchema: { type: "object", properties: {} } },\n];\nrl.on("line", line => {\n    let m; try { m = JSON.parse(line); } catch { return; }\n    if (m.method === "initialize") return send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "benim-sunucum", version: "1.0.0" } } });\n    if (m.method === "tools/list") return send({ jsonrpc: "2.0", id: m.id, result: { tools: TOOLS } });\n    if (m.method === "tools/call") {\n        const { name, arguments: a = {} } = m.params;\n        const text = name === "zar_at" ? "Zar: " + (1 + Math.floor(Math.random() * (a.yuz || 6))) : name === "saat" ? new Date().toLocaleTimeString("tr-TR") : "bilinmeyen araç";\n        return send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text }] } });\n    }\n    if (m.id !== undefined) send({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "Method not found" } });\n});\n`,
            ".vscode/mcp.json": `{\n    "servers": {\n        "benim-sunucum": { "type": "stdio", "command": "node", "args": ["server.js"] }\n    }\n}\n`, "README.md": "# Kendi MCP sunucun\n\nMasaüstü uygulamasında MCP görünümünden **Çalışma alanındaki .vscode/mcp.json'u içe aktar** de ve bağlan.\nAraçlarını AI sohbetinde (Ctrl+Alt+I) kullanabilirsin.\n" } },
    ];
    VS.newFromTemplate = async (id) => {
        const tpl = VS.TEMPLATES.find(x => x.id === id); if (!tpl) return;
        let fs;
        if (N && await VS.confirm(t("Şablon diskte yeni bir klasöre mi kurulsun? (Hayır = tarayıcı çalışma alanı)", "Create the template in a folder on disk? (No = browser workspace)"))) { const root = await N.fs.pick(true); if (!root) return; fs = new VS.NativeFS(root); }
        else { fs = new VS.MemFS("default"); if (fs.d && Object.keys(fs.d.files).length && !(await VS.confirm(t("Tarayıcı çalışma alanı bu şablonla değiştirilsin mi? (Eski dosyalar silinir — önce ZIP olarak indirebilirsin)", "Replace the browser workspace with this template? (Old files are removed — you can download a ZIP first)")))) return; await fs.clear(); }
        for (const [p, c] of Object.entries(tpl.files)) await fs.write(p, c);
        await VS.openWorkspace(fs, { force: true });
        if (id === "blank") { VS.toast(t("İpucu: ! yaz ve Tab ya da Enter'a bas → HTML iskeleti. div.kart*3 + Tab da dene!", "Tip: type ! then Tab or Enter → HTML boilerplate. Try div.card*3 + Tab too!"), "ok", 9000); }
        else VS.preview();
    };
    // Yeni proje: önce ne yazacağını seçersin (Web, Python, JavaScript…), sonra adını verirsin.
    // Dosya boş açılır; kodu kişi kendisi yazar. Her proje tarayıcıda ayrı saklanır ("Projelerim").
    VS.PROJE_TURLERI = () => [
        { id: "web", ad: t("Web sayfası / oyun (HTML)", "Web page / game (HTML)"), d: t("index.html · ! yazıp Enter'a bas", "index.html · type ! and press Enter"), dosya: "index.html", ipucu: t("index.html'de ! yazıp Enter'a bas, sayfa iskeleti gelsin. Çalıştırmak için F5.", "In index.html type ! and press Enter. Press F5 to run.") },
        { id: "python", ad: "Python", d: t("main.py · tarayıcıda çalışır", "main.py · runs in the browser"), dosya: "main.py", ipucu: t("main.py'ye kodunu yaz, F5 ile çalıştır. Çıktı terminalde görünür. Örnek: print(\"Merhaba\")", "Write your code in main.py and press F5. Output appears in the terminal.") },
        { id: "js", ad: "JavaScript (Node.js)", d: t("main.js · konsol programı", "main.js · console program"), dosya: "main.js", ipucu: t("main.js'e kodunu yaz, F5 ile çalıştır. console.log çıktısı terminalde.", "Write code in main.js and press F5. console.log shows in the terminal.") },
        { id: "bos", ad: t("Boş proje", "Empty project"), d: t("dosyaları kendin oluştur (Ctrl+N)", "create files yourself (Ctrl+N)"), dosya: "", ipucu: t("Ctrl+N ile istediğin dosyayı oluştur: oyun.py, stil.css, app.js…", "Create any file with Ctrl+N: game.py, style.css, app.js…") },
    ];
    VS.newProject = async (tur) => {
        const T = VS.PROJE_TURLERI();
        tur = tur || await VS.pick(T.map(x => ({ label: x.ad, detail: x.d, value: x.id })), t("Ne yapmak istiyorsun?", "What do you want to build?"));
        const secim = T.find(x => x.id === tur); if (!secim) return;
        const list = VS.store.get("projects", []);
        let name = await VS.prompt(t("Projenin adı", "Project name"), t("Projem ", "My Project ") + (list.length + 1));
        if (name === null) return; name = (name.trim() || t("Projem ", "My Project ") + (list.length + 1)).slice(0, 40);
        const key = "p" + Date.now().toString(36);
        VS.store.set("projects", [{ key, name, tur: secim.id, at: Date.now() }, ...list].slice(0, 50));
        const fs = new VS.MemFS(key); if (secim.dosya) await fs.write(secim.dosya, ""); else fs.save();
        await VS.openWorkspace(fs, { force: true, quiet: true });
        if (secim.dosya) await VS.openFile(secim.dosya);
        VS.toast(secim.ipucu, "ok", 10000);
    };
    VS.myProjects = async () => {
        const list = VS.store.get("projects", []);
        const items = [{ label: t("+ Yeni proje", "+ New project"), value: "__new" }, ...list.map(p => ({ label: p.name, detail: new Date(p.at).toLocaleDateString(), value: p.key })), { label: t("Eski tarayıcı çalışma alanı", "Old browser workspace"), value: "default" }];
        const v = await VS.pick(items, t("Bir proje seç", "Pick a project")); if (!v) return;
        if (v === "__new") return VS.newProject();
        VS.openWorkspace(new VS.MemFS(v));
    };
    // Sade hoş geldin ekranı
    VS.welcome = (el) => {
        const projeler = VS.store.get("projects", []).slice(0, 4);
        el.innerHTML = `<div class="welcome welcome-simple">
            <img class="w-logo" src="../img/logo.png" alt="">
            <h1>${t("Hoş geldin, geliştirici", "Welcome, developer")}</h1>
            <p class="sub">${t("Ne yapmak istersin?", "What would you like to build?")}</p>
            <div class="w-acts">
              <button data-new="web"><b>${t("Web / Oyun", "Web / Game")}</b><span>HTML · CSS · JS</span></button>
              <button data-new="python"><b>Python</b><span>${t("tarayıcıda çalışır", "runs in the browser")}</span></button>
              <button data-new="js"><b>JavaScript</b><span>Node.js</span></button>
              <button data-new="bos"><b>${t("Boş proje", "Empty")}</b><span>${t("kendin oluştur", "start blank")}</span></button>
            </div>
            <div class="w-links"><button data-c="vemtrio.myProjects">${t("Projelerim", "My Projects")}</button><button data-c="vemtrio.openFolder">${t("Klasör aç", "Open folder")}</button><button data-c="view.pool">${t("Kod Havuzu", "Code Pool")}</button><button data-c="ai.toggle">VEMTRIO Topluluk AI</button></div>
            ${projeler.length ? `<div class="w-recent"><small>${t("SON PROJELER", "RECENT PROJECTS")}</small>${projeler.map(p => `<button data-p="${esc(p.key)}">${esc(p.name)}<span>${new Date(p.at).toLocaleDateString()}</span></button>`).join("")}</div>` : ""}
            <p class="w-foot">${VS.kbd(VS.keyFor("workbench.action.showCommands"))} ${t("tüm komutlar", "all commands")} · ${VS.kbd("f5")} ${t("çalıştır", "run")}${N ? "" : ` · <a href="/indir">${t("Masaüstü sürümü", "Desktop app")}</a>`}</p>
        </div>`;
        el.onclick = e => { const c = e.target.closest("[data-c]"), n = e.target.closest("[data-new]"), p = e.target.closest("[data-p]"); if (c) VS.run(c.dataset.c); if (n) VS.newProject(n.dataset.new); if (p) VS.openWorkspace(new VS.MemFS(p.dataset.p)); };
    };

    // ================= ayarlar arayüzü =================
    function settingsUI(el) {
        const s = VS.settings;
        const rows = [
            ["workbench.colorTheme", t("Renk teması", "Color theme"), "select", Object.keys(VS.themes)],
            ["editor.fontSize", t("Yazı boyutu", "Font size"), "number"],
            ["editor.fontFamily", t("Yazı tipi", "Font family"), "text"],
            ["editor.tabSize", t("Sekme genişliği", "Tab size"), "number"],
            ["editor.wordWrap", t("Satır kaydırma", "Word wrap"), "select", ["off", "on", "wordWrapColumn", "bounded"]],
            ["editor.minimap.enabled", t("Mini harita", "Minimap"), "bool"],
            ["editor.lineNumbers", t("Satır numaraları", "Line numbers"), "select", ["on", "off", "relative"]],
            ["editor.fontLigatures", t("Bitişik harfler", "Font ligatures"), "bool"],
            ["editor.stickyScroll.enabled", t("Yapışkan kaydırma", "Sticky scroll"), "bool"],
            ["editor.formatOnSave", t("Kaydederken biçimlendir", "Format on save"), "bool"],
            ["files.autoSave", t("Otomatik kaydet", "Auto save"), "select", ["off", "afterDelay"]],
            ["emmet.enabled", "Emmet (! + Tab)", "bool"],
            ["preview.autoRefresh", t("Kaydedince önizlemeyi yenile", "Refresh preview on save"), "bool"],
            ...(N ? [["terminal.shell", t("Terminal kabuğu", "Terminal shell"), "select", ["powershell", "cmd", "bash"]]] : []),
            ["ai.model", t("AI modeli", "AI model"), "select", ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-2"]],
            ["ai.effort", t("AI düşünme seviyesi", "AI effort"), "select", ["low", "medium", "high", "xhigh", "max"]],
            ["ai.confirmTools", t("AI araç çağrılarını onayla", "Confirm AI tool calls"), "bool"],
        ];
        el.innerHTML = `<div class="settings"><div class="row" style="justify-content:space-between"><h2>${t("Ayarlar", "Settings")}</h2><div class="row"><button class="btn sec" data-j="settings">{ } settings.json</button><button class="btn sec" data-j="keys">keybindings.json</button><button class="btn sec" data-j="mcp">mcp.json</button></div></div>
            <p class="hint">${t("Değişiklikler anında uygulanır ve bu cihazda saklanır.", "Changes apply immediately and are stored on this device.")}</p>
            ${rows.map(([k, l, type, opts]) => `<div class="set"><b>${esc(l)} <i>${esc(k)}</i></b>${type === "bool" ? `<label class="row"><input type="checkbox" data-k="${k}" ${s[k] ? "checked" : ""}> ${t("Açık", "Enabled")}</label>` : type === "select" ? `<select data-k="${k}">${opts.map(o => `<option ${o === s[k] ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>` : `<input data-k="${k}" type="${type}" value="${esc(s[k])}">`}</div>`).join("")}
            <div class="set"><b>${t("Dil", "Language")} <i>VEMTRIO</i></b><select id="set-lang"><option value="tr" ${VS.lang() === "tr" ? "selected" : ""}>Türkçe</option><option value="en" ${VS.lang() === "en" ? "selected" : ""}>English</option></select></div>
            <div class="set"><b>${t("Sıfırla", "Reset")}</b><p>${t("Tüm ayarları, kısayolları ve düzeni varsayılana döndürür.", "Restore all settings, keybindings and layout to defaults.")}</p><div><button class="btn danger" id="set-reset">${t("Varsayılanlara dön", "Reset to defaults")}</button></div></div></div>`;
        el.onchange = e => { const k = e.target.dataset.k; if (k) { const r = rows.find(x => x[0] === k); VS.setSetting(k, r[2] === "bool" ? e.target.checked : r[2] === "number" ? +e.target.value : e.target.value); } if (e.target.id === "set-lang") { document.documentElement.lang = e.target.value; try { localStorage.setItem("vemtrio-lang", e.target.value); } catch (x) { } location.reload(); } };
        el.onclick = async e => { const j = e.target.closest("[data-j]"); if (j) VS.run({ settings: "workbench.action.openSettingsJson", keys: "workbench.action.openGlobalKeybindingsFile", mcp: "mcp.openConfig" }[j.dataset.j]); if (e.target.id === "set-reset" && await VS.confirm(t("Tüm ayarlar sıfırlansın mı?", "Reset all settings?"))) { ["settingsText", "keysText", "layout"].forEach(VS.store.del); location.reload(); } };
    }
    function keybindingsUI(el) {
        const binds = VS.bindings(); const byCmd = {}; for (const [k, id] of binds) (byCmd[id] = byCmd[id] || []).push(k);
        const draw = q => { const list = [...VS.commands.values()].filter(c => !q || (VS.cmdTitle(c) + c.id + (byCmd[c.id] || []).join()).toLowerCase().includes(q.toLowerCase())).sort((a, b) => (byCmd[b.id] ? 1 : 0) - (byCmd[a.id] ? 1 : 0)); $("#kb-list").innerHTML = list.map(c => `<div class="it" data-id="${esc(c.id)}" style="display:grid;grid-template-columns:1.4fr 1fr 1.2fr;gap:12px;padding:6px 16px"><span>${esc((c.cat ? c.cat + ": " : "") + VS.cmdTitle(c))}</span><span>${(byCmd[c.id] || []).map(k => VS.kbd(k)).join(" ") || "<small>—</small>"}</span><small style="font-family:var(--mono)">${esc(c.id)}</small></div>`).join(""); };
        el.innerHTML = `<div class="settings" style="max-width:1100px"><div class="row" style="justify-content:space-between"><h2>${t("Klavye Kısayolları", "Keyboard Shortcuts")}</h2><button class="btn sec" id="kb-json">keybindings.json</button></div><p class="hint">${t("Bir satıra çift tıkla ve yeni tuş kombinasyonuna bas (akor için iki kombinasyon art arda). Esc iptal eder.", "Double-click a row and press the new key combination (two in a row for a chord). Esc cancels.")}</p><input id="kb-q" placeholder="${t("Komut ya da tuş ara", "Search commands or keys")}" style="margin:12px 0"><div style="position:relative;min-height:400px"><div class="list" id="kb-list"></div></div></div>`;
        draw(""); $("#kb-q").oninput = e => draw(e.target.value);
        $("#kb-json").onclick = () => VS.run("workbench.action.openGlobalKeybindingsFile");
        $("#kb-list").ondblclick = async e => {
            const row = e.target.closest("[data-id]"); if (!row) return;
            const id = row.dataset.id; VS.toast(t("Yeni kısayola bas…", "Press the new shortcut…"), "", 2500);
            const keys = [];
            const cap = ev => { ev.preventDefault(); ev.stopPropagation(); if (ev.key === "Escape") return done(); const k = VS.keyOf(ev); if (!k || ["ctrl", "shift", "alt"].includes(k)) return; keys.push(k); if (keys.length === 1) setTimeout(done, 900); else done(); };
            const done = () => { window.removeEventListener("keydown", cap, true); if (!keys.length) return; const key = keys.join(" "); try { const arr = VS.parseJSONC(VS.userText["keybindings.json"]) || []; arr.push({ key, command: id }); VS.userText["keybindings.json"] = JSON.stringify(arr, null, 4); VS.store.set("keysText", VS.userText["keybindings.json"]); loadSettings(); keybindingsUI(el); VS.toast(`${VS.prettyKey(key)} → ${id}`, "ok"); } catch (x) { VS.toast(x.message, "err"); } };
            window.addEventListener("keydown", cap, true);
        };
    }

    // ================= topluluk =================
    const apiHub = async (a, body, q = "") => {
        if (N) return N.site.api(a, body, q);
        try { const r = await fetch("/api/hub?a=" + a + q, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" } : { credentials: "same-origin" }); return await r.json(); } catch (e) { return { ok: false, error: "server" }; }
    };
    VS.apiHub = apiHub;
    let me = undefined;
    VS.communityView = async (body, actions) => {
        actions.innerHTML = `<button title="${t("Yenile", "Refresh")}" data-a="r">${VS.ci("refresh")}</button>`;
        actions.onclick = () => { me = undefined; VS.communityView(body, actions); };
        body.innerHTML = `<div class="pad hint">…</div>`;
        if (me === undefined) { const j = await apiHub("me"); me = j.ok ? j.user : null; }
        const list = await apiHub("posts", null, "&sort=new&start=0");
        if (VS.currentView() !== "community") return;
        body.innerHTML = `<div class="pad col">
            ${me ? `<p class="hint">${t("Giriş yapıldı:", "Signed in as")} <b style="color:var(--fg)">@${esc(me.username)}</b></p>` : `<p class="hint">${t("Paylaşmak için VEMTRIO hesabına giriş yap.", "Sign in to your VEMTRIO account to share.")}</p><button class="btn sec w" data-a="login">${t("Giriş Yap", "Sign In")}</button>`}
            <button class="btn w" data-a="share" ${VS.ws ? "" : "disabled"}>${t("Bu çalışma alanını paylaş", "Share this workspace")}</button>
            <p class="hint">${t("Dosyaların VEMTRIO Guard ile taranır; toplulukta herkes kodunu güvenle inceleyip kum havuzunda çalıştırabilir.", "Files are scanned by VEMTRIO Guard; everyone can review your code and run it in a sandbox.")}</p>
            <button class="btn sec w" data-a="zip" ${VS.ws ? "" : "disabled"}>${t("ZIP olarak indir", "Download as ZIP")}</button></div>
            <div class="sb-sec"><h4>${t("SON PAYLAŞIMLAR · REMIX", "LATEST · REMIX")}</h4>${list.ok && list.posts ? list.posts.slice(0, 30).map(p => `<div class="post"><b>${esc(p.title)}</b><p>${esc(p.summary)}</p><div class="row"><small class="hint">@${esc(p.author)}</small><span class="badge-s ${esc(p.verdict)}">${esc(p.verdict)}</span><span style="flex:1"></span><button class="btn sec" style="height:22px" data-open="${esc(p.id)}">${t("Aç", "Open")}</button><button class="btn" style="height:22px" data-remix="${esc(p.id)}">Remix</button></div></div>`).join("") : `<p class="pad hint">${t("Topluluğa ulaşılamadı.", "Couldn't reach the community.")}</p>`}</div>`;
        body.onclick = async e => {
            const a = e.target.closest("[data-a]"), rm = e.target.closest("[data-remix]"), op = e.target.closest("[data-open]");
            if (op) { const u = "https://vemtriotr.vercel.app/topluluk#/p/" + op.dataset.open; N ? N.openExternal(u) : window.open("/topluluk#/p/" + op.dataset.open, "_blank"); }
            if (rm) remix(rm.dataset.remix);
            if (!a) return;
            if (a.dataset.a === "login") { if (N) { await N.site.login(); me = undefined; VS.communityView(body, actions); } else location.href = "/hesap?next=" + encodeURIComponent("/studio/") + "#/giris"; }
            if (a.dataset.a === "share") VS.run("vemtrio.share");
            if (a.dataset.a === "zip") VS.run("vemtrio.downloadZip");
        };
    };
    async function remix(id) {
        const j = await apiHub("post", null, "&id=" + encodeURIComponent(id));
        if (!j.ok || !j.files) return VS.toast(t("Gönderi yüklenemedi.", "Couldn't load post."), "err");
        const fs = new VS.MemFS("remix-" + id);
        await fs.clear(); for (const f of j.files) await fs.write(f.name, f.content);
        fs.name = "Remix: " + j.post.title;
        await VS.openWorkspace(fs, { force: true });
        VS.toast(t(`"${j.post.title}" remix için açıldı (@${j.post.author}). Değiştir, sonra kendi adınla paylaş!`, `"${j.post.title}" opened for remix (@${j.post.author}). Change it, then share as your own!`), "ok", 7000);
    }
    VS.remix = remix;
    async function shareWorkspace() {
        if (!VS.ws) return VS.toast(t("Önce bir çalışma alanı aç.", "Open a workspace first."), "warn");
        for (const tab of VS.tabs) if (tab.dirty) await saveTab(tab);
        const G = window.VGuard; const LIM = (G && G.LIMITS) || { files: 30, fileBytes: 200 * 1024, totalBytes: 300 * 1024 };
        const files = [], skipped = [];
        for (const f of VS.ws.files) {
            if (VS.isBinaryName(f) || (G && G.isAllowed && !G.isAllowed(f))) { skipped.push(f); continue; }
            const c = await textOf(f); if (c.length > LIM.fileBytes) { skipped.push(f + " (>200KB)"); continue; }
            if (files.length >= LIM.files) { skipped.push(f); continue; }
            files.push({ name: f, content: c });
        }
        const total = files.reduce((a, f) => a + f.content.length, 0);
        if (!files.length) return VS.toast(t("Paylaşılabilir dosya yok.", "No shareable files."), "warn");
        if (total > LIM.totalBytes) return VS.toast(t("Toplam boyut 300 KB'ı geçiyor.", "Total size exceeds 300 KB."), "err");
        let scan = ""; if (G && G.scan) { try { const r = G.scan(files); scan = `<p class="hint">VEMTRIO Guard: <b class="badge-s ${r.verdict}">${r.verdict}</b> · ${r.score}/100 · ${r.findings.length} ${t("bulgu", "findings")}</p>`; if (r.verdict === "danger") return VS.toast(t("Guard tehlikeli kod buldu, paylaşım engellendi.", "Guard found dangerous code; sharing blocked."), "err"); } catch (e) { } }
        const v = await VS.modal(t("Toplulukta paylaş", "Share to community"), [
            { type: "html", html: `<p class="hint">${files.length} ${t("dosya", "files")} · ${VS.kb(total)}${skipped.length ? ` · ${t("atlanan", "skipped")}: ${esc(skipped.slice(0, 4).join(", "))}${skipped.length > 4 ? "…" : ""}` : ""}</p>${scan}` },
            { name: "title", label: t("BAŞLIK (3-60)", "TITLE (3-60)"), value: VS.ws.name.replace(/^Remix: /, "").slice(0, 60) },
            { name: "cat", label: t("KATEGORİ", "CATEGORY"), type: "select", value: "game", options: [["game", t("Oyun", "Game")], ["tool", t("Araç", "Tool")], ["web", "Web"], ["art", t("Sanat", "Art")], ["other", t("Diğer", "Other")]] },
            { name: "summary", label: t("KISA ÖZET (10-160)", "SHORT SUMMARY (10-160)") },
            { name: "desc", label: t("AÇIKLAMA", "DESCRIPTION"), type: "textarea", rows: 4 },
            { name: "tags", label: t("ETİKETLER (virgülle)", "TAGS (comma separated)"), placeholder: "vemtrio-code, 2d" },
            { name: "aiok", label: t("VEMTRIO TOPLULUK AI", "VEMTRIO COMMUNITY AI"), type: "select", value: "1", options: [["1", t("Kodum örnek olarak kullanılabilir (adım gösterilir)", "My code can be used as an example (credited)")], ["0", t("Kullanılmasın", "Do not use my code")]] },
        ], t("Yayınla", "Publish"));
        if (!v) return;
        const P = window.VProfanity; if (P && [v.title, v.summary, v.desc, v.tags].some(x => x && !P.isClean(x))) return VS.toast(t("Metinde uygunsuz ifade var.", "Inappropriate language found."), "err");
        const r = await apiHub("publish", { title: v.title, cat: v.cat, summary: v.summary, desc: v.desc, link: "", tags: String(v.tags || "").split(",").map(x => x.trim()).filter(Boolean).slice(0, 5), files, jam: false, aiok: v.aiok !== "0" });
        if (!r.ok) { if (r.error === "auth") { VS.toast(t("Önce giriş yapmalısın.", "You need to sign in first."), "warn", 6000, [{ label: t("Giriş Yap", "Sign In"), run: async () => { if (N) await N.site.login(); else location.href = "/hesap?next=%2Fstudio%2F#/giris"; } }]); return; } if (r.similar) return VS.toast(r.msg || r.error, "err", 12000, [{ label: t("Benzer paylaşımı aç", "Open similar post"), run: () => window.open((N ? "https://vemtriotr.vercel.app" : "") + "/topluluk#/p/" + r.similar.id, "_blank") }]);
            return VS.toast(t("Paylaşılamadı: ", "Couldn't publish: ") + (r.msg || r.error), "err"); }
        const url = (N ? "https://vemtriotr.vercel.app" : "") + "/topluluk#/p/" + r.post.id;
        VS.toast(r.post.status === "draft" ? t("Taslak olarak kaydedildi. Yayına girmesi için kapak görseli gerekli: gönderiyi aç → “📸 OYUNDAN AL”.", "Saved as a draft. It needs a cover image to go live: open the post → “📸 FROM GAME”.") : r.post.status === "published" ? t("Yayınlandı!", "Published!") : t("Gönderildi, yönetici onayından sonra yayına girecek.", "Submitted; it goes live after review."), r.post.status === "draft" ? "warn" : "ok", 12000, [{ label: t("Gönderiyi aç", "Open post"), run: () => N ? N.openExternal(url) : window.open(url, "_blank") }]);
    }
    async function downloadZip() {
        if (!VS.ws || !window.JSZip) return;
        const zip = new JSZip(); for (const f of VS.ws.files) if (!VS.isBinaryName(f)) zip.file(f, await textOf(f));
        const blob = await zip.generateAsync({ type: "blob" });
        const name = VS.ws.name.replace(/[^\w\- ]+/g, "").trim() || "workspace";
        if (N) { const ok = await N.fs.saveAs(name + ".zip", new Uint8Array(await blob.arrayBuffer())); if (ok) VS.toast(t("Kaydedildi.", "Saved."), "ok"); return; }
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name + ".zip"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }

    // ================= komutlar =================
    const C = VS.cmd;
    C("workbench.action.showCommands", () => t("Komut Paletini Göster", "Show All Commands"), () => VS.palette(">"), ["ctrl+shift+p", "f1"], "View");
    C("workbench.action.quickOpen", () => t("Dosyaya Git…", "Go to File…"), () => VS.palette(""), "ctrl+p", "Go");
    C("workbench.action.gotoLine", () => t("Satıra Git…", "Go to Line…"), () => VS.palette(":"), "ctrl+g", "Go");
    C("workbench.action.gotoSymbol", () => t("Sembole Git…", "Go to Symbol…"), () => { editor && editor.focus(); editor && editor.trigger("k", "editor.action.quickOutline"); }, "ctrl+shift+o", "Go");
    C("vemtrio.newFile", () => t("Yeni Dosya", "New File"), () => VS.newFile(), ["ctrl+n", "ctrl+alt+n"], "File");
    C("vemtrio.newFolder", () => t("Yeni Klasör", "New Folder"), () => VS.newFolder(), null, "File");
    C("vemtrio.openFolder", () => t("Klasör Aç…", "Open Folder…"), VS.openFolder, ["ctrl+k ctrl+o", "ctrl+o"], "File");
    C("vemtrio.openBrowserWs", () => t("Tarayıcı Çalışma Alanını Aç", "Open Browser Workspace"), () => VS.openWorkspace(new VS.MemFS("default")), null, "File");
    C("vemtrio.newProject", () => t("Yeni Proje Başlat", "Start New Project"), () => VS.newProject(), "ctrl+alt+p", "File");
    C("vemtrio.myProjects", () => t("Projelerim", "My Projects"), () => VS.myProjects(), null, "File");
    C("vemtrio.newFromTemplate", () => t("Şablondan Yeni Proje…", "New Project from Template…"), async () => { const p = await VS.pick(VS.TEMPLATES.map(x => ({ label: x.icon + " " + x.name(), detail: x.desc(), value: x.id }))); if (p) VS.newFromTemplate(p); }, null, "File");
    C("workbench.action.files.save", () => t("Kaydet", "Save"), () => saveTab(active), "ctrl+s", "File");
    C("workbench.action.files.saveAll", () => t("Tümünü Kaydet", "Save All"), async () => { for (const x of VS.tabs) if (x.dirty) await saveTab(x); }, "ctrl+alt+s", "File");
    C("workbench.action.closeActiveEditor", () => t("Editörü Kapat", "Close Editor"), () => VS.closeTab(), ["ctrl+w", "ctrl+f4"], "View");
    C("workbench.action.closeAllEditors", () => t("Tüm Editörleri Kapat", "Close All Editors"), async () => { for (const x of VS.tabs.slice()) await VS.closeTab(x); }, "ctrl+k ctrl+w", "View");
    C("workbench.action.reopenClosedEditor", () => t("Kapatılan Editörü Yeniden Aç", "Reopen Closed Editor"), () => { const r = VS.store.get("recentFiles", []).find(f => !tabByPath(f) && VS.ws && VS.ws.files.includes(f)); if (r) VS.openFile(r); }, "ctrl+shift+t", "View");
    C("workbench.action.nextEditor", () => t("Sonraki Editör", "Next Editor"), () => { if (!VS.tabs.length) return; activate(VS.tabs[(VS.tabs.indexOf(active) + 1) % VS.tabs.length]); }, ["ctrl+tab", "ctrl+pagedown"], "View");
    C("workbench.action.previousEditor", () => t("Önceki Editör", "Previous Editor"), () => { if (!VS.tabs.length) return; activate(VS.tabs[(VS.tabs.indexOf(active) - 1 + VS.tabs.length) % VS.tabs.length]); }, ["ctrl+shift+tab", "ctrl+pageup"], "View");
    for (let i = 1; i <= 9; i++) C("workbench.action.openEditorAtIndex" + i, () => t(`${i}. Editörü Aç`, `Open Editor ${i}`), () => VS.tabs[i - 1] && activate(VS.tabs[i - 1]), "alt+" + i, "View");
    C("workbench.action.toggleSidebarVisibility", () => t("Yan Çubuğu Aç/Kapat", "Toggle Primary Side Bar"), () => { $("#wb").classList.toggle("no-side"); renderActivity(); saveLayout(); setTimeout(() => editor && editor.layout(), 0); }, "ctrl+b", "View");
    C("workbench.action.togglePanel", () => t("Paneli Aç/Kapat", "Toggle Panel"), () => { $("#wb").classList.toggle("no-panel"); if (!$("#wb").classList.contains("no-panel")) renderPanel(); saveLayout(); setTimeout(() => editor && editor.layout(), 0); }, "ctrl+j", "View");
    C("workbench.action.terminal.toggleTerminal", () => t("Terminali Aç/Kapat", "Toggle Terminal"), () => { const wb = $("#wb"); if (!wb.classList.contains("no-panel") && curPanel === "terminal") { wb.classList.add("no-panel"); editor && editor.focus(); } else showPanel("terminal"); saveLayout(); setTimeout(() => editor && editor.layout(), 0); }, ["ctrl+`", "ctrl+'", "ctrl+shift+`"], "View");
    C("workbench.action.terminal.clear", () => t("Terminali Temizle", "Clear Terminal"), () => VS.term.clear(), null, "Terminal");
    C("workbench.action.terminal.runActiveFile", () => t("Etkin Dosyayı Terminalde Çalıştır", "Run Active File in Terminal"), () => { if (!active || active.kind !== "file") return; const e = VS.ext(active.path); const cmd = { js: "node", mjs: "node", py: "python", ps1: "powershell -File", ts: "npx tsx", lua: "lua", rb: "ruby", go: "go run", sh: "bash" }[e]; if (!cmd) return VS.toast(t("Bu dosya türü için çalıştırıcı yok.", "No runner for this file type."), "warn"); VS.term.exec(cmd + " " + JSON.stringify(active.path)); }, "ctrl+alt+r", "Terminal");
    C("workbench.action.output.toggleOutput", () => t("Çıktıyı Göster", "Show Output"), () => showPanel("output"), "ctrl+shift+u", "View");
    C("workbench.actions.view.problems", () => t("Sorunları Göster", "Show Problems"), () => showPanel("problems"), "ctrl+shift+m", "View");
    C("workbench.action.toggleMaximizedPanel", () => t("Paneli Büyüt", "Maximize Panel"), () => { $("#wb").classList.toggle("panel-max"); renderPanel(); setTimeout(() => editor && editor.layout(), 0); }, null, "View");
    C("workbench.action.toggleZenMode", () => t("Zen Modu", "Toggle Zen Mode"), () => { const wb = $("#wb"); const zen = !wb.classList.contains("zen"); wb.classList.toggle("zen", zen); wb.classList.toggle("no-side", zen); wb.classList.toggle("no-panel", zen); if (zen) VS.closeAux(); renderActivity(); setTimeout(() => editor && editor.layout(), 0); }, "ctrl+k z", "View");
    C("preview.toggle", () => t("Canlı Önizlemeyi Aç/Kapat", "Toggle Live Preview"), () => auxMode === "preview" ? VS.closeAux() : VS.preview(), "ctrl+shift+v", "Run");
    // Akıllı çalıştır: açık dosyanın diline göre (HTML → önizleme, JS → Node, Python → Python, diğerleri → masaüstü terminali)
    C("vemtrio.run", () => t("Çalıştır", "Run"), async () => {
        const tab = active;
        if (!tab || tab.kind !== "file" || tab.path.startsWith("user:")) { if (VS.ws && VS.ws.files.some(f => /\.html?$/i.test(f))) return VS.preview(); return VS.toast(t("Çalıştırmak için bir dosya aç.", "Open a file to run."), "warn"); }
        if (tab.dirty) await saveTab(tab);
        const e = VS.ext(tab.path), q = JSON.stringify(tab.path);
        if (/^(html?|css)$/.test(e)) return VS.preview(e === "css" ? undefined : tab.path);
        const yerel = N && VS.ws && VS.ws.fs.kind === "native";
        if (/^(m?js|cjs)$/.test(e)) return VS.term.exec("node " + q);
        if (e === "py") return VS.term.exec("python " + q);
        if (yerel) return VS.run("workbench.action.terminal.runActiveFile");
        VS.toast(t(`.${e} dosyaları tarayıcıda çalıştırılamaz. Tarayıcıda HTML, JavaScript ve Python çalışır; diğer diller için masaüstü uygulamasını kullan.`, `.${e} files can't run in the browser. HTML, JavaScript and Python run here; use the desktop app for other languages.`), "warn", 8000);
    }, "f5", "Run");
    C("preview.refresh", () => t("Önizlemeyi Yenile", "Refresh Preview"), () => VS.preview(previewPath), "ctrl+shift+r", "Run");
    C("workbench.action.openSettings", () => t("Ayarları Aç", "Open Settings"), () => VS.openCustom("ui:settings", t("Ayarlar", "Settings"), settingsUI, { icon: "" }), "ctrl+,", "Preferences");
    C("workbench.action.openSettingsJson", () => t("Kullanıcı Ayarlarını Aç (JSON)", "Open User Settings (JSON)"), () => VS.openFile("user:settings.json"), null, "Preferences");
    C("workbench.action.openGlobalKeybindings", () => t("Klavye Kısayolları", "Open Keyboard Shortcuts"), () => VS.openCustom("ui:keys", t("Klavye Kısayolları", "Keyboard Shortcuts"), keybindingsUI, { icon: "" }), "ctrl+k ctrl+s", "Preferences");
    C("workbench.action.openGlobalKeybindingsFile", () => t("Klavye Kısayollarını Aç (JSON)", "Open Keyboard Shortcuts (JSON)"), () => VS.openFile("user:keybindings.json"), null, "Preferences");
    C("workbench.action.selectTheme", () => t("Renk Teması", "Color Theme"), async () => { const cur = VS.settings["workbench.colorTheme"]; const names = Object.keys(VS.themes); const p = await VS.pick(names.map(n => ({ label: n, detail: (n === cur ? "✓ " : "") + (VS.themes[n].ext ? t("eklenti: ", "extension: ") + VS.themes[n].ext : t("yerleşik", "built-in")), value: n }))); if (p) VS.setSetting("workbench.colorTheme", p); }, "ctrl+k ctrl+t", "Preferences");
    C("workbench.action.showWelcome", () => t("Hoş Geldin", "Welcome"), () => VS.openCustom("ui:welcome", t("Hoş Geldin", "Welcome"), VS.welcome, { icon: "★" }), null, "Help");
    C("editor.action.changeLanguage", () => t("Dil Modunu Değiştir", "Change Language Mode"), async () => { if (!active || active.kind !== "file") return; const p = await VS.pick(monaco.languages.getLanguages().map(l => ({ label: (l.aliases && l.aliases[0]) || l.id, detail: l.id, value: l.id }))); if (p) { monaco.editor.setModelLanguage(active.model, p); renderStatus(); } }, "ctrl+k m", "Editor");
    C("editor.action.toggleWordWrap", () => t("Satır Kaydırmayı Aç/Kapat", "Toggle Word Wrap"), () => VS.setSetting("editor.wordWrap", VS.settings["editor.wordWrap"] === "off" ? "on" : "off"), "alt+z", "View");
    C("editor.action.toggleMinimap", () => t("Mini Haritayı Aç/Kapat", "Toggle Minimap"), () => VS.setSetting("editor.minimap.enabled", !VS.settings["editor.minimap.enabled"]), null, "View");
    C("editor.action.fontZoomIn", () => t("Editör Yazısını Büyüt", "Editor Font Zoom In"), () => VS.setSetting("editor.fontSize", Math.min(40, (+VS.settings["editor.fontSize"] || 14) + 1)), ["ctrl+=", "ctrl+shift+="], "View");
    C("editor.action.fontZoomOut", () => t("Editör Yazısını Küçült", "Editor Font Zoom Out"), () => VS.setSetting("editor.fontSize", Math.max(8, (+VS.settings["editor.fontSize"] || 14) - 1)), "ctrl+-", "View");
    C("editor.action.fontZoomReset", () => t("Editör Yazı Boyutunu Sıfırla", "Editor Font Zoom Reset"), () => VS.setSetting("editor.fontSize", 14), "ctrl+0", "View");
    C("editor.action.formatDocument", () => t("Belgeyi Biçimlendir", "Format Document"), () => editor && editor.getAction("editor.action.formatDocument").run(), "shift+alt+f", "Editor");
    C("workbench.action.findInFiles", () => t("Dosyalarda Ara", "Find in Files"), () => showView("search"), "ctrl+shift+h", "Search");
    C("workbench.files.action.refreshFilesExplorer", () => t("Gezgini Yenile", "Refresh Explorer"), refreshTree, null, "File");
    C("vemtrio.share", () => t("Çalışma Alanını Toplulukta Paylaş", "Share Workspace to Community"), shareWorkspace, "ctrl+alt+u", "VEMTRIO");
    C("vemtrio.downloadZip", () => t("Çalışma Alanını ZIP Olarak İndir", "Download Workspace as ZIP"), downloadZip, null, "VEMTRIO");
    C("vemtrio.openSite", () => t("VEMTRIO Sitesini Aç", "Open VEMTRIO Site"), () => N ? N.openExternal("https://vemtriotr.vercel.app/") : window.open("/", "_blank"), null, "VEMTRIO");
    C("vemtrio.download", () => t("Masaüstü Uygulamasını İndir", "Download Desktop App"), () => N ? N.openExternal("https://vemtriotr.vercel.app/indir") : window.open("/indir", "_blank"), null, "VEMTRIO");
    C("vemtrio.resetBrowserWs", () => t("Tarayıcı Çalışma Alanını Temizle", "Clear Browser Workspace"), async () => { if (!(await VS.confirm(t("Tarayıcı çalışma alanındaki tüm dosyalar silinsin mi?", "Delete all files in the browser workspace?")))) return; const fs = new VS.MemFS("default"); await fs.clear(); VS.openWorkspace(fs, { force: true }); }, null, "VEMTRIO");
    C("workbench.action.reloadWindow", () => t("Pencereyi Yeniden Yükle", "Reload Window"), () => location.reload(), "ctrl+r", "Developer");
    C("workbench.action.toggleDevTools", () => t("Geliştirici Araçları", "Toggle Developer Tools"), () => N ? N.win.devtools() : VS.toast("F12", ""), "ctrl+shift+i", "Developer");
    C("workbench.action.toggleFullScreen", () => t("Tam Ekran", "Toggle Full Screen"), () => N ? N.win.fullscreen() : (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()), "f11", "View");
    C("editor.emmet.action.expandAbbreviation", () => "Emmet: " + t("Kısaltmayı Genişlet", "Expand Abbreviation"), () => { editor.focus(); editor.trigger("k", "editor.action.triggerSuggest"); }, null, "Emmet");
    C("workbench.action.focusActiveEditorGroup", () => t("Editöre Odaklan", "Focus Editor"), () => editor && editor.focus(), "ctrl+1", "View");
    C("workbench.action.focusSideBar", () => t("Yan Çubuğa Odaklan", "Focus Side Bar"), () => { if ($("#wb").classList.contains("no-side")) showView(curView); const tr = $("#tree"); tr ? tr.focus() : $("#sb-body").querySelector("input,button")?.focus(); }, "ctrl+0 ctrl+0", "View");
    C("vemtrio.about", () => t("Hakkında", "About"), () => VS.modal("VEMTRIO Code " + VS.version, [{ type: "html", html: `<p class="hint">${t("VS Code tarzı editör · Monaco, Open VSX, Model Context Protocol, Emmet.", "VS Code-style editor · Monaco, Open VSX, Model Context Protocol, Emmet.")}<br>${N ? "Electron " + N.versions.electron + " · Node " + N.versions.node : navigator.userAgent}</p>` }], "OK"), null, "Help");
    // görünüm kısayolları (sonradan kaydolan görünümler için boot'ta da üretilir)
    function viewCommands() { for (const v of VS.viewDefs) if (!VS.commands.has("view." + v.id)) C("view." + v.id, () => t("Görünümü Göster: ", "Show View: ") + v.title(), () => showView(v.id, true), v.key, "View"); }

    // ================= menü çubuğu =================
    const MENUS = () => ({
        [t("Dosya", "File")]: [{ label: t("Yeni Proje", "New Project"), cmd: "vemtrio.newProject" }, { label: t("Projelerim", "My Projects"), cmd: "vemtrio.myProjects" }, { label: t("Yeni Dosya", "New File"), cmd: "vemtrio.newFile" }, { label: t("Kod Havuzundan Ekle…", "Insert from Code Pool…"), cmd: "pool.insert" }, "-", { label: t("Klasör Aç…", "Open Folder…"), cmd: "vemtrio.openFolder" }, { label: t("Tarayıcı Çalışma Alanı", "Browser Workspace"), cmd: "vemtrio.openBrowserWs" }, "-", { label: t("Kaydet", "Save"), cmd: "workbench.action.files.save" }, { label: t("Tümünü Kaydet", "Save All"), cmd: "workbench.action.files.saveAll" }, { label: t("Otomatik Kaydet", "Auto Save") + (VS.settings["files.autoSave"] === "afterDelay" ? " ✓" : ""), run: () => VS.setSetting("files.autoSave", VS.settings["files.autoSave"] === "afterDelay" ? "off" : "afterDelay") }, "-", { label: t("Toplulukta Paylaş…", "Share to Community…"), cmd: "vemtrio.share" }, { label: t("ZIP Olarak İndir", "Download as ZIP"), cmd: "vemtrio.downloadZip" }, "-", { label: t("Tercihler: Ayarlar", "Preferences: Settings"), cmd: "workbench.action.openSettings" }, { label: t("Tercihler: Klavye Kısayolları", "Preferences: Keyboard Shortcuts"), cmd: "workbench.action.openGlobalKeybindings" }, { label: t("Tercihler: Renk Teması", "Preferences: Color Theme"), cmd: "workbench.action.selectTheme" }, "-", { label: t("Editörü Kapat", "Close Editor"), cmd: "workbench.action.closeActiveEditor" }, ...(N ? [{ label: t("Çıkış", "Exit"), run: () => N.win.close() }] : [])],
        [t("Düzen", "Edit")]: [{ label: t("Geri Al", "Undo"), key: "ctrl+z", run: () => editor.trigger("m", "undo") }, { label: t("Yinele", "Redo"), key: "ctrl+y", run: () => editor.trigger("m", "redo") }, "-", { label: t("Bul", "Find"), key: "ctrl+f", run: () => editor.getAction("actions.find").run() }, { label: t("Değiştir", "Replace"), key: "ctrl+h", run: () => editor.getAction("editor.action.startFindReplaceAction").run() }, "-", { label: t("Dosyalarda Bul", "Find in Files"), cmd: "workbench.action.findInFiles" }, "-", { label: t("Satır Yorumunu Aç/Kapat", "Toggle Line Comment"), key: "ctrl+/", run: () => editor.getAction("editor.action.commentLine").run() }, { label: t("Belgeyi Biçimlendir", "Format Document"), cmd: "editor.action.formatDocument" }, { label: "Emmet: " + t("Kısaltmayı Genişlet", "Expand Abbreviation"), key: "tab", cmd: "editor.emmet.action.expandAbbreviation" }],
        [t("Seçim", "Selection")]: [{ label: t("Tümünü Seç", "Select All"), key: "ctrl+a", run: () => editor.trigger("m", "editor.action.selectAll") }, { label: t("Seçimi Genişlet", "Expand Selection"), key: "shift+alt+right", run: () => editor.trigger("m", "editor.action.smartSelect.expand") }, "-", { label: t("Satırı Yukarı Kopyala", "Copy Line Up"), key: "shift+alt+up", run: () => editor.trigger("m", "editor.action.copyLinesUpAction") }, { label: t("Satırı Aşağı Kopyala", "Copy Line Down"), key: "shift+alt+down", run: () => editor.trigger("m", "editor.action.copyLinesDownAction") }, { label: t("Satırı Yukarı Taşı", "Move Line Up"), key: "alt+up", run: () => editor.trigger("m", "editor.action.moveLinesUpAction") }, { label: t("Satırı Aşağı Taşı", "Move Line Down"), key: "alt+down", run: () => editor.trigger("m", "editor.action.moveLinesDownAction") }, "-", { label: t("Yukarı İmleç Ekle", "Add Cursor Above"), key: "ctrl+alt+up", run: () => editor.trigger("m", "editor.action.insertCursorAbove") }, { label: t("Aşağı İmleç Ekle", "Add Cursor Below"), key: "ctrl+alt+down", run: () => editor.trigger("m", "editor.action.insertCursorBelow") }, { label: t("Sonraki Eşleşmeyi Ekle", "Add Next Occurrence"), key: "ctrl+d", run: () => editor.trigger("m", "editor.action.addSelectionToNextFindMatch") }, { label: t("Tüm Eşleşmeleri Seç", "Select All Occurrences"), key: "ctrl+shift+l", run: () => editor.trigger("m", "editor.action.selectHighlights") }],
        [t("Görünüm", "View")]: [{ label: t("Komut Paleti…", "Command Palette…"), cmd: "workbench.action.showCommands" }, "-", ...VS.viewDefs.slice().sort((a, b) => a.order - b.order).map(v => ({ label: v.title()[0] + v.title().slice(1).toLowerCase(), cmd: "view." + v.id })), "-", { label: t("Yan Çubuk", "Side Bar"), cmd: "workbench.action.toggleSidebarVisibility" }, { label: t("Panel", "Panel"), cmd: "workbench.action.togglePanel" }, { label: "Zen", cmd: "workbench.action.toggleZenMode" }, { label: t("Tam Ekran", "Full Screen"), cmd: "workbench.action.toggleFullScreen" }, "-", { label: t("Satır Kaydırma", "Word Wrap"), cmd: "editor.action.toggleWordWrap" }, { label: t("Mini Harita", "Minimap"), cmd: "editor.action.toggleMinimap" }, { label: t("Yakınlaştır", "Zoom In"), cmd: "editor.action.fontZoomIn" }, { label: t("Uzaklaştır", "Zoom Out"), cmd: "editor.action.fontZoomOut" }],
        [t("Git", "Go")]: [{ label: t("Dosyaya Git…", "Go to File…"), cmd: "workbench.action.quickOpen" }, { label: t("Satıra Git…", "Go to Line…"), cmd: "workbench.action.gotoLine" }, { label: t("Sembole Git…", "Go to Symbol…"), cmd: "workbench.action.gotoSymbol" }, "-", { label: t("Tanıma Git", "Go to Definition"), key: "f12", run: () => editor.trigger("m", "editor.action.revealDefinition") }, { label: t("Sonraki Sorun", "Next Problem"), key: "f8", run: () => editor.trigger("m", "editor.action.marker.next") }, "-", { label: t("Sonraki Editör", "Next Editor"), cmd: "workbench.action.nextEditor" }, { label: t("Önceki Editör", "Previous Editor"), cmd: "workbench.action.previousEditor" }],
        [t("Çalıştır", "Run")]: [{ label: t("Çalıştır", "Run"), cmd: "vemtrio.run" }, { label: t("Canlı Önizleme", "Live Preview"), cmd: "preview.toggle" }, { label: t("Önizlemeyi Yenile", "Refresh Preview"), cmd: "preview.refresh" }, { label: t("Etkin Dosyayı Çalıştır", "Run Active File"), cmd: "workbench.action.terminal.runActiveFile" }],
        [t("Terminal", "Terminal")]: [{ label: t("Terminali Aç/Kapat", "Toggle Terminal"), cmd: "workbench.action.terminal.toggleTerminal" }, { label: t("Terminali Temizle", "Clear Terminal"), cmd: "workbench.action.terminal.clear" }, { label: t("Etkin Dosyayı Çalıştır", "Run Active File"), cmd: "workbench.action.terminal.runActiveFile" }],
        [t("Yardım", "Help")]: [{ label: t("Hoş Geldin", "Welcome"), cmd: "workbench.action.showWelcome" }, { label: t("Tüm Komutlar", "Show All Commands"), cmd: "workbench.action.showCommands" }, { label: t("Klavye Kısayolları", "Keyboard Shortcuts"), cmd: "workbench.action.openGlobalKeybindings" }, "-", { label: t("VEMTRIO Sitesi", "VEMTRIO Site"), cmd: "vemtrio.openSite" }, ...(N ? [{ label: t("Geliştirici Araçları", "Developer Tools"), cmd: "workbench.action.toggleDevTools" }] : [{ label: t("Masaüstü Uygulamasını İndir", "Download Desktop App"), cmd: "vemtrio.download" }]), { label: t("Hakkında", "About"), cmd: "vemtrio.about" }],
    });
    function renderMenubar() {
        const m = MENUS(); const bar = $("#menubar");
        bar.innerHTML = Object.keys(m).map(k => `<button data-m="${esc(k)}">${esc(k)}</button>`).join("");
        const open = b => { VS.closeMenu(); b.classList.add("open"); const r = b.getBoundingClientRect(); VS.menu(r.left, r.bottom + 2, MENUS()[b.dataset.m]); };
        bar.onclick = e => { const b = e.target.closest("[data-m]"); if (!b) return; if (b.classList.contains("open")) VS.closeMenu(); else open(b); };
        bar.onmouseover = e => { const b = e.target.closest("[data-m]"); if (b && bar.querySelector(".open") && !b.classList.contains("open")) open(b); };
    }

    // ================= düzen (sash) =================
    function saveLayout() { const wb = $("#wb"), cs = document.documentElement.style; VS.store.set("layout", { side: cs.getPropertyValue("--side-w"), panel: cs.getPropertyValue("--panel-h"), aux: cs.getPropertyValue("--aux-w"), noSide: wb.classList.contains("no-side"), noPanel: wb.classList.contains("no-panel") }); }
    function sash(id, varName, axis, calc) {
        const el = $(id);
        el.onmousedown = e => {
            e.preventDefault(); el.classList.add("drag"); document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";
            const ov = VS.h(`<div style="position:fixed;inset:0;z-index:99"></div>`); document.body.appendChild(ov);
            const mv = ev => { document.documentElement.style.setProperty(varName, calc(ev) + "px"); editor && editor.layout(); };
            const up = () => { el.classList.remove("drag"); document.body.style.cursor = ""; ov.remove(); removeEventListener("mousemove", mv); removeEventListener("mouseup", up); saveLayout(); };
            addEventListener("mousemove", mv); addEventListener("mouseup", up);
        };
    }

    // ================= Monaco =================
    VS.once = (ev, fn) => { const off = VS.on(ev, (...a) => { off(); fn(...a); }); };
    function editorOptions() {
        const s = VS.settings;
        return { fontSize: +s["editor.fontSize"], fontFamily: s["editor.fontFamily"], fontLigatures: !!s["editor.fontLigatures"], tabSize: +s["editor.tabSize"], insertSpaces: !!s["editor.insertSpaces"], wordWrap: s["editor.wordWrap"], minimap: { enabled: !!s["editor.minimap.enabled"] }, lineNumbers: s["editor.lineNumbers"], cursorBlinking: s["editor.cursorBlinking"], cursorSmoothCaretAnimation: s["editor.cursorSmoothCaretAnimation"], smoothScrolling: !!s["editor.smoothScrolling"], renderWhitespace: s["editor.renderWhitespace"], bracketPairColorization: { enabled: !!s["editor.bracketPairColorization.enabled"] }, guides: { bracketPairs: !!s["editor.guides.bracketPairs"] }, stickyScroll: { enabled: !!s["editor.stickyScroll.enabled"] }, linkedEditing: !!s["editor.linkedEditing"] };
    }
    function applySettings() {
        if (editor) { editor.updateOptions(editorOptions()); VS.tabs.forEach(x => x.model && x.model.updateOptions({ tabSize: +VS.settings["editor.tabSize"], insertSpaces: !!VS.settings["editor.insertSpaces"] })); }
        VS.applyTheme(VS.settings["workbench.colorTheme"]);
        renderStatus();
    }
    VS.applySettings = applySettings;
    function loadMonaco() {
        return new Promise((res, rej) => {
            const base = window.MONACO_BASE;
            if (/^https?:/.test(base)) window.MonacoEnvironment = { getWorkerUrl: () => `data:text/javascript;charset=utf-8,${encodeURIComponent(`self.MonacoEnvironment={baseUrl:'${base}/../'};importScripts('${base}/base/worker/workerMain.js');`)}` };
            const s = document.createElement("script"); s.src = base + "/loader.js";
            s.onload = () => { window.require.config({ paths: { vs: base } }); window.require(["vs/editor/editor.main"], () => res(window.monaco), rej); };
            s.onerror = rej; document.head.appendChild(s);
        });
    }

    // ================= başlat =================
    async function boot() {
        // düzen
        const L = VS.store.get("layout", {}); const cs = document.documentElement.style;
        if (L.side) cs.setProperty("--side-w", L.side); if (L.panel) cs.setProperty("--panel-h", L.panel); if (L.aux) cs.setProperty("--aux-w", L.aux);
        if (L.noSide) $("#wb").classList.add("no-side"); if (L.noPanel !== false) $("#wb").classList.add("no-panel");
        $("#sash-right").hidden = true;
        sash("#sash-side", "--side-w", "x", e => Math.max(170, Math.min(innerWidth * .6, e.clientX - 48)));
        sash("#sash-panel", "--panel-h", "y", e => Math.max(80, Math.min(innerHeight - 160, innerHeight - 22 - e.clientY)));
        sash("#sash-right", "--aux-w", "x", e => Math.max(240, Math.min(innerWidth * .7, innerWidth - e.clientX)));
        viewCommands(); renderMenubar(); renderActivity();
        VS.applyTheme(VS.settings["workbench.colorTheme"]);
        $("#tb-search").onclick = () => VS.palette("");
        $("#tb-right").innerHTML = `<button data-c="workbench.action.toggleSidebarVisibility" title="${t("Yan çubuk", "Side bar")} (Ctrl+B)">${VS.ci("layout-sidebar-left")}</button><button data-c="workbench.action.togglePanel" title="Panel (Ctrl+J)">${VS.ci("layout-panel")}</button><button data-c="vemtrio.run" title="${t("Çalıştır", "Run")} (F5)" style="color:var(--ok)">${VS.ci("play")}</button><button data-c="preview.toggle" title="${t("Önizleme", "Preview")} (Ctrl+Shift+V)">${VS.ci("open-preview")}</button><button data-c="ai.toggle" title="AI (Ctrl+Alt+I)">${VS.ci("sparkle")}</button>`;
        $("#tb-right").onclick = e => { const b = e.target.closest("[data-c]"); if (b) VS.run(b.dataset.c); };
        $("#activity").onclick = async e => {
            const b = e.target.closest("[data-v]"); if (b) return showView(b.dataset.v, true);
            if (e.target.closest("[data-gear]")) { const r = e.target.closest("[data-gear]").getBoundingClientRect(); VS.menu(r.right + 4, r.top - 160, [{ label: t("Komut Paleti…", "Command Palette…"), cmd: "workbench.action.showCommands" }, "-", { label: t("Ayarlar", "Settings"), cmd: "workbench.action.openSettings" }, { label: t("Eklentiler", "Extensions"), cmd: "view.extensions" }, { label: t("Klavye Kısayolları", "Keyboard Shortcuts"), cmd: "workbench.action.openGlobalKeybindings" }, { label: t("Renk Teması", "Color Theme"), cmd: "workbench.action.selectTheme" }, { label: "MCP", cmd: "mcp.openConfig" }]); }
            if (e.target.closest("[data-acc]")) showView("community");
        };
        $("#tabs").onclick = e => { const x = e.target.closest("[data-close]"); if (x) { e.stopPropagation(); return VS.closeTab(VS.tabs[+x.dataset.close]); } const tb = e.target.closest(".tab"); if (tb) activate(VS.tabs[+tb.dataset.i]); };
        $("#tabs").onauxclick = e => { const tb = e.target.closest(".tab"); if (tb && e.button === 1) VS.closeTab(VS.tabs[+tb.dataset.i]); };
        $("#tabs").ondblclick = e => { const tb = e.target.closest(".tab"); if (tb) { VS.tabs[+tb.dataset.i].preview = false; renderTabs(); } };
        $("#tabs").oncontextmenu = e => { const tb = e.target.closest(".tab"); if (!tb) return; e.preventDefault(); const tab = VS.tabs[+tb.dataset.i]; VS.menu(e.clientX, e.clientY, [{ label: t("Kapat", "Close"), run: () => VS.closeTab(tab) }, { label: t("Diğerlerini Kapat", "Close Others"), run: async () => { for (const x of VS.tabs.slice()) if (x !== tab) await VS.closeTab(x); } }, { label: t("Tümünü Kapat", "Close All"), cmd: "workbench.action.closeAllEditors" }, "-", ...(tab.kind === "file" && !isUser(tab.path) ? [{ label: t("Göreli Yolu Kopyala", "Copy Relative Path"), run: () => navigator.clipboard.writeText(tab.path) }, { label: t("Gezginde Göster", "Reveal in Explorer"), run: () => { showView("explorer"); selectInTree(tab.path); } }] : [])]); };
        let dragTab = null;
        $("#tabs").ondragstart = e => { const tb = e.target.closest(".tab"); dragTab = tb ? +tb.dataset.i : null; };
        $("#tabs").ondragover = e => e.preventDefault();
        $("#tabs").ondrop = e => { const tb = e.target.closest(".tab"); if (dragTab == null || !tb) return; const [m] = VS.tabs.splice(dragTab, 1); VS.tabs.splice(+tb.dataset.i, 0, m); renderTabs(); };
        $("#panel-tabs").onclick = e => { const p = e.target.closest("[data-p]"); if (p) showPanel(p.dataset.p); const a = e.target.closest("[data-pa]"); if (!a) return; ({ clear: () => { outputs[curOut] = []; renderPanel(); }, tclear: () => VS.term.clear(), kill: () => VS.term.kill(), max: () => VS.run("workbench.action.toggleMaximizedPanel"), close: () => VS.run("workbench.action.togglePanel") })[a.dataset.pa](); };
        $("#panel-tabs").onchange = e => { if (e.target.id === "out-ch") { curOut = e.target.value; renderPanel(); } };
        $("#panel-body").onclick = e => { const ex = e.target.closest("[data-explain]"); if (ex) { e.stopPropagation(); return VS.assistAsk(ex.dataset.explain, +ex.dataset.line); } const it = e.target.closest("[data-u]"); if (it) { const p = decodeURIComponent(monaco.Uri.parse(it.dataset.u).path.slice(1)); VS.openFile(p, { line: +it.dataset.l, col: +it.dataset.c }); } };
        $("#statusbar").onclick = async e => {
            const s = e.target.closest("[data-s]"); if (!s) return;
            const k = s.dataset.s;
            if (k === "problems") showPanel("problems");
            if (k === "line") VS.palette(":");
            if (k === "lang") VS.run("editor.action.changeLanguage");
            if (k === "theme") VS.run("workbench.action.selectTheme");
            if (k === "golive") VS.run("preview.toggle");
            if (k === "mcp") showView("mcp");
            if (k === "ai") VS.run("ai.toggle");
            if (k === "bell") showPanel("output");
            if (k === "indent") { const v = await VS.pick([2, 4, 8].map(n => ({ label: t("Boşluk: ", "Spaces: ") + n, value: n }))); if (v) VS.setSetting("editor.tabSize", v); }
            if (k === "eol" && active && active.model) { active.model.setEOL(active.model.getEOL() === "\n" ? 1 : 0); renderStatus(); }
            if (k === "remote") { const p = await VS.pick([{ label: "" + t("Klasör Aç…", "Open Folder…"), value: "vemtrio.openFolder" }, { label: "" + t("Tarayıcı Çalışma Alanı", "Browser Workspace"), value: "vemtrio.openBrowserWs" }, { label: "" + t("Şablondan Yeni Proje", "New from Template"), value: "vemtrio.newFromTemplate" }, { label: "" + t("Toplulukta Paylaş", "Share to Community"), value: "vemtrio.share" }, ...(N ? [] : [{ label: "" + t("Masaüstü Uygulamasını İndir", "Download Desktop App"), value: "vemtrio.download" }])]); if (p) VS.run(p); }
        };
        window.addEventListener("resize", () => editor && editor.layout());
        window.addEventListener("beforeunload", e => { if (VS.tabs.some(x => x.dirty)) { e.preventDefault(); e.returnValue = ""; } });
        activate(null);

        // Monaco yükle
        try { monaco = await loadMonaco(); }
        catch (e) { VS.toast(t("Editör yüklenemedi. İnternet bağlantını kontrol et.", "Editor failed to load. Check your connection."), "err", 0); return; }
        VS.monaco = monaco;
        editor = monaco.editor.create($("#monaco"), { automaticLayout: true, model: null, ...editorOptions(), padding: { top: 6 }, fixedOverflowWidgets: true, quickSuggestions: { other: true, comments: false, strings: true }, suggest: { preview: false }, inlineSuggest: { enabled: true } });   // öneri önizlemesi kapalı (VS Code varsayılanı): yazarken satır içinde kutulu "<sAmp></sAmp>" gibi hayalet metin çıkmasın
        VS.editor = editor;
        VS.focusEditor = () => editor.focus();
        editor.onDidChangeCursorPosition(VS.debounce(renderStatus, 60));
        editor.onDidChangeCursorSelection(VS.debounce(renderStatus, 60));
        monaco.editor.onDidChangeMarkers(VS.debounce(() => { renderStatus(); if (curPanel === "problems" && !$("#wb").classList.contains("no-panel")) renderPanel(); }, 200));
        VS.on("goto-line", n => { if (editor.getModel()) { editor.revealLineInCenter(n); editor.setPosition({ lineNumber: n, column: 1 }); editor.focus(); } });
        VS.on("goto-symbol", () => { editor.focus(); editor.trigger("k", "editor.action.quickOutline"); });
        // Monaco'nun kendi F1 paletini bizimkiyle değiştir
        editor.addCommand(monaco.KeyCode.F1, () => VS.palette(">"));
        // JS/TS: tarayıcı + node türleri, sözdizimi kontrolü
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({ target: 99, allowNonTsExtensions: true, allowJs: true, checkJs: false, module: 99, lib: ["esnext", "dom"] });
        monaco.languages.typescript.javascriptDefaults.addExtraLib("declare const Vemtrio:{version:string;inVemtrio:boolean;getPlayer():Promise<{username:string,display:string,color:string}|null>;saveScore(score:number):Promise<{ok:boolean,best?:number,rank?:number,total?:number}>;getLeaderboard():Promise<{rank:number,username:string,display:string,score:number}[]>};declare const process:any;declare function require(n:string):any;declare const module:any;", "vemtrio.d.ts");
        // Emmet: "!" + Tab/Enter → HTML iskeleti; ul>li*3, div.kart#ana …
        if (window.emmetMonaco && VS.settings["emmet.enabled"]) { try { emmetMonaco.emmetHTML(monaco, ["html", "php", "javascript", "typescript"]); emmetMonaco.emmetCSS(monaco, ["css", "scss", "less"]); } catch (e) { console.warn("emmet", e); } }
        // VS Code'daki gibi: "!" + Tab/Enter ve "ul>li*3" + Tab doğrudan genişler (öneri penceresi açık olmasa da)
        const TAGS = new Set("a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hr html i iframe img input ins kbd label legend li link main map mark menu meta meter nav noscript object ol optgroup option output p param picture pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr svg".split(" "));
        editor.onKeyDown(e => {
            if (!VS.settings["emmet.enabled"] || !window.emmetMonaco || e.shiftKey || e.ctrlKey || e.altKey) return;
            if (e.keyCode !== monaco.KeyCode.Tab && e.keyCode !== monaco.KeyCode.Enter) return;
            const model = editor.getModel(); if (!model) return;
            const lang = model.getLanguageId(); const css = ["css", "scss", "less"].includes(lang); if (!css && !["html", "php"].includes(lang)) return;
            if (document.querySelector(".suggest-widget.visible") || !editor.getSelection().isEmpty()) return;
            const sc = editor.getContribution("snippetController2"); if (sc && sc.isInSnippet && sc.isInSnippet()) return;   // Tab = sonraki yer tutucu
            const pos = editor.getPosition(); const before = model.getLineContent(pos.lineNumber).slice(0, pos.column - 1);
            if (!css && /=\s*["'][^"']*$/.test(before)) return;                                                             // öznitelik değerinin içindeyiz
            const m = before.match(css ? /([\w\-:!@#.%$]+)$/ : /(?:^|[\s>])((?:!|[\w.#\-$@:]+(?:\[[^\]]*\])?(?:\{[^}]*\})?(?:[>+^*]\d*|[\w.#\-$@:]|\([^)]*\)|\[[^\]]*\]|\{[^}]*\})*))$/);
            if (!m) return; const abbr = m[1];
            if (!css && /<[^>]*$/.test(before.slice(0, before.length - abbr.length))) return;           // etiket içindeyiz
            if (!css && /^[a-z][\w-]*$/i.test(abbr) && !TAGS.has(abbr.toLowerCase())) return;           // düz kelime
            if (e.keyCode === monaco.KeyCode.Enter && !(abbr === "!" || /[>#.*+]/.test(abbr)) ) return;
            if (css && e.keyCode === monaco.KeyCode.Enter) return;
            let out; try { out = emmetMonaco.expandAbbreviation(abbr, { type: css ? "stylesheet" : "markup", syntax: css ? "css" : "html", options: { "output.field": (i, p) => `\${${i}${p ? ":" + p.replace(/[$}\\]/g, "\\$&") : ""}}` } }); } catch (er) { return; }
            if (!out || out === abbr) return;
            e.preventDefault(); e.stopPropagation();
            if (abbr === "!" && VS.lang() === "tr") out = out.replace('lang="en"', 'lang="tr"');
            editor.executeEdits("emmet", [{ range: new monaco.Range(pos.lineNumber, pos.column - abbr.length, pos.lineNumber, pos.column), text: "" }]);
            editor.getContribution("snippetController2").insert(out);
        });
        editor.onDidType(ch => { if (ch === "!" && editor.getModel() && editor.getModel().getLanguageId() === "html") setTimeout(() => editor.trigger("emmet", "editor.action.triggerSuggest"), 0); });
        // user ayarları için JSON şeması (otomatik tamamlama)
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({ validate: true, allowComments: true, trailingCommas: "ignore", schemas: [
            { uri: "vcode://schemas/settings", fileMatch: ["vcode-user:/settings.json"], schema: { type: "object", properties: Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, { type: typeof v === "boolean" ? "boolean" : typeof v === "number" ? "number" : "string", default: v, ...(k === "workbench.colorTheme" ? { enum: Object.keys(VS.themes) } : {}) }])) } },
            { uri: "vcode://schemas/keys", fileMatch: ["vcode-user:/keybindings.json"], schema: { type: "array", items: { type: "object", required: ["key", "command"], properties: { key: { type: "string" }, command: { type: "string", enum: [...VS.commands.keys(), ...[...VS.commands.keys()].map(k => "-" + k)] } } } } },
            { uri: "vcode://schemas/mcp", fileMatch: ["vcode-user:/mcp.json", "**/.vscode/mcp.json"], schema: { type: "object", properties: { servers: { type: "object", additionalProperties: { type: "object", properties: { type: { enum: ["stdio", "http", "sse"] }, command: { type: "string" }, args: { type: "array", items: { type: "string" } }, env: { type: "object" }, url: { type: "string" }, headers: { type: "object" } } } } } } },
        ] });
        applySettings();
        VS.emit("monaco-ready", monaco);

        // başlangıç çalışma alanı (URL: #template=game · #remix=<id> · #new)
        const hash = new URLSearchParams(location.hash.slice(1));
        const last = VS.store.get("lastWs", null);
        if (hash.has("new")) { history.replaceState(null, "", location.pathname); await VS.newProject(); }
        else if (hash.has("pool")) { history.replaceState(null, "", location.pathname); const last2 = VS.store.get("lastWs", null); if (last2 && last2.kind === "mem") await VS.openWorkspace(new VS.MemFS(last2.key), { quiet: true }); VS.showView("pool"); }
        else if (hash.get("template")) { history.replaceState(null, "", location.pathname); await VS.newFromTemplate(hash.get("template")); }
        else if (hash.get("remix")) { history.replaceState(null, "", location.pathname); await remix(hash.get("remix")); }
        else if (last && last.kind === "native" && N) { try { await VS.openWorkspace(new VS.NativeFS(last.root), { quiet: true }); } catch (e) { } }
        else if (last && last.kind === "mem") await VS.openWorkspace(new VS.MemFS(last.key), { quiet: true });
        else showView(curView);
        if (!active) VS.run("workbench.action.showWelcome");
        // Editör açıkken adres #new / #pool / #remix=… olarak değişirse de çalışsın
        window.addEventListener("hashchange", () => {
            const h = new URLSearchParams(location.hash.slice(1)); if (![...h.keys()].length) return;
            history.replaceState(null, "", location.pathname);
            if (h.has("new")) VS.newProject(); else if (h.has("pool")) VS.showView("pool"); else if (h.get("remix")) remix(h.get("remix")); else if (h.get("template")) VS.newFromTemplate(h.get("template"));
        });
        renderPanel();
        if (!VS.store.get("seenTip")) { VS.store.set("seenTip", 1); setTimeout(() => VS.toast(t("İpucu: Ctrl+Shift+P ile tüm komutlar, Ctrl+P ile dosyalar. HTML'de ! yazıp Tab'a bas.", "Tip: Ctrl+Shift+P for all commands, Ctrl+P for files. In HTML, type ! and press Tab."), "", 9000), 800); }
    }
    document.addEventListener("DOMContentLoaded", boot);
})();
