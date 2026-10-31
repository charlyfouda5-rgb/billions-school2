# Worker multimédia — architecture de production

Les traitements longs (documents scannés, audio, vidéo, gros fichiers) ne doivent pas être exécutés dans une fonction Vercel : les fonctions ont des durées maximales et ne conviennent pas aux médias de plusieurs Go.

Déployer ce worker dans Google Cloud Run (ou un service de traitement équivalent), avec une file de tâches. Le worker doit :

1. prendre un job `queued` dans Neon avec `FOR UPDATE SKIP LOCKED` ;
2. télécharger l'objet source depuis Cloudflare R2 en streaming ;
3. détecter le type et contrôler la taille, le quota, le format et les droits ;
4. pour les documents : extraire le texte (OCR pour les scans), traduire par segments, reconstruire le document ;
5. pour l'audio/vidéo : extraire le son, transcrire avec Speech-to-Text, traduire les segments, produire les sous-titres SRT/VTT et, si demandé, générer une piste audio Text-to-Speech ;
6. découper les médias en segments adaptés, reprendre les segments après échec et assembler le résultat ;
7. stocker le résultat dans R2, mettre à jour `translation_jobs` et enregistrer les coûts ;
8. supprimer les fichiers temporaires et appliquer une durée de conservation configurable.

Le worker de traitement complet n'est pas livré dans ce dossier : il dépend des identifiants Google Cloud, du bucket R2, des quotas et des choix de formats/codec. Ne marquez jamais un job `completed` avant de vérifier que le fichier final est lisible.
