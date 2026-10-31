module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'GET') return res.status(405).json({ok:false,error:'Méthode non autorisée'});
  const checks = {
    neon: !!process.env.DATABASE_URL,
    r2: !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET),
    googleTranslation: !!process.env.GOOGLE_TRANSLATE_API_KEY,
    googleServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    worker: !!process.env.TRANSLATION_WORKER_URL
  };
  return res.status(200).json({ok:true, service:'BILLIONS SCHOOL multimedia translation', checks, note:'Configuration détectée uniquement ; ce contrôle ne lance pas un traitement réel.'});
};
