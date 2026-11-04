# V16 — Traduction de gros fichiers, codes de suivi, historique GPS

## A. Codes de suivi et GPS (aucune configuration en plus)
Fonctionnent dès que la V15 est déployée (GitHub → Vercel → Neon). Rien à exécuter.

## B. Traduction de fichiers volumineux
### Comment ça marche
Le navigateur découpe le fichier en morceaux de 64 Mo (plus gros si le fichier dépasse ~560 Go) et les envoie **directement à Cloudflare R2** avec des liens signés : rien ne passe par Vercel. Chaque morceau est réessayé jusqu'à 5 fois ; l'envoi peut être annulé. Quand tout est reçu, un worker (Google Cloud Run) traduit le fichier et dépose le résultat, que l'utilisateur télécharge depuis « Langues → Mes traductions ».

### Limites honnêtes
Aucune taille n'est vraiment « illimitée ». Limite appliquée ici : `MAX_UPLOAD_GB` (50 Go par défaut, modifiable ; R2 accepte jusqu'à 5 To par objet). Les vraies limites sont le disque et la durée de l'instance Cloud Run, les quotas et le coût Google (la transcription audio/vidéo est facturée à la minute). Une vidéo de plusieurs Go se traite, mais lentement et à un coût réel : fixez des quotas et alertes de budget dans Google Cloud.
Formats : TXT/MD/CSV, SRT/VTT, DOCX, PPTX, XLSX, PDF contenant du texte, audio et vidéo (sous-titres SRT, copie vidéo sous-titrée en option). **Non inclus** : PDF scannés et images (OCR), doublage vocal. La mise en page des Word/PowerPoint est conservée ; celle des PDF ne l'est pas (sortie texte).

### 1. Migrations Neon
Exécuter `backend/neon/migration_v16_media.sql` (après la v14 et la v15).

### 2. Cloudflare R2
Créer un bucket **privé**, puis une clé API (lecture/écriture sur ce bucket). Dans le bucket → Settings → **CORS policy** :
```json
[{"AllowedOrigins":["https://VOTRE-SITE.vercel.app"],"AllowedMethods":["PUT","GET"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3600}]
```
(Sans `ExposeHeaders: ETag`, l'envoi échoue.) Ajouter une règle de cycle de vie pour supprimer `uploads/` après quelques jours et abandonner les envois incomplets.

### 3. Google Cloud
Activer Cloud Translation, Speech-to-Text et Cloud Storage ; créer un bucket temporaire (`GCS_BUCKET`) ; compte de service du worker avec les rôles : Cloud Translation API User, Cloud Speech Client, Storage Object Admin (sur ce bucket).

### 4. Worker Cloud Run
```
cd worker
gcloud run deploy billions-worker --source . --region europe-west1 --memory 4Gi --cpu 2 --timeout 3600 --allow-unauthenticated --no-cpu-throttling --min-instances 1 \
  --set-env-vars DATABASE_URL=...,R2_ACCOUNT_ID=...,R2_ACCESS_KEY_ID=...,R2_SECRET_ACCESS_KEY=...,R2_BUCKET=...,GCS_BUCKET=...,WORKER_TOKEN=...
```
Mettre « CPU toujours alloué » et au moins 1 instance minimale pour que la boucle interne relève la file (ou ajouter un Cloud Scheduler qui appelle `POST /run` chaque minute avec `Authorization: Bearer WORKER_TOKEN`). Pour de très gros fichiers, utiliser une instance avec disque suffisant (au moins 2 fois la taille du plus gros fichier).

### 5. Vercel
Ajouter `R2_*`, `MAX_UPLOAD_GB`, `WORKER_URL` (adresse Cloud Run), `WORKER_TOKEN`, puis Redeploy. Vérifier `/api/health` : `r2_configured:true`.

### Statut de test
L'API (`api/media.js`) et l'interface ont été testées avec un stockage simulé (16 + 34 vérifications). **Le worker n'a pas pu être exécuté ici** (pas d'accès aux services Google/R2) : faites d'abord un essai avec un petit fichier .txt, puis .docx, puis un court audio avant les gros fichiers.

## C. Sécurité
Le filtrage des lectures par rôle/établissement reste à faire (voir GUIDE_DEPLOIEMENT_V15.md §5). Le super administrateur voit les codes de suivi de tous les élèves : c'est voulu pour cette fonction.
