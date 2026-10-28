/* Configuration du serveur (Supabase).
   Laissez vide pour utiliser l'application seulement en local (sans serveur).
   Collez ici l'adresse du projet et la clé PUBLIQUE ("publishable", qui commence par sb_publishable_, ou l'ancienne clé "anon").
   NE JAMAIS coller la clé "service_role" ou "secret" : elle donnerait un accès total à la base. */
window.DS_CONFIG = {
  SUPABASE_URL: "https://fxbyemkphcqgkrgtlazm.supabase.co",       // exemple : "https://abcdefgh.supabase.co"
  SUPABASE_ANON_KEY: "sb_publishable_VOTRE_CLE"   // exemple : "eyJhbGciOi..." ou "sb_publishable_..."
};
