# DELTA SCHOOL V22 — points de priorité et recherche géolocalisée

Cette version conserve les fichiers et fonctionnalités de V21 et ajoute `priority.js`.

## Nouveautés
- Note de priorité de 0 à 20 pour chaque établissement et répétiteur.
- Calcul pondéré : résultats/progression 35 %, assiduité 25 %, satisfaction/avis vérifiés 20 %, fiabilité 20 %. Chaque indicateur est saisi/validé par le super administrateur sur 100 ; la somme pondérée est divisée par 5 pour obtenir une note sur 20.
- Tableau super administrateur « Classements & points » : classement des établissements et répétiteurs, saisie des indicateurs, coordonnées géographiques et recalcul.
- Parents et élèves disposent de « Meilleurs établissements » : filtres par ville/quartier, niveau/classe, et recherche facultative autour de leur position. Pour les répétiteurs, filtres par zone et matière.
- La géolocalisation du demandeur est facultative et demandée uniquement s'il coche « Me localiser ». Les coordonnées des établissements/répétiteurs sont renseignées par le super administrateur. Aucun suivi GPS permanent n'est activé.
- Les résultats sont triés par proximité lorsqu'une position est autorisée, puis les points de priorité ; sinon par points de priorité.

## Mise en service
1. Remplacer les fichiers du projet par ceux de cette archive en conservant les variables d'environnement Vercel/Neon déjà configurées.
2. Vérifier que `index.html` charge `priority.js` après les scripts existants.
3. Déployer sur Vercel.
4. Se connecter comme super administrateur, ouvrir « Classements & points », saisir les quatre indicateurs vérifiés et les coordonnées (latitude/longitude) de chaque établissement et répétiteur, puis enregistrer.
5. Les parents et élèves verront les classements dans « Meilleurs établissements ».

## Important
- Les points constituent un indicateur d'aide au classement et à une éventuelle récompense future, pas une récompense automatique.
- Pour éviter les classements artificiels, les indicateurs doivent être basés sur des données vérifiables et actualisés régulièrement. Les profils sans coordonnées restent visibles dans les résultats, mais sans distance.
- Les modifications des objets sont sauvegardées dans l'état de l'application existant (`save()`), sans remplacer la base de données ni toucher aux variables d'environnement.
