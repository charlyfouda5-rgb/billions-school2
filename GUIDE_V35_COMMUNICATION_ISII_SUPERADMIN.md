# DELTA SCHOOL V35 — Communication de l'ISII exclusivement par le superadministrateur

## Règle de confidentialité
- Le registre central des ISII est consultable uniquement par le superadministrateur.
- Le chef d'établissement ne dispose pas d'un outil de recherche dans ce registre et ne peut pas découvrir l'ISII d'un élève par lui-même.
- Le chef envoie une demande au superadministrateur en précisant l'identité de l'élève, éventuellement sa date de naissance, son ancien établissement et le motif (admission, transfert, vérification).
- Le superadministrateur vérifie l'identité dans le registre central et communique l'ISII au chef demandeur par la messagerie DELTA SCHOOL.
- Le chef reçoit le message, copie l'ISII dans son espace « Recherche ISII » et lance la recherche du dossier.
- Le serveur vérifie que cet ISII a bien été communiqué à ce chef pour cette demande avant de retourner les informations autorisées.

## Accès au dossier
La communication de l'ISII n'accorde pas automatiquement un accès illimité. Le superadministrateur doit accorder une autorisation de consultation du dossier, limitée au motif et à la durée nécessaires. Les consultations sont journalisées.

## Migration
Exécuter `backend/neon/migration_v35_isii_communication_superadmin.sql` après les migrations V34 et précédentes.

## Limite de cette livraison
L'interface de demande et d'envoi par la messagerie locale est ajoutée au module V34. Le contrôle de confidentialité absolu exige de raccorder les actions au serveur Neon : l'API doit empêcher les chefs d'interroger le registre, valider la communication destinée au compte exact du demandeur, appliquer les droits de dossier et journaliser chaque opération. Tant que ces endpoints ne sont pas déployés, cette version est une préparation fonctionnelle et non une garantie de sécurité en production.
