/* BILLIONS SCHOOL V16 — (1) code de suivi retrouvé via le super administrateur, (2) historique GPS filtrable + carte, (3) traduction de gros fichiers. */
(function () {
  function nrm(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
  function isSuper() { return me && me.role === "super"; }
  function ensure() { if (!S.codeReqs) S.codeReqs = []; }
  function two(n) { return String(n).padStart(2, "0"); }
  function ldate(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()); }
  window.ldate = ldate;

  /* ================= 1. Parent sans code de suivi -> super administrateur ================= */
  var _enf = VIEWS.enf;
  VIEWS.enf = function () { return _enf() + (me.role === "parent" ? forgotCard() : ""); };
  function forgotCard() {
    ensure();
    var mineR = S.codeReqs.filter(function (r) { return r.parent === me.id; }).slice().reverse().slice(0, 5);
    return '<div class="card"><b>🔎 Je ne connais pas le code de suivi de mon enfant</b><div class="mu">Écrivez au super administrateur : il vérifie l’élève, puis vous envoie son code de suivi dans votre messagerie et ajoute l’enfant à votre compte.</div>'
      + IN("fc_name", "Nom complet de l’enfant") + IN("fc_school", "Établissement (nom et ville)") + IN("fc_class", "Classe (facultatif)") + IN("fc_note", "Précisions utiles : date de naissance, matricule… (facultatif)")
      + ER() + '<button onclick="sendCodeReq()">Envoyer ma demande</button>'
      + (mineR.length ? '<div class="mu" style="margin-top:8px"><b>Mes demandes</b></div>' + mineR.map(function (r) { return '<div class="mu">• ' + esc(r.child) + ' (' + esc(r.school) + ') — ' + (r.status === "attente" ? "⏳ en attente" : r.status === "repondu" ? "✅ code envoyé dans votre messagerie" : "ℹ️ clôturée") + '</div>'; }).join("") : "") + '</div>';
  }
  window.sendCodeReq = function () {
    ensure(); var c = v("fc_name"), s = v("fc_school");
    if (!c || !s) return err("Indiquez le nom de l’enfant et son établissement.");
    var r = { id: nid(S.codeReqs), parent: me.id, parentName: me.name, contact: me.phone || me.email || "", child: c, school: s, cls: v("fc_class"), note: v("fc_note"), ts: now(), status: "attente" };
    S.codeReqs.push(r);
    S.users.filter(function (u) { return u.role === "super"; }).forEach(function (u) { S.msgs.push({ id: nid(S.msgs), from: me.id, to: u.id, text: "🔑 Demande de code de suivi\nParent : " + me.name + " (" + r.contact + ")\nEnfant : " + c + "\nÉtablissement : " + s + (r.cls ? "\nClasse : " + r.cls : "") + (r.note ? "\nPrécisions : " + r.note : "") + "\n→ Onglet « Codes de suivi ».", kind: "text", readAt: "", ts: now() }); });
    L("Demande de code de suivi : " + c); alert("Demande envoyée au super administrateur. Vous recevrez le code dans votre messagerie."); render();
  };

  /* ---- côté super administrateur ---- */
  var _tabsOf = window.tabsOf;
  window.tabsOf = function () {
    var t = _tabsOf.apply(this, arguments);
    if (isSuper()) { ensure(); var n = S.codeReqs.filter(function (r) { return r.status === "attente"; }).length, i = t.findIndex(function (x) { return x[0] === "req"; }); t.splice(i < 0 ? 1 : i + 1, 0, ["codes", "🔑", "Codes de suivi" + (n ? " (" + n + ")" : "")]); }
    return t;
  };
  function students() { return S.users.filter(function (u) { return u.role === "eleve"; }); }
  function score(st, r) {
    var tk = nrm(r.child).split(/\s+/).filter(function (x) { return x.length > 1; }), nm = nrm(st.name), n = 0;
    tk.forEach(function (x) { if (nm.indexOf(x) >= 0) n += 2; });
    var sn = nrm((sch(st.school) || {}).name); nrm(r.school).split(/\s+/).filter(function (x) { return x.length > 2; }).forEach(function (x) { if (sn.indexOf(x) >= 0) n += 1; });
    if (r.cls && nrm((cls(st.classId) || {}).name).indexOf(nrm(r.cls)) >= 0) n += 1;
    return n;
  }
  function stLine(st) { return esc(st.name) + ' — ' + esc((sch(st.school) || {}).name || "") + ' (' + esc((cls(st.classId) || {}).name || "sans classe") + ') · matricule ' + esc(st.matricule || "—") + ' · <b>' + esc(st.code || "—") + '</b>'; }
  var CSQ = "";
  window.csSearch = function () { CSQ = v("cs_q"); render(); };
  window.vCodes = function () {
    if (!isSuper()) return ""; ensure();
    var pend = S.codeReqs.filter(function (r) { return r.status === "attente"; }), done = S.codeReqs.filter(function (r) { return r.status !== "attente"; }).slice(-8).reverse();
    var qr = CSQ ? students().filter(function (st) { var h = nrm(st.name + " " + (st.matricule || "") + " " + (st.code || "") + " " + ((sch(st.school) || {}).name || "")); return nrm(CSQ).split(/\s+/).every(function (x) { return h.indexOf(x) >= 0; }); }).slice(0, 20) : null;
    var h = '<h2>🔑 Codes de suivi demandés par les parents</h2><div class="card"><b>Rechercher un élève</b><div class="mu">Par nom, matricule, code de suivi ou établissement.</div><input id="cs_q" value="' + esc(CSQ) + '" placeholder="Ex. Mbarga Lycée Bilingue" onkeydown="if(event.key===\'Enter\')csSearch()"><button onclick="csSearch()">🔎 Rechercher</button>'
      + (qr ? (qr.length ? qr.map(function (st) { return '<div class="row"><span>' + stLine(st) + '</span></div>'; }).join("") : '<div class="mu">Aucun élève trouvé.</div>') : "") + '</div>';
    h += '<h3>En attente (' + pend.length + ')</h3>' + (pend.length ? pend.map(function (r) {
      var sg = students().map(function (st) { return [score(st, r), st]; }).filter(function (x) { return x[0] > 0; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 8);
      return '<div class="card"><b>' + esc(r.parentName) + '</b> <span class="mu">(' + esc(r.contact) + ') · ' + esc(r.ts) + '</span><div>Cherche : <b>' + esc(r.child) + '</b> — ' + esc(r.school) + (r.cls ? ' — ' + esc(r.cls) : '') + '</div>' + (r.note ? '<div class="mu">' + esc(r.note) + '</div>' : '')
        + '<div class="mu" style="margin-top:6px"><b>Élèves correspondants</b> (cochez ceux à envoyer)</div>'
        + (sg.length ? sg.map(function (x) { return '<label style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" id="cs_' + r.id + '_' + x[1].id + '"><span>' + stLine(x[1]) + '</span></label>'; }).join("") : '<div class="mu">Aucune correspondance automatique : utilisez la recherche ci-dessus.</div>')
        + '<div style="margin-top:8px">' + btn("📨 Envoyer le code au parent", "answerCode(" + r.id + ")", "p") + ' ' + btn("Aucun élève trouvé", "noCode(" + r.id + ")", "s") + '</div></div>';
    }).join("") : '<div class="card mu">Aucune demande en attente.</div>');
    return h + lst("Dernières demandes traitées", done.map(function (r) { return '<div class="row"><span><b>' + esc(r.parentName) + '</b><div class="mu">' + esc(r.child) + ' · ' + (r.status === "repondu" ? "code envoyé" : "clôturée") + ' · ' + esc(r.answeredAt || "") + '</div></span></div>'; }), "Aucune.");
  };
  VIEWS.codes = vCodes;
  window.answerCode = function (id) {
    var r = S.codeReqs.filter(function (x) { return x.id == id; })[0]; if (!r) return;
    var ch = students().filter(function (st) { var e = document.getElementById("cs_" + id + "_" + st.id); return e && e.checked; });
    if (!ch.length) return alert("Cochez au moins un élève.");
    var p = uid(r.parent); if (!p) return alert("Compte parent introuvable.");
    if (!confirm("Confirmez-vous avoir vérifié que " + r.parentName + " est bien responsable de : " + ch.map(function (s) { return s.name; }).join(", ") + " ?")) return;
    if (!p.kids) p.kids = [];
    ch.forEach(function (st) { if (p.kids.indexOf(st.id) < 0) p.kids.push(st.id); });
    S.msgs.push({ id: nid(S.msgs), from: me.id, to: p.id, kind: "text", readAt: "", ts: now(), text: "🔑 Votre demande de code de suivi a été traitée :\n" + ch.map(function (st) { return "• " + st.name + " — " + ((sch(st.school) || {}).name || "") + " : " + st.code; }).join("\n") + "\nL’enfant a été ajouté à « Mes enfants ». Vous pouvez aussi saisir ce code à cet endroit." });
    r.status = "repondu"; r.answeredAt = now(); r.by = me.id; r.codes = ch.map(function (s) { return s.id; });
    L("Code de suivi envoyé au parent " + r.parentName); alert("Code envoyé au parent."); render();
  };
  window.noCode = function (id) {
    var r = S.codeReqs.filter(function (x) { return x.id == id; })[0]; if (!r) return;
    S.msgs.push({ id: nid(S.msgs), from: me.id, to: r.parent, kind: "text", readAt: "", ts: now(), text: "ℹ️ Nous n’avons pas pu identifier « " + r.child + " » (" + r.school + "). Merci de vérifier l’orthographe, de contacter le chef d’établissement, ou de refaire une demande avec plus de précisions (date de naissance, classe)." });
    r.status = "clos"; r.answeredAt = now(); r.by = me.id; render();
  };

  /* ================= 2. Historique GPS : filtres par date, établissement, carte ================= */
  window.cloudCard = function () { return ""; };
  window.accExtra = function () {
    var ss = {}, opts = ""; accSrc().forEach(function (x) { var k = x.school ? String(x.school) : (x.schoolName || ""); if (k && !ss[k]) { ss[k] = 1; opts += '<option value="' + esc(k) + '"' + (accF.s === k ? " selected" : "") + ">" + esc(x.schoolName || (sch(x.school) || {}).name || k) + "</option>"; } });
    return '<select id="afs" onchange="setAccF()"><option value="">Tous les établissements</option>' + opts + '</select>'
      + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px"><label style="margin:0">Du</label><input type="date" id="afd1" value="' + esc(accF.d1) + '" onchange="setAccF()" style="width:auto"><label style="margin:0">Au</label><input type="date" id="afd2" value="' + esc(accF.d2) + '" onchange="setAccF()" style="width:auto"></div>'
      + '<div style="margin-top:6px">' + btn("Aujourd’hui", "setAccRange(0)", "s") + " " + btn("7 jours", "setAccRange(7)", "s") + " " + btn("30 jours", "setAccRange(30)", "s") + " " + btn("Tout", "setAccRange(-1)", "s") + " " + btn("⬇️ Exporter CSV", "exportAcc()", "s") + "</div>";
  };
  window.setAccRange = function (n) { var d = new Date(); accF.d2 = n < 0 ? "" : ldate(d); if (n < 0) accF.d1 = ""; else { d.setDate(d.getDate() - n); accF.d1 = ldate(d); } render(); };
  window.showFilteredMap = function () {
    var rows = accRows().filter(function (x) { return x.lat != null; });
    if (!rows.length) return alert("Aucune position GPS dans la sélection actuelle.");
    var one = !!accF.u, pal = { chef: "#2563eb", prof: "#7c3aed", comptable: "#d97706", censeur: "#0891b2", eleve: "#14a38f", parent: "#db2777", repetiteur: "#ea580c" };
    mapOv("🗺️ Positions filtrées (" + rows.length + ")", '<div id="allmap" style="height:400px;border-radius:14px;border:1px solid #e3e8f0"></div><div class="mu" style="margin-top:6px">' + (accF.d1 || accF.d2 ? "Période : " + esc(accF.d1 || "…") + " → " + esc(accF.d2 || "…") + ". " : "") + (one ? "Le trait relie les connexions de l’utilisateur dans l’ordre chronologique. " : "") + 'Touchez un point pour le détail.</div>');
    loadLeaflet(function (ok) {
      var el = document.getElementById("allmap"); if (!el) return;
      if (!ok) { el.outerHTML = '<div class="card">Carte indisponible hors ligne. Liens directs :' + rows.slice(0, 50).map(function (x) { return '<div class="row"><span>' + esc(x.name) + " · " + esc(x.loginLocal) + '</span><a href="' + geoLink(x) + '" target="_blank" rel="noopener">Ouvrir ↗</a></div>'; }).join("") + "</div>"; return; }
      var m = L.map("allmap"), b = []; L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
      var chrono = rows.slice().sort(function (a, c) { return new Date(a.loginAt) - new Date(c.loginAt); });
      chrono.forEach(function (x, i) { L.circleMarker([x.lat, x.lng], { radius: 8, color: "#fff", weight: 2, fillColor: pal[x.role] || "#6b7280", fillOpacity: .9 }).addTo(m).bindPopup((one ? "<b>#" + (i + 1) + "</b> " : "") + "<b>" + esc(x.name) + "</b><br>" + esc(RL[x.role] || x.role) + "<br>Entrée : " + esc(x.loginLocal) + "<br>" + (x.logoutLocal ? "Sortie : " + esc(x.logoutLocal) : "En ligne") + (x.acc ? "<br>± " + x.acc + " m" : "")); b.push([x.lat, x.lng]); });
      if (one && b.length > 1) L.polyline(b, { color: "#14a38f", weight: 3, opacity: .7 }).addTo(m);
      if (b.length == 1) m.setView(b[0], 16); else m.fitBounds(b, { padding: [30, 30] });
    });
  };
  window.exportAcc = function () {
    var rows = accRows(), q = function (s) { return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"'; };
    var csv = "\ufeffUtilisateur;Profil;Établissement;Entrée;Sortie;Durée (min);Latitude;Longitude;Précision (m)\n" + rows.map(function (x) { return [x.name, RL[x.role] || x.role, x.schoolName || (sch(x.school) || {}).name || "Plateforme", x.loginLocal, x.logoutLocal || "", x.durationMinutes == null ? "" : x.durationMinutes, x.lat == null ? "" : x.lat, x.lng == null ? "" : x.lng, x.acc || ""].map(q).join(";"); }).join("\n");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = "historique-gps-" + ldate(new Date()) + ".csv"; a.click();
  };

  /* ================= 3. Traduction de fichiers : envoi par morceaux (aucune limite côté navigateur) ================= */
  var API = ((window.DS_CONFIG || {}).API_BASE_URL || "") + "/api/media", up = null, jt = null;
  var LBL = { awaiting_upload: "Envoi interrompu ou en cours", uploaded: "Reçu", queued: "En file d’attente", processing: "Traduction en cours", completed: "Terminé ✅", failed: "Échec ❌", cancelled: "Annulé" };
  function tok() { var d = window.DSYNC; return d && d.tok && !d.guest ? d.tok : null; }
  function api(action, method, body, extra) {
    return fetch(API + "?action=" + action + (extra || ""), { method: method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok() }, body: body ? JSON.stringify(body) : undefined, cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.ok === false) throw new Error(j.error || "Erreur serveur (" + r.status + ")"); return j; }); });
  }
  function size(n) { return n >= 1073741824 ? (n / 1073741824).toFixed(2) + " Go" : n >= 1048576 ? (n / 1048576).toFixed(1) + " Mo" : Math.ceil(n / 1024) + " Ko"; }
  window.docCard = function () {
    setTimeout(refreshJobs, 60);
    return '<div class="card"><b>📄 Traduire un document, une vidéo ou un fichier</b><div class="mu">Tous formats, y compris de plusieurs Go : le fichier est envoyé par morceaux avec reprise automatique en cas de coupure. Documents (Word, PowerPoint, Excel, PDF avec texte, TXT, SRT/VTT) : fichier traduit. Audio et vidéo : sous-titres traduits (SRT), avec option de copie vidéo sous-titrée.</div>'
      + '<input id="trFile" type="file"><label>Langue de sortie</label>' + SEL_("fileLang", langOpts(), myLang())
      + '<label>Langue parlée ou écrite dans le fichier (obligatoire pour l’audio et la vidéo)</label>' + SEL_("fileSrc", [["", "Détection automatique / non précisée"]].concat(langOpts()), "")
      + '<label style="display:flex;gap:6px;align-items:center;font-size:13px"><input id="fileMux" type="checkbox"> Vidéo : incorporer les sous-titres dans une copie de la vidéo</label>'
      + '<button id="trGo" onclick="startFileTr()">Envoyer et traduire</button> <button id="trStop" onclick="stopFileTr()" style="display:none">Annuler l’envoi</button>'
      + '<div id="fileTrBar" class="mu" style="margin-top:6px"></div><div id="trJobs" style="margin-top:10px"></div></div>';
  };
  function bar(t, p) { var e = document.getElementById("fileTrBar"); if (e) e.innerHTML = t + (p != null ? '<div style="height:8px;background:#e5e7eb;border-radius:6px;margin-top:4px"><div style="height:8px;width:' + p + '%;background:#14a38f;border-radius:6px"></div></div>' : ""); }
  function putPart(url, blob, onp, ctl) {
    return new Promise(function (ok, ko) {
      var x = new XMLHttpRequest(); ctl.x.push(x); x.open("PUT", url);
      x.upload.onprogress = function (e) { onp(e.loaded); };
      x.onload = function () { if (x.status >= 200 && x.status < 300) { var et = x.getResponseHeader("ETag"); et ? ok(et) : ko(new Error("ETag illisible : configurez le CORS du bucket R2 (voir le guide).")); } else ko(new Error("HTTP " + x.status)); };
      x.onerror = function () { ko(new Error("Réseau")); }; x.onabort = function () { ko(new Error("Annulé")); }; x.send(blob);
    });
  }
  window.stopFileTr = function () { if (up) { up.stop = true; up.x.forEach(function (x) { try { x.abort(); } catch (e) { } }); } };
  window.startFileTr = function () {
    if (!tok()) return alert("Connectez-vous avec le serveur en ligne pour utiliser la traduction de fichiers.");
    if (up) return alert("Un envoi est déjà en cours.");
    var f = document.getElementById("trFile").files[0], to = v("fileLang"), from = v("fileSrc");
    if (!f) return alert("Choisissez un document, une vidéo ou un fichier.");
    if (/^(audio|video)\//.test(f.type) && !from) return alert("Indiquez la langue parlée dans le fichier.");
    var ctl = up = { stop: false, x: [] }, done = 0, loaded = {}, etags = {}, total = 0, jobId = 0, partSize = 0;
    var go = document.getElementById("trGo"), st = document.getElementById("trStop"); go.disabled = true; st.style.display = "";
    var upd = function () { var l = done * 0, s = 0; Object.keys(loaded).forEach(function (k) { s += loaded[k]; }); var p = Math.min(99, Math.floor(s / f.size * 100)); bar("Envoi de « " + esc(f.name) + " » (" + size(f.size) + ") : " + p + " %", p); };
    api("start", "POST", { name: f.name, size: f.size, mime: f.type, target: to, source: from || undefined, mux: !!(document.getElementById("fileMux") || {}).checked }).then(function (j) {
      jobId = j.jobId; partSize = j.partSize; total = j.totalParts; var next = 1, active = 0;
      return new Promise(function (ok, ko) {
        var failed = false;
        function pump() {
          if (failed) return;
          if (ctl.stop) { failed = true; return ko(new Error("Envoi annulé")); }
          if (done === total) return ok();
          while (active < 3 && next <= total) { launch(next++); }
        }
        function launch(n) {
          active++;
          var a = (n - 1) * partSize, blob = f.slice(a, Math.min(f.size, a + partSize)), tries = 0;
          (function attempt() {
            api("sign", "POST", { jobId: jobId, parts: [n] }).then(function (s) { return putPart(s.urls[n], blob, function (l) { loaded[n] = l; upd(); }, ctl); })
              .then(function (et) { etags[n] = et; loaded[n] = blob.size; done++; active--; upd(); pump(); })
              .catch(function (e) { if (ctl.stop) { failed = true; return ko(new Error("Envoi annulé")); } if (++tries < 5) { loaded[n] = 0; return setTimeout(attempt, 1500 * tries); } failed = true; ko(e); });
          })();
        }
        pump();
      });
    }).then(function () {
      bar("Finalisation…", 99);
      return api("complete", "POST", { jobId: jobId, parts: Object.keys(etags).map(function (k) { return { n: Number(k), etag: etags[k] }; }) });
    }).then(function () { bar("✅ Fichier reçu : la traduction démarre. Suivez l’avancement ci-dessous.", 100); refreshJobs(); })
      .catch(function (e) { bar("❌ " + esc(e.message)); if (jobId) api("cancel", "POST", { jobId: jobId }).catch(function () { }).then(refreshJobs); })
      .then(function () { up = null; var g = document.getElementById("trGo"), s2 = document.getElementById("trStop"); if (g) g.disabled = false; if (s2) s2.style.display = "none"; });
  };
  window.dlJob = function (id) { api("download", "GET", null, "&id=" + id).then(function (j) { window.open(j.url, "_blank"); }).catch(function (e) { alert(e.message); }); };
  window.cancelJob = function (id) { if (confirm("Annuler cette traduction ?")) api("cancel", "POST", { jobId: id }).then(refreshJobs).catch(function (e) { alert(e.message); }); };
  function refreshJobs() {
    clearTimeout(jt); var el = document.getElementById("trJobs"); if (!el || !tok()) return;
    api("list", "GET").then(function (j) {
      el = document.getElementById("trJobs"); if (!el) return;
      el.innerHTML = j.jobs.length ? '<b>Mes traductions</b>' + j.jobs.slice(0, 15).map(function (x) {
        return '<div class="row"><span><b>' + esc(x.name) + '</b><div class="mu">' + size(x.size) + " → " + esc(x.target) + " · " + (LBL[x.status] || x.status) + (x.status === "processing" ? " " + x.progress + " %" : "") + '</div>' + (x.error ? '<div class="mu" style="color:#b91c1c">' + esc(x.error) + "</div>" : "") + "</span><span>"
          + (x.status === "completed" ? btn("⬇️ Télécharger", "dlJob(" + x.id + ")", "p") : "") + (["queued", "awaiting_upload"].indexOf(x.status) >= 0 && !(up && x.status === "awaiting_upload") ? " " + btn("✕", "cancelJob(" + x.id + ")") : "") + "</span></div>";
      }).join("") : "";
      var act = j.jobs.some(function (x) { return ["queued", "processing", "awaiting_upload"].indexOf(x.status) >= 0; });
      jt = setTimeout(refreshJobs, act ? 6000 : 30000);
    }).catch(function () { jt = setTimeout(refreshJobs, 30000); });
  }
})();
