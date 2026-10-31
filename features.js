/* BILLIONS SCHOOL V15 — (1) numéro de suivi envoyé automatiquement au parent, (2) recherche de répétiteurs par champs. */
(function () {
  function nrm(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
  function inc(a, b) { return !b || nrm(a).indexOf(nrm(b)) >= 0; }

  /* ---------- 1. Numéro de suivi -> parent ---------- */
  function sameContact(u, c) { c = String(c || "").trim(); return !!c && (String(u.email || "").toLowerCase() === c.toLowerCase() || (typeof phoneMatch === "function" && (phoneMatch(u.phone, c) || phoneMatch(c.replace(/\D/g, ""), u.phone || "")))); }
  function trackText(st, from) {
    var s = (sch(st.school) || {}).name || "", c = (cls(st.classId) || {}).name || "";
    return "🎓 " + st.name + " est inscrit(e) à " + s + (c ? " (" + c + ")" : "") + ".\nNuméro de suivi : " + st.code + "\nMatricule : " + st.matricule + "\nVotre enfant est déjà ajouté dans « Mes enfants » ; si besoin, saisissez ce numéro à cet endroit pour retrouver ses notes et bulletins.";
  }
  function giveToParent(p, st, text, from) {
    if (!p.kids) p.kids = [];
    if (p.kids.indexOf(st.id) < 0) p.kids.push(st.id);
    S.msgs.push({ id: nid(S.msgs), from: from, to: p.id, text: text, kind: "text", readAt: "", ts: now() });
  }
  /* renvoie "direct" (parent déjà inscrit) ou "attente" (livré dès que le parent crée son compte) */
  window.sendTracking = function (st, contact) {
    contact = String(contact || "").trim(); if (!contact) return "";
    st.parentContact = contact; var text = trackText(st), from = me.id;
    S.parentNotices = (S.parentNotices || []).filter(function (n) { return !(n.sid === st.id && !n.done); });
    var p = S.users.filter(function (u) { return u.role === "parent" && sameContact(u, contact); })[0];
    if (p) { giveToParent(p, st, text, from); st.trackSent = now(); return "direct"; }
    S.parentNotices.push({ id: nid(S.parentNotices), school: st.school, sid: st.id, contact: contact, text: text, from: from, ts: now(), done: false });
    st.trackSent = ""; return "attente";
  };
  function deliverPending(u) {
    var ch = false;
    (S.parentNotices || []).forEach(function (n) {
      if (n.done || !sameContact(u, n.contact)) return;
      var st = uid(n.sid); if (!st) return;
      giveToParent(u, st, n.text, n.from); n.done = true; n.parent = u.id; st.trackSent = now(); ch = true;
    });
    return ch;
  }
  var _render = window.render;
  window.render = function () { if (typeof me !== "undefined" && me && me.role === "parent") deliverPending(me); return _render.apply(this, arguments); };

  window.addE = function () {
    var n = v("en"), e = v("ee").toLowerCase(), p = v("ep"), pc = v("epp");
    if (!n || !e || p.length < 6) return err("Nom, e-mail et mot de passe (6 caractères min.) requis.");
    if (!pc) return err("Indiquez le téléphone ou l’e-mail du parent : le numéro de suivi lui sera envoyé automatiquement.");
    if (S.users.some(function (u) { return u.email == e; })) return err("Un de ces e-mails est déjà utilisé.");
    var id = nid(S.users), code, yy = String(new Date().getFullYear()).slice(2), k = S.users.filter(function (u) { return u.school == me.school && u.role == "eleve"; }).length + 1, mat;
    do { code = "SUI-" + (100000 + Math.floor(Math.random() * 900000)); } while (S.users.some(function (u) { return u.code == code; }));
    do { mat = "BS-" + yy + "-" + String(k++).padStart(4, "0"); } while (S.users.some(function (u) { return u.matricule == mat; }));
    var u = { id: id, name: n, email: e, pw: p, role: "eleve", school: me.school, active: true, classId: +v("ec"), matricule: mat, code: code, naissance: v("ed"), genre: v("eg"), abs: 0, conduite: 15 };
    S.users.push(u);
    var r = sendTracking(u, pc);
    L("Élève inscrit : " + n + " — numéro de suivi " + (r == "direct" ? "envoyé au parent" : "en attente du compte parent (" + pc + ")"));
    alert("Élève inscrit. Numéro de suivi : " + code + "\n" + (r == "direct" ? "Il a été envoyé automatiquement dans la messagerie du parent et son enfant est déjà ajouté à son compte." : "Le parent n’a pas encore de compte : le numéro lui sera envoyé automatiquement dès qu’il créera son compte avec " + pc + "."));
    render();
  };
  window.resendTrack = function (i) {
    var st = uid(i); if (!st) return;
    var c = prompt("Téléphone ou e-mail du parent :", st.parentContact || ""); if (!c) return;
    var r = sendTracking(st, c); L("Numéro de suivi renvoyé pour " + st.name);
    alert(r == "direct" ? "Numéro de suivi envoyé au parent." : "Le parent n’a pas encore de compte : le numéro lui sera envoyé dès qu’il en créera un."); render();
  };

  /* ---------- 2. Recherche de répétiteurs : champs puis bouton « Rechercher » ---------- */
  var searched = false;
  window.doRep = function () { ["m", "v", "r", "q", "d"].forEach(function (k) { var el = document.getElementById("rf_" + k); if (el) RF[k] = el.value.trim(); }); searched = true; render(); setTimeout(function () { var el = document.getElementById("rfres"); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60); };
  window.resetRep = function () { RF = { m: "", v: "", r: "", q: "", d: "" }; searched = false; render(); };
  window.vRsr = function () {
    if (cv) return vThread();
    var rs = searched ? S.reps.filter(function (r) { return repOk(r) && (!RF.m || r.all || inc(r.m1, RF.m) || inc(r.m2, RF.m)) && inc(r.ville, RF.v) && inc(r.region, RF.r) && inc(r.quartier, RF.q) && (!RF.d || r.mode == RF.d); }) : [];
    var f = [["m", "Matière (ex. Mathématiques)"], ["v", "Ville"], ["r", "Région"], ["q", "Quartier"]].map(function (x) { return '<input id="rf_' + x[0] + '" placeholder="' + x[1] + '" value="' + esc(RF[x[0]]) + '" onkeydown="if(event.key===\'Enter\')doRep()">'; }).join("");
    var res = !searched ? '<div class="card mu">Remplissez un ou plusieurs champs, puis appuyez sur « Rechercher » : les répétiteurs correspondants s’affichent ici.</div>'
      : lst("Répétiteurs trouvés (" + rs.length + ")", rs.map(function (r) { return '<div class="row"><span style="display:flex;gap:10px;align-items:center">' + av(r.uid, 56) + '<span><b>' + esc(r.prenom) + ' ' + esc((r.nom || "").charAt(0)) + '.</b><div class="mu">' + esc(r.niveau) + ' · ' + (r.all ? "Toutes matières" : esc([r.m1, r.m2].filter(Boolean).join(", "))) + '</div><div class="mu">' + esc([r.ville, r.region, r.quartier].filter(Boolean).join(" · ")) + '</div><div class="mu">' + (r.prix ? r.prix.toLocaleString("fr-FR") + " F/h" : "Prix à convenir") + ' · ' + esc(r.mode || "Mode à convenir") + '</div></span></span>' + btn("💬", "openConv(" + r.id + ")", "p") + '</div>'; }), "Aucun répétiteur actif ne correspond à ces champs. Essayez avec moins de critères (par exemple la matière seule ou la ville seule).");
    return '<h2>🔎 Trouver un répétiteur</h2><div class="card"><b>Que cherchez-vous ?</b>' + f + '<select id="rf_d"><option value="">Tous les modes de travail</option>' + opt(MODES, RF.d) + '</select><div style="margin-top:8px">' + btn("🔎 Rechercher", "doRep()", "p") + ' ' + btn("Effacer", "resetRep()", "s") + '</div></div><div id="rfres">' + res + '</div>' + myConvs() + myDom();
  };
})();
