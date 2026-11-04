const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok:false, error:'Méthode non autorisée' }); }
  // Endpoint serveur protégé. Ne jamais exposer ce jeton dans le navigateur.
  const expected = process.env.TRANSLATION_API_TOKEN;
  const supplied = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || !supplied || supplied.length !== expected.length || !require('crypto').timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return res.status(401).json({ ok:false, error:'Authentification serveur requise.' });
  }
  if (!process.env.GOOGLE_TRANSLATE_API_KEY) return res.status(503).json({ ok:false, error:'GOOGLE_TRANSLATE_API_KEY absente.' });
  const { text, target, source } = req.body || {};
  if (typeof text !== 'string' || !text.trim() || !target || text.length > 30000) return res.status(400).json({ ok:false, error:'Texte requis (30 000 caractères maximum par appel) et langue cible requis.' });
  try {
    const payload = { q: text, target, format: 'text' };
    if (source) payload.source = source;
    const response = await fetch('https://translation.googleapis.com/language/translate/v2?key=' + encodeURIComponent(process.env.GOOGLE_TRANSLATE_API_KEY), {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ ok:false, error:'Le service Google Translation a refusé la demande.', provider_status:response.status });
    const translated = data.data && data.data.translations && data.data.translations[0];
    if (!translated) return res.status(502).json({ ok:false, error:'Réponse de traduction vide.' });
    return res.status(200).json({ ok:true, translatedText:translated.translatedText, detectedSourceLanguage:translated.detectedSourceLanguage || null });
  } catch (e) { console.error('translation error', e); return res.status(502).json({ ok:false, error:'Service de traduction momentanément indisponible.' }); }
};
