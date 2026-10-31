/* BILLIONS SCHOOL V17 — Bibliothèque : le super administrateur envoie livres, vidéos, documents et autres fichiers (gros fichiers inclus)
   aux utilisateurs de son choix ; chacun les retrouve dans l'onglet « Bibliothèque ». */
(function () {
  var API = ((window.DS_CONFIG || {}).API_BASE_URL || "") + "/api/media", SH = { role: "", school: "", q: "", sel: {} }, busy = null;
  var KIND = { livre: ["📖", "Livre"], video: ["🎬", "Vidéo"], document: ["📄", "Document"], autre: ["📎", "Autre"] };
  var ROLES = ["eleve", "parent", "prof", "chef", "comptable", "censeur", "repetiteur"];
  function nrm(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
  function ensure() { if (!S.shares) S.shares = []; if (!S.shareReads) S.shareReads = []; }
  function tok() { var d = window.DSYNC; return d && d.tok && !d.guest ? d.tok : null; }
  function size(n) { return n >= 1073741824 ? (n / 1073741824).toFixed(2) + " Go" : n >= 1048576 ? (n / 1048576).toFixed(1) + " Mo" : Math.ceil(n / 1024) + " Ko"; }
  function api(action, method, body, extra) {
    return fetch(API + "?action=" + action + (extra || ""), { method: method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok() }, body: body ? JSON.stringify(body) : undefined, cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.ok === false) throw new Error(j.error || "Erreur serveur (" + r.status + ")"); return j; }); });
  }
  function isRead(sid) { return S.shareReads.some(function (r) { return r.share === sid && r.uid === me.id; }); }
  function mineShares() { ensure(); return S.shares.filter(function (s) { return s.to.indexOf(me.id) >= 0; }); }

  /* ---- onglets ---- */
  var _tabsOf = window.tabsOf;
  window.tabsOf = function () {
    var t = _tabsOf.apply(this, arguments);
    if (me.role === "super") { var i = t.findIndex(function (x) { return x[0] === "codes"; }); t.splice(i < 0 ? 1 : i + 1, 0, ["envoi", "📤", "Envoyer des contenus"]); }
    else { ensure(); var n = mineShares().filter(function (s) { return !isRead(s.id); }).length; t.splice(Math.max(1, t.length - 1), 0, ["biblio", "📚", "Bibliothèque" + (n ? " (" + n + ")" : "")]); }
    return t;
  };

  /* ================= Destinataire : Bibliothèque ================= */
  window.vLib = function () {
    var l = mineShares().slice().reverse();
    return '<h2>📚 Ma bibliothèque</h2><div class="sim">Livres, vidéos et documents envoyés par le super administrateur de la plateforme.</div>'
      + (l.length ? l.map(function (s) {
        var k = KIND[s.kind] || KIND.autre, nw = !isRead(s.id);
        return '<div class="card"><b>' + k[0] + " " + esc(s.title) + "</b>" + (nw ? ' <span style="background:#e11d48;color:#fff;border-radius:8px;padding:1px 7px;font-size:12px">Nouveau</span>' : "")
          + '<div class="mu">' + k[1] + " · " + esc(s.ts) + (s.fileName ? " · 📎 " + esc(s.fileName) + " (" + size(s.size) + ")" : "") + "</div>" + (s.note ? '<div style="margin:6px 0;white-space:pre-wrap">' + esc(s.note) + "</div>" : "")
          + (s.link ? '<div style="margin-top:6px">' + btn(s.kind === "video" ? "▶️ Regarder" : "🔗 Ouvrir le lien", "openLink(" + s.id + ")", "p") + "</div>" : "") + (s.fileId ? '<div style="margin-top:6px">' + btn(s.kind === "video" ? "▶️ Regarder" : "👁 Ouvrir", "openShare(" + s.id + ",'view')", "p") + " " + btn("⬇️ Télécharger", "openShare(" + s.id + ",'download')", "s") + "</div>" : "") + "</div>";
      }).join("") : '<div class="card mu">Aucun contenu reçu pour le moment.</div>');
  };
  VIEWS.biblio = vLib;
  window.openLink = function (id) {
    ensure(); var s = S.shares.filter(function (x) { return x.id === id; })[0]; if (!s || !/^https?:\/\//i.test(s.link || "")) return;
    if (!isRead(id)) { S.shareReads.push({ id: nid(S.shareReads), share: id, uid: me.id, name: me.name, ts: now() }); save(); render(); }
    window.open(s.link, "_blank", "noopener");
  };
  window.openShare = function (id, mode) {
    ensure(); var s = S.shares.filter(function (x) { return x.id === id; })[0]; if (!s || !s.fileId) return;
    if (!tok()) return alert("Connectez-vous au serveur en ligne pour ouvrir ce contenu.");
    var w = window.open("", "_blank");
    api("sdownload", "GET", null, "&id=" + s.fileId + "&mode=" + mode).then(function (j) {
      if (!isRead(id)) { S.shareReads.push({ id: nid(S.shareReads), share: id, uid: me.id, name: me.name, ts: now() }); save(); render(); } // lu seulement si le serveur a autorisé l'accès
      if (w) w.location.href = j.url; else location.href = j.url; })
      .catch(function (e) { if (w) w.close(); alert(e.message); });
  };

  /* ================= Super administrateur : envoyer ================= */
  function matches() {
    var tk = nrm(SH.q).split(/\s+/).filter(Boolean);
    return S.users.filter(function (u) {
      if (u.role === "super" || u.active === false) return false;
      if (SH.role && u.role !== SH.role) return false;
      if (SH.school && String(u.school) !== SH.school) return false;
      if (!tk.length) return true;
      var h = nrm(u.name + " " + (u.email || "") + " " + (u.matricule || "") + " " + ((sch(u.school) || {}).name || ""));
      return tk.every(function (x) { return h.indexOf(x) >= 0; });
    });
  }
  function count() { return Object.keys(SH.sel).length; }
  window.shRefresh = function () {
    var m = matches(), c = document.getElementById("shCount"), l = document.getElementById("shList"); if (c) c.textContent = count();
    if (!l) return;
    l.innerHTML = '<div class="mu" style="margin:6px 0">' + m.length + " utilisateur(s) correspondant(s)" + (m.length > 150 ? " (150 affichés)" : "") + '</div><div>' + btn("☑ Cocher les " + m.length, "shAll(true)", "s") + " " + btn("☐ Décocher ces résultats", "shAll(false)", "s") + " " + btn("Tout décocher", "shClear()", "s") + "</div>"
      + '<div style="max-height:260px;overflow:auto;margin-top:6px">' + m.slice(0, 150).map(function (u) { return '<label class="row" style="display:flex;gap:8px;align-items:center"><input type="checkbox" ' + (SH.sel[u.id] ? "checked " : "") + 'onchange="shTog(' + u.id + ',this.checked)"><span>' + esc(u.name) + ' <span class="mu">· ' + esc(RL[u.role] || u.role) + " · " + esc((sch(u.school) || {}).name || "Plateforme") + "</span></span></label>"; }).join("") + "</div>";
  };
  window.shTog = function (id, on) { if (on) SH.sel[id] = 1; else delete SH.sel[id]; var c = document.getElementById("shCount"); if (c) c.textContent = count(); };
  window.shAll = function (on) { matches().forEach(function (u) { if (on) SH.sel[u.id] = 1; else delete SH.sel[u.id]; }); shRefresh(); };
  window.shClear = function () { SH.sel = {}; shRefresh(); };
  window.shFilter = function () { SH.role = v("sh_role"); SH.school = v("sh_school"); SH.q = v("sh_q"); shRefresh(); };
  window.shQuick = function (role) { SH.role = role; SH.school = SH.school; var r = document.getElementById("sh_role"); if (r) r.value = role; matches().forEach(function (u) { SH.sel[u.id] = 1; }); shRefresh(); };

  window.vShare = function () {
    if (me.role !== "super") return ""; ensure();
    var sc = S.schools.map(function (s) { return [s.id, s.name]; }), mineS = S.shares.slice().reverse();
    var qb = [["eleve", "Tous les élèves"], ["parent", "Tous les parents"], ["prof", "Tous les professeurs"], ["chef", "Tous les chefs d’établissement"], ["repetiteur", "Tous les répétiteurs"], ["", "Tout le monde"]].map(function (x) { return btn(x[1], "shQuick('" + x[0] + "')", "s"); }).join(" ");
    setTimeout(shRefresh, 30);
    return '<h2>📤 Envoyer des livres, vidéos et documents</h2><div class="sim">Choisissez un fichier (de plusieurs Go si besoin : envoi par morceaux avec reprise) puis les destinataires. Ils le retrouvent dans l’onglet « Bibliothèque ».</div>'
      + '<div class="card"><b>1. Le contenu</b>' + IN("sh_title", "Titre (ex. Manuel de mathématiques 3ème)")
      + '<select id="sh_kind"><option value="livre">📖 Livre</option><option value="video">🎬 Vidéo</option><option value="document" selected>📄 Document</option><option value="autre">📎 Autre</option></select>'
      + '<input id="sh_file" type="file"><div class="mu">Pas de stockage de fichiers ? Collez plutôt un lien (vidéo YouTube, Google Drive, site…) :</div><input id="sh_link" placeholder="https://…"><textarea id="sh_note" rows="3" placeholder="Message d’accompagnement (facultatif)" style="width:100%;padding:10px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx)"></textarea></div>'
      + '<div class="card"><b>2. Les destinataires</b> — <b id="shCount">0</b> sélectionné(s)<div style="margin:6px 0">' + qb + "</div>"
      + '<select id="sh_role" onchange="shFilter()"><option value="">Tous les profils</option>' + ROLES.map(function (r) { return '<option value="' + r + '"' + (SH.role === r ? " selected" : "") + ">" + esc(RL[r] || r) + "</option>"; }).join("") + "</select>"
      + '<select id="sh_school" onchange="shFilter()"><option value="">Tous les établissements</option>' + sc.map(function (x) { return '<option value="' + x[0] + '"' + (String(x[0]) === SH.school ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join("") + "</select>"
      + '<input id="sh_q" value="' + esc(SH.q) + '" placeholder="Rechercher un nom, e-mail, matricule…" oninput="shFilter()"><div id="shList"></div></div>'
      + '<div class="card"><button id="shGo" onclick="shSend()">📤 Envoyer à la sélection</button> <button id="shStop" onclick="shStop()" style="display:none">Annuler l’envoi</button><div id="shBar" class="mu" style="margin-top:6px"></div></div>'
      + lst("Mes envois (" + mineS.length + ")", mineS.slice(0, 40).map(function (s) {
        var k = KIND[s.kind] || KIND.autre, rd = S.shareReads.filter(function (r) { return r.share === s.id; }).length;
        return '<div class="row"><span><b>' + k[0] + " " + esc(s.title) + '</b><div class="mu">' + esc(s.ts) + (s.fileName ? " · " + esc(s.fileName) + " (" + size(s.size) + ")" : "") + (s.link ? " · 🔗 lien" : "") + " · " + s.to.length + " destinataire(s) · " + rd + " ouvert(s)</div></span><span>" + btn("👥", "shDetails(" + s.id + ")") + " " + btn("🗑️", "shDelete(" + s.id + ")") + "</span></div>";
      }), "Aucun envoi pour le moment.");
  };
  VIEWS.envoi = vShare;
  function bar(t, p) { var e = document.getElementById("shBar"); if (e) e.innerHTML = t + (p != null ? '<div style="height:8px;background:#e5e7eb;border-radius:6px;margin-top:4px"><div style="height:8px;width:' + p + '%;background:#14a38f;border-radius:6px"></div></div>' : ""); }
  function putPart(url, blob, onp, ctl) {
    return new Promise(function (ok, ko) {
      var x = new XMLHttpRequest(); ctl.x.push(x); x.open("PUT", url); x.upload.onprogress = function (e) { onp(e.loaded); };
      x.onload = function () { if (x.status >= 200 && x.status < 300) { var et = x.getResponseHeader("ETag"); et ? ok(et) : ko(new Error("ETag illisible : configurez le CORS du bucket R2 (voir le guide).")); } else ko(new Error("HTTP " + x.status)); };
      x.onerror = function () { ko(new Error("Réseau")); }; x.onabort = function () { ko(new Error("Annulé")); }; x.send(blob);
    });
  }
  function upload(f, ctl, onp) {
    var loaded = {}, etags = {}, done = 0, fileId = 0, partSize = 0, total = 0;
    var upd = function () { var s = 0; Object.keys(loaded).forEach(function (k) { s += loaded[k]; }); onp(Math.min(99, Math.floor(s / f.size * 100))); };
    return api("sstart", "POST", { name: f.name, size: f.size, mime: f.type }).then(function (j) {
      fileId = j.fileId; partSize = j.partSize; total = j.totalParts; var next = 1, active = 0;
      return new Promise(function (ok, ko) {
        var failed = false;
        function pump() { if (failed) return; if (ctl.stop) { failed = true; return ko(new Error("Envoi annulé")); } if (done === total) return ok(); while (active < 3 && next <= total) launch(next++); }
        function launch(n) {
          active++; var a = (n - 1) * partSize, blob = f.slice(a, Math.min(f.size, a + partSize)), tries = 0;
          (function attempt() {
            api("ssign", "POST", { fileId: fileId, parts: [n] }).then(function (s) { return putPart(s.urls[n], blob, function (l) { loaded[n] = l; upd(); }, ctl); })
              .then(function (et) { etags[n] = et; loaded[n] = blob.size; done++; active--; upd(); pump(); })
              .catch(function (e) { if (ctl.stop) { failed = true; return ko(new Error("Envoi annulé")); } if (++tries < 5) { loaded[n] = 0; return setTimeout(attempt, 1500 * tries); } failed = true; ko(e); });
          })();
        }
        pump();
      });
    }).then(function () { return api("scomplete", "POST", { fileId: fileId, parts: Object.keys(etags).map(function (k) { return { n: Number(k), etag: etags[k] }; }) }); })
      .then(function () { return fileId; })
      .catch(function (e) { if (fileId) api("sdelete", "POST", { fileId: fileId }).catch(function () { }); throw e; });
  }
  window.shStop = function () { if (busy) { busy.stop = true; busy.x.forEach(function (x) { try { x.abort(); } catch (e) { } }); } };
  window.shSend = function () {
    ensure(); if (busy) return alert("Un envoi est déjà en cours.");
    var ids = Object.keys(SH.sel).map(Number), title = v("sh_title"), note = (document.getElementById("sh_note").value || "").trim(), kind = v("sh_kind"), f = (document.getElementById("sh_file").files || [])[0], link = v("sh_link");
    if (!ids.length) return alert("Sélectionnez au moins un destinataire."); if (!title) return alert("Indiquez un titre."); if (link && !/^https?:\/\/\S+$/i.test(link)) return alert("Le lien doit commencer par http:// ou https://");
    if (!f && !note && !link) return alert("Ajoutez un fichier, un lien ou un message.");
    if (f && !tok()) return alert("Connectez-vous au serveur en ligne pour envoyer un fichier.");
    if (!confirm("Envoyer « " + title + " » à " + ids.length + " utilisateur(s) ?")) return;
    var go = document.getElementById("shGo"), st = document.getElementById("shStop"); go.disabled = true; st.style.display = "";
    var rec = function (fileId) {
      var s = { id: nid(S.shares), from: me.id, to: ids, title: title, note: note, kind: kind, fileId: fileId || 0, link: link || "", fileName: f ? f.name : "", size: f ? f.size : 0, mime: f ? f.type : "", ts: now() };
      S.shares.push(s); L("Contenu envoyé : " + title + " à " + ids.length + " utilisateur(s)"); SH.sel = {}; save(); alert("Contenu envoyé à " + ids.length + " utilisateur(s)."); render();
    };
    if (!f) { rec(0); busy = null; return; }
    busy = { stop: false, x: [] };
    upload(f, busy, function (p) { bar("Envoi de « " + esc(f.name) + " » (" + size(f.size) + ") : " + p + " %", p); }).then(function (id) { bar("✅ Fichier reçu.", 100); rec(id); })
      .catch(function (e) { bar("❌ " + esc(e.message)); }).then(function () { busy = null; var g = document.getElementById("shGo"), s2 = document.getElementById("shStop"); if (g) g.disabled = false; if (s2) s2.style.display = "none"; });
  };
  window.shDetails = function (id) {
    var s = S.shares.filter(function (x) { return x.id === id; })[0]; if (!s) return;
    var rd = {}; S.shareReads.forEach(function (r) { if (r.share === id) rd[r.uid] = r.ts; });
    mapOv("👥 " + esc(s.title), '<div class="mu">' + s.to.length + " destinataire(s), " + Object.keys(rd).length + " ouvert(s)</div><div style=\"max-height:380px;overflow:auto\">" + s.to.map(function (u) { var x = uid(u) || {}; return '<div class="row"><span>' + esc(x.name || "Utilisateur " + u) + ' <span class="mu">· ' + esc(RL[x.role] || x.role || "") + "</span></span><span>" + (rd[u] ? "✅ " + esc(rd[u]) : "⏳") + "</span></div>"; }).join("") + "</div>");
  };
  window.shDelete = function (id) {
    var s = S.shares.filter(function (x) { return x.id === id; })[0]; if (!s || !confirm("Supprimer « " + s.title + " » pour tous les destinataires ?")) return;
    var fin = function () { S.shares = S.shares.filter(function (x) { return x.id !== id; }); S.shareReads = S.shareReads.filter(function (r) { return r.share !== id; }); L("Contenu supprimé : " + s.title); save(); render(); };
    if (s.fileId && tok()) api("sdelete", "POST", { fileId: s.fileId }).then(fin).catch(function (e) { alert(e.message); }); else fin();
  };
})();
