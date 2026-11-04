# DELTA SCHOOL V27 – Photos de profil dans la messagerie

Cette évolution conserve la base V26 et ajoute l'affichage des photos de profil des interlocuteurs dans les échanges.

## Comportement
- Dans les messages reçus ou envoyés, l'utilisateur voit la photo de profil de son interlocuteur.
- Dans les vues globales réservées à l'administration, les deux profils associés au message peuvent être affichés.
- Dans les conversations entre élèves/parents et répétiteurs, la photo de l'interlocuteur apparaît dans l'en-tête dès qu'au moins un message a été échangé.
- Les conversations créées mais sans aucun message échangé ne montrent pas la photo de l'autre utilisateur et ne sont pas listées comme conversations actives.
- Si aucun échange n'a lieu, aucune photo d'interlocuteur n'est affichée dans la messagerie. La photo de profil personnelle reste visible dans le profil de son propriétaire.

## Confidentialité
Les photos sont celles du profil déjà enregistré dans DELTA SCHOOL. L'affichage dans la messagerie ne doit pas rendre les photos publiquement consultables. En production, les contrôles d'accès aux médias doivent également être appliqués côté serveur/stockage et non uniquement dans l'interface.

## Déploiement
Remplacer les fichiers du projet par ceux de cette archive puis redéployer. Aucun changement SQL n'est requis pour cette modification d'interface. Tester avec deux comptes disposant chacun d'une photo de profil, puis avec une conversation sans message.
