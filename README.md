# BILLIONS SCHOOL V17 — GitHub + PostgreSQL (Neon) + Vercel

Base : V14 (tout est conservé). Nouveautés :

1. **Données en ligne** : toutes les données sont enregistrées dans PostgreSQL (Neon) et retrouvées sur n'importe quel téléphone après connexion (`sync.js`, `api/login.js`, `api/sync.js`).
2. **Numéro de suivi automatique** : à l'inscription d'un élève, le chef saisit le contact du parent ; le numéro est envoyé dans la messagerie du parent et l'enfant est ajouté à « Mes enfants ». Si le parent n'a pas encore de compte, l'envoi se fait dès qu'il en crée un (`features.js`).
3. **Recherche de répétiteurs** (élèves et parents) : champs matière, ville, région, quartier, mode, bouton « Rechercher », résultats affichés.

Déploiement : voir `GUIDE_DEPLOIEMENT_V15.md`. Sécurité et limites connues : section 5 du guide.

## Ajouts V16
4. **Traduction de fichiers volumineux** : envoi par morceaux vers Cloudflare R2 (`api/media.js`, `extras.js`) puis traitement par le worker Cloud Run (`worker/`). Limite réglable (`MAX_UPLOAD_GB`, 50 Go par défaut).
5. **Code de suivi introuvable** : le parent écrit au super administrateur depuis « Mes enfants » ; le super voit la demande dans l'onglet « Codes de suivi », vérifie l'élève et envoie le code (l'enfant est lié au compte du parent).
6. **Historique GPS** (super administrateur) : filtres utilisateur / profil / établissement / période, carte des positions filtrées avec trajet, export CSV.

Mise en place : `GUIDE_V16_TRADUCTION_ET_GPS.md`.

## Ajouts V17
7. **Bibliothèque** : le super administrateur envoie livres, vidéos, documents et autres fichiers (gros fichiers inclus) aux utilisateurs de son choix (par profil, établissement, recherche ou un par un). Les destinataires les retrouvent dans l'onglet « Bibliothèque », regardent les vidéos directement ou les téléchargent ; le super voit qui a ouvert quoi. Mise en place : `GUIDE_V17_BIBLIOTHEQUE.md`.
