/* VEMTRIO Code — Model Context Protocol (MCP) istemcisi.
 * Taşıyıcılar: stdio (sadece masaüstü: npx/uvx/node … süreçleri), Streamable HTTP (+ eski SSE yanıtları).
 * Yapılandırma VS Code'un .vscode/mcp.json biçimiyle aynıdır ("servers"); Claude Desktop'ın "mcpServers" biçimi de okunur. */
(() => {
    const VS = window.VS, N = VS.native, t = VS.t, esc = VS.esc, $ = VS.$;
    const PROTO = "2025-06-18";
    const DEFAULT = `{
    // ${t("MCP sunucuların. VS Code'un .vscode/mcp.json biçimiyle aynı.", "Your MCP servers. Same format as VS Code's .vscode/mcp.json.")}
    // ${t("stdio sunucuları sadece masaüstü uygulamasında çalışır; http sunucuları her yerde.", "stdio servers only run in the desktop app; http servers work everywhere.")}
    "servers": {
        // "filesystem": { "type": "stdio", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:/Users/me/Desktop"] },
        // "memory": { "type": "stdio", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-memory"] },
        // "uzak": { "type": "http", "url": "https://example.com/mcp", "headers": { "Authorization": "Bearer ..." } }
    }
}
`;
    let text = VS.store.get("mcpText", DEFAULT);
    VS.mcpText = () => text;
    const L = (s, c) => VS.log("MCP", s, c);
    const servers = {};       // ad → { cfg, state, client, tools, resources, prompts, error, info }
    function parseCfg() { try { const j = VS.parseJSONC(text) || {}; return j.servers || j.mcpServers || {}; } catch (e) { return {}; } }
    function sync() {
        const cfg = parseCfg();
        for (const name of Object.keys(servers)) if (!cfg[name]) { disconnect(name); delete servers[name]; }
        for (const [name, c] of Object.entries(cfg)) { const type = c.type || (c.url ? "http" : "stdio"); const ncfg = { ...c, type }; if (!servers[name]) servers[name] = { cfg: ncfg, state: "off", tools: [], resources: [], prompts: [] }; else if (JSON.stringify(servers[name].cfg) !== JSON.stringify(ncfg)) { disconnect(name); servers[name].cfg = ncfg; } }
        redraw();
    }
    VS.saveMcpText = (s) => { text = s; VS.store.set("mcpText", s); sync(); VS.toast(t("mcp.json kaydedildi.", "mcp.json saved."), "ok", 2000); };
    const redraw = () => { VS.renderStatus && VS.renderStatus(); VS.renderActivity && VS.renderActivity(); if (VS.currentView && VS.currentView() === "mcp") VS.renderSide(); };
    VS.mcpConnected = () => Object.values(servers).filter(s => s.state === "on").length;
    VS.mcpServers = () => servers;
    VS.mcpSummary = () => Object.entries(servers).map(([n, s]) => `${s.state === "on" ? "●" : "○"} ${n} (${s.cfg.type}) ${s.tools.length} tools`).join("\n") || t("Sunucu yok. mcp.json'u düzenle.", "No servers. Edit mcp.json.");

    // ---------- JSON-RPC istemcisi ----------
    class Client {
        constructor(name, cfg) { this.name = name; this.cfg = cfg; this.seq = 0; this.pending = new Map(); this.sid = null; this.closed = false; }
        async start() {
            if (this.cfg.type === "stdio") {
                if (!N) throw new Error(t("stdio sunucuları sadece masaüstü uygulamasında çalışır. Web'de http türü kullan.", "stdio servers only run in the desktop app. Use the http type on the web."));
                this.pid = await N.mcp.start({ command: this.cfg.command, args: this.cfg.args || [], env: this.cfg.env || {}, cwd: this.cfg.cwd || (VS.ws && VS.ws.fs.root) || undefined });
                this.offMsg = N.mcp.onMessage((pid, msg) => pid === this.pid && this.onMessage(msg));
                this.offLog = N.mcp.onLog((pid, line) => pid === this.pid && L(`[${this.name}] ${line}`, "m"));
                this.offExit = N.mcp.onExit((pid, code) => { if (pid !== this.pid) return; this.closed = true; for (const p of this.pending.values()) p.rej(new Error(t("süreç kapandı", "process exited") + " (" + code + ")")); this.pending.clear(); const s = servers[this.name]; if (s && s.client === this) { s.state = code ? "err" : "off"; s.error = code ? t("Süreç kapandı, kod ", "Process exited, code ") + code : ""; redraw(); } });
            }
            const init = await this.request("initialize", { protocolVersion: PROTO, capabilities: { roots: { listChanged: false } }, clientInfo: { name: "VEMTRIO Code", version: VS.version } });
            this.proto = init.protocolVersion || PROTO;
            await this.notify("notifications/initialized");
            return init;
        }
        onMessage(msg) {
            if (Array.isArray(msg)) return msg.forEach(m => this.onMessage(m));
            if (msg.id !== undefined && (msg.result !== undefined || msg.error)) { const p = this.pending.get(msg.id); if (!p) return; this.pending.delete(msg.id); msg.error ? p.rej(Object.assign(new Error(msg.error.message || "MCP error"), { code: msg.error.code })) : p.res(msg.result); return; }
            if (msg.method) {
                if (msg.method === "notifications/tools/list_changed") refresh(this.name);
                else if (msg.method === "notifications/message") L(`[${this.name}] ${msg.params && (msg.params.data && (typeof msg.params.data === "string" ? msg.params.data : JSON.stringify(msg.params.data)))}`);
                if (msg.id !== undefined) { // sunucudan gelen istek
                    const reply = msg.method === "roots/list" ? { result: { roots: VS.ws && VS.ws.fs.root ? [{ uri: "file:///" + VS.ws.fs.root.replace(/\\/g, "/"), name: VS.ws.name }] : [] } } : msg.method === "ping" ? { result: {} } : { error: { code: -32601, message: "Method not found" } };
                    this.send({ jsonrpc: "2.0", id: msg.id, ...reply });
                }
            }
        }
        async send(obj) {
            if (this.cfg.type === "stdio") return N.mcp.send(this.pid, obj);
            const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...(this.cfg.headers || {}) };
            if (this.sid) headers["Mcp-Session-Id"] = this.sid;
            if (this.proto) headers["MCP-Protocol-Version"] = this.proto;
            const r = N ? await N.http({ url: this.cfg.url, method: "POST", headers, body: JSON.stringify(obj) }) : await webPost(this.cfg.url, headers, obj);
            if (r.status >= 400) throw new Error(`HTTP ${r.status} ${r.body.slice(0, 200)}`);
            const sid = r.headers["mcp-session-id"]; if (sid) this.sid = sid;
            if (!r.body.trim()) return;
            if ((r.headers["content-type"] || "").includes("text/event-stream")) { for (const ev of r.body.split(/\r?\n\r?\n/)) { const data = ev.split(/\r?\n/).filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).join("\n"); if (data) { try { this.onMessage(JSON.parse(data)); } catch (e) { } } } }
            else { try { this.onMessage(JSON.parse(r.body)); } catch (e) { } }
        }
        request(method, params, timeout = 60000) {
            if (this.closed) return Promise.reject(new Error("closed"));
            const id = ++this.seq;
            return new Promise((res, rej) => {
                const h = setTimeout(() => { if (this.pending.delete(id)) rej(new Error(t("zaman aşımı: ", "timeout: ") + method)); }, timeout);
                this.pending.set(id, { res: v => { clearTimeout(h); res(v); }, rej: e => { clearTimeout(h); rej(e); } });
                this.send({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) }).catch(e => { if (this.pending.delete(id)) { clearTimeout(h); rej(e); } });
            });
        }
        notify(method, params) { return this.send({ jsonrpc: "2.0", method, ...(params ? { params } : {}) }); }
        close() {
            this.closed = true;
            if (this.cfg.type === "stdio" && this.pid) { N.mcp.stop(this.pid); [this.offMsg, this.offLog, this.offExit].forEach(f => f && f()); }
            else if (this.sid) { const headers = { "Mcp-Session-Id": this.sid, ...(this.cfg.headers || {}) }; (N ? N.http({ url: this.cfg.url, method: "DELETE", headers }) : fetch(this.cfg.url, { method: "DELETE", headers })).catch(() => { }); }
        }
    }
    async function webPost(url, headers, obj) {
        let r;
        try { r = await fetch(url, { method: "POST", headers, body: JSON.stringify(obj) }); }
        catch (e) { throw new Error(t("Bağlanılamadı (sunucu CORS'a izin vermiyor olabilir — masaüstü uygulamasında bu sınır yok).", "Couldn't connect (the server may not allow CORS — the desktop app has no such limit).")); }
        const hs = {}; r.headers.forEach((v, k) => { hs[k.toLowerCase()] = v; });
        return { status: r.status, headers: hs, body: await r.text() };
    }

    // ---------- bağlan / kopar ----------
    async function connect(name) {
        const s = servers[name]; if (!s || s.state === "wait") return;
        disconnect(name);
        s.state = "wait"; s.error = ""; redraw();
        L(`${name}: ${t("bağlanıyor", "connecting")} (${s.cfg.type}${s.cfg.type === "stdio" ? ": " + s.cfg.command + " " + (s.cfg.args || []).join(" ") : ": " + s.cfg.url})`);
        const c = new Client(name, s.cfg); s.client = c;
        try {
            const init = await c.start();
            s.info = init.serverInfo || {}; s.caps = init.capabilities || {}; s.instructions = init.instructions || "";
            s.state = "on";
            L(`✓ ${name}: ${s.info.name || ""} ${s.info.version || ""} · ${t("protokol", "protocol")} ${c.proto}`, "o");
            await refresh(name);
        } catch (e) { s.state = "err"; s.error = e.message; L(`✗ ${name}: ${e.message}`, "e"); c.close(); VS.toast(`MCP ${name}: ${e.message}`, "err", 8000); }
        redraw();
    }
    async function refresh(name) {
        const s = servers[name]; if (!s || !s.client) return;
        const all = async (method, key) => { let out = [], cursor; do { const r = await s.client.request(method, cursor ? { cursor } : {}); out = out.concat(r[key] || []); cursor = r.nextCursor; } while (cursor && out.length < 1000); return out; };
        try { s.tools = s.caps.tools ? await all("tools/list", "tools") : []; } catch (e) { s.tools = []; L(`${name} tools/list: ${e.message}`, "w"); }
        try { s.resources = s.caps.resources ? await all("resources/list", "resources") : []; } catch (e) { s.resources = []; }
        try { s.prompts = s.caps.prompts ? await all("prompts/list", "prompts") : []; } catch (e) { s.prompts = []; }
        L(`${name}: ${s.tools.length} ${t("araç", "tools")}, ${s.resources.length} ${t("kaynak", "resources")}, ${s.prompts.length} prompt`);
        redraw(); VS.emit("mcp-tools");
    }
    function disconnect(name) { const s = servers[name]; if (!s) return; if (s.client) s.client.close(); s.client = null; s.state = "off"; s.tools = []; s.resources = []; s.prompts = []; redraw(); VS.emit("mcp-tools"); }
    VS.mcpCall = async (server, tool, args) => {
        const s = servers[server]; if (!s || s.state !== "on") throw new Error(server + ": " + t("bağlı değil", "not connected"));
        L(`→ ${server}.${tool} ${JSON.stringify(args).slice(0, 300)}`);
        const r = await s.client.request("tools/call", { name: tool, arguments: args || {} }, 180000);
        L(`← ${server}.${tool} ${r.isError ? "ERROR " : ""}${JSON.stringify(r.content || r).slice(0, 300)}`, r.isError ? "e" : "");
        return r;
    };
    VS.mcpTools = () => Object.entries(servers).filter(([, s]) => s.state === "on").flatMap(([n, s]) => s.tools.map(tool => ({ server: n, tool })));
    VS.mcpConnect = connect;
    const resultText = r => (r.content || []).map(c => c.type === "text" ? c.text : c.type === "image" ? `[image ${c.mimeType}]` : c.type === "resource" ? (c.resource.text || `[resource ${c.resource.uri}]`) : c.type === "resource_link" ? `[link ${c.uri}]` : JSON.stringify(c)).join("\n") + (r.structuredContent ? "\n" + JSON.stringify(r.structuredContent, null, 2) : "");
    VS.mcpResultText = resultText;

    // ---------- araç çalıştırıcı (editör sekmesi) ----------
    function skeleton(schema) {
        const o = {}; const p = (schema && schema.properties) || {};
        for (const [k, v] of Object.entries(p)) o[k] = v.default !== undefined ? v.default : v.type === "number" || v.type === "integer" ? 0 : v.type === "boolean" ? false : v.type === "array" ? [] : v.type === "object" ? {} : v.enum ? v.enum[0] : "";
        return o;
    }
    function openTool(server, name) {
        const s = servers[server]; const tool = s && s.tools.find(x => x.name === name); if (!tool) return;
        VS.openCustom(`mcp:${server}/${name}`, `${name} · ${server}`, el => {
            const req = (tool.inputSchema && tool.inputSchema.required) || [];
            el.innerHTML = `<div class="runner"><div><div class="hint">MCP · ${esc(server)}</div><h2>${esc(tool.title || tool.name)}</h2><p class="hint" style="margin-top:6px;white-space:pre-wrap">${esc(tool.description || "")}</p>${tool.annotations ? `<div class="contrib">${tool.annotations.readOnlyHint ? `<span class="ok">${t("salt okunur", "read-only")}</span>` : ""}${tool.annotations.destructiveHint ? `<span style="color:var(--bad)">${t("yıkıcı", "destructive")}</span>` : ""}${tool.annotations.openWorldHint ? `<span>${t("dış dünya", "open world")}</span>` : ""}</div>` : ""}</div>
                <div class="contrib">${Object.entries((tool.inputSchema && tool.inputSchema.properties) || {}).map(([k, v]) => `<span title="${esc(v.description || "")}">${esc(k)}${req.includes(k) ? "*" : ""}: ${esc(v.type || "any")}</span>`).join("")}</div>
                <label class="f">${t("ARGÜMANLAR (JSON)", "ARGUMENTS (JSON)")}<textarea id="tr-args" rows="8">${esc(JSON.stringify(skeleton(tool.inputSchema), null, 2))}</textarea></label>
                <div class="row"><button class="btn" id="tr-run">▶ ${t("Çalıştır", "Run")} <kbd style="color:inherit;border-color:currentColor">Ctrl+Enter</kbd></button><button class="btn sec" id="tr-schema">${t("Şemayı göster", "Show schema")}</button></div>
                <pre id="tr-out" class="hint">${t("Sonuç burada görünecek.", "Result will appear here.")}</pre></div>`;
            const run = async () => {
                let args; try { args = JSON.parse($("#tr-args").value || "{}"); } catch (e) { $("#tr-out").textContent = "JSON: " + e.message; return; }
                $("#tr-out").textContent = "…"; const t0 = performance.now();
                try { const r = await VS.mcpCall(server, name, args); $("#tr-out").textContent = (r.isError ? "⚠ isError\n" : "") + resultText(r) + `\n\n— ${Math.round(performance.now() - t0)} ms`; $("#tr-out").style.color = r.isError ? "var(--bad)" : "var(--fg)"; }
                catch (e) { $("#tr-out").textContent = "✗ " + e.message; $("#tr-out").style.color = "var(--bad)"; }
            };
            $("#tr-run").onclick = run; $("#tr-args").onkeydown = e => { if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); e.stopPropagation(); run(); } };
            $("#tr-schema").onclick = () => { $("#tr-out").textContent = JSON.stringify(tool.inputSchema, null, 2); $("#tr-out").style.color = ""; };
        }, { icon: "🔌" });
    }
    async function readResource(server, uri) {
        const s = servers[server];
        try { const r = await s.client.request("resources/read", { uri }); VS.openCustom(`mcpres:${server}/${uri}`, uri.split("/").pop() || uri, el => { el.innerHTML = `<div class="runner"><div class="hint">MCP · ${esc(server)} · ${t("kaynak", "resource")}</div><h2 style="font-size:15px">${esc(uri)}</h2><pre>${esc((r.contents || []).map(c => c.text != null ? c.text : `[${c.mimeType || "blob"} ${c.blob ? c.blob.length + " b64" : ""}]`).join("\n\n"))}</pre></div>`; }, { icon: "📄" }); }
        catch (e) { VS.toast(e.message, "err"); }
    }

    // ---------- görünüm ----------
    const open = new Set(VS.store.get("mcpOpen", []));
    VS.viewDefs = VS.viewDefs || [];
    VS.viewDefs.push({ id: "mcp", title: () => "MCP " + t("SUNUCULARI", "SERVERS"), order: 4, key: "ctrl+shift+;", badge: () => VS.mcpConnected() || "",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 7V3M15 7V3"/><path d="M6 7h12v4a6 6 0 0 1-12 0z"/><path d="M12 17v4"/></svg>',
        render(body, actions) {
            actions.innerHTML = `<button title="${t("Sunucu ekle", "Add server")}" data-a="add">＋</button><button title="mcp.json" data-a="json">{ }</button><button title="${t("Hepsini bağla", "Connect all")}" data-a="all">⚡</button>`;
            actions.onclick = e => { const a = e.target.closest("[data-a]"); if (!a) return; ({ add: () => VS.run("mcp.addServer"), json: () => VS.run("mcp.openConfig"), all: () => Object.keys(servers).forEach(connect) })[a.dataset.a](); };
            const list = Object.entries(servers);
            body.innerHTML = (list.length ? list.map(([n, s]) => `<div class="srv"><div class="srv-h" data-n="${esc(n)}"><span class="tw" style="width:10px;color:var(--muted)">${open.has(n) ? "▾" : "▸"}</span><span class="dot ${s.state}"></span><b>${esc(n)}</b><small>${esc(s.cfg.type)}</small>${s.state === "on" ? `<button class="ib" data-x="${esc(n)}" title="${t("Bağlantıyı kes", "Disconnect")}">⏻</button><button class="ib" data-rf="${esc(n)}" title="${t("Yenile", "Refresh")}">⟳</button>` : `<button class="ib" data-c="${esc(n)}" title="${t("Bağlan", "Connect")}">▶</button>`}</div>
                ${open.has(n) ? `<div class="srv-b">${s.error ? `<p class="hint" style="color:var(--bad);margin-bottom:6px">${esc(s.error)}</p>` : ""}${s.info ? `<p class="hint" style="font-size:11px">${esc(s.info.name || "")} ${esc(s.info.version || "")}</p>` : ""}
                    ${s.tools.length ? `<p class="hint" style="font-size:10.5px;margin-top:6px">${t("ARAÇLAR", "TOOLS")} (${s.tools.length})</p>${s.tools.map(x => `<button class="tool" data-tool="${esc(x.name)}" data-s="${esc(n)}" title="${esc(x.description || "")}">⚙ ${esc(x.name)} <small>${esc((x.description || "").slice(0, 60))}</small></button>`).join("")}` : s.state === "on" ? `<p class="hint">${t("Araç yok.", "No tools.")}</p>` : `<p class="hint">${s.cfg.type === "stdio" ? esc(s.cfg.command + " " + (s.cfg.args || []).join(" ")) : esc(s.cfg.url || "")}</p>`}
                    ${s.resources.length ? `<p class="hint" style="font-size:10.5px;margin-top:6px">${t("KAYNAKLAR", "RESOURCES")}</p>${s.resources.slice(0, 60).map(x => `<button class="tool" data-res="${esc(x.uri)}" data-s="${esc(n)}">📄 ${esc(x.name || x.uri)}</button>`).join("")}` : ""}
                    ${s.prompts.length ? `<p class="hint" style="font-size:10.5px;margin-top:6px">PROMPTS</p>${s.prompts.map(x => `<button class="tool" data-prompt="${esc(x.name)}" data-s="${esc(n)}" title="${esc(x.description || "")}">💬 ${esc(x.name)}</button>`).join("")}` : ""}
                    <div class="row" style="margin-top:6px"><button class="btn sec" style="height:22px;font-size:11px" data-del="${esc(n)}">${t("Kaldır", "Remove")}</button></div></div>` : ""}</div>`).join("")
                : `<div class="pad col"><p class="hint">${t("Henüz MCP sunucusu yok. MCP, yapay zekâya araç (dosya, veritabanı, GitHub, tarayıcı…) bağlamanın standart yolu.", "No MCP servers yet. MCP is the standard way to plug tools (files, databases, GitHub, browsers…) into AI.")}</p><button class="btn w" data-add>＋ ${t("Sunucu Ekle", "Add Server")}</button><button class="btn sec w" data-json>{ } mcp.json</button></div>`)
                + `<div class="pad col"><p class="hint" style="font-size:11px">${t("Bağlı sunucuların araçları AI sohbetinde (Ctrl+Alt+I) otomatik kullanılabilir.", "Tools from connected servers are available in AI chat (Ctrl+Alt+I).")}${N ? "" : " " + t("stdio (npx/uvx) sunucuları için masaüstü uygulamasını kullan.", "Use the desktop app for stdio (npx/uvx) servers.")}</p>${VS.ws && VS.ws.files.includes(".vscode/mcp.json") ? `<button class="btn sec w" data-imp>${t("Çalışma alanındaki .vscode/mcp.json'u içe aktar", "Import workspace .vscode/mcp.json")}</button>` : ""}</div>`;
            body.onclick = async e => {
                const g = (sel) => e.target.closest(sel);
                if (g("[data-add]")) return VS.run("mcp.addServer");
                if (g("[data-json]")) return VS.run("mcp.openConfig");
                if (g("[data-imp]")) return VS.run("mcp.importWorkspace");
                if (g("[data-c]")) { e.stopPropagation(); open.add(g("[data-c]").dataset.c); VS.store.set("mcpOpen", [...open]); return connect(g("[data-c]").dataset.c); }
                if (g("[data-x]")) { e.stopPropagation(); return disconnect(g("[data-x]").dataset.x); }
                if (g("[data-rf]")) { e.stopPropagation(); return refresh(g("[data-rf]").dataset.rf); }
                if (g("[data-tool]")) return openTool(g("[data-tool]").dataset.s, g("[data-tool]").dataset.tool);
                if (g("[data-res]")) return readResource(g("[data-res]").dataset.s, g("[data-res]").dataset.res);
                if (g("[data-prompt]")) { const b = g("[data-prompt]"); try { const r = await servers[b.dataset.s].client.request("prompts/get", { name: b.dataset.prompt, arguments: {} }); VS.aiInsert && VS.aiInsert((r.messages || []).map(m => m.content && m.content.text).filter(Boolean).join("\n\n")); } catch (er) { VS.toast(er.message, "err"); } return; }
                if (g("[data-del]")) { const n = g("[data-del]").dataset.del; if (!(await VS.confirm(t(`"${n}" kaldırılsın mı?`, `Remove "${n}"?`)))) return; const j = VS.parseJSONC(text) || {}; const key = j.servers ? "servers" : j.mcpServers ? "mcpServers" : "servers"; delete (j[key] || {})[n]; VS.saveMcpText(JSON.stringify(j, null, 4)); return; }
                const h = g(".srv-h"); if (h) { const n = h.dataset.n; open.has(n) ? open.delete(n) : open.add(n); VS.store.set("mcpOpen", [...open]); VS.renderSide(); }
            };
        } });

    function addToConfig(name, entry) {
        let j; try { j = VS.parseJSONC(text) || {}; } catch (e) { j = {}; }
        const key = j.mcpServers && !j.servers ? "mcpServers" : "servers"; j[key] = j[key] || {}; j[key][name] = entry;
        VS.saveMcpText(JSON.stringify(j, null, 4));
    }
    VS.cmd("mcp.addServer", () => "MCP: " + t("Sunucu Ekle…", "Add Server…"), async () => {
        const kind = await VS.pick([
            { label: "⌨ stdio — " + t("Komut (npx, uvx, node, python…)", "Command (npx, uvx, node, python…)"), detail: N ? "" : t("sadece masaüstü", "desktop only"), value: "stdio" },
            { label: "🌐 HTTP — " + t("Uzak sunucu (Streamable HTTP)", "Remote server (Streamable HTTP)"), value: "http" },
            { label: "📦 " + t("Hazır: Dosya sistemi", "Preset: Filesystem"), detail: "@modelcontextprotocol/server-filesystem", value: "p-fs" },
            { label: "📦 " + t("Hazır: Hafıza (bilgi grafiği)", "Preset: Memory (knowledge graph)"), detail: "@modelcontextprotocol/server-memory", value: "p-mem" },
            { label: "📦 " + t("Hazır: Sıralı düşünme", "Preset: Sequential thinking"), detail: "@modelcontextprotocol/server-sequential-thinking", value: "p-seq" },
            { label: "📦 " + t("Hazır: Web getir (fetch)", "Preset: Fetch"), detail: "uvx mcp-server-fetch", value: "p-fetch" },
            { label: "📦 " + t("Hazır: Playwright tarayıcı", "Preset: Playwright browser"), detail: "@playwright/mcp", value: "p-pw" },
            { label: "📋 " + t("JSON yapıştır (Claude Desktop / VS Code biçimi)", "Paste JSON (Claude Desktop / VS Code format)"), value: "paste" },
        ], t("Ne tür bir MCP sunucusu?", "What kind of MCP server?"));
        if (!kind) return;
        const presets = { "p-fs": ["filesystem", { type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", (VS.ws && VS.ws.fs.root) || "."] }], "p-mem": ["memory", { type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-memory"] }], "p-seq": ["sequential-thinking", { type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-sequential-thinking"] }], "p-fetch": ["fetch", { type: "stdio", command: "uvx", args: ["mcp-server-fetch"] }], "p-pw": ["playwright", { type: "stdio", command: "npx", args: ["-y", "@playwright/mcp@latest"] }] };
        if (presets[kind]) { addToConfig(...presets[kind]); return connect(presets[kind][0]); }
        if (kind === "paste") {
            const v = await VS.modal(t("MCP JSON yapıştır", "Paste MCP JSON"), [{ name: "j", label: '{ "mcpServers": { ... } }  /  { "servers": { ... } }  /  { "ad": { "command": ... } }', type: "textarea", rows: 10 }], t("Ekle", "Add"));
            if (!v) return; let j; try { j = VS.parseJSONC(v.j); } catch (e) { return VS.toast("JSON: " + e.message, "err"); }
            const map = j.mcpServers || j.servers || (j.mcp && j.mcp.servers) || j; let n = 0;
            for (const [name, c] of Object.entries(map)) if (c && (c.command || c.url)) { addToConfig(name, { type: c.type || (c.url ? "http" : "stdio"), ...c }); n++; }
            return VS.toast(n + t(" sunucu eklendi.", " servers added."), n ? "ok" : "warn");
        }
        const v = await VS.modal("MCP: " + (kind === "stdio" ? "stdio" : "HTTP"), kind === "stdio"
            ? [{ name: "name", label: t("AD", "NAME"), value: "my-server" }, { name: "command", label: t("KOMUT", "COMMAND"), value: "npx", placeholder: "npx / uvx / node / python" }, { name: "args", label: t("ARGÜMANLAR (boşlukla; tırnak kullanılabilir)", "ARGUMENTS (space separated; quotes allowed)"), placeholder: '-y @modelcontextprotocol/server-everything' }, { name: "env", label: t("ORTAM DEĞİŞKENLERİ (KEY=VALUE, satır başına)", "ENV (KEY=VALUE per line)"), type: "textarea", rows: 3 }]
            : [{ name: "name", label: t("AD", "NAME"), value: "remote" }, { name: "url", label: "URL", placeholder: "https://example.com/mcp" }, { name: "auth", label: t("Authorization başlığı (isteğe bağlı)", "Authorization header (optional)"), placeholder: "Bearer …" }], t("Ekle ve bağlan", "Add & connect"));
        if (!v || !v.name) return;
        const name = v.name.trim().replace(/[^\w.-]/g, "-");
        if (kind === "stdio") addToConfig(name, { type: "stdio", command: v.command.trim(), args: (v.args.match(/"[^"]*"|\S+/g) || []).map(s => s.replace(/^"|"$/g, "")), ...(v.env.trim() ? { env: Object.fromEntries(v.env.split(/\r?\n/).filter(l => l.includes("=")).map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])) } : {}) });
        else addToConfig(name, { type: "http", url: v.url.trim(), ...(v.auth ? { headers: { Authorization: v.auth.trim() } } : {}) });
        open.add(name); VS.store.set("mcpOpen", [...open]); connect(name);
    }, null, "MCP");
    VS.cmd("mcp.openConfig", () => "MCP: " + t("Kullanıcı Yapılandırmasını Aç (mcp.json)", "Open User Configuration (mcp.json)"), () => VS.openFile("user:mcp.json"), null, "MCP");
    VS.cmd("mcp.listServers", () => "MCP: " + t("Sunucuları Listele", "List Servers"), () => VS.showView("mcp"), null, "MCP");
    VS.cmd("mcp.connectAll", () => "MCP: " + t("Tümünü Bağla", "Connect All"), () => Object.keys(servers).forEach(connect), null, "MCP");
    VS.cmd("mcp.runTool", () => "MCP: " + t("Araç Çalıştır…", "Run Tool…"), async () => { const all = VS.mcpTools(); if (!all.length) return VS.toast(t("Bağlı sunucu yok.", "No connected servers."), "warn"); const p = await VS.pick(all.map(x => ({ label: x.tool.name, detail: x.server + " · " + (x.tool.description || "").slice(0, 80), value: x }))); if (p) openTool(p.server, p.tool.name); }, "ctrl+alt+m", "MCP");
    VS.cmd("mcp.importWorkspace", () => "MCP: " + t("Çalışma Alanındaki .vscode/mcp.json'u İçe Aktar", "Import Workspace .vscode/mcp.json"), async () => {
        if (!VS.ws) return; let j; try { j = VS.parseJSONC(await VS.ws.fs.read(".vscode/mcp.json")); } catch (e) { return VS.toast(".vscode/mcp.json: " + e.message, "err"); }
        const map = j.servers || j.mcpServers || {}; for (const [n, c] of Object.entries(map)) addToConfig(n, { type: c.type || (c.url ? "http" : "stdio"), ...c, ...(c.type !== "http" && !c.cwd && VS.ws.fs.root ? { cwd: VS.ws.fs.root } : {}) });
        VS.toast(Object.keys(map).length + t(" sunucu içe aktarıldı.", " servers imported."), "ok"); VS.showView("mcp");
    }, null, "MCP");
    sync();
})();
