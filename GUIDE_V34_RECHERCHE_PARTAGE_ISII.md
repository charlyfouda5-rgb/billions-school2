# DELTA SCHOOL V34 — Recherche par ISII et partage contrôlé

## Fonctionnalités ajoutées
- Recherche d'un élève par saisie exacte de son ISII dans les espaces du superadministrateur et du chef d'établissement.
- Affichage des informations disponibles : identité, matricule actuel, établissement, cycle/classe, historiques de matricules, suivis et historique scolaire local.
- Si un chef recherche un élève d'un autre établissement, le dossier n'est pas ouvert automatiquement : il peut demander l'accès au superadministrateur en indiquant le motif (admission, transfert, etc.).
- Le superadministrateur peut approuver ou refuser la demande. L'autorisation est limitée dans le temps si une durée est indiquée.
- Les demandes, autorisations et consultations doivent être journalisées.

## Migration
Exécuter `backend/neon/migration_v34_recherche_partage_isii.sql` après les migrations précédentes.

## Limite de cette livraison
Le module d'interface et le schéma SQL sont ajoutés. Le fichier JavaScript utilise encore l'état local de l'application pour illustrer le parcours. La recherche mondiale réelle, la validation des rôles, l'octroi/révocation des autorisations et la lecture du dossier doivent être raccordés à des endpoints API Neon authentifiés avant toute mise en production. Ne pas exposer les tables à l'accès public ni faire confiance aux rôles envoyés par le navigateur.
