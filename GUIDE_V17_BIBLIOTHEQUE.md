# V17 — Bibliothèque (livres, vidéos, documents)

## Mise en place
1. Neon SQL Editor : exécuter `backend/neon/migration_v17_library.sql` (après la v16).
2. Cloudflare R2 : mêmes bucket, clés et règle CORS que pour la traduction (voir `GUIDE_V16_TRADUCTION_ET_GPS.md` §B.2). Pour lire une vidéo directement dans le navigateur, la règle CORS peut rester telle quelle (ouverture par lien signé).
3. Vercel : variables `R2_*` et `MAX_UPLOAD_GB` déjà définies en V16. Redéployer. **Le worker Cloud Run n'est pas nécessaire** pour la bibliothèque.

## Utilisation
- Super administrateur → onglet **📤 Envoyer des contenus** : titre, type (livre / vidéo / document / autre), fichier, message ; puis destinataires (boutons « Tous les élèves / parents / professeurs… », filtres profil et établissement, recherche, cases à cocher) ; « Envoyer ». La liste « Mes envois » indique le nombre de destinataires et d'ouvertures (👥 = détail par personne, 🗑️ = suppression pour tous).
- Les autres profils → onglet **📚 Bibliothèque** : pastille rouge pour les nouveautés, « Regarder / Ouvrir » ou « Télécharger ».

## Sécurité
Seul le super administrateur peut envoyer ou supprimer. Le fichier n'est lisible que par ses destinataires (vérifié par le serveur à chaque ouverture, lien temporaire d'1 heure), même si quelqu'un modifie sa liste dans son navigateur. Le bucket R2 doit rester privé. La liste des destinataires et les titres, eux, font partie de l'état partagé (voir limite de lecture dans `GUIDE_DEPLOIEMENT_V15.md` §5).

## Limites
Taille maximale par fichier : `MAX_UPLOAD_GB` (50 Go par défaut). Pas de traduction automatique des contenus reçus : le destinataire télécharge puis utilise « Langues → Traduire un fichier ». Les envois et la lecture ont été testés avec un stockage simulé, pas sur un vrai bucket R2.
