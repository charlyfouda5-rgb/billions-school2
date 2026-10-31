'use strict';
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

/* ---------- accès PostgreSQL (Neon) ---------- */
let _sql;
const db = () => _sql || (_sql = neon(process.env.DATABASE_URL));
const repo = {
  async getState() { const r = await db()`SELECT state_data, version FROM app_state WHERE state_key='main'`; return r[0] ? { data: r[0].state_data, version: Number(r[0].version) } : null; },
  async insertState(data) { await db()`INSERT INTO app_state(state_key,state_data,version) VALUES('main',${JSON.stringify(data)}::jsonb,1) ON CONFLICT (state_key) DO NOTHING`; },
  async casState(data, version) { const r = await db()`UPDATE app_state SET state_data=${JSON.stringify(data)}::jsonb, version=version+1, updated_at=now() WHERE state_key='main' AND version=${version} RETURNING version`; return r[0] ? Number(r[0].version) : null; },
  async getSecret(kind, ref) { const r = await db()`SELECT pwh FROM app_secrets WHERE kind=${kind} AND ref=${String(ref)}`; return r[0] ? r[0].pwh : null; },
  async setSecret(kind, ref, pwh) { await db()`INSERT INTO app_secrets(kind,ref,pwh) VALUES(${kind},${String(ref)},${pwh}) ON CONFLICT (kind,ref) DO UPDATE SET pwh=EXCLUDED.pwh, updated_at=now()`; },
  async insertJob(j) { const r = await db()`INSERT INTO translation_jobs(requester_id,source_filename,source_mime,source_bytes,source_object_key,target_language,source_language,task_type,status,upload_id,part_size,options) VALUES(${String(j.requester)},${j.name},${j.mime},${j.size},${j.key},${j.target},${j.source || null},${j.type},'awaiting_upload',${j.uploadId},${j.partSize},${JSON.stringify(j.opts || {})}::jsonb) RETURNING id`; return Number(r[0].id); },
  async getJob(id) { const r = await db()`SELECT * FROM translation_jobs WHERE id=${id}`; return r[0] || null; },
  async listJobs(requester) { return requester ? await db()`SELECT * FROM translation_jobs WHERE requester_id=${String(requester)} ORDER BY created_at DESC LIMIT 30` : await db()`SELECT * FROM translation_jobs ORDER BY created_at DESC LIMIT 100`; },
  async countActiveJobs(requester) { const r = await db()`SELECT count(*)::int AS n FROM translation_jobs WHERE requester_id=${String(requester)} AND status IN ('awaiting_upload','queued','processing')`; return r[0].n; },
  async setJobStatus(id, status, msg) { await db()`UPDATE translation_jobs SET status=${status}, error_message=${msg || null}, updated_at=now() WHERE id=${id}`; },
  async insertFile(f) { const r = await db()`INSERT INTO shared_files(owner_id,name,mime,size,object_key,upload_id,part_size) VALUES(${String(f.owner)},${f.name},${f.mime},${f.size},${f.key},${f.uploadId},${f.partSize}) RETURNING id`; return Number(r[0].id); },
  async getFile(id) { const r = await db()`SELECT * FROM shared_files WHERE id=${id}`; return r[0] || null; },
  async setFileStatus(id, status) { await db()`UPDATE shared_files SET status=${status} WHERE id=${id}`; },
  async getAttempt(key) { const r = await db()`SELECT n, locked_until FROM login_attempts WHERE k=${key}`; return r[0] ? { n: r[0].n, until: r[0].locked_until ? new Date(r[0].locked_until).getTime() : 0 } : { n: 0, until: 0 }; },
  async setAttempt(key, n, until) { await db()`INSERT INTO login_attempts(k,n,locked_until) VALUES(${key},${n},${until ? new Date(until).toISOString() : null}) ON CONFLICT (k) DO UPDATE SET n=EXCLUDED.n, locked_until=EXCLUDED.locked_until`; }
};

/* ---------- mots de passe et jetons ---------- */
function hashPw(pw) { const salt = crypto.randomBytes(16); return 's1$' + salt.toString('hex') + '$' + crypto.scryptSync(String(pw), salt, 32).toString('hex'); }
function checkPw(pw, stored) {
  if (!stored || typeof pw !== 'string') return false;
  const p = stored.split('$'); if (p.length !== 3 || p[0] !== 's1') return false;
  const h = crypto.scryptSync(pw, Buffer.from(p[1], 'hex'), 32), x = Buffer.from(p[2], 'hex');
  return h.length === x.length && crypto.timingSafeEqual(h, x);
}
const b64 = b => Buffer.from(b).toString('base64url');
function secret() { const s = process.env.SESSION_SECRET; if (!s || s.length < 24) throw new Error('SESSION_SECRET manquante ou trop courte (24 caractères min.)'); return s; }
function sign(payload, days) {
  const body = b64(JSON.stringify(Object.assign({}, payload, { exp: Date.now() + (days || 7) * 864e5 })));
  return body + '.' + crypto.createHmac('sha256', secret()).update(body).digest('base64url');
}
function verify(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null;
  const [body, sig] = token.split('.'), exp = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > Date.now() ? p : null; } catch (e) { return null; }
}
const bearer = req => ((req.headers && req.headers.authorization) || '').replace(/^Bearer\s+/i, '');

/* ---------- état initial (super administrateur créé depuis les variables Vercel) ---------- */
async function ensureState() {
  let st = await repo.getState(); if (st) return st;
  const email = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase(), pw = process.env.SUPER_ADMIN_PASSWORD || '';
  if (!email || pw.length < 8) throw Object.assign(new Error('Base vide : définissez SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD (8 caractères min.) dans Vercel.'), { code: 'NOINIT' });
  const init = JSON.parse(JSON.stringify(require('./initial-state.json')));
  const su = init.users.find(u => u.role === 'super'); su.email = email; su.name = su.name || 'Super administrateur'; delete su.pw;
  await repo.setSecret('user', su.id, hashPw(pw));
  await repo.insertState(init);
  return await repo.getState();
}

/* ---------- utilitaires métier ---------- */
const dg = x => String(x).replace(/\D/g, '');
function phoneMatch(st, typed) {
  if (!st) return false; let t = dg(typed); if (!t) return false; if (t.indexOf('00') === 0) t = t.slice(2);
  st = String(st); if (st === t) return true; const l = t.replace(/^0+/, '');
  return l.length >= 8 && st.length > l.length && st.length - l.length <= 4 && st.slice(-l.length) === l;
}
function publicState(state) { // visiteur non connecté : aucune donnée
  return {};
}
function clean(state) { // jamais de mot de passe vers le navigateur
  const o = Object.assign({}, state);
  ['users', 'reqs'].forEach(k => { if (Array.isArray(o[k])) o[k] = o[k].map(r => { if (r && r.pw !== undefined) { r = Object.assign({}, r); delete r.pw; } return r; }); });
  return o;
}

/* ---------- application des modifications envoyées par un appareil ---------- */
const NOT_FOR_LEARNERS = ['schools', 'grades', 'classes', 'subjects', 'cfg', 'langs', 'rates', 'disc', 'dec'];
const SUPER_ONLY = ['cfg', 'langs', 'rates', 'shares']; // 'shares' : contenus envoyés par le super administrateur
const GUEST_KEYS = ['reqs', 'logs', 'users', 'schools', 'photos', 'reps', 'nums', 'acc', 'accessHistory']; // parcours d'activation d'un compte après validation
async function applyOps(state, ops, auth) {
  const S = JSON.parse(JSON.stringify(state)), errs = [], role = auth ? auth.r : 'anon';
  const lowRole = ['eleve', 'parent', 'repetiteur'].indexOf(role) >= 0;
  const created = [];
  for (const op of (Array.isArray(ops) ? ops : [])) {
    if (!op || typeof op !== 'object') continue;
    const key = op.c || op.k; if (typeof key !== 'string' || /^__|constructor|prototype/.test(key)) continue;
    if (role === 'anon') { if (key !== 'reqs' && key !== 'logs') { errs.push('refusé:' + key); continue; } }
    else if (role === 'guest') { if (GUEST_KEYS.indexOf(key) < 0) { errs.push('refusé:' + key); continue; } }
    else if (role !== 'super') {
      if (SUPER_ONLY.indexOf(key) >= 0) { errs.push('refusé:' + key); continue; }
      if (key === 'schools' && role !== 'chef') { errs.push('refusé:' + key); continue; }
      if (lowRole && NOT_FOR_LEARNERS.indexOf(key) >= 0) { errs.push('refusé:' + key); continue; }
    }
    if (op.k !== undefined) { if (op.set !== undefined) S[key] = op.set; continue; }
    if (!Array.isArray(S[key])) S[key] = [];
    if (Array.isArray(op.add)) { S[key] = S[key].concat(op.add.slice(0, 200)); if (S[key].length > 3000) S[key] = S[key].slice(-3000); }
    for (const rec of (Array.isArray(op.put) ? op.put : [])) {
      if (!rec || typeof rec !== 'object' || typeof rec.id !== 'number') continue;
      const i = S[key].findIndex(x => x.id === rec.id);
      if (role === 'anon') { if (i >= 0 || key !== 'reqs') continue; }
      if (role === 'guest') {
        const q = (S.reqs || []).find(x => x.id === auth.q) || {};
        if (key === 'reqs') { if (i >= 0 && rec.id !== auth.q) continue; }
        else if (i >= 0) continue;
        else if (key === 'users' && (rec.fromReq !== auth.q || rec.role === 'super' || (q.type && rec.role !== q.type))) { errs.push('refusé:users'); continue; }
        else if (key === 'schools' && q.type !== 'chef') { errs.push('refusé:schools'); continue; }
      }
      if (role === 'guest' && key === 'reqs' && i >= 0 && rec.id !== auth.q) continue;
      if (key === 'users') {
        if (rec.role === 'super' && role !== 'super') { errs.push('refusé:super'); continue; }
        if (i >= 0 && S.users[i].role === 'super' && role !== 'super') { errs.push('refusé:super'); continue; }
        if (lowRole && rec.id !== auth.u) { errs.push('refusé:users'); continue; }
      }
      if (key === 'users' || key === 'reqs') {
        const kind = key === 'users' ? 'user' : 'req';
        if (typeof rec.pw === 'string' && rec.pw) { if (rec.pw.length < 6) { errs.push('mot de passe trop court'); continue; } await repo.setSecret(kind, rec.id, hashPw(rec.pw)); }
        else if (rec.fromReq && key === 'users') { const h = await repo.getSecret('req', rec.fromReq); if (h) await repo.setSecret('user', rec.id, h); }
        delete rec.pw; if (key === 'users') delete rec.fromReq;
        if (i >= 0 && key === 'users' && S.users[i].role !== rec.role && role !== 'super' && role !== 'chef') rec.role = S.users[i].role;
      }
      if (i >= 0) S[key][i] = rec; else { S[key].push(rec); if (role === 'anon') created.push(rec.id); }
    }
    for (const id of (Array.isArray(op.del) ? op.del : [])) {
      if (role === 'anon' || role === 'guest') continue;
      const j = S[key].findIndex(x => x.id === id);
      if (j >= 0) { if (key === 'users' && S.users[j].role === 'super') continue; if (lowRole && key !== 'convs' && key !== 'cm' && key !== 'msgs' && key !== 'dom') continue; S[key].splice(j, 1); }
    }
  }
  return { state: S, errs, created };
}

function send(res, code, obj) { res.statusCode = code; res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); }
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = ''; for await (const c of req) { s += c; if (s.length > 4.2e6) throw new Error('Requête trop volumineuse'); }
  return s ? JSON.parse(s) : {};
}
module.exports = { repo, hashPw, checkPw, sign, verify, bearer, ensureState, phoneMatch, clean, publicState, applyOps, send, body };
