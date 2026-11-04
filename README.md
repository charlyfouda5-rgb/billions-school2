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

## Ajout V18
8. **Comptes de test** (super administrateur, onglet « Comptes de test ») : crée un établissement d’exemple avec un compte par profil (chef, professeur, comptable, élève, parent, répétiteur), mots de passe aléatoires affichés sur l’appareil, suppression en un clic.

## Ajout V19
9. **Bibliothèque par lien** : le super administrateur peut envoyer un lien (YouTube, Google Drive, site) à la place d’un fichier — aucun stockage R2 requis.

## Ajout V20
10. **Google Traduction** : carte « Traduire avec Google Traduction » (documents, textes) dans Langues ; l’envoi de fichiers à traduire n’apparaît que si le stockage R2 est configuré.

## Ajout V21
11. **Performances (super administrateur)** : classements des établissements par quartier/ville/région/pays et par période (séquence, trimestre, semestre, année), progression et archives conservées, meilleurs et plus faibles élèves (matières faibles, notes, enseignants), effectifs des abonnés, alertes aux élèves/parents/établissements, renvois avec demande de motif. Chef : onglet « Renvois & localisation ».

## Ajout V22
12. **Points de priorité des établissements (0–20)** : 60 % moyenne + 25 % réussite + 15 % progression, archivés par période ; section « ⭐ Points » (cumul des années, export CSV).
13. **Recherche des meilleurs établissements** pour parents et élèves : filtres pays/région/ville/quartier, critères (points, moyenne, réussite, progression, proximité), distance depuis leur position, carte et itinéraire. Les établissements enregistrent leur position GPS.
14. **Répétiteurs** : notation 1–5 par les familles, points de priorité (85 % avis + 15 % activité), classement par zone ; les mieux classés sont affichés en priorité (🥇 Prioritaire) ; section « 🧑‍🏫 Répétiteurs » du super administrateur.
15. Correctif : l’ouverture d’une carte n’écrase plus la fonction de journal de l’application.
