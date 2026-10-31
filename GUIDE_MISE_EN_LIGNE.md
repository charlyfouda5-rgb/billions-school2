# Mettre DELTA SCHOOL en ligne : Supabase + GitHub + Vercel

Ordre conseillé : **1. Supabase** (le serveur) → **2. config.js** → **3. GitHub** (le dépôt) → **4. Vercel** (le site public) → **5. Tests**.
Durée : environ 45 minutes la première fois. Un ordinateur est fortement conseillé (envoi de dossiers sur GitHub).

## 0. Préparer les fichiers
1. Dézippez `billions-school-v11.zip`. Vous obtenez un dossier `billions-school`.
2. **Le contenu de ce dossier** doit se retrouver à la racine du dépôt : `index.html`, `config.js`, `manifest.webmanifest`, `sw.js`, `vercel.json`, et les dossiers `assets/` et `backend/`. `index.html` ne doit pas être dans un sous-dossier.

## 1. Supabase (serveur de données)
1. Allez sur **supabase.com** → « Start your project » → connectez-vous (e-mail ou GitHub).
2. **New project** : nom `billions-school`, mot de passe de base de données (générez-le et notez-le), région la plus proche de vos utilisateurs → **Create new project**. Attendez 1 à 2 minutes.
3. Menu **SQL Editor** → **New query** → collez tout le contenu de `backend/migration_v11_serveur.sql` → **Run**. Résultat attendu : « Success. No rows returned ».
4. Menu **Authentication → Users → Add user → Create new user** : e-mail + mot de passe du super administrateur du serveur, cochez **Auto Confirm User** → Create.
5. Retour dans **SQL Editor** → New query, collez (en remplaçant l'e-mail) puis Run :
   `insert into super_admins(user_id) select id from auth.users where email = 'VOTRE_EMAIL' on conflict do nothing;`
6. **Project Settings → API Keys** : copiez la **clé publique « Publishable » (`sb_publishable_…`)**. Si on vous propose « Create new API Keys », créez-les. L'adresse du projet (« Project URL », forme `https://xxxx.supabase.co`) se trouve dans le bouton **Connect** en haut du projet ou dans Project Settings.
   ⚠️ Ne copiez **jamais** la clé « secret » (`sb_secret_…`) ni « service_role » : elles donnent un accès total.
7. Recommandé : **Authentication**, réglages de connexion : désactivez « Allow new users to sign up » (si l'option existe) pour que personne ne puisse créer de compte.

## 2. Remplir config.js
Ouvrez `config.js` et collez vos deux valeurs entre les guillemets :
```js
window.DS_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_..."
};
```
(Vous pouvez aussi le faire plus tard, directement sur GitHub : ouvrir `config.js` → crayon ✏️ → Commit.)

## 3. GitHub
1. **github.com** → Sign up → confirmez votre e-mail.
2. Bouton **+** (en haut à droite) → **New repository** : nom `delta-school`, **Private** (conseillé), ne cochez rien d'autre → **Create repository**.
3. Sur la page vide, cliquez **uploading an existing file**. Sur ordinateur, glissez **tout le contenu** du dossier `billions-school` (fichiers ET dossiers `assets` et `backend`). Attendez la fin du chargement, puis **Commit changes**.
4. Vérifiez que `index.html` apparaît dans la liste, à la racine du dépôt.
   *Depuis un téléphone* (Chrome → menu ⋮ → « Version pour ordinateur ») : envoyez d'abord les fichiers de la racine. Pour un dossier : **Add file → Create new file**, tapez `assets/.keep` dans le nom, Commit ; ouvrez le dossier `assets` → **Add file → Upload files** → choisissez les images. Même chose pour `backend`.

## 4. Vercel (site public)
1. **vercel.com** → Sign Up → **Continue with GitHub** (plan Hobby).
2. **Add New… → Project → Import Git Repository** → autorisez GitHub à partager `delta-school` → **Import**.
3. Réglages : **Framework Preset : Other**, Root Directory `./`, build command et output directory **vides** → **Deploy**.
4. Après environ 30 secondes : « Congratulations ». Cliquez sur l'aperçu : votre lien `https://….vercel.app` est en ligne dans le monde entier.
5. Pour modifier un fichier plus tard : modifiez-le sur GitHub (✏️ → Commit) : Vercel republie tout seul en moins d'une minute.
6. Nom de domaine personnel (facultatif, environ 10 à 15 $ par an) : Vercel → Settings → Domains.

## 5. Tester
1. Sur un téléphone, ouvrez votre lien, installez l'application (bouton « 📲 Installer »), connectez-vous en **élève** et acceptez la localisation.
2. Sur un **autre appareil**, connectez-vous en **super administrateur** (`super@billions.school` / `admin123` en démonstration) → onglet **📍 Connexions** → « Connexion au serveur » avec l'e-mail de l'étape 1.4.
3. Le tableau de bord montre « En ligne maintenant » et « Dernières positions enregistrées ». Voyants du haut : **Serveur** vert ; **Sauvegarde** verte chez le super administrateur une fois connecté au serveur.

## Dépannage
- **Page 404 / blanche sur Vercel** : `index.html` n'est pas à la racine du dépôt. Déplacez les fichiers.
- **« Invalid JWT » ou erreur 401** : mauvaise clé dans `config.js`. Utilisez la clé *publishable* (ou l'ancienne clé *anon*), pas la clé secrète.
- **Connexion au serveur refusée** : e-mail/mot de passe incorrects, ou l'étape 1.5 n'a pas été exécutée.
- **Localisation refusée** : cadenas à côté de l'adresse → Autorisations → Position → Autoriser. L'adresse doit être en `https`.
- **L'ancienne version s'affiche après une mise à jour** : fermez et rouvrez l'application, ou videz les données du site.
- **Voyant Serveur rouge** : pas d'internet, ou le site est hors service.
- **Projet Supabase gratuit en pause** : les projets gratuits peuvent être mis en pause après une période d'inactivité ; ouvrez le tableau de bord Supabase et restaurez-le (à vérifier dans leur offre actuelle).

## Limites à connaître
- Seuls les **connexions, positions GPS et copies de sauvegarde** sont centralisés. Notes, élèves, paiements, catalogue et comptes restent dans le navigateur de chaque appareil.
- Les comptes de démonstration ne sont pas sécurisés : à remplacer par de vrais comptes avant un usage réel.
- Les abonnements sont simulés (pas de vrai paiement).
- Le plan gratuit Vercel (Hobby) est réservé à un usage personnel non commercial : si vous encaissez des abonnements, vérifiez les conditions et prévoyez un plan adapté.
- Position GPS = donnée personnelle sensible : informez les utilisateurs (et les parents des mineurs), supprimez les anciennes positions : `delete from app_connexions where login_at < now() - interval '12 months';`
