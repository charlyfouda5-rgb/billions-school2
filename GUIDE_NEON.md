# BILLIONS SCHOOL V13 — préparation Neon PostgreSQL + Vercel

Cette édition conserve l'interface et les fonctionnalités de la V11, remplace la configuration Supabase du projet par une configuration Neon et ajoute un contrôle réel de disponibilité PostgreSQL via `/api/health`.

## 1. Créer la base Neon

1. Créez un projet sur https://neon.tech/ nommé `billions-school`.
2. Ouvrez **SQL Editor** et exécutez intégralement `backend/neon/schema.sql`.
3. Dans **Dashboard / Connect**, copiez la chaîne de connexion PostgreSQL (connection string). Elle contient un identifiant et un mot de passe : gardez-la secrète.

## 2. Déployer sur Vercel

1. Importez le contenu du dossier `billions-school` à la racine du dépôt GitHub relié au projet Vercel `billions-school2`.
2. Dans Vercel → Project → Settings → Environment Variables, ajoutez :
   - **Name** : `DATABASE_URL`
   - **Value** : la chaîne de connexion Neon complète (copiée depuis Neon).
   - Environnements : Production, Preview et Development selon vos besoins.
3. Enregistrez puis lancez **Redeploy**.
4. Ouvrez `https://VOTRE-DOMAINE.vercel.app/api/health`.
   - Réponse `200` avec `{"ok":true,"provider":"neon-postgresql",...}` : Vercel joint Neon.
   - Réponse `503` : vérifiez `DATABASE_URL`, le mot de passe, le projet Neon et le redéploiement.

## 3. Sécurité impérative

- `DATABASE_URL` doit rester dans les variables d'environnement Vercel. Ne la collez jamais dans `config.js`, `index.html`, GitHub ou un message public.
- Ne créez pas de route API qui renvoie la chaîne de connexion.
- Ne stockez jamais les mots de passe en clair. Le schéma prévoit `password_hash`.
- Le premier compte super administrateur doit être créé par une procédure serveur sécurisée. Ne créez pas un compte super-admin en modifiant directement le navigateur.

## 4. État fonctionnel et limite à connaître avant utilisation réelle

La V13 contient :
- le connecteur serveur Neon (`@neondatabase/serverless`) ;
- la route `/api/health` qui exécute une vraie requête `SELECT` sur Neon ;
- le schéma PostgreSQL de départ : comptes, demandes d'inscription, sessions, état applicatif et journal d'audit ;
- la configuration publique sans clé ni mot de passe de base de données.

**Important : le contrôle vert confirme seulement que l'API Vercel peut joindre Neon.** Les écrans métier de cette version conservent encore leur stockage navigateur `localStorage` et l'ancien parcours de connexion local. Le schéma Neon n'effectue pas à lui seul la migration des comptes, des demandes déjà validées, des notes ou des messages. Il ne faut donc pas encore considérer la connexion multi-appareils et la validation des comptes comme réparées. La prochaine étape de développement consiste à brancher les formulaires d'inscription, la validation du super administrateur, la connexion et chaque module métier aux API sécurisées Neon, puis à migrer les données locales après sauvegarde.

## 5. Traduction

La traduction des textes utilise les services externes déjà présents dans l'application. Elle nécessite Internet et peut être limitée par le fournisseur. Le fait d'utiliser Neon ne rend pas automatiquement la traduction des PDF, Word, audio ou vidéos disponible ; ces traitements demandent des API spécialisées et un stockage de fichiers.

## 6. Vérifications après déploiement

- Tester `/api/health` et obtenir `ok: true`.
- Ne jamais tester avec des mots de passe réels tant que l'authentification serveur n'est pas branchée.
- Garder une copie de l'ancienne version et exporter les données locales avant toute migration.
