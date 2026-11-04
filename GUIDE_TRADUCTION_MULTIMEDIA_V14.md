# BILLIONS SCHOOL V14 — traduction multimédia et gros fichiers

## Ce qui est ajouté dans cette archive

- Migration Neon `backend/neon/migration_v14_multimedia.sql` : file des traductions, segments de traitement, préférences linguistiques et suivi de consommation.
- `api/translations/text.js` : endpoint serveur Google Cloud Translation, protégé par `TRANSLATION_API_TOKEN`.
- `api/translation-health.js` : diagnostic de présence des paramètres Neon, R2, Google et worker.
- `.env.example` : inventaire des variables nécessaires.
- `worker/README.md` : architecture requise pour les documents, OCR, voix et vidéos de longue durée.

## Limite importante et transparence

Cette version ajoute les fondations serveur et la structure de données. Elle ne réalise PAS encore automatiquement le téléversement R2, la création de jobs depuis les écrans de l'application, le traitement OCR/audio/vidéo, le doublage, ni le téléchargement des rendus. Le système d'inscription/connexion existant de l'interface V13 utilise encore une partie du stockage navigateur. Il faut le migrer et relier les identités à une authentification serveur avant d'exposer les opérations de médias aux utilisateurs.

Aucune taille « illimitée » ne peut être garantie : les limites effectives dépendent du plan R2, du réseau, des formats, des quotas Google, de la durée maximale du worker et du budget. Le pipeline doit utiliser des téléversements multipart, des traitements en streaming/segments, reprise sur erreur, quotas et suivi des coûts. Ne pas envoyer un fichier de plusieurs Go dans le corps d'une fonction Vercel.

## Étapes de configuration

1. Créer un bucket privé Cloudflare R2. Garder ses clés secrètes uniquement dans Vercel/Cloud Run.
2. Activer les API Google Cloud nécessaires (Cloud Translation, Speech-to-Text, Text-to-Speech et, selon les formats, Document AI/OCR). Configurer la facturation et des quotas/alertes.
3. Dans Neon SQL Editor, exécuter `backend/neon/migration_v14_multimedia.sql` après le schéma et les migrations V13.
4. Dans Vercel > projet `billions-school2` > Settings > Environment Variables, ajouter les variables de `.env.example`. Ne jamais mettre les secrets dans `config.js`, `index.html`, GitHub ou une capture d'écran.
5. Redéployer Vercel. Vérifier `GET /api/health` pour Neon et `GET /api/translation-health` pour la présence des configurations.
6. Déployer le worker séparément sur Cloud Run et le relier à une file/ordonnanceur. Le guide technique est dans `worker/README.md`.
7. Avant mise en production, relier le frontend à une authentification serveur robuste, aux API de création/consultation des jobs et aux URL de téléversement signées. Vérifier les droits par établissement et par rôle.

## Test du endpoint texte

`POST /api/translations/text` attend un JSON `{ "text":"Hello", "target":"fr" }` et un en-tête `Authorization: Bearer <TRANSLATION_API_TOKEN>`. Cette route est destinée à un appel serveur authentifié. Ne placez jamais le jeton dans le navigateur. Pour un appel direct depuis l'application, il faut d'abord implémenter les sessions utilisateurs et l'autorisation par rôle.

## Formats cibles

- Texte : Google Cloud Translation.
- Voix : Speech-to-Text → traduction segmentée → Text-to-Speech optionnel.
- Vidéo : extraction audio/segments → transcription → traduction → sous-titres VTT/SRT et doublage optionnel.
- PDF/Office : extraction de texte, OCR pour scans, traduction par segments, reconstruction et contrôle qualité.
- Images : OCR puis traduction en couche de texte ou image reconstruite.

La traduction d'un média ne garantit pas une reproduction parfaite de la mise en page, de la synchronisation, du ton de voix ou des schémas. Un contrôle humain est recommandé pour les documents officiels et pédagogiques sensibles.
