const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ok: false, provider: 'neon', error: 'DATABASE_URL absente dans les variables Vercel' });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT now() AS server_time, current_database() AS database_name, to_regclass('app_secrets') IS NOT NULL AS sync_tables`;
    return res.status(200).json({ ok: true, provider: 'neon-postgresql', server_time: rows[0].server_time, database: rows[0].database_name, sync_tables: rows[0].sync_tables, session_secret: !!(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 24), r2_configured: !!(process.env.R2_BUCKET && process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY), worker_url: !!process.env.WORKER_URL, super_admin_env: !!(process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD) });
  } catch (err) {
    console.error('Neon health check failed:', err);
    return res.status(503).json({ ok: false, provider: 'neon', error: 'Connexion PostgreSQL impossible. Vérifiez DATABASE_URL et le réseau Neon.' });
  }
};
