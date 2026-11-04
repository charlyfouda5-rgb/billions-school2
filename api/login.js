'use strict';
const L = require('./_lib');
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return L.send(res, 405, { ok: false, error: 'Méthode non autorisée' }); }
  try {
    const b = await L.body(req), id = String(b.id || '').trim().toLowerCase(), pw = typeof b.pw === 'string' ? b.pw : '';
    if (!id || !pw || id.length > 200 || pw.length > 200) return L.send(res, 400, { ok: false, error: 'Identifiant et mot de passe requis.' });
    const { data, version } = await L.ensureState();
    const att = await L.repo.getAttempt(id);
    if (att.until > Date.now()) return L.send(res, 429, { ok: false, error: 'Trop de tentatives. Réessayez dans ' + Math.ceil((att.until - Date.now()) / 60000) + ' min.' });
    let hit = null;
    for (const u of (data.users || [])) {
      if (!(String(u.email || '').toLowerCase() === id || L.phoneMatch(u.phone, id) || (u.role === 'eleve' && u.code && String(u.code).toLowerCase() === id))) continue;
      if (L.checkPw(pw, await L.repo.getSecret('user', u.id))) { hit = { kind: 'user', rec: u }; break; }
    }
    if (!hit) for (const r of (data.reqs || [])) {
      if (r.st === 'actif' || !L.phoneMatch(r.phone, id)) continue;
      if (L.checkPw(pw, await L.repo.getSecret('req', r.id))) { hit = { kind: 'req', rec: r }; break; }
    }
    if (!hit) { const n = att.n + 1; await L.repo.setAttempt(id, n >= 8 ? 0 : n, n >= 8 ? Date.now() + 15 * 60000 : 0); return L.send(res, 401, { ok: false, error: 'Identifiants incorrects pour ce profil.' }); }
    await L.repo.setAttempt(id, 0, 0);
    const token = hit.kind === 'user' ? L.sign({ u: hit.rec.id, r: hit.rec.role }) : L.sign({ r: 'guest', q: hit.rec.id }, 2);
    const out = hit.kind === 'user' ? L.clean(data) : { reqs: L.clean({ reqs: [hit.rec] }).reqs }; // une demande en attente ne voit que sa propre fiche
    return L.send(res, 200, { ok: true, kind: hit.kind, id: hit.rec.id, token, version, state: out });
  } catch (e) {
    console.error('login', e);
    return L.send(res, e.code === 'NOINIT' ? 503 : 500, { ok: false, error: e.code === 'NOINIT' ? e.message : 'Serveur indisponible.' });
  }
};
