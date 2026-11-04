# DELTA SCHOOL V28 — Photos des interlocuteurs et historique

Cette version conserve la base fusionnée V22 + V27 et ajoute :
- affichage des photos des interlocuteurs pendant une conversation active ;
- bouton de clôture manuelle ;
- clôture logique automatique après 24 h sans message (évaluée lors de l'ouverture/consultation de la messagerie) ;
- photos conservées dans la vue d'historique réservée au superadministrateur ;
- export JSON de l'historique avec profils et photos référencées ;
- suppression de l'historique depuis l'interface du superadministrateur.

## Migration Neon

Exécuter `backend/neon/migration_v28_conversations_photos.sql` dans Neon SQL Editor.

## Limites à connaître avant production

L'interface héritée V22/V27 conserve encore les messages dans l'état applicatif `S.msgs`. Le schéma Neon V28 prépare le stockage serveur durable, mais les nouvelles tables ne sont pas encore raccordées à une API dédiée dans cette archive. La clôture automatique côté navigateur est déclenchée lors de la consultation ; pour une clôture garantie même sans connexion d'utilisateur, planifier `close_inactive_conversations()` côté serveur. Les permissions de l'historique dans l'interface ne remplacent pas les contrôles d'accès serveur. Ne pas considérer la synchronisation multi-appareils ni la confidentialité de production comme validées avant raccordement API, tests d'autorisation et déploiement de la migration.

## Contrôles de recette

1. Envoyer un message entre deux comptes : les deux photos doivent apparaître dans leurs vues actives.
2. Clôturer manuellement : les photos disparaissent des vues ordinaires.
3. Laisser une conversation inactive 24 h puis rouvrir la messagerie : elle passe à l'état clôturé.
4. Se connecter comme superadministrateur : les photos et messages archivés restent visibles.
5. Tester l'export JSON puis la suppression après sauvegarde.
6. Vérifier qu'un compte non-super ne peut pas ouvrir l'historique administratif.
