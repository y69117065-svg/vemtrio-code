// Arayüze verilen yerel API (window.vnative). Sadece belirli, sınırlı kanallar açılır.
const { contextBridge, ipcRenderer } = require("electron");
const on = (ch) => (cb) => { const h = (e, ...a) => cb(...a); ipcRenderer.on(ch, h); return () => ipcRenderer.removeListener(ch, h); };
contextBridge.exposeInMainWorld("vnative", {
    versions: { electron: process.versions.electron, node: process.versions.node, chrome: process.versions.chrome },
    fs: {
        pick: (create) => ipcRenderer.invoke("fs:pick", !!create),
        list: (root) => ipcRenderer.invoke("fs:list", root),
        read: (root, p) => ipcRenderer.invoke("fs:read", root, p),
        write: (root, p, c) => ipcRenderer.invoke("fs:write", root, p, c),
        mkdir: (root, p) => ipcRenderer.invoke("fs:mkdir", root, p),
        remove: (root, p) => ipcRenderer.invoke("fs:remove", root, p),
        rename: (root, a, b) => ipcRenderer.invoke("fs:rename", root, a, b),
        reveal: (root, p) => ipcRenderer.invoke("fs:reveal", root, p),
        saveAs: (name, bytes) => ipcRenderer.invoke("fs:saveAs", name, bytes),
        fileUrl: (root, p) => ipcRenderer.sendSync("fs:fileUrl", root, p),
        dataUrl: (root, p) => ipcRenderer.invoke("fs:dataUrl", root, p),
    },
    term: { run: (o) => ipcRenderer.invoke("term:run", o), kill: (id) => ipcRenderer.invoke("term:kill", id), onData: on("term:data"), onExit: on("term:exit") },
    mcp: { start: (cfg) => ipcRenderer.invoke("mcp:start", cfg), send: (id, m) => ipcRenderer.invoke("mcp:send", id, m), stop: (id) => ipcRenderer.invoke("mcp:stop", id), onMessage: on("mcp:msg"), onLog: on("mcp:log"), onExit: on("mcp:exit") },
    http: (o) => ipcRenderer.invoke("http", o),
    site: { api: (a, body, q) => ipcRenderer.invoke("site:api", a, body, q), login: () => ipcRenderer.invoke("site:login") },
    win: { titleColors: (bg, fg) => ipcRenderer.send("win:titleColors", bg, fg), devtools: () => ipcRenderer.send("win:devtools"), fullscreen: () => ipcRenderer.send("win:fullscreen"), close: () => ipcRenderer.send("win:close"), preview: (html, title) => ipcRenderer.send("win:preview", html, title) },
    openExternal: (url) => ipcRenderer.send("openExternal", url),
});
