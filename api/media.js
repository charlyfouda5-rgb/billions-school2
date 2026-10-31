'use strict';
/* Traduction de fichiers volumineux : envoi direct navigateur -> Cloudflare R2 par morceaux (multipart, URLs signées).
   Aucun fichier ne transite par Vercel. Actions : start | sign | complete | list | download | cancel */
const crypto = require('crypto');
const L = require('./_lib');
const GiB = 1024 ** 3, MiB = 1024 ** 2;
const maxBytes = () => (Number(process.env.MAX_UPLOAD_GB) || 50) * GiB;
let _c; const sdk = () => _c || (_c = { s3: require('@aws-sdk/client-s3'), sign: require('@aws-sdk/s3-request-presigner') });
let _cl; const client = () => _cl || (_cl = new (sdk().s3.S3Client)({ region: 'auto', endpoint: 'https://' + process.env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com', credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } }));
const bucket = () => process.env.R2_BUCKET;

function taskType(name, mime) {
  const e = (String(name).split('.').pop() || '').toLowerCase(); mime = String(mime || '');
  if (mime.startsWith('video/') || ['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v'].includes(e)) return 'video';
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(e)) return 'audio';
  if (mime.startsWith('image/')) return 'image';
  if (['txt', 'srt', 'vtt', 'md', 'csv'].includes(e)) return 'text';
  return 'document';
}
const safeName = n => String(n || 'fichier').normalize('NFKD').replace(/[^\w.\-]+/g, '_').replace(/^\.+/, '').slice(0, 120) || 'fichier';
const shape = j => ({ id: Number(j.id), name: j.source_filename, size: Number(j.source_bytes), target: j.target_language, type: j.task_type, status: j.status, progress: j.progress, error: j.error_message || '', created: j.created_at, outName: j.output_name || '' });
async function mine(auth, id) { const j = await L.repo.getJob(Number(id)); if (!j) return null; return (String(j.requester_id) === String(auth.u) || auth.r === 'super') ? j : null; }

module.exports = async function handler(req, res) {
  try {
    const auth = L.verify(L.bearer(req));
    if (!auth || auth.r === 'guest') return L.send(res, 401, { ok: false, error: 'Connexion requise.' });
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    const action = q.action || '';
    if (['start', 'sign', 'complete', 'cancel', 'sstart', 'ssign', 'scomplete', 'sdelete'].includes(action) ? req.method !== 'POST' : req.method !== 'GET') return L.send(res, 405, { ok: false, error: 'Méthode non autorisée' });
    if (!process.env.R2_BUCKET || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) return L.send(res, 503, { ok: false, error: 'Stockage R2 non configuré sur le serveur.' });

    if (action === 'list') { const rows = await L.repo.listJobs(q.all === '1' && auth.r === 'super' ? null : auth.u); return L.send(res, 200, { ok: true, jobs: rows.map(shape) }); }

    if (action === 'download') {
      const j = await mine(auth, q.id); if (!j || j.status !== 'completed' || !j.output_object_key) return L.send(res, 404, { ok: false, error: 'Fichier traduit indisponible.' });
      const url = await sdk().sign.getSignedUrl(client(), new (sdk().s3.GetObjectCommand)({ Bucket: bucket(), Key: j.output_object_key, ResponseContentDisposition: 'attachment; filename="' + safeName(j.output_name || 'traduction') + '"' }), { expiresIn: 900 });
      return L.send(res, 200, { ok: true, url });
    }

    if (action === 'sdownload') { // contenu envoyé par le super administrateur : réservé aux destinataires
      const id = Number(q.id), f = await L.repo.getFile(id); if (!f || f.status !== 'ready') return L.send(res, 404, { ok: false, error: 'Contenu indisponible.' });
      let ok = auth.r === 'super';
      if (!ok) { const st = await L.ensureState(); ok = (st.data.shares || []).some(x => Number(x.fileId) === id && Array.isArray(x.to) && x.to.indexOf(auth.u) >= 0); }
      if (!ok) return L.send(res, 403, { ok: false, error: 'Ce contenu ne vous est pas destiné.' });
      const url = await sdk().sign.getSignedUrl(client(), new (sdk().s3.GetObjectCommand)({ Bucket: bucket(), Key: f.object_key, ResponseContentDisposition: (q.mode === 'view' ? 'inline' : 'attachment') + '; filename="' + safeName(f.name) + '"', ResponseContentType: f.mime || undefined }), { expiresIn: 3600 });
      return L.send(res, 200, { ok: true, url, name: f.name });
    }

    const b = await L.body(req);
    if (action[0] === 's' && action !== 'start' && action !== 'sign') { // bibliothèque : réservé au super administrateur
      if (auth.r !== 'super') return L.send(res, 403, { ok: false, error: 'Réservé au super administrateur.' });
      if (action === 'sstart') {
        const size = Number(b.size), name = safeName(b.name);
        if (!Number.isFinite(size) || size <= 0) return L.send(res, 400, { ok: false, error: 'Fichier vide ou invalide.' });
        if (size > maxBytes()) return L.send(res, 413, { ok: false, error: 'Fichier trop volumineux (maximum ' + Math.round(maxBytes() / GiB) + ' Go sur ce serveur).' });
        const partSize = Math.max(64 * MiB, Math.ceil(size / 9000 / MiB) * MiB), key = 'library/' + crypto.randomUUID() + '/' + name;
        const mp = await client().send(new (sdk().s3.CreateMultipartUploadCommand)({ Bucket: bucket(), Key: key, ContentType: String(b.mime || 'application/octet-stream') }));
        const id = await L.repo.insertFile({ owner: auth.u, name, mime: String(b.mime || ''), size, key, uploadId: mp.UploadId, partSize });
        return L.send(res, 200, { ok: true, fileId: id, partSize, totalParts: Math.ceil(size / partSize) });
      }
      const f = await L.repo.getFile(Number(b.fileId)); if (!f) return L.send(res, 404, { ok: false, error: 'Fichier introuvable.' });
      if (action === 'ssign') {
        if (f.status !== 'awaiting_upload') return L.send(res, 409, { ok: false, error: 'Envoi déjà terminé.' });
        const total = Math.ceil(Number(f.size) / Number(f.part_size)), urls = {};
        for (const n of (Array.isArray(b.parts) ? b.parts : []).slice(0, 50)) { if (Number.isInteger(n) && n >= 1 && n <= total) urls[n] = await sdk().sign.getSignedUrl(client(), new (sdk().s3.UploadPartCommand)({ Bucket: bucket(), Key: f.object_key, UploadId: f.upload_id, PartNumber: n }), { expiresIn: 3600 }); }
        return L.send(res, 200, { ok: true, urls });
      }
      if (action === 'scomplete') {
        if (f.status !== 'awaiting_upload') return L.send(res, 409, { ok: false, error: 'Envoi déjà terminé.' });
        const parts = (Array.isArray(b.parts) ? b.parts : []).map(p => ({ PartNumber: Number(p.n), ETag: String(p.etag) })).sort((x, y) => x.PartNumber - y.PartNumber);
        if (parts.length !== Math.ceil(Number(f.size) / Number(f.part_size)) || parts.some((p, i) => p.PartNumber !== i + 1 || !p.ETag)) return L.send(res, 400, { ok: false, error: 'Liste des morceaux incomplète.' });
        await client().send(new (sdk().s3.CompleteMultipartUploadCommand)({ Bucket: bucket(), Key: f.object_key, UploadId: f.upload_id, MultipartUpload: { Parts: parts } }));
        const h = await client().send(new (sdk().s3.HeadObjectCommand)({ Bucket: bucket(), Key: f.object_key }));
        if (Number(h.ContentLength) !== Number(f.size)) { await L.repo.setFileStatus(f.id, 'cancelled'); return L.send(res, 422, { ok: false, error: 'Envoi incomplet, recommencez.' }); }
        await L.repo.setFileStatus(f.id, 'ready'); return L.send(res, 200, { ok: true });
      }
      if (action === 'sdelete') {
        try { if (f.status === 'awaiting_upload') await client().send(new (sdk().s3.AbortMultipartUploadCommand)({ Bucket: bucket(), Key: f.object_key, UploadId: f.upload_id })); else if (f.status === 'ready') await client().send(new (sdk().s3.DeleteObjectCommand)({ Bucket: bucket(), Key: f.object_key })); } catch (e) { /* déjà supprimé */ }
        await L.repo.setFileStatus(f.id, 'deleted'); return L.send(res, 200, { ok: true });
      }
      return L.send(res, 400, { ok: false, error: 'Action inconnue.' });
    }
    if (action === 'start') {
      const size = Number(b.size), name = safeName(b.name), target = String(b.target || '');
      if (!Number.isFinite(size) || size <= 0) return L.send(res, 400, { ok: false, error: 'Fichier vide ou invalide.' });
      if (size > maxBytes()) return L.send(res, 413, { ok: false, error: 'Fichier trop volumineux (maximum ' + Math.round(maxBytes() / GiB) + ' Go sur ce serveur).' });
      if (!/^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(target)) return L.send(res, 400, { ok: false, error: 'Langue de sortie invalide.' });
      if (b.source && !/^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(String(b.source))) return L.send(res, 400, { ok: false, error: 'Langue source invalide.' });
      if (await L.repo.countActiveJobs(auth.u) >= 5) return L.send(res, 429, { ok: false, error: 'Déjà 5 traductions en cours : attendez la fin de l’une d’elles.' });
      const type = taskType(name, b.mime), partSize = Math.max(64 * MiB, Math.ceil(size / 9000 / MiB) * MiB), totalParts = Math.ceil(size / partSize);
      const key = 'uploads/' + auth.u + '/' + crypto.randomUUID() + '/' + name;
      const mp = await client().send(new (sdk().s3.CreateMultipartUploadCommand)({ Bucket: bucket(), Key: key, ContentType: String(b.mime || 'application/octet-stream') }));
      const id = await L.repo.insertJob({ requester: auth.u, name, mime: String(b.mime || ''), size, key, target, source: b.source, type, uploadId: mp.UploadId, partSize, opts: { mux: !!b.mux } });
      return L.send(res, 200, { ok: true, jobId: id, partSize, totalParts, type });
    }
    const j = await mine(auth, b.jobId); if (!j) return L.send(res, 404, { ok: false, error: 'Traduction introuvable.' });

    if (action === 'sign') {
      if (j.status !== 'awaiting_upload') return L.send(res, 409, { ok: false, error: 'Envoi déjà terminé ou annulé.' });
      const total = Math.ceil(Number(j.source_bytes) / Number(j.part_size)), urls = {};
      for (const n of (Array.isArray(b.parts) ? b.parts : []).slice(0, 50)) {
        if (!Number.isInteger(n) || n < 1 || n > total) continue;
        urls[n] = await sdk().sign.getSignedUrl(client(), new (sdk().s3.UploadPartCommand)({ Bucket: bucket(), Key: j.source_object_key, UploadId: j.upload_id, PartNumber: n }), { expiresIn: 3600 });
      }
      return L.send(res, 200, { ok: true, urls });
    }
    if (action === 'complete') {
      if (j.status !== 'awaiting_upload') return L.send(res, 409, { ok: false, error: 'Envoi déjà terminé ou annulé.' });
      const parts = (Array.isArray(b.parts) ? b.parts : []).map(p => ({ PartNumber: Number(p.n), ETag: String(p.etag) })).sort((x, y) => x.PartNumber - y.PartNumber);
      if (parts.length !== Math.ceil(Number(j.source_bytes) / Number(j.part_size)) || parts.some((p, i) => p.PartNumber !== i + 1 || !p.ETag)) return L.send(res, 400, { ok: false, error: 'Liste des morceaux incomplète.' });
      await client().send(new (sdk().s3.CompleteMultipartUploadCommand)({ Bucket: bucket(), Key: j.source_object_key, UploadId: j.upload_id, MultipartUpload: { Parts: parts } }));
      const h = await client().send(new (sdk().s3.HeadObjectCommand)({ Bucket: bucket(), Key: j.source_object_key }));
      if (Number(h.ContentLength) !== Number(j.source_bytes)) { await L.repo.setJobStatus(j.id, 'failed', 'Taille reçue différente de la taille envoyée.'); return L.send(res, 422, { ok: false, error: 'Envoi incomplet, recommencez.' }); }
      await L.repo.setJobStatus(j.id, 'queued', null);
      if (process.env.WORKER_URL) { const ac = new AbortController(); setTimeout(() => ac.abort(), 3000); try { await fetch(process.env.WORKER_URL.replace(/\/$/, '') + '/run', { method: 'POST', headers: { Authorization: 'Bearer ' + (process.env.WORKER_TOKEN || '') }, signal: ac.signal }); } catch (e) { /* le worker relève aussi la file seul */ } }
      return L.send(res, 200, { ok: true });
    }
    if (action === 'cancel') {
      if (j.status === 'awaiting_upload') { try { await client().send(new (sdk().s3.AbortMultipartUploadCommand)({ Bucket: bucket(), Key: j.source_object_key, UploadId: j.upload_id })); } catch (e) { /* déjà abandonné */ } }
      if (['awaiting_upload', 'queued'].includes(j.status)) await L.repo.setJobStatus(j.id, 'cancelled', null);
      return L.send(res, 200, { ok: true });
    }
    return L.send(res, 400, { ok: false, error: 'Action inconnue.' });
  } catch (e) { console.error('media', e); return L.send(res, 500, { ok: false, error: 'Serveur indisponible.' }); }
};
