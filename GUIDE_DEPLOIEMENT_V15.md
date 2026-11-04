# Déploiement V15 — GitHub + Neon PostgreSQL + Vercel (uniquement)

## 1. Base de données (Neon)
1. Projet Neon `billions-school` → **SQL Editor**.
2. Exécuter dans cet ordre : `backend/neon/schema.sql`, puis `backend/neon/migration_v14_multimedia.sql`, puis `backend/neon/migration_v15_sync.sql`.
3. Copier la chaîne de connexion (Dashboard → Connect).

## 2. GitHub
Déposer le **contenu** du dossier `billions-school` à la racine du dépôt (index.html, api/, sync.js, features.js, vercel.json…). Ne jamais déposer de fichier `.env`.

## 3. Vercel
Importer le dépôt, puis **Settings → Environment Variables** (Production + Preview) :
| Nom | Valeur |
|---|---|
| `DATABASE_URL` | chaîne Neon |
| `SESSION_SECRET` | 32+ caractères aléatoires |
| `SUPER_ADMIN_EMAIL` | e-mail du super administrateur |
| `SUPER_ADMIN_PASSWORD` | mot de passe (8 caractères min.) |
Puis **Redeploy**.

## 4. Vérifier
- `https://VOTRE-SITE.vercel.app/api/health` → `ok:true`, `sync_tables:true`, `session_secret:true`, `super_admin_env:true`.
- Se connecter avec l'e-mail/mot de passe du super administrateur : la base est initialisée **vide** (aucun compte de démo). Changer ensuite le mot de passe depuis « Paramètres ».
- Se connecter depuis un second téléphone : mêmes données.

## 5. Sécurité et limites à connaître
- Les mots de passe sont hachés côté serveur (scrypt) et ne reviennent jamais au navigateur ; connexion vérifiée par le serveur, 8 échecs = blocage 15 min.
- **Toute personne connectée reçoit l'état partagé de la plateforme** (pas encore filtré par rôle) : un utilisateur technique pourrait lire les données d'autres établissements via les outils du navigateur. Le serveur bloque déjà l'élévation de privilèges (super administrateur) et les écritures sensibles des élèves/parents/répétiteurs, mais le filtrage des lectures par rôle et établissement reste l'étape suivante avant d'y mettre des données réelles à grande échelle.
- Conception « état partagé » adaptée à un lancement pilote (quelques centaines d'utilisateurs). Au-delà, les photos et messages doivent passer dans des tables dédiées.
- Les numéros de suivi sont livrés dans la messagerie de la plateforme ; aucun SMS réel n'est envoyé (nécessite un fournisseur SMS).
- Hors connexion, les modifications sont renvoyées au retour du réseau tant que l'application reste ouverte.
- Les API n'ont pas été testées sur une vraie base Neon dans cet environnement (logique testée avec une base simulée).
