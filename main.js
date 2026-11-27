// VEMTRIO Code — Electron ana süreci.
// Arayüz app://vemtrio/studio/index.html (sitedeki /studio ile aynı kod). Yerel güçler preload.js köprüsüyle verilir:
// gerçek dosya sistemi (sadece açılan klasörün içi), terminal, stdio MCP sunucuları, CORS'suz HTTP ve VEMTRIO hesabı.
const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, session, Menu, nativeTheme } = require("electron");
const path = require("path"), fs = require("fs"), fsp = fs.promises, { spawn } = require("child_process"), { pathToFileURL } = require("url");

const SITE = "https://vemtriotr.vercel.app";
const WEB = path.join(__dirname, "app", "web");
const SKIP = /(^|[\\/])(node_modules|\.git|__pycache__|\.vs|\.next|dist|build|bin|obj)([\\/]|$)/;
protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
if (!app.requestSingleInstanceLock()) app.quit();

let win;
function createWindow() {
    win = new BrowserWindow({
        width: 1400, height: 900, minWidth: 720, minHeight: 480, backgroundColor: "#1b1d22", title: "VEMTRIO Code",
        icon: path.join(__dirname, "build", "icon.png"),
        titleBarStyle: "hidden", titleBarOverlay: { color: "#111316", symbolColor: "#d4d7dc", height: 34 },
        webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: false },
    });
    win.loadURL("app://vemtrio/studio/index.html");
    // Yeni pencere / dış bağlantılar sistem tarayıcısında açılır
    win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
    win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("app://vemtrio/")) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
    win.on("close", () => killAll());
    // Otomatik duman testi: VCODE_SMOKE=1 → arayüz yüklenince temel durumu yazdır ve çık
    if (process.env.VCODE_SMOKE) win.webContents.once("did-finish-load", () => setTimeout(async () => {
        try { console.log("SMOKE", JSON.stringify(await win.webContents.executeJavaScript(process.env.VCODE_SMOKE_JS || `({monaco:!!window.monaco,editor:!!(window.VS&&VS.editor),desktop:VS.isDesktop,cmds:VS.commands.size})`))); }
        catch (er) { console.log("SMOKE-ERR", er.message); }
        app.quit();
    }, 6000));
    if (process.env.VCODE_SMOKE) win.webContents.on("console-message", (e) => { const m = e.message || ""; if (/error/i.test(m)) console.log("CONSOLE", m.slice(0, 300)); });
}
app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    nativeTheme.themeSource = "dark";
    protocol.handle("app", req => {
        const u = new URL(req.url);
        const p = path.normalize(path.join(WEB, decodeURIComponent(u.pathname)));
        if (!p.startsWith(WEB)) return new Response("forbidden", { status: 403 });
        return net.fetch(pathToFileURL(p).toString());
    });
    createWindow();
    setTimeout(checkForUpdate, 5000); // açılıştan biraz sonra, editörü yavaşlatmadan
});

// ---- güncelleme kontrolü: GitHub'daki son sürüm daha yeniyse kullanıcıya sorar ----
// "Sonra" denen sürüm bir daha sorulmaz (userData/update.json). İnternet yoksa sessizce geçer.
const RELEASES = "https://api.github.com/repos/y69117065-svg/vemtrio-code/releases/latest";
const newer = (a, b) => { const x = String(a).replace(/^v/, "").split(".").map(Number), y = String(b).replace(/^v/, "").split(".").map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
async function checkForUpdate() {
    if (process.env.VCODE_SMOKE) return;
    try {
        const r = await net.fetch(RELEASES, { headers: { "User-Agent": "VEMTRIO-Code/" + app.getVersion(), Accept: "application/vnd.github+json" } });
        if (!r.ok) return;
        const rel = await r.json(), latest = String(rel.tag_name || "").replace(/^v/, "");
        if (!latest || !newer(latest, app.getVersion())) return;
        const file = path.join(app.getPath("userData"), "update.json");
        let skip = ""; try { skip = JSON.parse(fs.readFileSync(file, "utf8")).skip || ""; } catch (e) { }
        if (skip === latest || !win) return;
        const notes = String(rel.body || "").replace(/\r/g, "").split("\n").filter(Boolean).slice(0, 8).join("\n");
        const { response } = await dialog.showMessageBox(win, {
            type: "info", title: "VEMTRIO Code güncellemesi",
            message: `Yeni sürüm hazır: v${latest}`,
            detail: `Kullandığın sürüm: v${app.getVersion()}\n\n${notes ? "Yenilikler:\n" + notes + "\n\n" : ""}İndirip kurduğunda ayarların ve projelerin korunur.`,
            buttons: ["İndir", "Sonra"], defaultId: 0, cancelId: 1, noLink: true,
        });
        if (response === 0) shell.openExternal(SITE + "/indir");
        else fs.writeFileSync(file, JSON.stringify({ skip: latest }));
    } catch (e) { /* çevrimdışı ya da GitHub'a ulaşılamadı: sessizce geç */ }
}
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on("window-all-closed", () => { killAll(); app.quit(); });

// ---------- dosya sistemi (her yol açılan kök klasörün içinde kalmak zorunda) ----------
const inRoot = (root, rel) => { const r = path.resolve(root); const p = path.resolve(r, rel || ""); if (p !== r && !p.startsWith(r + path.sep)) throw new Error("Yol çalışma alanı dışında: " + rel); return p; };
ipcMain.handle("fs:pick", async (e, create) => { const r = await dialog.showOpenDialog(win, { properties: ["openDirectory", ...(create ? ["createDirectory", "promptToCreate"] : [])], title: create ? "Şablon için klasör seç" : "Klasör Aç" }); if (r.canceled || !r.filePaths[0]) return null; fs.mkdirSync(r.filePaths[0], { recursive: true }); return r.filePaths[0]; });
ipcMain.handle("fs:list", async (e, root) => {
    const files = [], dirs = [];
    const walk = async (abs, rel) => {
        let ents; try { ents = await fsp.readdir(abs, { withFileTypes: true }); } catch (er) { return; }
        for (const d of ents) {
            const r = rel ? rel + "/" + d.name : d.name; if (SKIP.test(r) || files.length > 8000) continue;
            if (d.isDirectory()) { dirs.push(r); await walk(path.join(abs, d.name), r); } else if (d.isFile()) files.push(r);
        }
    };
    await walk(path.resolve(root), ""); return { files: files.sort(), dirs: dirs.sort() };
});
ipcMain.handle("fs:read", async (e, root, p) => { const f = inRoot(root, p); const st = await fsp.stat(f); if (st.size > 20e6) throw new Error("Dosya çok büyük (20 MB+)"); return fsp.readFile(f, "utf8"); });
ipcMain.handle("fs:write", async (e, root, p, c) => { const f = inRoot(root, p); await fsp.mkdir(path.dirname(f), { recursive: true }); await fsp.writeFile(f, c, "utf8"); });
ipcMain.handle("fs:mkdir", async (e, root, p) => fsp.mkdir(inRoot(root, p), { recursive: true }));
ipcMain.handle("fs:remove", async (e, root, p) => { const f = inRoot(root, p); if (f === path.resolve(root)) throw new Error("Kök silinemez"); await shell.trashItem(f).catch(() => fsp.rm(f, { recursive: true, force: true })); });
ipcMain.handle("fs:rename", async (e, root, a, b) => { const to = inRoot(root, b); await fsp.mkdir(path.dirname(to), { recursive: true }); await fsp.rename(inRoot(root, a), to); });
ipcMain.handle("fs:reveal", (e, root, p) => shell.showItemInFolder(inRoot(root, p)));
ipcMain.handle("fs:saveAs", async (e, name, bytes) => { const r = await dialog.showSaveDialog(win, { defaultPath: name }); if (r.canceled || !r.filePath) return false; await fsp.writeFile(r.filePath, Buffer.from(bytes)); return true; });
// Resim/ses dosyası -> data: adresi (editördeki resim görüntüleyici ve önizleme için; file:// sayfada engelli)
const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", ico: "image/x-icon", bmp: "image/bmp", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4" };
ipcMain.handle("fs:dataUrl", async (e, root, p) => { const f = inRoot(root, p); const ext = path.extname(f).slice(1).toLowerCase(); if (!MIME[ext]) return null; const st = await fsp.stat(f); if (st.size > 15e6) return null; return "data:" + MIME[ext] + ";base64," + (await fsp.readFile(f)).toString("base64"); });
ipcMain.on("fs:fileUrl", (e, root, p) => { try { e.returnValue = pathToFileURL(inRoot(root, p)).toString(); } catch (er) { e.returnValue = ""; } });

// ---------- terminal (komut başına süreç; çalışma dizini her komuttan sonra raporlanır) ----------
const procs = new Map(); let seq = 0;
function killTree(cp) { if (!cp || cp.exitCode !== null) return; if (process.platform === "win32") spawn("taskkill", ["/pid", String(cp.pid), "/T", "/F"], { windowsHide: true }); else cp.kill("SIGTERM"); }
function killAll() { for (const cp of procs.values()) killTree(cp); procs.clear(); }
ipcMain.handle("term:run", (e, { cmd, cwd, shell: sh }) => {
    const id = "t" + (++seq);
    let file, args;
    if (sh === "cmd") { file = "cmd.exe"; args = ["/d", "/s", "/c", `${cmd} & echo __VCWD__:%CD%`]; }
    else if (sh === "bash") { file = "bash"; args = ["-lc", `${cmd}; echo "__VCWD__:$(pwd -W 2>/dev/null || pwd)"`]; }
    else { file = "powershell.exe"; args = ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `[Console]::OutputEncoding=[Text.Encoding]::UTF8; ${cmd}; Write-Output ("__VCWD__:" + (Get-Location).Path)`]; }
    let cp;
    try { cp = spawn(file, args, { cwd, env: { ...process.env, FORCE_COLOR: "0" }, windowsHide: true }); }
    catch (er) { setTimeout(() => { e.sender.send("term:data", id, String(er.message) + "\n", "err"); e.sender.send("term:exit", id, 1); }); return id; }
    procs.set(id, cp);
    cp.stdout.on("data", d => e.sender.send("term:data", id, d.toString("utf8"), "out"));
    cp.stderr.on("data", d => e.sender.send("term:data", id, d.toString("utf8"), "err"));
    cp.on("error", er => e.sender.send("term:data", id, er.message + "\n", "err"));
    cp.on("close", code => { procs.delete(id); if (!e.sender.isDestroyed()) e.sender.send("term:exit", id, code); });
    return id;
});
ipcMain.handle("term:kill", (e, id) => killTree(procs.get(id)));

// ---------- MCP stdio sunucuları (satır başına bir JSON-RPC mesajı) ----------
ipcMain.handle("mcp:start", (e, { command, args, env, cwd }) => {
    const id = "m" + (++seq);
    const cp = spawn(command, args || [], { cwd: cwd && fs.existsSync(cwd) ? cwd : undefined, env: { ...process.env, ...(env || {}) }, shell: process.platform === "win32", windowsHide: true });
    procs.set(id, cp);
    let buf = "";
    cp.stdout.on("data", d => { buf += d.toString("utf8"); let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; try { e.sender.send("mcp:msg", id, JSON.parse(line)); } catch (er) { e.sender.send("mcp:log", id, line); } } });
    cp.stderr.on("data", d => d.toString("utf8").split(/\r?\n/).filter(Boolean).forEach(l => e.sender.send("mcp:log", id, l)));
    cp.on("error", er => e.sender.send("mcp:log", id, "spawn: " + er.message));
    cp.on("close", code => { procs.delete(id); if (!e.sender.isDestroyed()) e.sender.send("mcp:exit", id, code); });
    return id;
});
ipcMain.handle("mcp:send", (e, id, msg) => { const cp = procs.get(id); if (!cp) throw new Error("MCP süreci kapalı"); cp.stdin.write(JSON.stringify(msg) + "\n"); });
ipcMain.handle("mcp:stop", (e, id) => { killTree(procs.get(id)); procs.delete(id); });

// ---------- CORS'suz HTTP (HTTP MCP sunucuları için) ----------
ipcMain.handle("http", async (e, { url, method, headers, body }) => {
    if (!/^https?:\/\//i.test(url)) throw new Error("Sadece http(s)");
    const r = await fetch(url, { method: method || "GET", headers, body });
    const hs = {}; r.headers.forEach((v, k) => { hs[k.toLowerCase()] = v; });
    return { status: r.status, headers: hs, body: await r.text() };
});

// ---------- VEMTRIO hesabı (site oturumu ayrı, kalıcı bir oturumda tutulur) ----------
const siteSes = () => session.fromPartition("persist:vemtrio-site");
ipcMain.handle("site:login", () => new Promise(res => {
    const w = new BrowserWindow({ width: 520, height: 760, parent: win, modal: true, title: "VEMTRIO Hesabı", autoHideMenuBar: true, webPreferences: { partition: "persist:vemtrio-site" } });
    w.loadURL(SITE + "/hesap?next=%2Fhesap%23%2Fprofil#/giris");
    const check = async () => { const c = await siteSes().cookies.get({ url: SITE, name: "vt" }); if (c.length && /#\/profil/.test(w.webContents.getURL())) w.close(); };
    w.webContents.on("did-navigate-in-page", check); w.webContents.on("did-navigate", check);
    w.on("closed", () => res(true));
}));
ipcMain.handle("site:api", async (e, a, body, q) => {
    const cs = await siteSes().cookies.get({ url: SITE });
    const headers = { Cookie: cs.map(c => c.name + "=" + c.value).join("; "), "User-Agent": "VEMTRIO-Code/" + app.getVersion() };
    if (body) headers["Content-Type"] = "application/json";
    try { const r = await fetch(SITE + "/api/hub?a=" + encodeURIComponent(a) + (q || ""), { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined }); return await r.json(); }
    catch (er) { return { ok: false, error: "server" }; }
});

// ---------- pencere ----------
ipcMain.on("win:titleColors", (e, bg, fg) => { try { if (/^#[0-9a-f]{3,8}$/i.test(bg) && /^#[0-9a-f]{3,8}$/i.test(fg)) win.setTitleBarOverlay({ color: bg.slice(0, 7), symbolColor: fg.slice(0, 7), height: 34 }); } catch (er) { } });
ipcMain.on("win:devtools", () => win.webContents.toggleDevTools());
ipcMain.on("win:fullscreen", () => win.setFullScreen(!win.isFullScreen()));
ipcMain.on("win:close", () => win.close());
ipcMain.on("win:preview", (e, html, title) => {
    // Önizleme ayrı, internetsiz ve köprüsüz bir pencerede
    const w = new BrowserWindow({ width: 1000, height: 760, title: "Önizleme · " + title, autoHideMenuBar: true, backgroundColor: "#ffffff", webPreferences: { sandbox: true, contextIsolation: true, partition: "preview" } });
    w.webContents.session.webRequest.onBeforeRequest((d, cb) => cb({ cancel: !/^(data|blob|about|devtools):/.test(d.url) }));
    w.loadURL("data:text/html;charset=utf-8;base64," + Buffer.from(html).toString("base64"));
});
ipcMain.on("openExternal", (e, url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); });
