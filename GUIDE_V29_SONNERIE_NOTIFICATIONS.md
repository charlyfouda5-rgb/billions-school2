DELTA SCHOOL V29 — SONNERIE DES NOTIFICATIONS

Cette version reprend l’archive V28 sans retirer ses fichiers et ajoute :
- une sonnerie à deux tons lors de la détection d’un nouveau message reçu non lu ;
- activation/désactivation par compte et par appareil ;
- bouton de test de la sonnerie dans la messagerie ;
- notification visuelle du navigateur si l’autorisation est accordée et si l’onglet est masqué.

IMPORTANT — limites techniques : la sonnerie fonctionne lorsque l’application est ouverte dans un onglet ou en application installée active. Le navigateur peut exiger une première interaction de l’utilisateur pour autoriser l’audio. La notification système dépend de l’autorisation du navigateur. Cette version ne met pas en place de push serveur garantissant les alertes lorsque l’application est fermée ou le téléphone verrouillé ; cela nécessiterait un service push, un worker serveur et des abonnements push. La détection des nouveaux messages dépend également de la synchronisation de messages déjà disponible dans l’application.

Déploiement : remplacer les fichiers du projet par le contenu de cette archive puis redéployer. Aucun changement SQL n’est requis pour la sonnerie locale.
