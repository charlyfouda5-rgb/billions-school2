# DELTA SCHOOL V30 — Matricules et numéros de suivi

## Ce que cette version ajoute
- Un espace « Matricules & suivi » pour le superadministrateur et le chef d'établissement.
- Attribution d'un matricule local à un élève, avec contrôle des doublons dans les données chargées sur l'appareil.
- Numéro distinct pour chaque opération/demande : inscription (INS), transfert (TRF), bulletin (BUL), réclamation (REC), certificat (CER), correction (COR), paiement (PAY), etc.
- Suivi des statuts : En attente, Reçue, En cours de traitement, En attente de validation, Validée, Rejetée, Terminée.
- Historique local des créations et changements de statut.

## Règles d'identification
- ISII : identifiant permanent de l'élève à l'échelle internationale.
- Matricule : identifiant administratif de l'élève dans un établissement / une inscription.
- Numéro de suivi : identifiant d'une opération précise. Un même élève peut avoir plusieurs numéros de suivi.
- Un matricule clôturé ou remplacé ne doit jamais être réattribué à un autre élève.

## Format d'exemple
- Matricule : `DS-CM-ECOLE001-2026-000125`.
- Suivi : `DS-INS-2026-000001`, `DS-TRF-2026-000002`, `DS-REC-2026-000003`.
Ces formats sont des exemples; les codes établissement et pays doivent être normalisés avant production.

## Migration Neon
Exécuter `backend/neon/migration_v30_matricules_suivi.sql` dans Neon SQL Editor.

## Limites à connaître avant production
Le module navigateur V30 constitue une interface et une logique locale de préparation. Il ne synchronise pas encore automatiquement chaque création vers Neon. Pour une unicité garantie entre pays et appareils, il faut créer des endpoints API sécurisés qui réservent les numéros avec `identifier_counters` dans une transaction SQL, insèrent dans `student_matricules` / `tracking_records`, contrôlent les rôles côté serveur et écrivent chaque changement dans `tracking_status_history`. Ne pas considérer la migration SQL seule comme un service opérationnel complet.
