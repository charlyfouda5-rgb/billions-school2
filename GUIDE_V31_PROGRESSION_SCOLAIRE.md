# DELTA SCHOOL V31 — Passage de cycle et progression scolaire

## Ajout
La V31 ajoute l'onglet « Progression scolaire » aux espaces du superadministrateur et du chef d'établissement. Il permet de sélectionner un élève, d'enregistrer son passage de cycle, son nouveau niveau/classe, la date d'effet et de consulter l'historique.

## Règles
- L'ISII est conservé lors de tous les changements de cycle et d'établissement.
- Le matricule local peut être conservé ou renouvelé selon les règles administratives applicables. L'écran demande une confirmation explicite avant de créer un nouveau matricule.
- Les anciens cycles, classes et matricules sont ajoutés à l'historique scolaire.
- Chaque passage crée un numéro de suivi de type `DS-PRG-AAAA-000001`.
- Les cycles proposés sont configurables en saisissant le cycle et le niveau cible : les systèmes éducatifs varient selon les pays.
- Le chef d'établissement ne voit et ne modifie que les élèves de son établissement ; le superadministrateur a une vue globale dans l'interface.

## Exemple
Grande section → SIL (ou CP selon le pays). L'élève conserve son ISII. Son matricule est conservé par défaut ; l'administration peut choisir d'en attribuer un nouveau si le règlement local le prévoit. L'ancien matricule reste dans l'historique.

## Installation Neon
Exécuter `backend/neon/migration_v31_progression_scolaire.sql` dans Neon SQL Editor après les migrations précédentes.

## Limites à traiter avant production
Le module front-end écrit dans l'état applicatif existant. La migration SQL crée les tables serveur, mais le raccordement API transactionnel n'est pas inclus dans cette livraison. Pour garantir l'unicité et la synchronisation entre appareils, brancher la création/lecture des passages à une API Neon avec contrôle des rôles côté serveur. Vérifier aussi les champs ISII et les identifiants de compte réellement utilisés dans le schéma de production.
