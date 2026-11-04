DELTA SCHOOL V33 — SUIVI DES CHANGEMENTS DE CLASSE

Règles fonctionnelles :
- Chaque changement de classe dans le même établissement crée un nouveau numéro de suivi.
- Un redoublement crée également un nouveau numéro de suivi.
- Le matricule ne change pas lors d'un changement de classe ou d'un redoublement dans le même cycle.
- L'ISII reste permanent.
- Un nouveau matricule n'est attribué qu'au passage vers un autre cycle, conformément aux règles V32.
- Les anciens matricules et numéros de suivi ne sont jamais réattribués.
- Le superadministrateur et le chef d'établissement autorisé peuvent consulter l'historique des classes ; l'accès est limité aux dossiers permis.

Installation : exécuter backend/neon/migration_v33_suivi_changements_classe.sql après les migrations V30, V31 et V32.

Limite technique : le fichier JS fournit la logique d'interface et un historique local compatible avec la structure existante. Pour une garantie mondiale multi-appareils, l'API serveur doit appeler la fonction SQL ds_register_class_change dans une transaction et vérifier les autorisations du compte. Ne pas exposer cette fonction directement au navigateur sans authentification/contrôle serveur.
