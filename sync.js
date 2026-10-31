/* BILLIONS SCHOOL V15 — synchronisation PostgreSQL (Neon) via les API Vercel.
   Les données de l'application sont envoyées par modifications (diff) et fusionnées : quel que soit le téléphone,
   l'utilisateur retrouve les mêmes données. Aucun secret n'est présent ici. */
(function () {
  var CFG = window.DS_CONFIG || {};
  if (CFG.BACKEND_PROVIDER !== "neon" || location.protocol.indexOf("http") !== 0 || typeof S === "undefined") return;
  var API = (CFG.API_BASE_URL || "") + "/api";
  var D = window.DSYNC = { tok: null, guest: false, ver: 0, status: "idle", err: "", at: 0, base: null, busy: false, inj: {}, timer: null };
  var SEQ = { logs: 1 }, ARR = ["schools","users","classes","subjects","grades","fin","disc","dec","msgs","rat","reqs","acc","nums","dupes","photos","reps","convs","cm","dom","resources","resourceReads","accessHistory","renewRequests","late","logs","groupRequests","groups","meetingRequests","meetings","photoHistory","translationJobs","trReq","gradeUnlockRequests","parentNotices","codeReqs","shares","shareReads"];

  /* ---- identifiants uniques entre appareils (plus de collision d'id) ---- */
  var lastId = 0;
  window.nid = function () { var n = Date.now() * 1000 + Math.floor(Math.random() * 1000); if (n <= lastId) n = lastId + 1; return (lastId = n); };

  /* ---- instantané et différences ---- */
  var hasId = function (a) { return a.every(function (x) { return x && typeof x === "object" && typeof x.id === "number"; }); };
  function ser(key, r) { var i = D.inj[key + ":" + r.id]; if (i !== undefined && r.pw === i) { var c = Object.assign({}, r); delete c.pw; return JSON.stringify(c); } return JSON.stringify(r); }
  function snap(st) {
    var o = {};
    Object.keys(st).forEach(function (k) {
      var v = st[k];
      if (Array.isArray(v) && SEQ[k]) o[k] = { t: "seq", n: v.length };
      else if (Array.isArray(v) && v.length && hasId(v)) { var m = {}; v.forEach(function (r) { m[r.id] = ser(k, r); }); o[k] = { t: "coll", m: m }; }
      else if (Array.isArray(v) && !v.length) o[k] = { t: "coll", m: {} };
      else o[k] = { t: "kv", s: JSON.stringify(v === undefined ? null : v) };
    });
    return o;
  }
  function diff(b, cur, st) {
    var ops = [];
    if (!b) return ops;
    Object.keys(cur).forEach(function (k) {
      var c = cur[k], p = b[k];
      if (c.t === "seq") { var n = p && p.t === "seq" ? p.n : 0; if (st[k].length > n) ops.push({ c: k, add: st[k].slice(n) }); return; }
      if (c.t === "kv" || !p || p.t !== c.t) { if (!p || p.t !== c.t || p.s !== c.s) ops.push({ k: k, set: st[k] }); return; }
      var put = [], del = [];
      st[k].forEach(function (r) { if (p.m[r.id] !== c.m[r.id]) put.push(r); });
      Object.keys(p.m).forEach(function (id) { if (c.m[id] === undefined) del.push(Number(id)); });
      if (put.length || del.length) ops.push({ c: k, put: put, del: del });
    });
    return ops;
  }
  function replay(st, ops) {
    ops.forEach(function (op) {
      var k = op.c || op.k;
      if (op.k !== undefined) { st[k] = op.set; return; }
      if (!Array.isArray(st[k])) st[k] = [];
      if (op.add) st[k] = st[k].concat(op.add);
      (op.put || []).forEach(function (r) { var i = st[k].findIndex(function (x) { return x.id === r.id; }); if (i >= 0) st[k][i] = r; else st[k].push(r); });
      (op.del || []).forEach(function (id) { st[k] = st[k].filter(function (x) { return x.id !== id; }); });
    });
  }

  /* ---- application d'un état reçu du serveur ---- */
  function setState(ns, keepOps) {
    ARR.forEach(function (k) { if (!Array.isArray(ns[k])) ns[k] = []; });
    if (keepOps && keepOps.length) replay(ns, keepOps);
    var oldMe = typeof me !== "undefined" ? me : null;
    S = ns;
    if (typeof ensureX === "function") try { ensureX(); } catch (e) {}
    if (oldMe) { var nu = S.users.filter(function (u) { return u.id === oldMe.id; })[0]; if (nu) { if (oldMe.pw && nu.pw === undefined) nu.pw = oldMe.pw; me = nu; } }
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }
  function typing() { var a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== "button" && a.type !== "checkbox"; }
  function refresh() { if (typeof me === "undefined" || !me) return; if (typing()) { D.pendingRender = true; return; } D.pendingRender = false; try { render(); } catch (e) {} }
  document.addEventListener("focusout", function () { if (D.pendingRender) setTimeout(function () { if (!typing()) refresh(); }, 300); });

  /* ---- réseau ---- */
  function call(method, path, body) {
    var h = { "Content-Type": "application/json" }; if (D.tok) h.Authorization = "Bearer " + D.tok;
    return fetch(API + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined, cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .catch(function () { return { ok: false, status: 0, j: {} }; });
  }
  function st(s, e) { D.status = s; D.err = e || ""; if (s === "ok") D.at = Date.now(); if (typeof updateSys === "function") updateSys(); if (typeof sysDetailRefresh === "function") sysDetailRefresh(); }

  function push() {
    D.timer = null;
    if (D.busy) { D.again = true; return; }
    var cur = snap(S), ops = diff(D.base, cur, S);
    if (!ops.length) return;
    D.busy = true; st("sync");
    var sent = cur, before = D.ver;
    call("POST", "/sync", { ops: ops }).then(function (r) {
      D.busy = false;
      if (r.status === 401 && D.tok) { D.tok = null; return st("auth", "Session expirée : reconnectez-vous."); }
      if (!r.ok) { st("offline", r.j.error || "Serveur injoignable"); return setTimeout(schedule, 8000); }
      var j = r.j;
      if (!D.tok && j.guestToken) { D.tok = j.guestToken; D.guest = true; }
      if (j.state && !D.guest) {
        var ops2 = diff(sent, snap(S), S); // modifications faites pendant l'envoi
        setState(j.state, ops2); D.base = snap(j.state); D.ver = j.version;
        if (j.version !== before + 1) refresh();
      } else D.base = sent;
      st("ok");
      if (D.again) { D.again = false; schedule(); }
    });
  }
  function schedule() { clearTimeout(D.timer); D.timer = setTimeout(push, 700); }
  function pull() {
    if (!D.tok || D.guest || D.busy || D.pulling || document.hidden) return;
    D.pulling = true;
    call("GET", "/sync?since=" + D.ver).then(function (r) {
      D.pulling = false;
      if (r.status === 401) { D.tok = null; return st("auth", "Session expirée : reconnectez-vous."); }
      if (!r.ok) return st("offline", r.j.error || "Serveur injoignable");
      if (r.j.changed) { var ops2 = diff(D.base, snap(S), S); setState(r.j.state, ops2); D.base = snap(r.j.state); D.ver = r.j.version; refresh(); if (ops2.length) schedule(); }
      st("ok");
    });
  }

  /* ---- enregistrement : chaque save() déclenche un envoi différé ---- */
  var _save = window.save;
  window.save = function () { var x = _save.apply(this, arguments); schedule(); return x; };

  /* ---- connexion vérifiée par le serveur (mots de passe jamais lus côté navigateur) ---- */
  function adopt(j, pw) {
    D.tok = j.token; D.guest = j.kind === "req"; D.ver = j.version;
    if (j.kind === "user") {
      setState(j.state); D.inj = {}; var u = S.users.filter(function (x) { return x.id === j.id; })[0]; if (u) { u.pw = pw; D.inj["users:" + u.id] = pw; }
      D.base = snap(S);
    } else {
      var r = j.state.reqs[0]; if (r) { var i = S.reqs.findIndex(function (x) { return x.id === r.id; }); if (i >= 0) S.reqs[i] = r; else S.reqs.push(r); r.pw = pw; D.inj["reqs:" + r.id] = pw; }
      D.base = snap(S);
    }
    st("ok");
  }
  function verifyThen(next) {
    var idEl = document.getElementById("em"), pwEl = document.getElementById("pw"), er = document.getElementById("err"), b = document.getElementById("lgbtn");
    var id = idEl ? idEl.value.trim() : "", pw = pwEl ? pwEl.value : "";
    if (!id || !pw) return next();
    if (b) { b.disabled = true; b.textContent = "Connexion…"; }
    call("POST", "/login", { id: id, pw: pw }).then(function (r) {
      if (b) { b.disabled = false; b.textContent = "Se connecter"; }
      if (!r.ok) { if (er) er.textContent = r.status === 0 ? "Serveur injoignable : vérifiez votre connexion internet." : (r.j.error || "Identifiants incorrects pour ce profil."); return; }
      adopt(r.j, pw); next();
    });
  }
  var _login = window.login, _chg = window.chg;
  window.login = function () { verifyThen(_login); };
  window.chg = function () { verifyThen(_chg); };

  /* ---- après activation d'un compte (visiteur -> utilisateur) : reconnexion complète pour recevoir les données ---- */
  var _ss = window.startSession;
  window.startSession = function (u, pos) {
    if (!D.guest || !u || !u.pw) return _ss(u, pos);
    clearTimeout(D.timer);
    var go = function () {
      if (D.busy) return setTimeout(go, 200);
      push(); // envoie le nouveau compte
      var wait = function () {
        if (D.busy) return setTimeout(wait, 200);
        call("POST", "/login", { id: u.phone || u.email, pw: u.pw }).then(function (r) {
          if (r.ok && r.j.kind === "user") { adopt(r.j, u.pw); var nu = S.users.filter(function (x) { return x.id === r.j.id; })[0]; _ss(nu || u, pos); }
          else _ss(u, pos);
        });
      };
      wait();
    };
    go();
  };

  /* ---- voyants colorés ---- */
  var _bk = window.sysBackup;
  window.sysBackup = function () {
    var C = SYS_COL;
    if (SYS.saveErr && _bk) return _bk();
    if (D.status === "sync") return { c: C.warn, t: "Enregistrement…", d: "Envoi des modifications vers la base PostgreSQL." };
    if (D.status === "ok" && D.tok) return { c: C.ok, t: "Sauvegardé en ligne", d: "Vos données sont enregistrées dans la base PostgreSQL et disponibles sur tous vos appareils (dernière synchronisation à " + new Date(D.at).toLocaleTimeString("fr-FR") + ")." };
    if (D.status === "offline") return { c: C.err, t: "Base injoignable", d: "Les modifications seront envoyées dès que la connexion revient. " + D.err };
    if (D.status === "auth") return { c: C.warn, t: "Session expirée", d: D.err };
    return { c: C.warn, t: "Non connecté", d: "Connectez-vous pour synchroniser vos données avec la base en ligne." };
  };
  window.cloudRow = function () { var b = window.sysBackup(); return { c: b.c, t: b.c === SYS_COL.ok ? "Connectée" : b.t, d: b.d }; };

  D.pull = pull; D.push = push;
  setInterval(pull, 12000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) pull(); });
  window.addEventListener("online", function () { schedule(); pull(); });
  D.base = snap(S); // les modifications faites avant la connexion (ex. inscription) sont envoyées comme visiteur
})();
