/* BILLIONS SCHOOL — comptes de test (super administrateur) : crée un établissement d'exemple avec un compte par profil,
   mots de passe aléatoires affichés sur cet appareil, et suppression en un clic. Aucun compte public par défaut. */
(function () {
  var LS = "bs_testpw";
  function two(n) { return String(n).padStart(2, "0"); }
  function pwGen() { var a = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "", r = new Uint32Array(10); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(r) : r.forEach(function (_, i) { r[i] = Math.random() * 4e9; }); for (var i = 0; i < 10; i++) s += a[r[i] % a.length]; return s; }
  function saved() { try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch (e) { return []; } }
  function demoUsers() { return S.users.filter(function (u) { return u.demo; }); }

  var _tabsOf = window.tabsOf;
  window.tabsOf = function () {
    var t = _tabsOf.apply(this, arguments);
    if (me.role === "super") { var i = t.findIndex(function (x) { return x[0] === "envoi"; }); if (i < 0) i = t.findIndex(function (x) { return x[0] === "codes"; }); t.splice(i < 0 ? 1 : i + 1, 0, ["demo", "🧪", "Comptes de test"]); }
    return t;
  };
  window.vDemo = function () {
    if (me.role !== "super") return "";
    var du = demoUsers(), sv = saved(), h = '<h2>🧪 Comptes de test</h2><div class="sim">Crée un établissement d’exemple avec un compte par profil (chef, professeur, comptable, élève, parent, répétiteur) pour essayer la plateforme. Les mots de passe sont générés au hasard et affichés ici, sur cet appareil. Supprimez-les avant l’ouverture au public.</div>';
    if (!du.length) return h + '<div class="card"><button onclick="createTest()">🧪 Créer les comptes de test</button></div>';
    h += '<div class="card"><b>Comptes de test existants</b>' + (sv.length ? '<div class="mu">Identifiant et mot de passe pour se connecter (autorisez la localisation sur le téléphone).</div>' + sv.map(function (x) { return '<div class="row"><span><b>' + esc(x.label) + '</b><div class="mu">Identifiant : <b>' + esc(x.login) + '</b></div></span><span><code style="font-size:15px">' + esc(x.pw) + "</code></span></div>"; }).join("")
      : '<div class="mu">Les mots de passe ne sont pas conservés sur cet appareil (créés depuis un autre téléphone). Supprimez les comptes de test puis recréez-les ici pour les afficher.</div>' + du.map(function (u) { return '<div class="row"><span>' + esc(u.name) + ' <span class="mu">' + esc(RL[u.role] || u.role) + " · " + esc(u.email) + "</span></span></div>"; }).join(""))
      + '</div><div class="card">' + btn("🗑️ Supprimer tous les comptes de test", "deleteTest()", "s") + "</div>";
    return h;
  };
  VIEWS.demo = vDemo;

  window.createTest = function () {
    if (demoUsers().length) return alert("Les comptes de test existent déjà.");
    var d = new Date(); d.setFullYear(d.getFullYear() + 1); var exp = d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate());
    var sid = nid(S.schools), cid = nid(S.classes), list = [], base = { active: true, lang: "fr", country: "CM", dial: "+237", currency: "XAF", demo: true };
    S.schools.push({ id: sid, name: "Lycée Exemple de Yaoundé", country: "Cameroun", plan: "Essai", exp: exp, hist: [], status: "actif", sections: ["Francophone"], systems: ["Secondaire"], filieres: ["Sciences", "Lettres"], delay: 24, gradeUnlocks: [], demo: true });
    S.classes.push({ id: cid, school: sid, name: "3ème A", system: "Secondaire", section: "Francophone", filiere: "Sciences", demo: true });
    [["Mathématiques", 4], ["Français", 4], ["SVT", 2]].forEach(function (m) { S.subjects.push({ id: nid(S.subjects), school: sid, name: m[0], coef: m[1], demo: true }); });
    function add(label, extra, login) { var pw = pwGen(), u = Object.assign({ id: nid(S.users), pw: pw }, base, extra); S.users.push(u); list.push({ label: label, login: login || u.email, pw: pw }); return u; }
    add("Chef d’établissement", { name: "Chef Test", email: "chef.test@exemple.cm", role: "chef", school: sid });
    add("Professeur", { name: "Professeur Test", email: "prof.test@exemple.cm", role: "prof", school: sid, titulaireOf: cid, classes: [cid], matieres: ["Mathématiques", "Français", "SVT"] });
    add("Comptable", { name: "Comptable Test", email: "compta.test@exemple.cm", role: "comptable", school: sid });
    var el = add("Élève (se connecte aussi avec son code de suivi)", { name: "Élève Test", email: "eleve.test@exemple.cm", role: "eleve", school: sid, classId: cid, matricule: "BS-" + String(d.getFullYear() - 1).slice(2) + "-9001", code: "SUI-" + (100000 + Math.floor(Math.random() * 900000)), abs: 0, conduite: 16, naissance: "2012-05-01", genre: "Féminin", parentContact: "+237600000001" });
    list[list.length - 1].login = el.email + "  ou  " + el.code;
    add("Parent", { name: "Parent Test", email: "+237600000001", phone: "+237600000001", role: "parent", school: 0, kids: [el.id] }, "+237600000001");
    var rp = add("Répétiteur", { name: "Joseph Test", email: "rep.test@exemple.cm", phone: "699100200", role: "repetiteur", school: 0 });
    S.reps.push({ id: nid(S.reps), uid: rp.id, prenom: "Joseph", nom: "Test", niveau: "Master", m1: "Mathématiques", m2: "Physique", all: false, lieu: "Bastos", ville: "Yaoundé", region: "Centre", quartier: "Bastos", orange: "699100200", prix: 2500, mode: "À domicile", monthly: 5000, exp: exp, renewedAt: new Date().toISOString(), status: "actif", demo: true });
    el.trackSent = now();
    try { localStorage.setItem(LS, JSON.stringify(list)); } catch (e) { }
    L("Comptes de test créés"); save(); render();
  };
  window.deleteTest = function () {
    if (!confirm("Supprimer l’établissement et tous les comptes de test ?")) return;
    var ids = {}; demoUsers().forEach(function (u) { ids[u.id] = 1; });
    S.users = S.users.filter(function (u) { return !u.demo; });
    ["schools", "classes", "subjects", "reps"].forEach(function (k) { S[k] = (S[k] || []).filter(function (x) { return !x.demo; }); });
    S.msgs = (S.msgs || []).filter(function (m) { return !ids[m.from] && !ids[m.to]; });
    S.accessHistory = (S.accessHistory || []).filter(function (a) { return !ids[a.uid]; });
    ["grades", "disc", "dec", "fin"].forEach(function (k) { if (S[k]) S[k] = S[k].filter(function (x) { return !ids[x.sid] && !ids[x.uid] && !ids[x.student]; }); });
    try { localStorage.removeItem(LS); } catch (e) { }
    L("Comptes de test supprimés"); save(); render();
  };
})();
