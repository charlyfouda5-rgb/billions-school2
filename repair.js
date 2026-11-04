/* DELTA SCHOOL V27.1 — couche de réparation (chargée AVANT le script principal).
   L'archive V27 appelait des éléments de base absents (PT, AVD, vMsg0, phOf, av, load…) : la page plantait au chargement.
   Ce fichier les redéfinit sans rien retirer. Les fonctions déjà présentes ailleurs gardent la priorité. */
var CLOUD = { on: false, tok: null, bkAt: 0, bkMsg: "", pend: 0 }, SYS_COL = { ok: "#16a34a", warn: "#d97706", err: "#dc2626" };
var UILG = "fr", LF = null, cv = 0, msgTo = 0, trk = 0;
var RF = { m: "", v: "", r: "", q: "", d: "" };
var MODES = ["À domicile", "En ligne", "Au centre"];
var PT = { s: ["Séquence 1", "Séquence 2", "Séquence 3", "Séquence 4", "Séquence 5", "Séquence 6"], t: ["Trimestre 1", "Trimestre 2", "Trimestre 3"] };
var AVD = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#cfe3ee"/><circle cx="32" cy="24" r="12" fill="#0b7fab"/><path d="M8 64c2-18 14-26 24-26s22 8 24 26z" fill="#0b7fab"/></svg>');
var NOCL = '<div class="card mu">Aucune classe ne vous est encore attribuée. Contactez votre établissement.</div>';
var LANGS = [["fr", "Français", "Français", "FR"], ["en", "Anglais", "English", "GB"], ["es", "Espagnol", "Español", "ES"], ["pt", "Portugais", "Português", "PT"], ["de", "Allemand", "Deutsch", "DE"], ["ar", "Arabe", "العربية", "SA"], ["zh", "Chinois", "中文", "CN"]].map(function (a) { return { code: a[0], nameFR: a[1], native: a[2], flag: a[3] }; });

/* ---- périodes, dates, argent, abonnements ---- */
function pin(p) { var t = { "Trimestre 1": [1, 2], "Trimestre 2": [3, 4], "Trimestre 3": [5, 6] }[p]; if (t) return [p].concat(t.map(function (i) { return "Séquence " + i; })); if (p == "Année") return PT.s.concat(PT.t, [p]); return [p]; }
function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function fdate(d) { var x = new Date(d); return isNaN(x) ? "" : x.toLocaleDateString("fr-FR"); }
function money(n) { return Number(n || 0).toLocaleString("fr-FR") + " F"; }
function subOk(id) { var s = sch(id); return !!s && (!s.exp || s.exp >= today()); }
function lim() { return !!me && me.role == "chef" && !subOk(me.school); }
function expCard(u) { return '<div class="card mu">⏳ Abonnement de l’établissement expiré : les résultats de ' + esc(u.name) + ' sont masqués.</div>'; }
function stLbl(s) { return s.status == "actif" ? "Actif" : s.status == "bloque" ? "Bloqué" : "Suspendu"; }
function autoBlock() { }
function gradeEntryLocked() { return false; }
function recordGradeDelay(u, t) { S.late = S.late || []; S.late.push({ id: nid(S.late), school: u.school, tid: u.id, txt: t, ts: now() }); }
function closeAcc() { tab = ""; }
function trkScreen() { R('<div class="card"><b>Suivi</b><div class="mu">Écran de suivi non restauré dans cette archive.</div><button onclick="trk=0;render()">Retour</button></div>'); }
function flagOfU() { return ""; }
function load() { load0(); ["convs", "cm", "photos", "dom", "reps", "msgs", "logs", "late"].forEach(function (k) { if (!Array.isArray(S[k])) S[k] = []; }); }
function vDash() { return vDash1(); }

/* ---- langues et traduction (service distant non restauré : envoi sans traduction) ---- */
function myLang() { return (me && me.lang) || "fr"; }
function lgOf(c) { return LANGS.filter(function (l) { return l.code == c; })[0]; }
function findLang(c) { c = String(c || "").toLowerCase(); return LANGS.filter(function (l) { return l.code == c || l.nameFR.toLowerCase() == c || l.native.toLowerCase() == c; })[0]; }
function lnat(c) { var l = lgOf(c); return l ? l.native : c; }
function langOpts() { return LANGS.map(function (l) { return [l.code, l.native + " (" + l.nameFR + ")"]; }); }
function trConsentOk(cb) { cb(); }
function trText(x, a, b, cb) { cb(null); }
function trList(a, s, t, cb) { cb(a.map(function () { return null; })); }
function trLine(m) { var t = m.tr && m.tr[myLang()]; return t ? '<div class="mu">🌐 ' + esc(t) + '</div>' : ""; }
function trMsg() { alert("Traduction indisponible dans cette archive."); }
function loadLeaflet(cb) { if (window.L) { LF = window.L; return cb && cb(); } var c = document.createElement("link"); c.rel = "stylesheet"; c.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css"; document.head.appendChild(c); var s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"; s.onload = function () { LF = window.L; cb && cb(); }; document.head.appendChild(s); }

/* ---- photos de profil (V27) ---- */
function phOf(id) { var p = (S.photos || []).filter(function (x) { return x.uid == id && x.cur && !x.del; })[0]; return p ? p.img : ((uid(id) || {}).photo || ""); }
function av(id, s) {
  s = s || 40; var u = uid(id) || {}, p = phOf(id), st = "width:" + s + "px;height:" + s + "px;border-radius:50%;flex:none;object-fit:cover";
  if (p) return '<img alt="" src="' + esc(p) + '" style="' + st + '">';
  var n = String(u.name || "?").trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase();
  return '<span style="' + st + ';display:inline-flex;align-items:center;justify-content:center;background:var(--pr);color:#fff;font-size:' + Math.round(s * .4) + 'px">' + esc(n) + '</span>';
}

/* ---- messagerie ---- */
function vMsg0() {
  var all = S.msgs || [], inb = all.filter(function (m) { return m.to == me.id; }).reverse(), out = all.filter(function (m) { return m.from == me.id; }).reverse();
  return '<h2>✉️ Messagerie</h2><div class="card"><b>Nouveau message</b>' + ER() + '<label>Destinataire</label><select id="mt">' + opt(targets()) + '</select><label>Message</label><textarea id="mx" rows="3" style="width:100%;padding:10px;margin:4px 0 8px"></textarea><label>Message vocal (facultatif)</label><input id="mvoice" type="file" accept="audio/*"><button class="p" onclick="sendMsg()">Envoyer</button></div>'
    + '<div class="card"><b>Reçus</b>' + (inb.map(function (m) { return mrow(m); }).join("") || '<div class="mu">Aucun message reçu.</div>') + '</div>'
    + '<div class="card"><b>Envoyés</b>' + (out.map(function (m) { return mrow(m); }).join("") || '<div class="mu">Aucun message envoyé.</div>') + '</div>';
}
function vGlobalHistory0() {
  var ms = (S.msgs || []).slice().reverse(), act = (S.convs || []).filter(function (c) { return cmsgs(c.id).length; });
  return '<h2>🗂️ Historique global</h2><div class="card"><b>Messages (' + ms.length + ')</b>' + (ms.slice(0, 100).map(function (m) { return mrow(m, 1); }).join("") || '<div class="mu">Aucun message.</div>') + '</div>'
    + '<div class="card"><b>Conversations avec répétiteurs (' + act.length + ')</b>' + (act.map(function (c) { var r = repById(c.rid) || {}; return '<div class="row"><span style="display:flex;gap:9px;align-items:center">' + av(c.sid, 36) + av(r.uid, 36) + '<span>' + esc((uid(c.sid) || {}).name || "?") + ' ↔ ' + esc((uid(r.uid) || {}).name || "?") + '</span></span><span class="mu">' + cmsgs(c.id).length + ' msg</span></div>'; }).join("") || '<div class="mu">Aucune conversation active.</div>') + '</div>'
    + '<div class="card"><b>Journal</b>' + (S.logs || []).slice(-50).reverse().map(function (l) { return '<div class="row"><span>' + esc(l.what) + '<div class="mu">' + esc(l.who) + '</div></span><span class="mu">' + esc(l.ts) + '</span></div>'; }).join("") + '</div>';
}
function vResources0() { return '<h2>📚 Ressources</h2>' + (S.resources || []).filter(function (r) { return me.role == "super" || (r.to || []).indexOf(me.id) >= 0; }).slice().reverse().map(function (r) { return '<div class="card"><b>' + esc(r.title || "Ressource") + '</b><div class="mu">' + esc(r.note || "") + '</div></div>'; }).join(""); }

/* ---- répétiteurs et conversations ---- */
function isCli() { return !!me && me.role != "repetiteur"; }
function repOf(id) { return (S.reps || []).filter(function (r) { return r.uid == id; })[0]; }
function repById(id) { return (S.reps || []).filter(function (r) { return r.id == id; })[0]; }
function repOk(r) { return !!r && r.status == "actif" && daysLeft(r.exp) >= 0; }
function cmsgs(id) { return (S.cm || []).filter(function (m) { return m.cid == id; }); }
function cpeer(c) { return (isCli() ? uid((repById(c.rid) || {}).uid) : uid(c.sid)) || {}; }
function openConv(rid) { var r = repById(rid); if (!r) return; var c = S.convs.filter(function (x) { return x.rid == rid && x.sid == me.id; })[0]; if (!c) { c = { id: nid(S.convs), rid: rid, sid: me.id, ts: now() }; S.convs.push(c); save(); } cv = c.id; render(); }
function closeConv() { cv = 0; render(); }
function sendTxt0() { var x = v("cmt"); if (!x || !cv) return; S.cm.push({ id: nid(S.cm), cid: cv, from: isCli() ? "c" : "r", text: x, ts: now() }); save(); render(); }
function myConvs() {
  var mine = (S.convs || []).filter(function (c) { var r = repOf(me.id); return isCli() ? c.sid == me.id : (r && c.rid == r.id); });
  var act = mine.filter(function (c) { return cmsgs(c.id).length; }), cur = mine.filter(function (c) { return c.id == cv; })[0], h = '';
  h += '<div class="card"><b>💬 Mes conversations</b>' + (act.map(function (c) { var p = cpeer(c); return '<div class="row"><span style="display:flex;gap:9px;align-items:center">' + av(p.id, 38) + '<span><b>' + esc(p.name || "?") + '</b><div class="mu">' + cmsgs(c.id).length + ' message(s)</div></span></span>' + btn("Ouvrir", "cv=" + c.id + ";render()", "p") + '</div>'; }).join("") || '<div class="mu">Aucune conversation active. Une conversation apparaît ici dès le premier message échangé.</div>') + '</div>';
  if (cur) { var p = cpeer(cur), ms = cmsgs(cur.id), mineSide = isCli() ? "c" : "r";
    h += '<div class="card"><div style="display:flex;gap:10px;align-items:center;justify-content:space-between"><span style="display:flex;gap:10px;align-items:center">' + (ms.length ? av(p.id, 44) : '') + '<b>' + esc(p.name || "?") + '</b>' + peerBadge() + '</span>' + btn("✕", "closeConv()") + '</div>'
      + ms.map(function (m) { return '<div class="row"><span><b>' + (m.from == mineSide ? "Moi" : esc(p.name || "?")) + '</b><div>' + esc(m.text) + '</div>' + trLine(m) + '</span><span class="mu">' + esc(m.ts || "") + '</span></div>'; }).join("")
      + '<textarea id="cmt" rows="2" style="width:100%;padding:10px;margin:8px 0 4px" placeholder="Votre message"></textarea>' + trToggle() + '<button class="p" onclick="sendTxt()">Envoyer</button></div>'; }
  return h;
}
function myDom() {
  var r = repOf(me.id); if (!r) return "";
  var d = (S.dom || []).filter(function (x) { return x.rid == r.id; });
  return '<div class="card"><b>🏠 Demandes à domicile</b>' + (d.map(function (x) { return '<div class="row"><span>' + esc(x.name || (uid(x.sid) || {}).name || "Demande") + '</span><span class="mu">' + esc(x.st || "") + '</span></div>'; }).join("") || '<div class="mu">Aucune demande.</div>') + '</div>';
}

/* ---- profil et photo de profil ---- */
function vProfil() {
  return '<h2>👤 Mon profil</h2><div class="card" style="text-align:center">' + av(me.id, 96) + '<div><b>' + esc(me.name) + '</b></div><div class="mu">' + esc(RL[me.role] || me.role) + ' · ' + esc(me.email || "") + '</div><label>Changer ma photo de profil</label><input id="phf" type="file" accept="image/*"><button class="p" onclick="saveMyPhoto()">Enregistrer la photo</button></div>'
    + '<div class="card mu">Votre photo n’est montrée qu’aux personnes avec qui vous échangez des messages et à l’administration autorisée.</div>';
}
function saveMyPhoto() {
  var i = document.getElementById("phf"), f = i && i.files && i.files[0]; if (!f) return alert("Choisissez une image.");
  if (f.size > 2 * 1024 * 1024) return alert("Image limitée à 2 Mo.");
  var r = new FileReader(); r.onload = function () { S.photos.forEach(function (p) { if (p.uid == me.id) p.cur = false; }); S.photos.push({ id: nid(S.photos), uid: me.id, school: me.school || 0, ts: Date.now(), img: r.result, cur: true, del: false }); L("Photo de profil mise à jour"); render(); }; r.readAsDataURL(f);
}

/* ---- table des écrans (VIEWS) : écrans présents rebranchés ; écrans absents de l'archive signalés sans plantage ---- */
var VIEWS = {};
(function () {
  var miss = function (t) { return function () { return '<h2>' + t + '</h2><div class="card mu">Cet écran n’est pas inclus dans l’archive V27 reçue. Il doit être réintégré depuis une version complète (V25 ou V26).</div>'; }; };
  VIEWS.dash = function () { return vDash(); };
  VIEWS.ecoles = function () { return vEc(); };
  VIEWS.users = function () { return me.role == "super" ? vUs() : vUsers(); };
  VIEWS.msg = function () { return vMsg(); };
  VIEWS.hist = function () { return vGlobalHistory(); };
  VIEWS.abo = function () { return vAbo(me.role == "super"); };
  VIEWS.notes = function () { return vProf(); };
  VIEWS.bul = function () { return vEleve(); };
  VIEWS.cfg = miss("⚙️ Configuration"); VIEWS.eleves = miss("🎓 Élèves"); VIEWS.postes = miss("🧑‍💼 Postes");
  VIEWS.sit = miss("📋 Situations"); VIEWS.fin = miss("💰 Finances"); VIEWS.disc = miss("⚖️ Discipline");
  VIEWS.rate = miss("⭐ Professeurs"); VIEWS.classe = miss("🏫 Ma classe"); VIEWS.mes = miss("Mes services");
})();

/* ---- onglets (couche V8 absente de l'archive) ---- */
function tabsOfV8() {
  var t = me.role == "repetiteur" ? [["dash", "📊", "Tableau de bord"], ["conv", "💬", "Conversations"], ["msg", "✉️", "Messagerie"]] : tabsOf0().slice();
  if (me.role == "super") t.splice(1, 0, ["req", "📨", "Demandes"], ["reps", "🧑‍🏫", "Répétiteurs"]);
  if (me.role == "eleve" || me.role == "parent") t.splice(t.length - 1, 0, ["rsr", "🔎", "Trouver un répétiteur"]);
  t.push(["langues", "🌐", "Langues"], ["pf", "👤", "Mon profil"]);
  return t;
}
VIEWS.conv = function () { return '<h2>💬 Conversations</h2>' + myConvs() + myDom(); };
VIEWS.rsr = function () { return vRsr(); };
VIEWS.langues = function () { return vTools(); };
VIEWS.reps = function () { return typeof vReps == "function" ? vReps() : ""; };
VIEWS.req = function () { return '<h2>📨 Demandes</h2><div class="card mu">Cet écran n’est pas inclus dans l’archive V27 reçue.</div>'; };

/* ---- écrans annexes ---- */
function repHist() { return ""; }
function flag(c) { c = String(c || "").toUpperCase(); return /^[A-Z]{2}$/.test(c) ? String.fromCodePoint(127397 + c.charCodeAt(0), 127397 + c.charCodeAt(1)) : ""; }
function prefCard() { return '<div class="card"><b>🌐 Langue de communication</b><select id="myLang">' + opt(langOpts(), myLang()) + '</select><button class="p" onclick="saveLang()">Enregistrer</button></div>'; }
function docCard() { return ""; }
function indicatifsCard() { return ""; }
function fxCard() { return '<div class="card mu">Convertisseur de devises non restauré dans cette archive.</div>'; }
function doConv() { alert("Convertisseur non restauré dans cette archive."); }
VIEWS.enf = function () {
  var ks = (me.kids || []).map(uid).filter(Boolean);
  return '<h2>👪 Mes enfants</h2>' + (ks.map(function (u) { return '<div class="card"><b>' + esc(u.name) + '</b><div class="mu">' + esc((sch(u.school) || {}).name || "") + ' · ' + esc((cls(u.classId) || {}).name || "") + '</div></div>'; }).join("") || '<div class="card mu">Aucun enfant associé.</div>')
    + '<div class="card"><b>Ajouter un enfant</b>' + ER() + '<input id="kc" placeholder="Numéro de suivi (SUI-…)"><button class="p" onclick="addKid()">Ajouter</button></div>';
};
function addKid() { var c = v("kc"), u = S.users.filter(function (x) { return x.role == "eleve" && x.code == c; })[0]; if (!u) return err("Numéro de suivi introuvable."); me.kids = me.kids || []; if (me.kids.indexOf(u.id) < 0) me.kids.push(u.id); L("Enfant ajouté : " + u.name); render(); }
function countryRows() { return ""; }
function filterCountryList() { }
