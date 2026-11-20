/* VEMTRIO Game SDK v1 · https://vemtriotr.vercel.app/vemtrio.js
 *
 * Toplulukta paylaştığın HTML oyununa tek satır ekle:
 *     <script src="/vemtrio.js"></script>
 *
 *   await Vemtrio.getPlayer()        -> { username, display, color } ya da null (giriş yapılmamış)
 *   await Vemtrio.saveScore(1234)    -> { ok, best, rank, total }  (oyunun altındaki liderlik tablosuna yazar)
 *   await Vemtrio.getLeaderboard()   -> [{ rank, username, display, score }]
 *   Vemtrio.inVemtrio                -> oyun VEMTRIO topluluğunda mı çalışıyor
 *
 * Oyunlar kum havuzunda (internetsiz) çalışır; SDK siteyle sadece güvenli postMessage köprüsü üzerinden konuşur.
 * Şifre, e-posta, çerez gibi hiçbir özel bilgi oyuna verilmez.
 */
(function () {
    if (window.Vemtrio) return;
    var inV = window.parent && window.parent !== window;
    var pending = {}, seq = 0;
    function call(type, data) {
        return new Promise(function (resolve) {
            if (!inV) { resolve({ ok: false, error: "not_in_vemtrio" }); return; }
            var id = ++seq;
            pending[id] = resolve;
            try { window.parent.postMessage({ __vemtrio: 1, id: id, type: type, data: data || {} }, "*"); } catch (e) { delete pending[id]; resolve({ ok: false, error: "bridge" }); return; }
            setTimeout(function () { if (pending[id]) { delete pending[id]; resolve({ ok: false, error: "timeout" }); } }, 8000);
        });
    }
    window.addEventListener("message", function (e) {
        var m = e.data;
        if (!m || !m.__vemtrioReply || !pending[m.id]) return;
        var r = pending[m.id]; delete pending[m.id]; r(m.data || {});
    });
    window.Vemtrio = {
        version: "1.0",
        inVemtrio: inV,
        getPlayer: function () { return call("player").then(function (r) { return r.player || null; }); },
        saveScore: function (score) {
            var n = Math.floor(Number(score));
            if (!isFinite(n) || n < 0) return Promise.resolve({ ok: false, error: "bad_score" });
            return call("score", { score: Math.min(n, 1e9) });
        },
        getLeaderboard: function () { return call("board").then(function (r) { return r.rows || []; }); },
    };
})();
