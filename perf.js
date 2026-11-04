/* BILLIONS SCHOOL V21 — Performances (super administrateur) : classements des établissements par zone, progression par période et par année
   (instantanés conservés), meilleurs/plus faibles élèves, effectifs, alertes, renvois. Côté chef : renvoi d'élèves et localisation. */
(function () {
  var PTY = { "Séquence": ["Séquence 1", "Séquence 2", "Séquence 3", "Séquence 4", "Séquence 5", "Séquence 6"], "Trimestre": ["Trimestre 1", "Trimestre 2", "Trimestre 3"], "Semestre": ["Semestre 1", "Semestre 2"], "Année": ["Année"] };
  var PF = { sec: "rank", year: "", pt: "Trimestre", per: "Trimestre 1", geo: "all", gv: "", school: "", cls: "", mode: "weak", lim: 10, q: "", dsc: "" };
  var GEO = [["all", "Tous les établissements"], ["quartier", "Par quartier"], ["ville", "Par ville"], ["region", "Par région"], ["country", "Par pays"]];
  var CACHE = {};
  function two(n) { return String(n).padStart(2, "0"); }
  function ymd(d) { d = d || new Date(); return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()); }
  function ay(ts) { var d = new Date(ts || Date.now()), y = d.getFullYear(); return d.getMonth() >= 8 ? y + "-" + (y + 1) : (y - 1) + "-" + y; }
  function wa(l) { var c = 0, t = 0; l.forEach(function (g) { var k = g.coef || 1; c += k; t += g.score * k; }); return c ? t / c : 0; }
  function f2(x) { return (Math.round(x * 100) / 100).toFixed(2); }
  function loc(s) { return { country: s.country || "—", region: s.region || "Non renseigné", ville: s.ville || "Non renseigné", quartier: s.quartier || "Non renseigné" }; }
  function inPer(g, per, year) { return ay(g.ts) === year && (per === "Année" || pin(per).indexOf(g.period) >= 0); }
  function years() { var o = {}; S.grades.forEach(function (g) { o[ay(g.ts)] = 1; }); (S.perfSnaps || []).forEach(function (s) { o[s.year] = 1; }); o[ay()] = 1; return Object.keys(o).sort().reverse(); }
  function short(p) { return String(p).replace("Séquence ", "S").replace("Trimestre ", "T").replace("Semestre ", "Sem").replace("Année", "An").replace(/^(\d\d)(\d\d)-(\d\d)(\d\d)$/, "$2-$4"); }

  /* ---------- calculs ---------- */
  function stats(year, per) {
    var k = year + "|" + per; if (CACHE[k]) return CACHE[k];
    var by = {}, stu = {}, sc = {};
    S.grades.forEach(function (g) { if (inPer(g, per, year)) (by[g.sid] = by[g.sid] || []).push(g); });
    Object.keys(by).forEach(function (id) {
      var u = uid(+id); if (!u || u.role !== "eleve") return;
      var gs = {}, sb = {}; by[id].forEach(function (g) { (gs[g.subject] = gs[g.subject] || []).push(g); }); Object.keys(gs).forEach(function (m) { sb[m] = wa(gs[m]); });
      var a = wa(by[id]); stu[id] = { id: +id, avg: a, subj: sb, school: u.school, classId: u.classId };
      var s = sc[u.school] || (sc[u.school] = { sum: 0, n: 0, ok: 0 }); s.sum += a; s.n++; if (a >= 10) s.ok++;
    });
    Object.keys(sc).forEach(function (i) { sc[i].avg = sc[i].sum / sc[i].n; });
    return (CACHE[k] = { stu: stu, sc: sc });
  }
  function snap(year, per) { return (S.perfSnaps || []).filter(function (x) { return x.year === year && x.period === per; })[0]; }
  function rankRows(year, per) {
    var st = stats(year, per), rows = Object.keys(st.sc).map(function (id) { var s = sch(+id); if (!s) return null; var l = loc(s), c = st.sc[id]; return Object.assign({ s: +id, name: s.name, avg: c.avg, n: c.n, ok: c.ok, status: s.status }, l); }).filter(Boolean);
    if (!rows.length) { var sn = snap(year, per); if (sn) rows = sn.rows.map(function (r) { return Object.assign({ archive: true }, r); }); }
    return rows.sort(function (a, b) { return b.avg - a.avg; });
  }
  function prevOf(year, per) {
    var m = /^(Séquence|Trimestre|Semestre) (\d)$/.exec(per);
    if (m) return +m[2] > 1 ? [year, m[1] + " " + (+m[2] - 1)] : null;
    if (per === "Année") { var y = +year.slice(0, 4) - 1, py = y + "-" + (y + 1); return years().indexOf(py) >= 0 ? [py, "Année"] : null; }
    return null;
  }
  function schoolVal(id, year, per) {
    var st = stats(year, per); if (st.sc[id]) return { v: st.sc[id].avg, src: "" };
    var sn = snap(year, per), r = sn && sn.rows.filter(function (x) { return x.s === id; })[0]; return r ? { v: r.avg, src: "archive" } : null;
  }
  function stuVal(id, year, per) {
    var st = stats(year, per); if (st.stu[id]) return st.stu[id].avg;
    var sn = snap(year, per), r = sn && (sn.stu || []).filter(function (x) { return x[0] === id; })[0]; return r ? r[1] : null;
  }
  /* instantanés : conservent les classements même si les notes sont modifiées ou supprimées plus tard */
  function autoSnap() {
    if (!S.perfSnaps) S.perfSnaps = []; var combos = {}, ch = false;
    S.grades.forEach(function (g) {
      var y = ay(g.ts), ts = Number(g.ts) || 0, m = /^Séquence (\d)$/.exec(g.period), ps = [g.period, "Année"];
      if (m) { ps.push("Trimestre " + Math.ceil(+m[1] / 2)); ps.push("Semestre " + Math.ceil(+m[1] / 3)); }
      ps.forEach(function (p) { var k = y + "|" + p; if (!combos[k] || combos[k] < ts) combos[k] = ts; });
    });
    Object.keys(combos).forEach(function (k) {
      var a = k.split("|"), sn = snap(a[0], a[1]); if (sn && sn.ts >= combos[k]) return;
      var st = stats(a[0], a[1]), rows = rankRows(a[0], a[1]).filter(function (r) { return !r.archive; }).map(function (r) { return { s: r.s, name: r.name, country: r.country, region: r.region, ville: r.ville, quartier: r.quartier, avg: Math.round(r.avg * 100) / 100, n: r.n, ok: r.ok }; });
      var rec = { id: sn ? sn.id : nid(S.perfSnaps), year: a[0], period: a[1], ts: combos[k], saved: now(), rows: rows, stu: Object.keys(st.stu).map(function (i) { return [+i, Math.round(st.stu[i].avg * 10) / 10]; }) };
      if (sn) S.perfSnaps[S.perfSnaps.indexOf(sn)] = rec; else S.perfSnaps.push(rec); ch = true;
    });
    if (ch) save();
  }

  /* ---------- aides d'affichage ---------- */
  function selH(fn, opts, val) { return '<select onchange="' + fn + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>"; }
  function periodBar() {
    var yrs = years(); if (!PF.year || yrs.indexOf(PF.year) < 0) PF.year = yrs[0];
    return '<div class="card"><b>Période</b>' + selH("pfSet('year',this.value)", yrs.map(function (y) { return [y, "Année scolaire " + y]; }), PF.year)
      + selH("pfSet('pt',this.value)", Object.keys(PTY).map(function (k) { return [k, k === "Année" ? "Année complète" : k + "s"]; }), PF.pt)
      + (PF.pt === "Année" ? "" : selH("pfSet('per',this.value)", PTY[PF.pt].map(function (p) { return [p, p]; }), PF.per)) + "</div>";
  }
  function chart(pts) {
    pts = pts.filter(function (p) { return p.y != null; }); if (!pts.length) return '<div class="mu">Pas encore de données.</div>';
    var W = 320, H = 160, l = 26, r = 10, t = 14, b = 26, n = pts.length;
    var X = function (i) { return n === 1 ? l + (W - l - r) / 2 : l + i * (W - l - r) / (n - 1); }, Y = function (v) { return t + (H - t - b) * (1 - Math.max(0, Math.min(20, v)) / 20); };
    var g = [0, 10, 20].map(function (v) { return '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#9ca3af" stroke-opacity="' + (v === 10 ? ".7" : ".3") + '" stroke-dasharray="' + (v === 10 ? "4 3" : "0") + '"/><text x="2" y="' + (Y(v) + 3) + '" font-size="9" fill="#6b7280">' + v + "</text>"; }).join("");
    var line = pts.map(function (p, i) { return X(i) + "," + Y(p.y); }).join(" ");
    return '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;max-width:440px">' + g + '<polyline points="' + line + '" fill="none" stroke="#14a38f" stroke-width="2.5"/>'
      + pts.map(function (p, i) { return '<circle cx="' + X(i) + '" cy="' + Y(p.y) + '" r="3.5" fill="' + (p.a ? "#d97706" : "#14a38f") + '"/><text x="' + X(i) + '" y="' + (Y(p.y) - 7) + '" font-size="9" text-anchor="middle" fill="#374151">' + f2(p.y) + '</text><text x="' + X(i) + '" y="' + (H - 8) + '" font-size="9" text-anchor="middle" fill="#6b7280">' + esc(short(p.x)) + "</text>"; }).join("") + "</svg>";
  }
  function parentsOf(sid) { return S.users.filter(function (u) { return u.role === "parent" && (u.kids || []).indexOf(sid) >= 0; }); }
  function chefsOf(sid) { return S.users.filter(function (u) { return u.role === "chef" && u.school === sid && u.active !== false; }); }
  function sendTo(ids, text) { ids.forEach(function (to) { S.msgs.push({ id: nid(S.msgs), from: me.id, to: to, text: text, kind: "text", readAt: "", ts: now() }); }); }
  function lowSubj(o, k) { return Object.keys(o.subj).filter(function (m) { return o.subj[m] < 10; }).sort(function (a, b) { return o.subj[a] - o.subj[b]; }).slice(0, k || 4); }

  /* ---------- onglets ---------- */
  var _tabsOf = window.tabsOf;
  window.tabsOf = function () {
    var t = _tabsOf.apply(this, arguments);
    if (me.role === "super") t.splice(1, 0, ["perf", "📊", "Performances"]);
    else if (me.role === "chef") { var n = (S.dismissals || []).filter(function (d) { return d.school === me.school && d.ask && !d.reply; }).length; t.splice(Math.max(1, t.length - 1), 0, ["etab", "🏫", "Renvois & localisation" + (n ? " (" + n + ")" : "")]); }
    return t;
  };
  window.pfSec = function (k) { PF.sec = k; render(); };
  window.pfSet = function (k, v) { PF[k] = v; if (k === "pt") PF.per = PTY[v][0]; if (k === "geo") PF.gv = ""; if (k === "school") PF.cls = ""; render(); };

  /* ---------- 1. Classements ---------- */
  function rowH(r, i, prev) {
    var d = "", pv = prev && prev[r.s];
    if (pv != null) { var x = r.avg - pv; d = ' · <span style="color:' + (x >= 0 ? "#15803d" : "#b91c1c") + '">' + (x >= 0 ? "▲ +" : "▼ ") + f2(x) + "</span>"; }
    return '<div class="row"><span><b>#' + i + " " + esc(r.name) + (r.status === "suspendu" ? " (suspendu)" : "") + '</b><div class="mu">' + esc([r.quartier, r.ville, r.region, r.country].join(" · ")) + '</div><div class="mu">Moyenne <b>' + f2(r.avg) + "/20</b> · réussite " + Math.round(100 * r.ok / r.n) + " % · " + r.n + " élève(s) noté(s)" + d + (r.archive ? " · 🗄️ archivé" : "") + "</div></span><span>" + btn("📈", "pfGo('prog'," + r.s + ")") + " " + btn("🔔", "pfNotifySchool(" + r.s + ")") + "</span></div>";
  }
  function vRank() {
    var rows = rankRows(PF.year, PF.per), pr = prevOf(PF.year, PF.per), prev = null;
    if (pr) { prev = {}; rankRows(pr[0], pr[1]).forEach(function (r) { prev[r.s] = r.avg; }); }
    var gvs = {}; if (PF.geo !== "all") rows.forEach(function (r) { gvs[r[PF.geo]] = 1; });
    var h = periodBar() + '<div class="card"><b>Zone</b>' + selH("pfSet('geo',this.value)", GEO, PF.geo) + (PF.geo !== "all" ? selH("pfSet('gv',this.value)", [["", "Toutes les zones (meilleurs de chacune)"]].concat(Object.keys(gvs).sort().map(function (v) { return [v, v]; })), PF.gv) : "") + "</div>";
    if (!rows.length) return h + '<div class="card mu">Aucune note enregistrée pour cette période.</div>';
    if (PF.geo !== "all" && !PF.gv) {
      var gr = {}; rows.forEach(function (r) { (gr[r[PF.geo]] = gr[r[PF.geo]] || []).push(r); });
      return h + Object.keys(gr).sort().map(function (k) { return '<h3>🏆 ' + esc(k) + " (" + gr[k].length + " établissement(s))</h3>" + gr[k].slice(0, 3).map(function (r, i) { return rowH(r, i + 1, prev); }).join(""); }).join("");
    }
    if (PF.geo !== "all") rows = rows.filter(function (r) { return r[PF.geo] === PF.gv; });
    return h + '<h3>Classement (' + rows.length + ")</h3>" + rows.slice(0, 100).map(function (r, i) { return rowH(r, i + 1, prev); }).join("");
  }
  window.pfGo = function (sec, school) { PF.sec = sec; if (school) PF.school = String(school); render(); };

  /* ---------- 2. Progression ---------- */
  function vProg() {
    var yrs = years(); if (!PF.year || yrs.indexOf(PF.year) < 0) PF.year = yrs[0];
    var sc = S.schools.map(function (s) { return [s.id, s.name]; }); if (!PF.school && sc.length) PF.school = String(sc[0][0]);
    var h = '<div class="card"><b>Établissement</b>' + selH("pfSet('school',this.value)", sc, PF.school) + selH("pfSet('year',this.value)", yrs.map(function (y) { return [y, "Année scolaire " + y]; }), PF.year) + "</div>";
    if (!PF.school) return h + '<div class="card mu">Aucun établissement.</div>';
    var id = +PF.school, seq = PTY["Séquence"].map(function (p) { var r = schoolVal(id, PF.year, p); return { x: p, y: r ? r.v : null, a: r && r.src }; });
    var tri = PTY["Trimestre"].concat(PTY["Semestre"], ["Année"]).map(function (p) { var r = schoolVal(id, PF.year, p); return { x: p, y: r ? r.v : null, a: r && r.src }; });
    var ann = yrs.slice().reverse().map(function (y) { var r = schoolVal(id, y, "Année"); return { x: y, y: r ? r.v : null, a: r && r.src }; });
    var tb = function (a) { return a.map(function (p) { return '<div class="row"><span>' + esc(p.x) + "</span><span>" + (p.y == null ? "—" : "<b>" + f2(p.y) + "</b>/20" + (p.a ? " 🗄️" : "")) + "</span></div>"; }).join(""); };
    return h + '<div class="card"><b>Progression par séquence</b>' + chart(seq) + '</div><div class="card"><b>Trimestres, semestres et année</b>' + tb(tri) + '</div><div class="card"><b>Évolution d’une année à l’autre</b>' + chart(ann) + '</div><div class="mu">🗄️ = valeur conservée dans l’archive du système. Les points orange du graphique sont archivés.</div>';
  }

  /* ---------- 3. Élèves ---------- */
  function stuList() {
    var st = stats(PF.year, PF.per), a = Object.keys(st.stu).map(function (i) { return st.stu[i]; });
    if (PF.school) a = a.filter(function (x) { return String(x.school) === PF.school; });
    if (PF.cls) a = a.filter(function (x) { return String(x.classId) === PF.cls; });
    return a.sort(function (x, y) { return PF.mode === "best" ? y.avg - x.avg : x.avg - y.avg; });
  }
  function vStu() {
    var sc = [["", "Tous les établissements"]].concat(S.schools.map(function (s) { return [s.id, s.name]; })), cl = PF.school ? [["", "Toutes les classes"]].concat(S.classes.filter(function (c) { return String(c.school) === PF.school; }).map(function (c) { return [c.id, c.name]; })) : null;
    var h = periodBar() + '<div class="card">' + selH("pfSet('school',this.value)", sc, PF.school) + (cl ? selH("pfSet('cls',this.value)", cl, PF.cls) : "") + selH("pfSet('mode',this.value)", [["weak", "Les plus faibles"], ["best", "Les meilleurs"]], PF.mode) + selH("pfSet('lim',+this.value)", [10, 20, 50, 100].map(function (n) { return [n, n + " élèves"]; }), PF.lim) + "</div>";
    var a = stuList(); if (!a.length) return h + '<div class="card mu">Aucune note pour cette sélection.</div>';
    var shown = a.slice(0, PF.lim);
    return h + '<div class="card">' + btn("🔔 Notifier ces " + shown.length + " élèves", "pfNotifyList()", "p") + "</div>" + shown.map(function (o, i) {
      var u = uid(o.id), c = (cls(o.classId) || {}).name || "sans classe", lw = lowSubj(o), ps = parentsOf(o.id);
      return '<div class="row"><span><b>#' + (i + 1) + " " + esc(u.name) + '</b><div class="mu">' + esc((sch(u.school) || {}).name || "") + " · salle " + esc(c) + " · " + esc(u.matricule || "") + '</div><div class="mu">Moyenne <b style="color:' + (o.avg < 10 ? "#b91c1c" : "#15803d") + '">' + f2(o.avg) + "/20</b>" + (lw.length ? " · à travailler : " + lw.map(function (m) { return esc(m) + " " + f2(o.subj[m]); }).join(", ") : "") + '</div><div class="mu">Parent : ' + esc(ps.map(function (p) { return p.name; }).join(", ") || u.parentContact || "—") + "</div></span><span>" + btn("📋", "pfStu(" + o.id + ")") + " " + btn("🔔", "pfNotifyStudent(" + o.id + ")") + "</span></div>";
    }).join("") + (a.length > shown.length ? '<div class="mu">' + (a.length - shown.length) + " autre(s) élève(s) non affiché(s).</div>" : "");
  }
  window.pfStu = function (id) {
    var u = uid(id); if (!u) return;
    var gs = S.grades.filter(function (g) { return g.sid === id && ay(g.ts) === PF.year; }).sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }), sb = {};
    gs.forEach(function (g) { (sb[g.subject] = sb[g.subject] || []).push(g); });
    var seq = PTY["Séquence"].map(function (p) { var v = stuVal(id, PF.year, p); return { x: p, y: v }; });
    var ps = parentsOf(id), info = esc((sch(u.school) || {}).name || "") + " · salle " + esc((cls(u.classId) || {}).name || "—") + " · matricule " + esc(u.matricule || "—") + " · parent : " + esc(ps.map(function (p) { return p.name + " (" + (p.phone || p.email) + ")"; }).join(", ") || u.parentContact || "—") + (u.dismissed ? " · 🚪 renvoyé" : "");
    mapOv("📋 " + esc(u.name), '<div class="mu">' + info + "</div><b>Moyenne par matière (année " + esc(PF.year) + ")</b>" + (Object.keys(sb).length ? Object.keys(sb).map(function (m) { var v = wa(sb[m]); return '<div class="row"><span>' + esc(m) + '</span><span style="color:' + (v < 10 ? "#b91c1c" : "#15803d") + '"><b>' + f2(v) + "</b>/20</span></div>"; }).join("") : '<div class="mu">Aucune note.</div>')
      + "<b>Progression par séquence</b>" + chart(seq) + "<b>Toutes les notes</b><div style=\"max-height:260px;overflow:auto\">" + gs.map(function (g) { var t = uid(g.tid) || {}; return '<div class="row"><span>' + esc(g.subject) + " · " + esc(g.type || "") + '<div class="mu">' + esc(g.period) + " · par " + esc(t.name || "—") + "</div></span><span><b>" + g.score + "</b>/20 (coef " + (g.coef || 1) + ")</span></div>"; }).join("") + "</div>");
  };
  window.pfNotifyStudent = function (id) {
    var u = uid(id), st = stats(PF.year, PF.per).stu[id], lw = st ? lowSubj(st) : [];
    var def = "Alerte de la plateforme : vos résultats ne sont pas satisfaisants" + (lw.length ? " en " + lw.join(", ") : "") + ". Merci de redoubler d’efforts et de vous rapprocher de vos professeurs.";
    var t = prompt("Message à " + u.name + " :", def); if (!t) return;
    var ps = parentsOf(id), ids = [id]; if (ps.length && confirm("Envoyer aussi ce message aux " + ps.length + " parent(s) ?")) ids = ids.concat(ps.map(function (p) { return p.id; }));
    sendTo(ids, t); L("Alerte envoyée : " + u.name); alert("Message envoyé à " + ids.length + " personne(s)."); render();
  };
  window.pfNotifyList = function () {
    var a = stuList().slice(0, PF.lim), t = prompt("Message envoyé à ces " + a.length + " élèves :", "Alerte de la plateforme : vos résultats de la période « " + PF.per + " » sont insuffisants. Merci de redoubler d’efforts."); if (!t) return;
    if (!confirm("Envoyer à " + a.length + " élèves ?")) return; sendTo(a.map(function (o) { return o.id; }), t); L("Alerte groupée : " + a.length + " élèves"); alert("Messages envoyés."); render();
  };
  window.pfNotifySchool = function (id) {
    var s = sch(id), ch = chefsOf(id); if (!ch.length) return alert("Aucun chef d’établissement actif pour cet établissement.");
    var t = prompt("Message au chef de « " + s.name + " » :", "Notification de la plateforme : nous avons examiné les résultats de votre établissement pour la période « " + PF.per + " » (" + PF.year + "). Merci de prendre connaissance des points à améliorer."); if (!t) return;
    sendTo(ch.map(function (c) { return c.id; }), t); L("Notification établissement : " + s.name); alert("Message envoyé."); render();
  };

  /* ---------- 4. Effectifs ---------- */
  function vEff() {
    var t = ymd(), ab = S.schools.filter(function (s) { return s.status === "actif" && (!s.exp || s.exp >= t); });
    var tot = { chef: 0, prof: 0, comptable: 0, censeur: 0, eleve: 0, parent: 0, kids: 0 };
    var rows = ab.map(function (s) {
      var us = S.users.filter(function (u) { return u.school === s.id && u.active !== false; }), c = function (r) { return us.filter(function (u) { return u.role === r; }).length; };
      var els = {}; us.filter(function (u) { return u.role === "eleve"; }).forEach(function (u) { els[u.id] = 1; });
      var pars = S.users.filter(function (u) { return u.role === "parent" && (u.kids || []).some(function (k) { return els[k]; }); }), kids = 0; pars.forEach(function (p) { kids += (p.kids || []).filter(function (k) { return els[k]; }).length; });
      var r = { s: s, chef: c("chef"), prof: c("prof"), comptable: c("comptable"), censeur: c("censeur"), eleve: c("eleve"), parent: pars.length, kids: kids };
      Object.keys(tot).forEach(function (k) { tot[k] += r[k]; }); return r;
    });
    var reps = S.reps || [], act = reps.filter(function (r) { return typeof repOk === "function" ? repOk(r) : r.status === "actif"; }), bv = {}; act.forEach(function (r) { var v = r.ville || "Non renseigné"; bv[v] = (bv[v] || 0) + 1; });
    return '<div class="card"><b>Établissements abonnés : ' + ab.length + " / " + S.schools.length + '</b><div class="mu">Abonné = statut actif et abonnement non expiré.</div></div>'
      + '<div class="card"><b>Totaux des établissements abonnés</b><div class="row"><span>Personnel (chefs, professeurs, comptables, censeurs)</span><b>' + (tot.chef + tot.prof + tot.comptable + tot.censeur) + '</b></div><div class="row"><span>Élèves</span><b>' + tot.eleve + '</b></div><div class="row"><span>Parents ayant des élèves</span><b>' + tot.parent + '</b></div><div class="row"><span>Enfants liés à un parent</span><b>' + tot.kids + '</b></div></div>'
      + '<div class="card"><b>Répétiteurs</b><div class="row"><span>Inscrits / actifs</span><b>' + reps.length + " / " + act.length + "</b></div>" + Object.keys(bv).sort(function (a, b) { return bv[b] - bv[a]; }).slice(0, 10).map(function (v) { return '<div class="row"><span class="mu">' + esc(v) + "</span><span>" + bv[v] + "</span></div>"; }).join("") + "</div>"
      + rows.map(function (r) { return '<div class="card"><b>' + esc(r.s.name) + '</b><div class="mu">' + esc([r.s.quartier, r.s.ville, r.s.region, r.s.country].filter(Boolean).join(" · ")) + '</div><div class="mu">Chef ' + r.chef + " · Professeurs " + r.prof + " · Comptables " + r.comptable + " · Censeurs " + r.censeur + " → <b>personnel " + (r.chef + r.prof + r.comptable + r.censeur) + "</b></div><div class=\"mu\">Élèves <b>" + r.eleve + "</b> · Parents <b>" + r.parent + "</b> (" + r.kids + " enfant(s))</div></div>"; }).join("");
  }

  /* ---------- 5. Renvois (vue du super administrateur) ---------- */
  function vRen() {
    var ds = (S.dismissals || []).slice().reverse(), q = PF.dsc.toLowerCase();
    if (q) ds = ds.filter(function (d) { return (d.name + " " + ((sch(d.school) || {}).name || "")).toLowerCase().indexOf(q) >= 0; });
    return '<div class="card"><b>Élèves renvoyés des établissements</b><div class="mu">Cherchez un élève qui veut changer d’établissement, demandez le motif ou écrivez à l’établissement.</div><input id="pf_q" value="' + esc(PF.dsc) + '" placeholder="Nom de l’élève ou de l’établissement" onkeydown="if(event.key===\'Enter\')pfDq()"><button onclick="pfDq()">🔎 Rechercher</button></div>'
      + (ds.length ? ds.map(function (d) {
        var u = uid(d.sid) || {}, st = stats(ay(), "Année").stu[d.sid];
        return '<div class="card"><b>' + esc(d.name) + "</b> — " + esc((sch(d.school) || {}).name || "") + '<div class="mu">Salle ' + esc(d.cls || "—") + " · renvoyé le " + esc(d.date) + " · " + esc(d.status || "renvoyé") + (st ? " · moyenne de l’année " + f2(st.avg) : "") + '</div><div>Motif : ' + (d.motif ? esc(d.motif) : "<i>non communiqué</i>") + "</div>"
          + (d.ask ? '<div class="mu">❓ Motif demandé : ' + esc(d.ask) + "</div>" : "") + (d.reply ? '<div class="mu">💬 Réponse de l’établissement : ' + esc(d.reply) + "</div>" : "")
          + '<div style="margin-top:6px">' + btn("❓ Demander le motif", "pfAsk(" + d.id + ")", "s") + " " + btn("✉️ Écrire à l’établissement", "pfWrite(" + d.id + ")", "p") + (u.id ? " " + btn("📋", "pfStu(" + u.id + ")") : "") + "</div></div>";
      }).join("") : '<div class="card mu">Aucun renvoi enregistré.</div>');
  }
  window.pfDq = function () { PF.dsc = v("pf_q"); render(); };
  window.pfAsk = function (id) {
    var d = S.dismissals.filter(function (x) { return x.id === id; })[0]; if (!d) return; var ch = chefsOf(d.school); if (!ch.length) return alert("Aucun chef actif dans cet établissement.");
    var t = prompt("Demande de motif à l’établissement :", "Merci de nous communiquer le motif détaillé du renvoi de l’élève " + d.name + " (renvoyé le " + d.date + ")."); if (!t) return;
    d.ask = t; d.askTs = now(); sendTo(ch.map(function (c) { return c.id; }), "🚪 Renvoi de " + d.name + " : " + t + "\n→ Répondez depuis l’onglet « Renvois & localisation »."); L("Motif demandé : " + d.name); alert("Demande envoyée."); render();
  };
  window.pfWrite = function (id) {
    var d = S.dismissals.filter(function (x) { return x.id === id; })[0]; if (!d) return; var ch = chefsOf(d.school); if (!ch.length) return alert("Aucun chef actif dans cet établissement.");
    var t = prompt("Message à l’établissement :", "Nous vous écrivons au sujet de l’élève " + d.name + ", renvoyé le " + d.date + ", qui souhaite poursuivre sa scolarité dans un autre établissement. Merci de nous transmettre son dossier scolaire et de confirmer les circonstances du renvoi."); if (!t) return;
    sendTo(ch.map(function (c) { return c.id; }), t); L("Message à l’établissement : " + d.name); alert("Message envoyé."); render();
  };

  /* ---------- 6. Localisation (super) ---------- */
  function vLoc() {
    return '<div class="card mu">Le quartier, la ville et la région servent aux classements par zone. Le pays vient de l’inscription.</div>' + S.schools.map(function (s) { return '<div class="row"><span><b>' + esc(s.name) + '</b><div class="mu">' + esc([s.quartier, s.ville, s.region, s.country].filter(Boolean).join(" · ") || "Localisation non renseignée") + "</div></span><span>" + btn("📍", "pfLoc(" + s.id + ")") + "</span></div>"; }).join("");
  }
  window.pfLoc = function (id) { var s = sch(id), q = prompt("Quartier de « " + s.name + " » :", s.quartier || ""); if (q === null) return; var v2 = prompt("Ville :", s.ville || ""); if (v2 === null) return; var r = prompt("Région :", s.region || ""); if (r === null) return; s.quartier = q.trim(); s.ville = v2.trim(); s.region = r.trim(); L("Localisation : " + s.name); render(); };

  window.vPerf = function () {
    if (me.role !== "super") return ""; CACHE = {}; autoSnap(); var yy = years(); if (!PF.year || yy.indexOf(PF.year) < 0) PF.year = yy[0];
    var secs = [["rank", "🏆 Classements"], ["prog", "📈 Progression"], ["stu", "🎓 Élèves"], ["eff", "👥 Effectifs"], ["ren", "🚪 Renvois"], ["loc", "📍 Zones"]];
    var nav = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' + secs.map(function (x) { return btn(x[1], "pfSec('" + x[0] + "')", PF.sec === x[0] ? "p" : "s"); }).join("") + "</div>";
    var body = { rank: vRank, prog: vProg, stu: vStu, eff: vEff, ren: vRen, loc: vLoc }[PF.sec]();
    return "<h2>📊 Performances des établissements et des élèves</h2>" + nav + body;
  };
  VIEWS.perf = vPerf;

  /* ---------- Chef d'établissement : renvois et localisation ---------- */
  window.vEtab = function () {
    if (me.role !== "chef") return ""; var s = sch(me.school) || {}, ds = (S.dismissals || []).filter(function (d) { return d.school === me.school; }).slice().reverse();
    var els = S.users.filter(function (u) { return u.role === "eleve" && u.school === me.school && u.active !== false; });
    var f = function (id, ph, val) { return '<input id="' + id + '" placeholder="' + ph + '" value="' + esc(val || "") + '">'; };
    return '<h2>🏫 Mon établissement</h2><div class="card"><b>📍 Localisation</b><div class="mu">Utilisée pour les classements par quartier, ville et région.</div>' + f("lc_q", "Quartier", s.quartier) + f("lc_v", "Ville", s.ville) + f("lc_r", "Région", s.region) + '<button onclick="saveLoc()">Enregistrer</button></div>'
      + '<div class="card"><b>🚪 Renvoyer un élève</b><div class="mu">Le compte de l’élève est désactivé et le super administrateur en est informé. Le motif est obligatoire.</div><select id="rn_s">' + els.map(function (u) { return '<option value="' + u.id + '">' + esc(u.name) + " — " + esc((cls(u.classId) || {}).name || "") + "</option>"; }).join("") + '</select>' + f("rn_m", "Motif du renvoi (obligatoire)") + '<button onclick="dismissStu()">Renvoyer l’élève</button></div>'
      + lst("Renvois de mon établissement (" + ds.length + ")", ds.map(function (d) { return '<div class="row"><span><b>' + esc(d.name) + '</b><div class="mu">' + esc(d.date) + " · " + esc(d.status || "renvoyé") + " · Motif : " + esc(d.motif || "—") + "</div>" + (d.ask && !d.reply ? '<div style="color:#b45309">❓ Le super administrateur demande : ' + esc(d.ask) + "</div>" : "") + (d.reply ? '<div class="mu">💬 Votre réponse : ' + esc(d.reply) + "</div>" : "") + "</span><span>" + (d.ask && !d.reply ? btn("💬", "answerDismiss(" + d.id + ")", "p") + " " : "") + (d.status !== "réintégré" ? btn("↩️", "reinstate(" + d.id + ")") : "") + "</span></div>"; }), "Aucun renvoi.");
  };
  VIEWS.etab = vEtab;
  window.saveLoc = function () { var s = sch(me.school); s.quartier = v("lc_q"); s.ville = v("lc_v"); s.region = v("lc_r"); L("Localisation de l’établissement mise à jour"); alert("Localisation enregistrée."); render(); };
  window.dismissStu = function () {
    var id = +v("rn_s"), m = v("rn_m"), u = uid(id); if (!u) return alert("Choisissez un élève."); if (!m) return alert("Le motif du renvoi est obligatoire.");
    if (!confirm("Renvoyer " + u.name + " ? Son compte sera désactivé.")) return;
    if (!S.dismissals) S.dismissals = [];
    S.dismissals.push({ id: nid(S.dismissals), school: me.school, sid: id, name: u.name, cls: (cls(u.classId) || {}).name || "", date: ymd(), motif: m, by: me.id, status: "renvoyé" });
    u.active = false; u.dismissed = true;
    sendTo(S.users.filter(function (x) { return x.role === "super"; }).map(function (x) { return x.id; }), "🚪 Renvoi : " + u.name + " (" + ((sch(me.school) || {}).name || "") + ")\nMotif : " + m);
    L("Élève renvoyé : " + u.name); render();
  };
  window.answerDismiss = function (id) {
    var d = S.dismissals.filter(function (x) { return x.id === id; })[0]; if (!d) return; var t = prompt("Votre réponse au super administrateur :", d.motif || ""); if (!t) return;
    d.reply = t; d.replyTs = now(); sendTo(S.users.filter(function (x) { return x.role === "super"; }).map(function (x) { return x.id; }), "💬 Réponse sur le renvoi de " + d.name + " (" + ((sch(d.school) || {}).name || "") + ") :\n" + t); render();
  };
  window.reinstate = function (id) {
    var d = S.dismissals.filter(function (x) { return x.id === id; })[0]; if (!d || !confirm("Réintégrer " + d.name + " ? Son compte sera réactivé.")) return;
    var u = uid(d.sid); if (u) { u.active = true; u.dismissed = false; } d.status = "réintégré"; d.reinstatedAt = ymd(); L("Élève réintégré : " + d.name); render();
  };
})();
