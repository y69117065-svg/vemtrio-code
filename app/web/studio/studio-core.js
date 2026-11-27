/* VEMTRIO Code — çekirdek: yardımcılar, dosya sistemleri, komutlar, kısayollar, palet, menüler, bildirimler.
 * Aynı dosya hem tarayıcıda (/studio) hem masaüstü uygulamasında (Electron, window.vnative köprüsüyle) çalışır. */
(() => {
    const VS = window.VS = { version: "1.0.0" };
    const N = VS.native = window.vnative || null;           // masaüstü köprüsü (yoksa tarayıcıdayız)
    VS.isDesktop = !!N;

    // ---------- yardımcılar ----------
    const lang = () => (document.documentElement.lang === "tr" ? "tr" : "en");
    const t = VS.t = (tr, en) => (lang() === "tr" ? tr : en);
    VS.lang = lang;
    const esc = VS.esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    const $ = VS.$ = (s, r = document) => r.querySelector(s);
    VS.h = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; };
    VS.store = {
        get(k, d) { try { const v = localStorage.getItem("vcode:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem("vcode:" + k, JSON.stringify(v)); return true; } catch (e) { VS.toast(t("Tarayıcı depolaması dolu ya da kapalı.", "Browser storage is full or blocked."), "err"); return false; } },
        del(k) { try { localStorage.removeItem("vcode:" + k); } catch (e) { } },
    };
    // Basit olay yolu
    const subs = {};
    VS.on = (ev, fn) => { (subs[ev] = subs[ev] || []).push(fn); return () => { subs[ev] = subs[ev].filter(f => f !== fn); }; };
    VS.emit = (ev, ...a) => (subs[ev] || []).forEach(f => { try { f(...a); } catch (e) { console.error(e); } });
    VS.basename = p => p.split("/").pop();
    VS.dirname = p => p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "";
    VS.ext = p => { const b = VS.basename(p); return b.includes(".") ? b.slice(b.lastIndexOf(".") + 1).toLowerCase() : ""; };
    VS.join = (...a) => a.filter(Boolean).join("/").replace(/\/+/g, "/").replace(/^\//, "");
    VS.kb = n => (n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(1) + " MB");
    VS.sleep = ms => new Promise(r => setTimeout(r, ms));
    VS.debounce = (fn, ms) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };
    // JSON yorumlu (VS Code ayar/tema dosyaları JSONC'dir)
    VS.parseJSONC = (s) => {
        let out = "", i = 0, inStr = false;
        while (i < s.length) {
            const c = s[i], n = s[i + 1];
            if (inStr) { out += c; if (c === "\\") { out += n || ""; i += 2; continue; } if (c === '"') inStr = false; i++; continue; }
            if (c === '"') { inStr = true; out += c; i++; continue; }
            if (c === "/" && n === "/") { while (i < s.length && s[i] !== "\n") i++; continue; }
            if (c === "/" && n === "*") { i += 2; while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i++; i += 2; continue; }
            out += c; i++;
        }
        return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
    };

    // ---------- dil kimlikleri ----------
    const LANGS = { js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript", html: "html", htm: "html", css: "css", scss: "scss", less: "less", json: "json", jsonc: "json", md: "markdown", py: "python", lua: "lua", cs: "csharp", cpp: "cpp", cc: "cpp", h: "cpp", hpp: "cpp", c: "c", java: "java", go: "go", rs: "rust", php: "php", rb: "ruby", sh: "shell", bash: "shell", ps1: "powershell", bat: "bat", cmd: "bat", xml: "xml", svg: "xml", yml: "yaml", yaml: "yaml", sql: "sql", kt: "kotlin", swift: "swift", dart: "dart", txt: "plaintext", ini: "ini", toml: "ini", dockerfile: "dockerfile", vue: "html", gd: "python", glsl: "cpp", r: "r" };
    VS.langOf = p => { const b = VS.basename(p).toLowerCase(); if (b === "dockerfile") return "dockerfile"; return (VS.extraLangs && VS.extraLangs[VS.ext(p)]) || LANGS[VS.ext(p)] || "plaintext"; };
    const ICONS = { javascript: ["JS", "#e8d44d"], typescript: ["TS", "#3d8fd1"], html: ["<>", "#e4714a"], css: ["#", "#5aa0e8"], scss: ["#", "#d26a9d"], json: ["{}", "#cbcb41"], markdown: ["M↓", "#5aa0e8"], python: ["PY", "#4e9fd6"], lua: ["LU", "#6a7fd1"], csharp: ["C#", "#a07ad6"], cpp: ["C+", "#6a9fd6"], c: ["C", "#6a9fd6"], java: ["JV", "#e26a3c"], go: ["GO", "#5ec2d6"], rust: ["RS", "#de8a5a"], shell: ["$", "#8fe3a0"], powershell: ["PS", "#5aa0e8"], xml: ["<>", "#e4714a"], yaml: ["YM", "#c88"], plaintext: ["≡", "#858b94"] };
    VS.icon = p => { const e = VS.ext(p); if (/^(png|jpe?g|gif|webp|ico|bmp)$/.test(e)) return ["▣", "#a596e0"]; return ICONS[VS.langOf(p)] || ["≡", "#858b94"]; };
    // VS Code'un simge seti (Codicons, Monaco ile birlikte gelir; internetsiz de çalışır)
    VS.ci = (name, style = "") => `<i class="codicon codicon-${name}"${style ? ` style="${style}"` : ""} aria-hidden="true"></i>`;
    // Dosya simgeleri: VS Code'un varsayılan (Seti) temasına benzer renk ve şekiller
    const FI = { html: ["code", "#e37933"], xml: ["code", "#e37933"], json: ["json", "#cbcb41"], markdown: ["markdown", "#519aba"], css: ["#", "#519aba", 1], scss: ["#", "#f55385", 1], javascript: ["JS", "#cbcb41", 1], typescript: ["TS", "#519aba", 1], python: ["py", "#519aba", 1], lua: ["lua", "#519aba", 1], csharp: ["C#", "#a074c4", 1], cpp: ["C++", "#519aba", 1], c: ["C", "#519aba", 1], java: ["J", "#cc3e44", 1], go: ["go", "#519aba", 1], rust: ["rs", "#e37933", 1], shell: ["terminal", "#4d5a5e"], powershell: ["terminal-powershell", "#519aba"], yaml: ["settings", "#a074c4"], plaintext: ["list-flat", "#6d8086"] };
    VS.fileIcon = p => {
        const e = VS.ext(p);
        if (/^(png|jpe?g|gif|webp|ico|bmp|svg)$/.test(e)) return `<span class="fic" style="color:#a074c4">${VS.ci("file-media")}</span>`;
        if (/^(mp3|wav|ogg|m4a)$/.test(e)) return `<span class="fic" style="color:#a074c4">${VS.ci("file-media")}</span>`;
        if (/^(zip|rar|7z)$/.test(e)) return `<span class="fic" style="color:#cbcb41">${VS.ci("file-zip")}</span>`;
        if (/^(license|licence)$/i.test(VS.basename(p))) return `<span class="fic" style="color:#cbcb41">${VS.ci("law")}</span>`;
        const f = FI[VS.langOf(p)];
        if (!f) return `<span class="fic" style="color:#6d8086">${VS.ci("file")}</span>`;
        return f[2] ? `<span class="fic fic-t" style="color:${f[1]}">${f[0]}</span>` : `<span class="fic" style="color:${f[1]}">${VS.ci(f[0])}</span>`;
    };
    VS.isBinaryName = p => /\.(png|jpe?g|gif|webp|ico|bmp|mp3|wav|ogg|mp4|webm|zip|exe|dll|bin|woff2?|ttf|otf|pdf|vsix)$/i.test(p);

    // ---------- dosya sistemleri ----------
    const SKIP = /(^|\/)(node_modules|\.git|__pycache__|\.vs|\.next|dist|build|bin|obj)(\/|$)/;
    // 1) Tarayıcı belleği (localStorage)
    class MemFS {
        constructor(key) { this.key = "mem:" + key; this.kind = "mem"; const pr = (VS.store.get("projects", []) || []).find(p => p.key === key); this.name = pr ? pr.name : t("Tarayıcı Çalışma Alanı", "Browser Workspace"); this.d = VS.store.get(this.key, null) || { files: {}, dirs: [] }; }
        save() { VS.store.set(this.key, this.d); }
        async list() { return { files: Object.keys(this.d.files).sort(), dirs: [...new Set([...this.d.dirs, ...Object.keys(this.d.files).flatMap(f => { const p = f.split("/"); return p.slice(0, -1).map((_, i) => p.slice(0, i + 1).join("/")); })])].sort() }; }
        async read(p) { if (!(p in this.d.files)) throw new Error("ENOENT " + p); return this.d.files[p]; }
        async dataUrl() { return null; }
        async write(p, c) { this.d.files[p] = c; this.save(); }
        async mkdir(p) { if (!this.d.dirs.includes(p)) this.d.dirs.push(p); this.save(); }
        async remove(p) { delete this.d.files[p]; for (const f of Object.keys(this.d.files)) if (f.startsWith(p + "/")) delete this.d.files[f]; this.d.dirs = this.d.dirs.filter(d => d !== p && !d.startsWith(p + "/")); this.save(); }
        async rename(a, b) {
            if (a in this.d.files) { this.d.files[b] = this.d.files[a]; delete this.d.files[a]; }
            for (const f of Object.keys(this.d.files)) if (f.startsWith(a + "/")) { this.d.files[b + f.slice(a.length)] = this.d.files[f]; delete this.d.files[f]; }
            this.d.dirs = this.d.dirs.map(d => d === a || d.startsWith(a + "/") ? b + d.slice(a.length) : d); this.save();
        }
        async clear() { this.d = { files: {}, dirs: [] }; this.save(); }
    }
    // 2) Gerçek klasör (Chrome/Edge: File System Access API)
    class DirFS {
        constructor(h) { this.h = h; this.kind = "dir"; this.name = h.name; }
        async _dir(path, create) { let d = this.h; for (const part of path.split("/").filter(Boolean)) d = await d.getDirectoryHandle(part, { create }); return d; }
        async list() {
            const files = [], dirs = [];
            const walk = async (d, pre) => { for await (const [name, h] of d.entries()) { const p = pre ? pre + "/" + name : name; if (SKIP.test(p)) continue; if (files.length > 4000) return; if (h.kind === "directory") { dirs.push(p); await walk(h, p); } else files.push(p); } };
            await walk(this.h, ""); return { files: files.sort(), dirs: dirs.sort() };
        }
        async read(p) { const d = await this._dir(VS.dirname(p)); const f = await (await d.getFileHandle(VS.basename(p))).getFile(); return await f.text(); }
        // resim/ses dosyası -> data: adresi (önizleme ve resim görüntüleyici için)
        async dataUrl(p) { const d = await this._dir(VS.dirname(p)); const f = await (await d.getFileHandle(VS.basename(p))).getFile(); if (f.size > 15e6) return null; return await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsDataURL(f); }); }
        async write(p, c) { const d = await this._dir(VS.dirname(p), true); const w = await (await d.getFileHandle(VS.basename(p), { create: true })).createWritable(); await w.write(c); await w.close(); }
        async mkdir(p) { await this._dir(p, true); }
        async remove(p) { const d = await this._dir(VS.dirname(p)); await d.removeEntry(VS.basename(p), { recursive: true }); }
        async rename(a, b) {
            const { files } = await this.list();
            const inside = files.filter(f => f === a || f.startsWith(a + "/"));
            for (const f of inside) await this.write(b + f.slice(a.length), await this.read(f));
            await this.remove(a);
        }
    }
    // 3) Masaüstü (Electron, gerçek disk)
    class NativeFS {
        constructor(root) { this.root = root; this.kind = "native"; this.name = root.split(/[\\/]/).filter(Boolean).pop() || root; }
        list() { return N.fs.list(this.root); }
        read(p) { return N.fs.read(this.root, p); }
        dataUrl(p) { return N.fs.dataUrl ? N.fs.dataUrl(this.root, p) : Promise.resolve(null); }
        write(p, c) { return N.fs.write(this.root, p, c); }
        mkdir(p) { return N.fs.mkdir(this.root, p); }
        remove(p) { return N.fs.remove(this.root, p); }
        rename(a, b) { return N.fs.rename(this.root, a, b); }
    }
    VS.MemFS = MemFS; VS.DirFS = DirFS; VS.NativeFS = NativeFS;

    // ---------- bildirimler ----------
    VS.toast = (text, kind = "", ms = 4200, actions) => {
        const el = VS.h(`<div class="toast ${kind}"><div>${esc(text)}</div><button class="ib" aria-label="close">✕</button></div>`);
        if (actions) { const r = VS.h(`<div class="row" style="margin-top:8px"></div>`); actions.forEach(a => { const b = VS.h(`<button class="btn ${a.sec ? "sec" : ""}">${esc(a.label)}</button>`); b.onclick = () => { el.remove(); a.run(); }; r.appendChild(b); }); el.firstElementChild.appendChild(r); ms = Math.max(ms, 9000); }
        el.querySelector(".ib").onclick = () => el.remove();
        $("#toasts").appendChild(el);
        if (ms) setTimeout(() => el.remove(), ms);
        VS.emit("notify", text, kind);
        return el;
    };
    // Basit modal: alanlar → değerler
    VS.modal = (title, fields, okLabel) => new Promise(resolve => {
        const wrap = $("#modal"), box = $("#modal-box");
        box.innerHTML = `<h2>${esc(title)}</h2>${fields.map((f, i) => f.type === "html" ? f.html : `<label class="f">${esc(f.label)}${f.type === "select" ? `<select data-i="${i}">${f.options.map(o => `<option value="${esc(o[0])}" ${o[0] === f.value ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>` : f.type === "textarea" ? `<textarea data-i="${i}" rows="${f.rows || 5}" placeholder="${esc(f.placeholder || "")}">${esc(f.value || "")}</textarea>` : `<input data-i="${i}" type="${f.type || "text"}" value="${esc(f.value || "")}" placeholder="${esc(f.placeholder || "")}">`}</label>`).join("")}
            <div class="row" style="justify-content:flex-end"><button class="btn sec" data-x>${t("İptal", "Cancel")}</button><button class="btn" data-ok>${esc(okLabel || "OK")}</button></div>`;
        wrap.hidden = false;
        const first = box.querySelector("[data-i]"); if (first) setTimeout(() => first.focus(), 30);
        const done = v => { wrap.hidden = true; box.innerHTML = ""; resolve(v); };
        box.querySelector("[data-x]").onclick = () => done(null);
        box.querySelector("[data-ok]").onclick = () => { const v = {}; box.querySelectorAll("[data-i]").forEach(el => { const f = fields[+el.dataset.i]; v[f.name] = el.value; }); done(v); };
        box.onkeydown = e => { if (e.key === "Escape") done(null); if (e.key === "Enter" && e.target.tagName === "INPUT") box.querySelector("[data-ok]").click(); };
    });
    VS.prompt = async (title, value, placeholder) => { const r = await VS.modal(title, [{ name: "v", label: "", value, placeholder }], "OK"); return r ? r.v : null; };
    VS.confirm = async (text) => !!(await VS.modal(text, [], t("Evet", "Yes")));

    // ---------- komutlar ve kısayollar ----------
    const CMDS = new Map();
    VS.commands = CMDS;
    VS.cmd = (id, title, run, key, cat) => { CMDS.set(id, { id, title, run, key, cat }); };
    VS.run = async (id, ...a) => { const c = CMDS.get(id); if (!c) { VS.toast(t("Komut bulunamadı: ", "Command not found: ") + id, "err"); return; } try { return await c.run(...a); } catch (e) { console.error(e); VS.toast(String(e.message || e), "err"); } };
    VS.cmdTitle = c => typeof c.title === "function" ? c.title() : c.title;
    // Tuş adları (fiziksel tuş: Türkçe klavyede de doğru çalışsın diye e.code kullanılır)
    const CODE = { Backquote: "`", Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]", Backslash: "\\", Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/", Space: "space", Enter: "enter", NumpadEnter: "enter", Escape: "escape", Tab: "tab", Backspace: "backspace", Delete: "delete", ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", PageUp: "pageup", PageDown: "pagedown", Home: "home", End: "end", NumpadAdd: "=", NumpadSubtract: "-" };
    VS.keyOf = e => {
        let k = e.code.startsWith("Key") ? e.code.slice(3).toLowerCase() : e.code.startsWith("Digit") ? e.code.slice(5) : /^F\d+$/.test(e.code) ? e.code.toLowerCase() : CODE[e.code];
        if (!k) return null;
        return [e.ctrlKey || e.metaKey ? "ctrl" : "", e.shiftKey ? "shift" : "", e.altKey ? "alt" : "", k].filter(Boolean).join("+");
    };
    VS.prettyKey = k => k ? k.split(" ").map(c => c.split("+").map(p => p === "ctrl" ? "Ctrl" : p === "shift" ? "Shift" : p === "alt" ? "Alt" : p === "`" ? "`" : p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)).join("+")).join(" ") : "";
    VS.kbd = k => k ? k.split(" ").map(c => `<kbd>${esc(VS.prettyKey(c))}</kbd>`).join(" ") : "";
    // Etkin bağlar: varsayılan + kullanıcının keybindings.json dosyası
    VS.userKeys = [];
    VS.bindings = () => {
        const m = new Map();
        for (const c of CMDS.values()) for (const k of [].concat(c.key || [])) m.set(k, c.id);
        for (const b of VS.userKeys) {
            if (!b || !b.key) continue;
            const key = String(b.key).toLowerCase().replace(/cmd|meta/g, "ctrl").replace(/\s+/g, " ").trim();
            if (String(b.command || "").startsWith("-")) { if (m.get(key) === b.command.slice(1)) m.delete(key); } else m.set(key, b.command);
        }
        return m;
    };
    VS.keyFor = id => { for (const [k, v] of VS.bindings()) if (v === id) return k; return ""; };
    let chord = null, chordTimer;
    window.addEventListener("keydown", e => {
        if (!$("#palette").hidden || !$("#modal").hidden) return;
        const k = VS.keyOf(e); if (!k) return;
        if (["ctrl", "shift", "alt"].includes(k)) return;
        const binds = VS.bindings();
        const full = chord ? chord + " " + k : k;
        if (binds.has(full)) {
            e.preventDefault(); e.stopPropagation(); chord = null; VS.emit("chord", null);
            VS.run(binds.get(full)); return;
        }
        if (!chord && [...binds.keys()].some(b => b.startsWith(k + " "))) {
            e.preventDefault(); e.stopPropagation(); chord = k; VS.emit("chord", k);
            clearTimeout(chordTimer); chordTimer = setTimeout(() => { chord = null; VS.emit("chord", null); }, 2500); return;
        }
        if (chord) { e.preventDefault(); e.stopPropagation(); VS.toast(`(${VS.prettyKey(full)}) ` + t("bir komuta bağlı değil.", "is not a command."), "warn", 2200); chord = null; VS.emit("chord", null); }
    }, true);

    // ---------- komut paleti / hızlı açma ----------
    const pal = { items: [], idx: 0, mode: "" };
    const fuzzy = (q, s) => {
        if (!q) return { score: 1, html: esc(s) };
        const lq = q.toLowerCase(), ls = s.toLowerCase();
        const at = ls.indexOf(lq);
        if (at >= 0) return { score: 100 - at - s.length * .01, html: esc(s.slice(0, at)) + "<mark>" + esc(s.slice(at, at + q.length)) + "</mark>" + esc(s.slice(at + q.length)) };
        let i = 0, html = "", score = 0;
        for (let j = 0; j < s.length; j++) { if (i < lq.length && ls[j] === lq[i]) { html += "<mark>" + esc(s[j]) + "</mark>"; i++; score += 2; } else html += esc(s[j]); }
        return i === lq.length ? { score: score - s.length * .05, html } : null;
    };
    VS.palette = (prefix = "", custom) => {
        const wrap = $("#palette"), inp = $("#pal-in");
        wrap.hidden = false; pal.custom = custom || null;
        inp.value = prefix; inp.placeholder = custom ? custom.placeholder || "" : t("Dosya adı yaz · > komut · : satır · ? yardım", "Type a file name · > command · : line · ? help");
        render(); inp.focus();
    };
    VS.pick = (items, placeholder) => new Promise(res => VS.palette("", { items, placeholder, done: res }));
    const closePal = (v) => { $("#palette").hidden = true; if (pal.custom) { const c = pal.custom; pal.custom = null; c.done(v); } VS.emit("palette-closed"); };
    async function render() {
        const q = $("#pal-in").value; let items = [];
        if (pal.custom) {
            items = pal.custom.items.map(it => { const f = fuzzy(q, it.label + " " + (it.detail || "")); return f && { ...it, html: fuzzy(q, it.label)?.html || esc(it.label), score: f.score }; }).filter(Boolean).sort((a, b) => b.score - a.score);
        } else if (q.startsWith(">")) {
            const qq = q.slice(1).trim(); const binds = VS.bindings(); const keyOf = id => { for (const [k, v] of binds) if (v === id) return k; return ""; };
            const recent = VS.store.get("recentCmds", []);
            items = [...CMDS.values()].map(c => { const title = (c.cat ? c.cat + ": " : "") + VS.cmdTitle(c); const f = fuzzy(qq, title); return f && { label: title, html: f.html, key: keyOf(c.id), score: f.score + (recent.includes(c.id) && !qq ? 50 - recent.indexOf(c.id) : 0), run: () => { VS.store.set("recentCmds", [c.id, ...recent.filter(x => x !== c.id)].slice(0, 8)); VS.run(c.id); } }; }).filter(Boolean).sort((a, b) => b.score - a.score);
        } else if (q.startsWith(":")) {
            const n = parseInt(q.slice(1)); items = [{ label: isNaN(n) ? t("Satır numarası yaz", "Type a line number") : t(`${n}. satıra git`, `Go to line ${n}`), html: "", run: () => !isNaN(n) && VS.emit("goto-line", n) }];
        } else if (q.startsWith("?")) {
            items = [[">", t("Komutları göster ve çalıştır", "Show and run commands")], [":", t("Satıra git", "Go to line")], ["", t("Dosya aç (adına göre)", "Open a file by name")], ["@", t("Belgedeki sembole git", "Go to symbol in editor")]].map(([p, d]) => ({ label: p || "…", detail: d, run: () => VS.palette(p) }));
        } else if (q.startsWith("@")) {
            closePal(); VS.emit("goto-symbol"); return;
        } else {
            const files = VS.ws ? VS.ws.files : [];
            const recent = VS.store.get("recentFiles", []);
            items = files.map(f => { const fz = fuzzy(q, VS.basename(f)) || (q.includes("/") && fuzzy(q, f)); return fz && { label: VS.basename(f), html: fz.html, detail: VS.dirname(f), file: f, score: fz.score + (recent.includes(f) ? 30 - recent.indexOf(f) : 0), run: () => VS.openFile(f) }; }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 80);
            if (!q && !files.length) items = [{ label: t("Henüz dosya yok — > yazıp komut çalıştırabilirsin", "No files yet — type > for commands"), html: "", run: () => VS.palette(">") }];
        }
        pal.items = items; pal.idx = 0; draw();
    }
    function draw() {
        const list = $("#pal-list");
        list.innerHTML = pal.items.slice(0, 200).map((it, i) => `<div class="pal-it ${i === pal.idx ? "on" : ""}" data-i="${i}">${it.file ? `<span style="color:${VS.icon(it.file)[1]};font:700 9px var(--mono);width:18px">${esc(VS.icon(it.file)[0])}</span>` : it.icon ? `<span>${it.icon}</span>` : ""}<span>${it.html || esc(it.label)}</span>${it.detail ? `<span class="d">${esc(it.detail)}</span>` : ""}<span class="k">${VS.kbd(it.key)}</span></div>`).join("") || `<div class="pal-sep">${t("Eşleşme yok", "No matching results")}</div>`;
        const on = list.querySelector(".on"); if (on) on.scrollIntoView({ block: "nearest" });
    }
    const pick = i => { const it = pal.items[i]; if (!it) return; if (pal.custom) { pal.custom.items = []; closePal(it.value !== undefined ? it.value : it); return; } closePal(); setTimeout(() => it.run && it.run(), 0); };
    document.addEventListener("DOMContentLoaded", () => {
        $("#pal-in").addEventListener("input", render);
        $("#pal-in").addEventListener("keydown", e => {
            if (e.key === "ArrowDown") { e.preventDefault(); pal.idx = Math.min(pal.items.length - 1, pal.idx + 1); draw(); }
            else if (e.key === "ArrowUp") { e.preventDefault(); pal.idx = Math.max(0, pal.idx - 1); draw(); }
            else if (e.key === "Enter") { e.preventDefault(); pick(pal.idx); }
            else if (e.key === "Escape") { e.preventDefault(); closePal(null); VS.focusEditor && VS.focusEditor(); }
            else if (e.key === "Tab") { e.preventDefault(); }
        });
        $("#pal-list").addEventListener("mousedown", e => { const it = e.target.closest(".pal-it"); if (it) { e.preventDefault(); pick(+it.dataset.i); } });
        $("#palette").addEventListener("mousedown", e => { if (e.target.id === "palette") closePal(null); });
    });

    // ---------- menüler ----------
    VS.menu = (x, y, items) => {
        const pop = $("#menu-pop");
        pop.innerHTML = items.map((it, i) => it === "-" ? "<hr>" : `<button data-i="${i}" ${it.disabled ? "disabled style=opacity:.4" : ""}><span>${esc(it.label)}</span>${VS.kbd(it.key || (it.cmd ? VS.keyFor(it.cmd) : ""))}</button>`).join("");
        pop.hidden = false;
        const r = pop.getBoundingClientRect();
        pop.style.left = Math.min(x, innerWidth - r.width - 6) + "px"; pop.style.top = Math.min(y, innerHeight - r.height - 6) + "px";
        pop.onclick = e => { const b = e.target.closest("button[data-i]"); if (!b) return; const it = items[+b.dataset.i]; VS.closeMenu(); it.cmd ? VS.run(it.cmd) : it.run && it.run(); };
    };
    VS.closeMenu = () => { $("#menu-pop").hidden = true; document.querySelectorAll(".menubar button.open").forEach(b => b.classList.remove("open")); };
    document.addEventListener("mousedown", e => { if (!e.target.closest("#menu-pop") && !e.target.closest(".menubar")) VS.closeMenu(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#menu-pop").hidden) VS.closeMenu(); });
})();
