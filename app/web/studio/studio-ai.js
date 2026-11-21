/* VEMTRIO Code — AI sohbet (Claude). Kendi Anthropic API anahtarınla çalışır; anahtar sadece bu cihazda saklanır.
 * Araçlar: çalışma alanı (dosya listele/oku/yaz) + bağlı tüm MCP sunucularının araçları. */
(() => {
    const VS = window.VS, t = VS.t, esc = VS.esc, $ = VS.$;
    const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.6.0/+esm";
    let Anthropic = null, client = null, clientKey = null;
    let history = [];          // Messages API geçmişi (yanıt içeriği olduğu gibi geri gönderilir)
    let view = [];             // ekranda gösterilen balonlar
    let busy = false, stopFlag = false;
    const key = () => VS.store.get("aiKey", "");

    async function getClient() {
        if (!Anthropic) Anthropic = (await import(SDK_URL)).default;
        if (!client || clientKey !== key()) { client = new Anthropic({ apiKey: key(), dangerouslyAllowBrowser: true }); clientKey = key(); }
        return client;
    }
    // ---- araçlar ----
    const WS_TOOLS = [
        { name: "workspace_list_files", description: "List all file paths in the user's open VEMTRIO Code workspace.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
        { name: "workspace_read_file", description: "Read a text file from the workspace. Path is relative to the workspace root.", input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false } },
        { name: "workspace_write_file", description: "Create or overwrite a text file in the workspace with the full new content. The file opens in the editor so the user sees the change.", input_schema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"], additionalProperties: false } },
    ];
    const mcpName = (server, tool) => ("mcp__" + server + "__" + tool).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
    function toolList() {
        const out = VS.ws ? WS_TOOLS.slice() : [];
        const map = {};
        for (const { server, tool } of VS.mcpTools()) { const n = mcpName(server, tool.name); map[n] = { server, tool: tool.name }; out.push({ name: n, description: `[MCP: ${server}] ${tool.description || tool.name}`.slice(0, 1024), input_schema: tool.inputSchema && tool.inputSchema.type === "object" ? tool.inputSchema : { type: "object", properties: {} } }); }
        return { tools: out, map };
    }
    async function runTool(name, input, map) {
        if (name === "workspace_list_files") return VS.ws.files.join("\n") || "(empty)";
        if (name === "workspace_read_file") { const tab = VS.tabs.find(x => x.path === input.path && x.model); return tab ? tab.model.getValue() : await VS.ws.fs.read(input.path); }
        if (name === "workspace_write_file") {
            await VS.ws.fs.write(input.path, input.content); await VS.refreshTree();
            const tab = VS.tabs.find(x => x.path === input.path && x.model); if (tab) { tab.model.setValue(input.content); tab.saved = tab.model.getAlternativeVersionId(); tab.dirty = false; } else await VS.openFile(input.path, { keepFocus: true });
            VS.emit("saved", { path: input.path }); return "OK, wrote " + input.content.length + " chars to " + input.path;
        }
        const m = map[name]; if (!m) throw new Error("unknown tool " + name);
        const r = await VS.mcpCall(m.server, m.tool, input);
        return { text: VS.mcpResultText(r) || "(no content)", isError: !!r.isError, images: (r.content || []).filter(c => c.type === "image") };
    }

    // ---- sohbet döngüsü ----
    let mode = VS.store.get("aiMode", "assist");          // "assist" = ücretsiz Kod Asistanı, "claude" = kendi API anahtarınla
    const useClaude = () => mode === "claude" && !!key();
    async function send(textIn) {
        if (busy || !textIn.trim()) return;
        if (!useClaude()) {
            view.push({ k: "u", text: textIn });
            let cev; try { cev = VS.assistAnswer ? VS.assistAnswer(textIn) : "VEMTRIO Topluluk AI yüklenemedi."; } catch (e) { cev = String(e.message || e); }
            view.push({ k: "a", text: cev }); draw(); return;
        }
        busy = true; stopFlag = false;
        const ctx = VS.activeTab() && VS.activeTab().model ? `\n\n[${t("Açık dosya", "Open file")}: ${VS.activeTab().path}]` : "";
        history.push({ role: "user", content: textIn + ctx });
        view.push({ k: "u", text: textIn }); draw();
        try {
            const c = await getClient();
            for (let step = 0; step < 25 && !stopFlag; step++) {
                const { tools, map } = toolList();
                view.push({ k: "a", text: "…", pending: true }); draw();
                const resp = await c.beta.messages.create({
                    model: VS.settings["ai.model"] || "claude-opus-5-5",
                    max_tokens: 16000,
                    betas: ["server-side-fallback-2026-07-01"],
                    fallbacks: "default",
                    output_config: { effort: VS.settings["ai.effort"] || "medium" },
                    system: `You are the coding assistant inside VEMTRIO Code, a VS Code-style editor made by VEMTRIO (a Turkish game & software studio). Reply in the user's language (often Turkish). Be concise. When the user asks you to build or change code, use the workspace tools to read and write files directly instead of only pasting code. HTML projects are previewed in a sandbox (no network). Games can call Vemtrio.saveScore(n) and Vemtrio.getPlayer() from /vemtrio.js for community leaderboards. Tools named mcp__<server>__<tool> come from MCP servers the user connected.${VS.ws ? " Workspace: " + VS.ws.name + " (" + VS.ws.files.length + " files)." : " No workspace is open."}`,
                    tools,
                    messages: history,
                });
                view.pop();
                if (resp.stop_reason === "refusal") { view.push({ k: "err", text: t("Model bu isteği yanıtlamadı.", "The model declined this request.") }); history.push({ role: "assistant", content: resp.content }); break; }
                history.push({ role: "assistant", content: resp.content });
                for (const b of resp.content) if (b.type === "text" && b.text.trim()) view.push({ k: "a", text: b.text });
                const uses = resp.content.filter(b => b.type === "tool_use");
                if (resp.stop_reason !== "tool_use" || !uses.length) { if (resp.stop_reason === "max_tokens") view.push({ k: "err", text: t("Yanıt uzunluk sınırında kesildi.", "Response hit the length limit.") }); break; }
                const results = [];
                for (const u of uses) {
                    view.push({ k: "t", text: `${u.name} ${JSON.stringify(u.input).slice(0, 220)}` }); draw();
                    const risky = u.name !== "workspace_list_files" && u.name !== "workspace_read_file";
                    if (risky && VS.settings["ai.confirmTools"] && !(await VS.confirm(t(`AI şu aracı çalıştırmak istiyor: ${u.name}. İzin verilsin mi?`, `AI wants to run tool: ${u.name}. Allow?`)))) { results.push({ type: "tool_result", tool_use_id: u.id, content: "The user denied this tool call.", is_error: true }); view.push({ k: "t", text: "✕ " + t("reddedildi", "denied") }); continue; }
                    try {
                        const r = await runTool(u.name, u.input || {}, map);
                        if (typeof r === "string") results.push({ type: "tool_result", tool_use_id: u.id, content: r.slice(0, 100000) });
                        else results.push({ type: "tool_result", tool_use_id: u.id, is_error: r.isError, content: [{ type: "text", text: r.text.slice(0, 100000) }, ...r.images.slice(0, 3).map(i => ({ type: "image", source: { type: "base64", media_type: i.mimeType, data: i.data } }))] });
                        view.push({ k: "t", text: "✓ " + (typeof r === "string" ? r : r.text).slice(0, 160).replace(/\n/g, " ") });
                    } catch (e) { results.push({ type: "tool_result", tool_use_id: u.id, content: String(e.message || e), is_error: true }); view.push({ k: "t", text: "✗ " + e.message }); }
                }
                history.push({ role: "user", content: results }); draw();
            }
        } catch (e) {
            if (view.length && view[view.length - 1].pending) view.pop();
            const msg = e && e.status === 401 ? t("API anahtarı geçersiz.", "Invalid API key.") : e && e.status === 429 ? t("Hız sınırı, biraz bekle.", "Rate limited, wait a bit.") : String((e && e.message) || e);
            view.push({ k: "err", text: msg }); VS.log("AI", msg, "e");
            if (e && e.status === 401) VS.store.del("aiKey");
            // yarım kalan araç turunu geçmişten temizle ki sonraki istek geçersiz olmasın
            while (history.length && history[history.length - 1].role === "assistant" && history[history.length - 1].content.some && history[history.length - 1].content.some(b => b.type === "tool_use")) history.pop();
            if (history.length && history[history.length - 1].role === "user" && typeof history[history.length - 1].content === "string") { /* kullanıcı mesajı kalsın */ }
        }
        busy = false; draw();
    }
    async function askKey() {
        const v = await VS.modal(t("Claude API anahtarı", "Claude API key"), [{ type: "html", html: `<p class="hint">${t("AI sohbet kendi Anthropic API anahtarınla çalışır (console.anthropic.com). Anahtar sadece bu cihazda saklanır ve doğrudan Anthropic'e gönderilir; VEMTRIO sunucularına gitmez.", "AI chat uses your own Anthropic API key (console.anthropic.com). It's stored only on this device and sent directly to Anthropic, never to VEMTRIO servers.")}</p>` }, { name: "k", label: "API KEY", type: "password", placeholder: "sk-ant-…" }], t("Kaydet", "Save"));
        if (v && v.k.trim()) { VS.store.set("aiKey", v.k.trim()); client = null; draw(); }
    }
    // ---- görünüm ----
    function fmt(s) {
        const parts = s.split(/```(\w*)\n?([\s\S]*?)```/g); let h = "";
        for (let i = 0; i < parts.length; i++) { if (i % 3 === 0) h += esc(parts[i]).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>"); else if (i % 3 === 2) h += `<pre>${esc(parts[i])}</pre>`; }
        const bt = (a, l) => `<button class="btn sec" style="height:24px;font-size:11px;margin:6px 4px 0 0" ${a}>${l}</button>`;
        return h.replace(/\[\[ekle:([\w-]+)\]\]/g, (m, id) => `<button class="btn" style="height:24px;font-size:11px;margin-top:6px" data-pool="${id}">${t("Koda ekle", "Insert into code")}</button>`)
            .replace(/\[\[cai:([\w-]+)\]\]/g, (m, id) => bt(`data-caip="${id}"`, t("Projeyi incele", "Explore project") + (VS.communityIndex().find(p => p.id === id) ? ": " + esc(VS.communityIndex().find(p => p.id === id).title) : "")))
            .replace(/\[\[remix:([\w-]+)\]\]/g, (m, id) => bt(`data-remix="${id}"`, "Remix"))
            .replace(/\[\[eklefn:([\w-]+):([\w$]+)\]\]/g, (m, id, fn) => `<button class="btn" style="height:24px;font-size:11px;margin:6px 4px 0 0" data-eklefn="${id}:${fn}">${t("Koda ekle", "Insert")} ${fn}()</button>`);
    }
    function draw() {
        if (VS.auxMode() !== "ai") return;
        const box = $("#ai-chat"); if (!box) return;
        box.innerHTML = view.length ? view.map(m => `<div class="msg ${m.k}">${m.k === "a" ? fmt(m.text) : esc(m.text)}</div>`).join("") : useClaude()
            ? `<div class="hint" style="padding:8px;line-height:1.6">${t("Claude modu: kod yazdırabilir, dosyalarını düzenletebilir, bağlı MCP araçlarını kullandırabilirsin.", "Claude mode: write code, edit files, use connected MCP tools.")}<br><br>${t("Araçlar", "Tools")}: ${toolList().tools.length}</div>`
            : `<div class="hint" style="padding:8px;line-height:1.7"><b style="color:var(--fg)">VEMTRIO Topluluk AI</b><br>${t("Topluluktaki projelerin nasıl çalıştığını anlatırım, oradan örnek kod gösteririm, kodundaki hataları açıklarım ve VEMTRIO Code'un kullanımını bilirim. Hazır sorular:", "I explain how community projects work, show example code from them, explain errors in your code and know how VEMTRIO Code works. Quick questions:")}<br><br>${(VS.assistChips ? VS.assistChips() : ["koddaki hata ne?"]).map(x => `<button class="btn sec" style="height:24px;font-size:11px;margin:2px" data-ask="${esc(x)}">${esc(x)}</button>`).join("")}</div>`;
        box.scrollTop = box.scrollHeight;
        const b = $("#ai-send"); if (b) { b.textContent = busy ? "■ " + t("Durdur", "Stop") : t("Gönder", "Send") + " ↵"; }
    }
    VS.aiInsert = s => { VS.run("ai.toggle", true); setTimeout(() => { const ta = $("#ai-in"); if (ta) { ta.value = s; ta.focus(); } }, 50); };
    function openAI(force) {
        if (VS.auxMode() === "ai" && !force) return VS.closeAux();
        const ui = VS.showAux("ai", "VEMTRIO TOPLULUK AI", true);
        ui.head.innerHTML = `<select id="ai-mode" style="width:auto;height:22px;padding:0 4px;font-size:11px"><option value="assist" ${mode === "assist" ? "selected" : ""}>VEMTRIO Topluluk AI</option><option value="claude" ${mode === "claude" ? "selected" : ""}>Claude (${t("API anahtarı", "API key")})</option></select><button class="ib" data-a="new" title="${t("Yeni sohbet", "New chat")}">＋</button><button class="ib" data-a="x" title="${t("Kapat", "Close")}">✕</button>`;
        ui.head.onclick = e => { const a = e.target.closest("[data-a]"); if (!a) return; if (a.dataset.a === "new") { history = []; view = []; draw(); } if (a.dataset.a === "x") VS.closeAux(); };
        ui.head.onchange = async e => { if (e.target.id !== "ai-mode") return; mode = e.target.value; VS.store.set("aiMode", mode); if (mode === "claude" && !key()) await askKey(); if (mode === "claude" && !key()) { mode = "assist"; e.target.value = "assist"; VS.store.set("aiMode", mode); } openAI(true); };
        ui.body.innerHTML = `<div class="chat" id="ai-chat"></div><div class="chat-in"><textarea id="ai-in" placeholder="${t("Bir şey sor… (Enter gönderir, Shift+Enter yeni satır)", "Ask anything… (Enter to send, Shift+Enter newline)")}"></textarea><div class="row"><span class="hint" style="font-size:11px;flex:1">${useClaude() ? esc(VS.settings["ai.model"]) + " · " + t("araçlar", "tools") + ": " + toolList().tools.length : "VEMTRIO Topluluk AI"}</span><button class="btn" id="ai-send"></button></div></div>`;
        const ta = $("#ai-in");
        ta.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); const v = ta.value; ta.value = ""; send(v); } };
        $("#ai-send").onclick = () => { if (busy) { stopFlag = true; return; } const v = ta.value; ta.value = ""; send(v); };
        ui.body.onclick = e => {
            if (e.target.closest("[data-key]")) askKey();
            const q = e.target.closest("[data-ask]"); if (q) send(q.dataset.ask);
            const cp = e.target.closest("[data-caip]"); if (cp) return VS.openCommunityProject(cp.dataset.caip);
            const rx = e.target.closest("[data-remix]"); if (rx) return VS.remix(rx.dataset.remix);
            const ef = e.target.closest("[data-eklefn]"); if (ef) { const [pid, fn] = ef.dataset.eklefn.split(":"); return VS.caiInsert(pid, fn); }
            const pl = e.target.closest("[data-pool]"); if (pl) { const p = (VS.codePool || []).find(x => x.id === pl.dataset.pool); if (p) { VS.run("pool.show"); setTimeout(() => { const b = document.querySelector(`[data-ekle="${p.id}"]`); if (b) b.click(); else VS.toast(p.title, ""); }, 50); } }
        };
        draw(); setTimeout(() => ta.focus(), 30);
        if (VS.loadCommunityIndex) VS.loadCommunityIndex().then(() => { if (!view.length) draw(); });
    }
    VS.assistAsk = (q, line) => { if (mode === "claude" && !key()) mode = "assist"; openAI(true); setTimeout(() => send(String(q) + (line ? ` (${t("satır", "line")} ${line})` : "")), 30); };
    VS.viewDefs = VS.viewDefs || [];
    VS.cmd("ai.toggle", () => t("AI Sohbeti Aç/Kapat", "Toggle AI Chat"), openAI, "ctrl+alt+i", "AI");
    VS.cmd("ai.setKey", () => t("AI: API Anahtarını Ayarla", "AI: Set API Key"), askKey, null, "AI");
    VS.cmd("ai.explainSelection", () => t("AI: Seçimi Açıkla", "AI: Explain Selection"), () => { const ed = VS.editor; const s = ed && ed.getModel() ? ed.getModel().getValueInRange(ed.getSelection()) : ""; openAI(true); if (s) send(t("Bu kodu açıkla:\n```\n", "Explain this code:\n```\n") + s + "\n```"); }, "ctrl+alt+e", "AI");
    VS.cmd("ai.fixFile", () => t("AI: Bu Dosyadaki Hataları Düzelt", "AI: Fix Problems in This File"), () => { const tab = VS.activeTab(); if (!tab || !tab.model) return; const ms = VS.monaco.editor.getModelMarkers({ resource: tab.model.uri }).map(m => `${m.startLineNumber}: ${m.message}`).join("\n"); openAI(true); send(t(`${tab.path} dosyasını incele ve hataları düzelt (dosyaya yaz).`, `Review ${tab.path} and fix its problems (write the file).`) + (ms ? "\n" + ms : "")); }, null, "AI");
    VS.on("mcp-tools", () => draw());
})();
