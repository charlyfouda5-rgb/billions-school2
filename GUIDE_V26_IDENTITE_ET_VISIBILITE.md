# DELTA SCHOOL V26 — ISII et visibilité

Cette version conserve la V25 et ajoute un écran « Identité internationale ».

## Qui voit l’ISII ?
- Super administrateur : tous les élèves présents dans les données auxquelles il a accès.
- Chef d’établissement : uniquement les élèves de son établissement.
- Parent : uniquement ses enfants associés au compte.
- Élève : uniquement son propre identifiant.
- Professeurs, personnel non autorisé et public : aucun accès à l’ISII par défaut.

Les consultations du registre sont ajoutées à un journal local. Pour un audit opposable en production, le journal doit être écrit côté serveur.

## Migration distante
Exécuter `backend/migration_v26_isii_visibility.sql` après sauvegarde de la base. Vérifier que les tables `profiles` et `parent_children` correspondent au schéma réellement déployé. La migration crée les tables d’identité et les politiques de lecture, mais une API serveur transactionnelle reste nécessaire pour garantir l’unicité mondiale et l’attribution atomique.

## Limites à traiter avant production
1. Synchroniser l’ensemble des données métier avec la base distante, et non seulement une sauvegarde d’état.
2. Remplacer les données ISII locales par l’API serveur sécurisée.
3. Vérifier les associations parent-enfant et les transferts transfrontaliers.
4. Mettre en place consentement/justification, journal serveur, chiffrement, sauvegardes et durées de conservation conformes aux lois de chaque pays.
5. Tester les classements, les archives annuelles et les transferts sur des données de test avant ouverture au public.
