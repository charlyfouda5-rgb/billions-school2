'use strict';
const L = require('./_lib');
/* GET  /api/sync?since=N : renvoie l'état s'il a changé (jeton requis)
   POST /api/sync {base, ops} : applique les modifications de l'appareil puis renvoie l'état fusionné */
module.exports = async function handler(req, res) {
  try {
    const auth = L.verify(L.bearer(req));
    if (req.method === 'GET') {
      if (!auth || auth.r === 'guest') return L.send(res, 401, { ok: false, error: 'Connexion requise.' });
      const since = Number((req.query && req.query.since) || new URL(req.url, 'http://x').searchParams.get('since') || 0);
      const { data, version } = await L.ensureState();
      return L.send(res, 200, version === since ? { ok: true, changed: false, version } : { ok: true, changed: true, version, state: L.clean(data) });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return L.send(res, 405, { ok: false, error: 'Méthode non autorisée' }); }
    const b = await L.body(req), ops = Array.isArray(b.ops) ? b.ops : [];
    for (let essai = 0; essai < 6; essai++) {
      const cur = await L.ensureState();
      const r = await L.applyOps(cur.data, ops, auth || null);
      const same = JSON.stringify(r.state) === JSON.stringify(cur.data);
      let version = cur.version;
      if (!same) { const nv = await L.repo.casState(r.state, cur.version); if (nv === null) continue; version = nv; }
      const out = { ok: true, version, errors: r.errs };
      if (auth && auth.r !== 'guest') out.state = L.clean(r.state);
      if (!auth && r.created.length) out.guestToken = L.sign({ r: 'guest', q: r.created[0] }, 2);
      return L.send(res, 200, out);
    }
    return L.send(res, 409, { ok: false, error: 'Conflit d’écriture, réessayez.' });
  } catch (e) {
    console.error('sync', e);
    return L.send(res, e.code === 'NOINIT' ? 503 : 500, { ok: false, error: e.code === 'NOINIT' ? e.message : 'Serveur indisponible.' });
  }
};
