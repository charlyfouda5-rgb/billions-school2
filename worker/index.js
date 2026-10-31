'use strict';
/* BILLIONS SCHOOL — worker de traduction (Google Cloud Run). Prend les jobs 'queued' dans Neon, lit le fichier dans R2 en flux,
   traduit, dépose le résultat dans R2. Les gros fichiers restent sur disque (jamais entièrement en mémoire).
   Formats : TXT/MD/CSV, SRT/VTT, DOCX, PPTX, XLSX, PDF avec texte, audio/vidéo (sous-titres SRT, copie vidéo sous-titrée en option).
   NON couvert : PDF scannés/images (OCR), doublage vocal. Le disque de l'instance doit être > 2 x la taille du plus gros fichier. */
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process'), { pipeline } = require('stream/promises');
const { Pool } = require('pg');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3'), { Upload } = require('@aws-sdk/lib-storage');
const { Translate } = require('@google-cloud/translate').v2, { SpeechClient } = require('@google-cloud/speech'), { Storage } = require('@google-cloud/storage');
const AdmZip = require('adm-zip');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true }, max: 3 });
const s3 = new S3Client({ region: 'auto', endpoint: 'https://' + process.env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com', credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
const BUCKET = process.env.R2_BUCKET, tr = new Translate(), speech = new SpeechClient(), gcs = new Storage();
const SPEECH = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', pt: 'pt-PT', de: 'de-DE', it: 'it-IT', ar: 'ar-SA', zh: 'zh-CN', ru: 'ru-RU', ja: 'ja-JP', ko: 'ko-KR', hi: 'hi-IN', sw: 'sw-KE', nl: 'nl-NL', tr: 'tr-TR' };

const progress = (id, p) => pool.query('UPDATE translation_jobs SET progress=$2, updated_at=now() WHERE id=$1 AND status=$3', [id, Math.min(99, p), 'processing']);
const run = (cmd, args) => new Promise((ok, ko) => { const c = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] }); let e = ''; c.stderr.on('data', d => { e = (e + d).slice(-2000); }); c.on('close', k => k === 0 ? ok() : ko(new Error(cmd + ' : ' + e))); });

/* ---- traduction par lots avec reprise ---- */
async function translateMany(list, to, from) {
  const uniq = [...new Set(list.filter(s => s && s.trim()))], map = new Map();
  for (let i = 0; i < uniq.length;) {
    let batch = [], chars = 0; while (i < uniq.length && batch.length < 100 && chars + uniq[i].length < 25000) { batch.push(uniq[i]); chars += uniq[i].length; i++; }
    if (!batch.length) { batch = [uniq[i].slice(0, 20000)]; i++; }
    let out; for (let t = 0; ; t++) { try { [out] = await tr.translate(batch, Object.assign({ to, format: 'text' }, from ? { from } : {})); break; } catch (e) { if (t >= 4) throw e; await new Promise(r => setTimeout(r, 1500 * (t + 1))); } }
    batch.forEach((s, k) => map.set(s, Array.isArray(out) ? out[k] : out));
  }
  return s => (map.has(s) ? map.get(s) : s);
}
const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---- formats ---- */
async function doText(src, dst, to, from, ext) {
  const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/), isCue = l => /-->/.test(l) || /^\d+$/.test(l.trim()) || /^WEBVTT/.test(l) || !l.trim();
  const t = await translateMany(lines.filter(l => (ext === 'srt' || ext === 'vtt') ? !isCue(l) : l.trim()), to, from);
  fs.writeFileSync(dst, lines.map(l => ((ext === 'srt' || ext === 'vtt') ? isCue(l) : !l.trim()) ? l : t(l)).join('\n'));
}
async function doOffice(src, dst, to, from, ext) {
  const zip = new AdmZip(src), rx = ext === 'docx' ? /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g : ext === 'pptx' ? /<a:t>([^<]*)<\/a:t>/g : /<t(?: [^>]*)?>([^<]*)<\/t>/g;
  const ok = n => ext === 'docx' ? /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(n) : ext === 'pptx' ? /^ppt\/(slides|notesSlides)\/[^/]+\.xml$/.test(n) : n === 'xl/sharedStrings.xml';
  const entries = zip.getEntries().filter(e => ok(e.entryName)), all = [];
  entries.forEach(e => { let m; const r = new RegExp(rx.source, 'g'), x = e.getData().toString('utf8'); while ((m = r.exec(x))) all.push(unesc(m[1])); });
  const t = await translateMany(all, to, from);
  entries.forEach(e => { const x = e.getData().toString('utf8'); zip.updateFile(e.entryName, Buffer.from(x.replace(new RegExp(rx.source, 'g'), (m, g) => m.replace(/>[^<]*</, () => '>' + esc(t(unesc(g))) + '<')), 'utf8')); });
  zip.writeZip(dst);
}
async function doPdf(src, dst, to, from) {
  const d = await require('pdf-parse')(fs.readFileSync(src)), text = (d.text || '').trim();
  if (text.length < 40 * Math.max(1, d.numpages)) throw new Error('PDF scanné ou sans texte : une reconnaissance de caractères (OCR) est nécessaire, non incluse.');
  const paras = text.split(/\n{2,}/), t = await translateMany(paras, to, from);
  fs.writeFileSync(dst, paras.map(p => t(p)).join('\n\n'));
}
const ts = (ms, sep) => { const h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3), z = Math.floor(ms % 1e3); return [h, m, s].map(n => String(n).padStart(2, '0')).join(':') + sep + String(z).padStart(3, '0'); };
async function doMedia(job, src, dir, to, from, id) {
  const flac = path.join(dir, 'a.flac'); await run('ffmpeg', ['-y', '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'flac', flac]); await progress(id, 15);
  const bucket = process.env.GCS_BUCKET, obj = 'tmp/' + id + '.flac'; await gcs.bucket(bucket).upload(flac, { destination: obj, resumable: true }); await progress(id, 30);
  try {
    const [op] = await speech.longRunningRecognize({ audio: { uri: 'gs://' + bucket + '/' + obj }, config: { encoding: 'FLAC', sampleRateHertz: 16000, languageCode: SPEECH[from] || from || 'fr-FR', enableWordTimeOffsets: true, enableAutomaticPunctuation: true, model: 'latest_long' } });
    const [resp] = await op.promise(); await progress(id, 60);
    const sec = x => Number(x.seconds || 0) * 1000 + Math.floor(Number(x.nanos || 0) / 1e6), cues = []; let cur = null;
    for (const r of resp.results || []) for (const w of (r.alternatives[0] || {}).words || []) {
      const a = sec(w.startTime), b = sec(w.endTime);
      if (!cur || b - cur.a > 6500 || cur.t.length > 80) { cur = { a, b, t: '' }; cues.push(cur); }
      cur.t += (cur.t ? ' ' : '') + w.word; cur.b = b;
    }
    if (!cues.length) throw new Error('Aucune parole détectée (vérifiez la langue indiquée).');
    const t = await translateMany(cues.map(c => c.t), to, from);
    const srt = cues.map((c, i) => (i + 1) + '\n' + ts(c.a, ',') + ' --> ' + ts(c.b, ',') + '\n' + t(c.t) + '\n').join('\n'), sp = path.join(dir, 'out.srt'); fs.writeFileSync(sp, srt);
    if (job.task_type === 'video' && (job.options || {}).mux) { const o = path.join(dir, 'out.mp4'); await run('ffmpeg', ['-y', '-i', src, '-i', sp, '-map', '0', '-map', '1', '-c', 'copy', '-c:s', 'mov_text', o]); return { file: o, name: 'mp4' }; }
    return { file: sp, name: 'srt' };
  } finally { gcs.bucket(bucket).file(obj).delete().catch(() => { }); }
}

/* ---- traitement d'un job ---- */
async function process1(job) {
  const id = Number(job.id), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'job' + id + '-')), base = job.source_filename.replace(/\.[^.]+$/, ''), ext = (job.source_filename.split('.').pop() || '').toLowerCase(), to = job.target_language, from = job.source_language || undefined;
  try {
    const src = path.join(dir, 'src.' + ext), g = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: job.source_object_key }));
    await pipeline(g.Body, fs.createWriteStream(src)); await progress(id, 10);
    let out, outExt = ext;
    if (['txt', 'md', 'csv', 'srt', 'vtt'].includes(ext)) { out = path.join(dir, 'out'); await doText(src, out, to, from, ext); }
    else if (['docx', 'pptx', 'xlsx'].includes(ext)) { out = path.join(dir, 'out'); await doOffice(src, out, to, from, ext); }
    else if (ext === 'pdf') { out = path.join(dir, 'out'); await doPdf(src, out, to, from); outExt = 'txt'; }
    else if (job.task_type === 'audio' || job.task_type === 'video') { const r = await doMedia(job, src, dir, to, from, id); out = r.file; outExt = r.name; }
    else throw new Error('Format non pris en charge pour la traduction : .' + ext);
    await progress(id, 90);
    const outName = base + '.' + to + '.' + outExt, key = 'results/' + job.requester_id + '/' + id + '/' + outName;
    await new Upload({ client: s3, params: { Bucket: BUCKET, Key: key, Body: fs.createReadStream(out) }, partSize: 64 * 1024 * 1024, queueSize: 3 }).done();
    await pool.query("UPDATE translation_jobs SET status='completed', progress=100, output_object_key=$2, output_name=$3, output_bytes=$4, completed_at=now(), updated_at=now(), error_message=NULL WHERE id=$1", [id, key, outName, fs.statSync(out).size]);
  } catch (e) {
    console.error('job', id, e);
    await pool.query("UPDATE translation_jobs SET status='failed', error_message=$2, updated_at=now() WHERE id=$1", [id, String(e.message || e).slice(0, 500)]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
let busy = false;
async function loop() {
  if (busy) return; busy = true;
  try { for (; ;) { const r = await pool.query("UPDATE translation_jobs SET status='processing', progress=5, updated_at=now() WHERE id=(SELECT id FROM translation_jobs WHERE status='queued' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *"); if (!r.rows[0]) break; await process1(r.rows[0]); } }
  catch (e) { console.error('loop', e); } finally { busy = false; }
}
/* tâches restées bloquées (instance arrêtée) : remises en file après 6 h sans mise à jour */
const rescue = () => pool.query("UPDATE translation_jobs SET status='queued' WHERE status='processing' AND updated_at < now() - interval '6 hours'").catch(() => { });
http.createServer((q, s) => {
  if (q.method === 'POST' && q.url === '/run' && q.headers.authorization === 'Bearer ' + process.env.WORKER_TOKEN && process.env.WORKER_TOKEN) { loop(); s.writeHead(202); return s.end('ok'); }
  s.writeHead(q.url === '/health' ? 200 : 404); s.end(q.url === '/health' ? 'ok' : '');
}).listen(process.env.PORT || 8080);
setInterval(() => { rescue(); loop(); }, 60000); loop();
