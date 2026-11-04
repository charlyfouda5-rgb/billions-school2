# DELTA SCHOOL V32 — Identifiants mondiaux, historiques et classements

## Conservation
La V32 part de la V31 sans retirer ses fichiers ni ses modules. Elle conserve les versions antérieures, la progression scolaire, les ISII, les dossiers, la messagerie, les notifications et les modules de classement existants.

## Règles ajoutées
- Les numéros de suivi sont uniques à l'échelle de toute DELTA SCHOOL, tous pays et établissements confondus. La migration fournit `ds_next_global_tracking()` qui réserve atomiquement un numéro via Neon. Toute création en production doit appeler cette fonction côté serveur puis insérer le résultat dans `ds_tracking_registry` ; une génération navigateur ne garantit pas l'unicité mondiale.
- Le matricule reste le même lors d'un changement d'établissement au sein du même cycle. Il ne change qu'au passage maternelle → primaire → secondaire → université. Les matricules précédents restent dans `ds_student_cycle_matricules` et dans l'historique du dossier.
- Une situation annuelle peut être archivée puis consultée par le chef de l'établissement concerné, le chef de l'établissement destinataire d'un transfert autorisé et le superadministrateur. Chaque consultation est journalisée.
- Le chef destinataire peut consulter les anciens matricules et numéros de suivi nécessaires à l'accueil de l'élève, seulement après autorisation explicite liée au transfert. Le superadministrateur a une vue globale.
- Classement des établissements : d'abord un classement général tous cycles confondus, ensuite quatre classements distincts (maternelle, primaire, secondaire, université). Les scores doivent être calculés avec une méthodologie documentée et comparable.

## Installation
Exécuter `backend/neon/migration_v32_suivi_historique_classement.sql` dans Neon après V30 et V31.

## À finaliser avant production
La migration SQL crée les registres, index, fonction atomique et journaux. Le nouveau module ajoute l'écran de consultation côté interface. Il faut encore raccorder les opérations sensibles à une API Neon qui authentifie le rôle, vérifie `ds_student_school_access`, crée les snapshots annuels, attribue les matricules et numéros de suivi dans une transaction, et protège les données par des contrôles serveur. Le numéro produit localement par l'interface n'est qu'un identifiant provisoire tant que cet appel API n'est pas branché.
