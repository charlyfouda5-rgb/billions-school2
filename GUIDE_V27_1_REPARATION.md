# DELTA SCHOOL V27.1 — Réparation de l'archive V27

Tout le contenu de la V27 est conservé. Seuls ont changé : `index.html` (une ligne ajoutée : `<script src="repair.js">`), `sw.js` (cache v27 + `student-identity.js` et `repair.js`) et le nouveau fichier `repair.js`.

## Pourquoi
L'archive V27 plantait au chargement : le code appelait des définitions de base absentes (PT, AVD, VIEWS, vMsg0, phOf, av, load, tabsOfV8, CLOUD…).

## Rétabli dans repair.js
Chargement, périodes, abonnements, messagerie (Reçus / Envoyés / Nouveau message), historique global, photos de profil (`phOf`, `av`, page Mon profil avec envoi de photo), conversations avec les répétiteurs, onglets, Mes enfants.

## Photos dans la messagerie (V27) — vérifié
- Message reçu ou envoyé : photo de l'interlocuteur.
- Vue globale administration : les deux profils.
- Conversation répétiteur : photo dans l'en-tête seulement après le premier message ; conversation vide : pas de photo.

## Limites connues (absents de l'archive reçue)
- Écrans non restaurés (message explicite à l'écran) : Configuration, Élèves, Postes, Situations, Finances, Discipline, Professeurs, Ma classe, Demandes.
- Traduction : les messages partent sans traduction ; langues limitées à 7.
- Cartes / GPS, convertisseur de devises, écran de suivi : non restaurés.
- Les fonctions de repair.js sont des reconstitutions : comparer avec une version complète (V25/V26) dès que possible.
