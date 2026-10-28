# DELTA SCHOOL INTERNATIONAL — version 11 (liaison serveur Supabase, GPS, voyants, logo d’installation)

## Nouveautés de la version 11 : liaison avec le serveur
- `config.js` (adresse et clé publique Supabase) et `backend/migration_v11_serveur.sql` : voir **GUIDE_MISE_EN_LIGNE.md** pour les étapes complètes (Supabase, GitHub, Vercel).
- Chaque connexion (avec position GPS) et chaque déconnexion sont envoyées au serveur ; si l'appareil est hors ligne, elles sont mises en attente puis envoyées au retour du réseau.
- Le super administrateur se connecte au serveur depuis l'onglet 📍 Connexions et voit **les connexions de tous les appareils**, avec cartes OpenStreetMap.
- Copie complète de sauvegarde envoyée automatiquement au serveur toutes les 5 minutes (super administrateur) : le voyant Sauvegarde passe au vert.
- Sans `config.js` rempli, l'application fonctionne comme avant, uniquement en local.
- **Tableau de bord du super administrateur** : bloc « 🟢 En ligne maintenant » (nombre d'utilisateurs connectés par profil : chefs, personnel, répétiteurs, parents, élèves) et tableau « 📍 Dernières positions enregistrées » (une ligne par utilisateur, la plus récente d'abord) avec les boutons **Voir la carte** et **Historique** (ouvre l'onglet Connexions filtré sur cet utilisateur) et « Carte de tous les utilisateurs ». Avec le serveur branché, il couvre tous les appareils et se met à jour automatiquement toutes les 30 secondes. Un utilisateur est « en ligne » s'il a une session ouverte depuis moins de 12 h.
- Message vert « ✔ Connecté au serveur — Sauvegarde enregistrée le … » après chaque copie de sauvegarde manuelle vers le serveur.


## Nouveautés de la version 10 (tout le reste de la version 9 est conservé)

### Position GPS obligatoire avant la connexion
- Chef d'établissement, personnel (professeur, comptable, censeur), répétiteur, parent et élève : après avoir saisi leurs identifiants, le navigateur demande la position. **Sans autorisation, la connexion est refusée** (message d'aide : réglages du navigateur, GPS, https). Le super administrateur n'est pas soumis à cette règle.
- La position (latitude, longitude, précision en mètres) est enregistrée à chaque connexion avec la date et l'heure.
- La localisation du navigateur exige **https** (ou localhost) : sur un site publié sur Vercel, c'est le cas.

### Espace du super administrateur (onglet 📍 Connexions)
- Historique complet : entrée (date, heure, position), sortie (date, heure, type : déconnexion ou fermeture de l'application) et durée.
- Filtres par utilisateur et par profil.
- Bouton « 🗺️ Voir sur la carte » (OpenStreetMap) pour une connexion précise, lien « Ouvrir OpenStreetMap », et **carte de la dernière position de chaque utilisateur** (vert : en ligne, gris : déconnecté). Les cartes demandent internet.

### Heure de déconnexion
- Enregistrée à chaque clic sur Quitter / Déconnexion, et aussi à la fermeture de la page ou de l'application (si le navigateur l'autorise ; une coupure brutale peut laisser « Session ouverte »).

### Logo à l'installation
- La photo envoyée (logo DELTA SCHOOL) sert d'icône d'installation (192, 512, 180, version maskable) et s'affiche dans une bannière « Installer DELTA SCHOOL » sur l'écran d'accueil de l'application. La fenêtre native d'installation du navigateur affiche ce même logo.

### Voyants serveur et sauvegarde (tous les comptes)
- Deux pastilles colorées dans l'en-tête et sur l'écran de connexion ; un clic ouvre le détail.
- **Serveur** : 🟢 vert = connecté (contrôle toutes les 30 s) · 🔴 rouge = hors connexion · 🟠 orange = ouvert depuis un fichier (aucun serveur) ou vérification en cours.
- **Sauvegarde** : 🟠 orange = enregistrée sur cet appareil seulement (la base en ligne n'est pas encore branchée) · 🔴 rouge = échec d'écriture (stockage plein ou bloqué) · 🟢 vert = copiée sur le serveur (s'activera avec le branchement de Supabase).
- Le super administrateur voit en plus le **journal des coupures et des échecs** (avec date et heure) et peut **télécharger une copie de sauvegarde** (JSON).

### Correctif
- Les boutons « Supprimer » du **catalogue** (sections, systèmes d'enseignement, filières) et des **langues** ne faisaient rien à cause d'une erreur de code ; ils fonctionnent maintenant : après confirmation, l'élément disparaît aussitôt et la suppression est conservée.

### Important
- Dans cette version de démonstration, les données restent dans le navigateur de chaque appareil : le super administrateur ne voit que les connexions faites **sur son propre appareil**. Pour voir en direct les positions de tous les utilisateurs, brancher la base en ligne et exécuter `backend/migration_v10_geolocalisation.sql` (position obligatoire imposée côté serveur, coordonnées non modifiables, lecture réservée au super administrateur).
- La position est une donnée personnelle sensible : informer les utilisateurs (et les parents pour les mineurs), fixer une durée de conservation.

## Nouveautés de la version 9 (tout le reste de la version 8 est conservé)

### Logo et raccourci sur le téléphone ou l'ordinateur
- Le nouveau logo DELTA SCHOOL remplace l'ancien partout : écran de connexion, en-tête, favicon, icône d'application (192, 512, 180 et version « maskable » pour Android).
- L'application est une **PWA installable** : une fois installée, l'icône du logo apparaît sur l'écran d'accueil (téléphone) ou sur le bureau / le menu des applications (ordinateur) et un clic ouvre l'application directement, en plein écran, sans barre du navigateur. Si l'application est déjà ouverte, le clic la remet au premier plan.
- **Pour que l'installation soit proposée, le dossier doit être publié en https** (Netlify, Cloudflare Pages, GitHub Pages, Vercel ou votre propre serveur) : les navigateurs refusent d'installer une application ouverte directement depuis un fichier. Une fois publié :
  - Android (Chrome) : menu ⋮ > « Installer l'application » ou « Ajouter à l'écran d'accueil », ou bouton « Installer / créer un raccourci » dans ⚙️ Paramètres.
  - iPhone (Safari) : bouton Partager > « Sur l'écran d'accueil ».
  - Ordinateur (Chrome / Edge) : icône d'installation dans la barre d'adresse.
- Fichiers : `manifest.webmanifest`, `sw.js` (fonctionnement hors ligne de l'interface), `assets/icon-*.png`.

### Écrire au super administrateur
Dans tous les comptes, l'icône 🔱 de l'en-tête ouvre la messagerie avec le super administrateur déjà sélectionné. Le bouton ⚙️ ouvre les paramètres personnels.

### Indicateurs et tableaux d'évaluation par compte (onglet 📈 Évaluation)
- **Super administrateur** : comptes par profil, pays et langue, établissements (statut, effectifs, moyenne, réussite, jours restants), revenu mensuel simulé, connexions des 7 derniers jours.
- **Chef d'établissement** : tableaux par classe, par matière et par professeur (avis des élèves), évolution de la moyenne, élèves en difficulté / excellents, meilleurs élèves et élèves à accompagner.
- **Professeur** : tableau par classe et matière, répartition et dispersion de ses notes, évolution, ressources lues, avis des élèves.
- **Comptable** : évolution mensuelle, taux de dépense, principales dépenses. **Censeur** : incidents par type et par classe, tableau de son secteur.
- **Élève et parent** : tableau d'évaluation par matière (moyenne, moyenne de la classe, écart, rang), évolution, priorités. **Répétiteur** : profil complété, élèves contactés, messages, demandes à domicile.

### Langues et traduction
- Le **super administrateur ajoute ou supprime une langue** (Catalogue). Il tape le nom en français, en anglais, dans la langue elle-même ou son code : le système **reconnaît la langue** (code, nom natif, drapeau) et la met aussitôt à disposition du traducteur et des choix de langue de tous les utilisateurs. Le français ne peut pas être supprimé ; les utilisateurs d'une langue supprimée repassent en français.
- Chaque utilisateur choisit sa langue, son pays et sa devise (⚙️ / Langues, traduction et devises).
- **Messagerie** : option « traduire mon message dans la langue du destinataire » avant l'envoi, et bouton 🌐 sur chaque message reçu pour le lire dans sa langue. **Conversations élève / parent ↔ répétiteur** : même principe, avec la langue de l'interlocuteur affichée.
- **Documents** : « Traduire avant téléchargement » dans Mes ressources : le destinataire choisit la langue ; le titre et la consigne sont traduits, et les fichiers texte (txt, md, csv, html, json, srt, vtt) sont traduits entièrement avec téléchargement du résultat. Les PDF, Word, PowerPoint, audio et vidéo enregistrent une demande, car leur traduction exige le service de traitement du serveur.
- Moteur de traduction : les phrases courantes fonctionnent hors ligne ; le reste passe par le service choisi par le super administrateur (service en ligne MyMemory, votre propre serveur de type LibreTranslate, ou hors ligne uniquement). Avec le service en ligne, les textes quittent la plateforme : à utiliser en connaissance de cause, surtout pour des mineurs.
- L'interface complète existe en français et en anglais ; les autres langues du catalogue servent à la communication et à la traduction.

### Pays, indicatifs, drapeaux et devises
- Liste de 244 pays avec drapeaux et indicatifs téléphoniques (recherche), choix du pays et de l'indicatif à l'inscription, drapeau affiché à côté du nom.
- **Convertisseur de devises** dans tous les comptes ; les montants d'abonnement s'affichent aussi dans la devise de l'utilisateur (ex. « 10 000 FCFA ≈ 15,24 € »). Taux indicatifs ; le super administrateur peut les actualiser en ligne, saisir un taux manuel ou revenir aux taux par défaut. Le montant à payer reste celui fixé en FCFA.

### Rétabli
- Les conversations avec les répétiteurs (texte réel, vocaux, demandes d'appel) sont de nouveau visibles dans l'Historique global du super administrateur, et lui seul.


## Mettre en ligne sur Vercel
1. **Depuis un ordinateur (le plus simple)** : installer Node.js, puis dans le dossier `billions-school` : `npm i -g vercel`, `vercel login`, `vercel --prod`. Vercel donne une adresse https (ex. `https://delta-school.vercel.app`).
2. **Depuis un téléphone ou sans ligne de commande** : créer un dépôt GitHub, y envoyer le contenu du dossier `billions-school` (index.html à la racine), puis sur vercel.com : *Add New > Project > Import* ce dépôt, sans commande de build ; *Deploy*.
3. Ouvrir l'adresse, puis installer le raccourci (menu du navigateur ou ⚙️ Paramètres). Le fichier `vercel.json` règle déjà le service worker, le manifeste et la sécurité de base (caméra et micro autorisés pour les selfies et les vocaux).
- **Important** : mettre l'application en ligne ne partage pas les données entre les appareils : elles restent dans le navigateur de chaque utilisateur tant que la base de données en ligne (`backend/schema.sql`) n'est pas branchée.
- Le plan gratuit « Hobby » de Vercel est réservé à un usage personnel non commercial (à vérifier dans leurs conditions) : pour facturer des écoles, prévoir un plan payant, ou un hébergeur statique équivalent (Cloudflare Pages, Netlify).

## Règles des photos
- Lors de la toute première inscription, le candidat doit obligatoirement prendre un selfie du visage avec la caméra avant. La photo de galerie n’est pas proposée dans ce formulaire d’inscription.
- Le selfie initial est conservé dans l’historique des photos du compte. Si le navigateur prend en charge la détection de visage, le système vérifie qu’un visage est visible ; sinon, le selfie peut être contrôlé par le super administrateur.
- Une fois le compte créé, aucune nouvelle photo n’est imposée à la connexion. Dans « Mon profil », l’utilisateur peut garder sa photo actuelle ou choisir librement de la remplacer par un nouveau selfie ou une photo de sa galerie.
- Chaque changement de photo est ajouté à l’historique avec sa date et son heure.

Ouvrir `index.html` dans un navigateur (aucune installation, fonctionne hors ligne). Les données restent dans le navigateur de l'appareil. Pour le selfie, ouvrir de préférence depuis un téléphone (l'appareil photo avant s'ouvre).

## Comptes de démonstration
| Profil | Identifiant | Mot de passe |
|---|---|---|
| Super administrateur | super@billions.school | admin123 |
| Chef d'établissement | chef@demo.school | chef123 |
| Professeur titulaire | prof@demo.school | prof123 |
| Professeur (Anglais) | prof2@demo.school | prof123 |
| Comptable | compta@demo.school | compta123 |
| Censeur | censeur@demo.school | censeur123 |
| Élève | eleve@demo.school | eleve123 |
| Parent (sans enfant au départ) | parent@demo.school | parent123 |
| Répétiteur (actif) | rep@demo.school | rep123 |
| Répétiteur (abonnement expiré, bloqué) | rep2@demo.school | rep123 |
| Chef d'une école dont l'abonnement est expiré | chef4@demo.school | chef123 |

Une demande d'inscription de démonstration (Marie Essomba) attend déjà dans l'espace du super administrateur.

## Abonnements : blocage automatique et réactivation
- Quand l'abonnement d'un établissement se termine, le système le **bloque automatiquement** : il devient invisible et inaccessible pour les élèves, parents et personnel. Le chef d'établissement peut encore se connecter, mais seulement à l'onglet Abonnement, à la messagerie et à son profil.
- Après avoir constaté le paiement, le **super administrateur réactive** l'établissement (bouton « Réactiver / Renouveler (paiement constaté) »). Il redevient actif et visible partout.
- La **date, le jour, l'heure, le mois et l'année du renouvellement** s'affichent chez le super administrateur et chez le chef, avec les **jours restants** (aussi dans l'en-tête).
- Le super administrateur peut **rappeler** un chef ou un répétiteur par un message quand l'abonnement est fini ou proche de la fin.
- Les dates de démonstration sont calculées à partir du jour d'ouverture : un établissement et un répétiteur de démonstration sont déjà expirés pour montrer le blocage.

## Répétiteurs
- **Créer un compte répétiteur** : carte « Répétiteur » > « Créer un compte ? » : nom, prénom, niveau d'étude, matières (1er choix, 2ème choix ou toutes), lieu de résidence, ville, région, quartier, numéro Orange Money, téléphone et mot de passe, selfie (caméra avant), numéro qui paie, « Payer 300 FCFA » (simulation). La demande arrive chez le super administrateur, qui autorise ou refuse ; messages de refus, félicitations avec abonnement mensuel, bouton vert « Se connecter ».
- **Professeur déjà inscrit** : onglet « Devenir répétiteur » dans son compte, même parcours ; une fois autorisé, il ouvre son « Espace répétiteur » par un onglet, en plus de son compte d'établissement.
- **Abonnement** : mensuel. À l'expiration le profil est bloqué et invisible des élèves jusqu'à réactivation par le super administrateur.
- **Élève** : onglet « Répétiteurs » : recherche par matière, ville, région, quartier et mode de travail ; photo, prix et mode de travail visibles ; seuls les abonnements actifs apparaissent ; numéros masqués. Un élève peut solliciter plusieurs répétiteurs.
- **Conversation intégrée** : messages, messages vocaux et demande d'appel dans la plateforme. Les numéros tapés dans un message sont masqués. Tout est enregistré pour le **super administrateur uniquement** (onglet Historique).
- **Cours à domicile** : l'élève écrit au super administrateur, qui lui répond ; si l'élève est d'accord, le super administrateur autorise l'affichage des coordonnées du répétiteur, que l'élève peut alors contacter hors plateforme.

## Parent : accès par numéro de suivi
Un parent ne voit aucune note tant qu'il n'a pas saisi le **numéro de suivi** de son enfant (onglet « Mes enfants »). Il peut ajouter plusieurs enfants, y compris dans des établissements différents, et les retirer. Après 5 numéros invalides, l'ajout est bloqué 15 minutes. Si l'abonnement d'un établissement est expiré ou si l'établissement est suspendu, les notes et bulletins de ses élèves ne sont plus visibles pour le parent (message d'explication) ; ils réapparaissent dès le renouvellement. Le chef d'établissement communique le numéro de suivi (affiché à l'inscription et dans la liste des élèves).

Numéros de suivi de démonstration : Élève Démo `SUI-4821`, Aminata `SUI-4858`, Paul `SUI-4895`, Sarah `SUI-4932` (Yaoundé) ; Kevin `SUI-9912` (Douala) ; Léa `SUI-7777` (Paris, abonnement expiré).

## Création de compte (lien « Créer un compte ? »)
- **Chef d'établissement, élève, parent** : nom, téléphone, mot de passe masqué (œil) et confirmation, selfie obligatoire, choix du numéro de paiement, bouton « Payer 300 FCFA », puis « Créer définitivement mon compte ». Le super administrateur autorise (en fixant l'abonnement mensuel) ou refuse. Après refus, le message d'information s'affiche et l'utilisateur peut reprendre sa demande autant de fois qu'il veut. Après acceptation : message de félicitations, bouton « OK », le bouton de vérification devient vert, l'espace s'ouvre avec le message de bienvenue et le montant.
- **Personnel** : formulaire (nom, prénom, établissement, région, ville, quartier, autres informations, poste), selfie, paiement de 500 FCFA. Après autorisation du super administrateur, le système propose les établissements correspondants ; le personnel demande l'accès au chef, qui autorise ou refuse (le super administrateur voit la demande et la marque lue). Une fois autorisé, le personnel apparaît chez le chef et chez le super administrateur, avec sa photo.
- **Numéros** : un numéro (téléphone ou paiement) ne peut servir qu'à un seul compte. Une tentative de réutilisation est signalée au super administrateur, qui peut réinitialiser le numéro ou l'ignorer.
- **Paiements simulés** : aucun argent réel n'est prélevé.

## Périodes d'évaluation
Toutes les périodes sont disponibles : séquences 1 à 6, trimestres 1 à 3, semestres 1 et 2. Le chef d'établissement choisit celles que son école utilise (Configuration). Les notes sont saisies dans une période ; un trimestre regroupe ses deux séquences (T1 = séquences 1-2, T2 = 3-4, T3 = 5-6) et un semestre regroupe trois séquences (S1 = 1-3, S2 = 4-6), en plus des notes saisies directement sur ce trimestre ou ce semestre. Bulletins, situations du chef et vue du titulaire se consultent par période.

## Personnel : chacun ne voit que ce qui le concerne
Un professeur ne voit que les notes qu'il a saisies (jamais celles de ses collègues). Le censeur ne voit que les élèves de son secteur, le comptable que les finances. Un onglet non autorisé est refusé. Le chef peut aussi limiter le professeur titulaire à ses propres notes (Configuration), au lieu de toutes les notes de sa classe.

## Photos
Le super administrateur voit toutes les photos (filtres année, mois, jour, heure, utilisateur), même supprimées. Le chef voit l'historique de son personnel et de ses élèves. L'élève ne voit que sa photo et peut la changer. Le parent voit les photos des élèves de l'établissement de ses enfants.

## Autres fonctionnalités
Catalogue, établissements, utilisateurs (activation/désactivation par le super administrateur seul), messagerie cloisonnée, historique des conversations avec audit, configuration d'école, classes, matières, élèves, postes, situations, notes avec délai de modification, bulletins avec rangs et recommandations, finances, discipline. Un professeur ne voit jamais les notes de ses collègues (le titulaire voit sa classe entière).

## Fusion avec l'autre version : ce qui a été repris
- **Code élève** : l'élève se connecte avec son code personnel (ou téléphone / e-mail) **et** son mot de passe ; le code seul ne suffit pas. Il le retrouve dans son profil ; le super administrateur le voit dans la liste des utilisateurs.
- **Historique des connexions** : date et heure d'entrée et de sortie et durée de chaque session (super administrateur exempté), visible dans l'onglet « Connexions » du super administrateur. La position GPS n'est **pas** demandée.
- **Ressources pédagogiques** : le professeur envoie un titre, une consigne et un fichier (vidéo, image, livre, PDF, document, son ; 4 Mo max dans cette démonstration) à un ou plusieurs élèves de ses classes. L'élève voit « Mes ressources », l'ouverture marque « lu », le téléchargement est autorisé ou non. Le professeur voit lu / non lu, le super administrateur supervise tous les envois.
- **Signaler son paiement** : le chef d'établissement envoie une demande de vérification (référence du payeur) ; le super administrateur la voit dans « Renouvellements », constate le paiement et réactive ; le chef reçoit un message de confirmation. L'historique des renouvellements est affiché.
- **Répétiteurs** : les parents peuvent aussi chercher un répétiteur ; messages vocaux par fichier audio en plus de l'enregistrement ; le partage des coordonnées exige l'accord de l'élève (ou du parent), l'accord du répétiteur, puis l'autorisation du super administrateur ; le super administrateur peut modifier le montant mensuel, bloquer ou renouveler un répétiteur (onglet « Répétiteurs »).
- **Précision de l'expiration** : un abonnement reste valable jusqu'à la fin du jour d'expiration.
- Le classement d'un élève est limité à son établissement.
- Le schéma `backend/schema.sql` reprend les règles de sécurité détaillées de l'autre version et ajoute les tables de cette version.

## Limites de cette version
- Données locales et mots de passe en clair : à remplacer par une base distante et une authentification sécurisée (`backend/schema.sql` est un point de départ ; ajouter les tables des demandes, photos et numéros).
- La détection du visage utilise le navigateur quand il la propose ; sinon le super administrateur vérifie la photo.
- Les photos sont stockées dans le navigateur ; en production, utiliser un stockage de fichiers sécurisé.
- Un élève qui crée son compte lui-même n'est rattaché à un établissement que quand un chef l'ajoute avec son téléphone (onglet Élèves).
- L'interface n'est traduite qu'en français.
- Les parents voient les photos de tous les élèves de l'établissement de leurs enfants (demande d'origine). L'autre version la limitait aux enfants liés : pour restreindre, modifier `vPph`.
- Les appels en direct dans la plateforme demandent un serveur (WebRTC) : dans cette version, la demande d'appel est enregistrée dans la conversation mais l'appel n'est pas établi. Les messages vocaux dépendent de l'enregistrement du navigateur.


## Ajouts de la version enrichie — communication, groupes et audit
- Tous les comptes disposant d'une session peuvent écrire au super administrateur ; les messages reçus peuvent être marqués « lu » et les accusés de lecture sont visibles.
- Messagerie de démonstration : SMS textuels et pièce audio courte. L'audio est limité à 10 Mo dans le prototype local.
- Les enseignants et répétiteurs peuvent demander l'ouverture d'un groupe pédagogique. Le super administrateur autorise ou refuse l'ouverture, puis traite les demandes d'adhésion. Le bouton de participation n'est disponible qu'après autorisation.
- Le chef d'établissement peut proposer une réunion en précisant l'objet, la date et les modalités. Après validation par le super administrateur, les personnes convoquées voient un bouton pour rejoindre l'espace de réunion.
- Tableau de bord enrichi avec messages non lus, espaces accessibles et réunions à rejoindre.
- Historique global de démonstration : messages, journaux, photos, groupes et réunions ; le super administrateur peut supprimer certains enregistrements de démonstration.
- Les parents peuvent utiliser l'espace « Mes enfants » existant pour associer plusieurs enfants via leur numéro de suivi et consulter les informations scolaires disponibles.

## Limites techniques importantes avant mise en production
Ce ZIP reste une **application de démonstration HTML** : son état est stocké dans le navigateur de l'appareil. Il ne fournit donc pas à lui seul une synchronisation multi-téléphone, un véritable chat temps réel, ni l'envoi fiable de fichiers de plusieurs dizaines de Go. Le seuil fonctionnel cible est : accepter les fichiers de plus de 20 Go et refuser ceux de plus de 200 Go ; cela nécessite un backend distant et un stockage privé avec téléversement reprenable en morceaux, contrôle des droits, validation des fichiers, URLs temporaires, quotas et journalisation. Les fichiers ne doivent pas être encodés en base64 dans le stockage du navigateur.
- La vue « Historique global » est un prototype. Pour respecter la confidentialité des élèves et des parents, l'accès aux conversations et aux photos doit être encadré par des rôles, des finalités, une durée de conservation et une journalisation des consultations/suppressions.
- Les boutons présents dans cette version ne constituent pas une garantie de fonctionnement de chaque action métier existante. Il faut effectuer une recette fonctionnelle complète et connecter les opérations à la base de données distante avant la production.

## Nouvelle fonction — échéance de saisie des notes
- Le chef d'établissement peut définir une date et une heure limites dans Configuration.
- À échéance, les professeurs sont signalés et l'interface de démonstration bloque la saisie, la modification et la suppression des notes.
- Les alertes comprennent le profil du professeur, l'établissement, la date limite et l'heure de constat.
- Le chef d'établissement peut enregistrer une décision disciplinaire ou choisir de ne pas sanctionner, puis rouvrir la saisie après vérification en présentiel.
- Le professeur peut demander une réouverture ; le super administrateur peut l'autoriser depuis « Retards de saisie des notes ».
- La migration backend `backend/migration_delais_notes.sql` ajoute les tables et le contrôle serveur à intégrer. Le contrôle réel en production exige de faire passer toutes les opérations de notes par une RPC/Edge Function et d'appliquer les règles RLS correspondantes.
- La page HTML actuelle reste un prototype local : les données locales ne sont pas partagées entre appareils et ne remplacent pas le contrôle serveur.
## Version V5 — messagerie super administrateur, langues, indicatifs et devises

Cette version conserve les fonctions de V4 (selfie initial obligatoire à l'inscription, changement de photo facultatif ensuite, échéances de notes, comptes, établissements, messagerie et historiques) et ajoute :

- Un bouton 🔱 dans l'en-tête de tous les comptes. Les utilisateurs non super-administrateurs ouvrent la messagerie avec le super-administrateur présélectionné.
- Une page **Langues, traduction et devises** accessible à tous les profils : préférence de langue, traduction de texte et des messages, demande de traduction de document/vidéo/fichier, convertisseur de devises et liste d'indicatifs/drapeaux.
- Le sélecteur de pays/indicatif dans le formulaire d'inscription.
- Des indicateurs supplémentaires : messages reçus/envoyés, notes/évaluations disponibles, moyenne si applicable, état du compte et historique photo.
- Le bouton **Quitter l’application** sur l'écran d'accueil.
- Un manifeste PWA, icônes 192×192 et 512×512 dérivées du logo, icône Apple et service worker pour rendre l'installation plus simple sur les appareils compatibles. L'icône installée reprend le logo de l'application.
- `backend/migration_langues_traduction_devises.sql` pour les langues activées, préférences utilisateurs, tâches de traduction, et taux de change côté serveur.

### Limites importantes du prototype

- Les langues ajoutées par le super-administrateur apparaissent dans les sélecteurs dès que le catalogue local est actualisé. L'interface complète n'est pas encore automatiquement traduite dans toutes les langues : cela demande un catalogue de libellés multilingues côté application.
- La traduction des messages/texte tente d'utiliser un service de traduction en ligne. Elle dépend de la connexion, du service tiers et de ses règles. Ne collez pas de données sensibles sans validation de la politique de confidentialité.
- Le traitement de fichiers (PDF/Word/PowerPoint), l'extraction de sous-titres d'une vidéo, la traduction des sous-titres et la création du fichier traduit sont représentés par une demande dans le prototype. Pour produire un vrai fichier téléchargeable, il faut connecter un backend sécurisé (stockage privé, antivirus, OCR/transcription, traduction, reconstruction du document/vidéo, lien de téléchargement expirant).
- Les taux du convertisseur sont **indicatifs et codés pour la démonstration**, non temps réel. Il faut connecter une API de change et afficher sa date de mise à jour avant tout paiement ou affichage de prix officiel.
- Le bouton Quitter tente de fermer la fenêtre. Les navigateurs mobiles interdisent souvent à une page de fermer un onglet qu'elle n'a pas elle-même ouvert ; dans ce cas, l'écran indique à l'utilisateur de fermer l'onglet/l'application depuis l'appareil.
- Comme V4, cette version HTML reste un prototype local. `localStorage` ne synchronise pas les données entre appareils et ne constitue pas un stockage de production. Pour l'usage réel, connecter Supabase/serveur, authentification sécurisée, stockage de fichiers, RLS et tâches serveur. Ne pas utiliser les comptes de démonstration en production.

### Installation

Déployer le dossier sur un hébergement HTTPS compatible (par exemple Vercel) en conservant les chemins `manifest.webmanifest`, `sw.js` et `assets/`. Sur Android, ouvrir le site dans le navigateur compatible puis choisir **Installer l'application** / **Ajouter à l'écran d'accueil**. L'installation PWA nécessite HTTPS (ou localhost en développement).


## Version V6 — indicatifs mondiaux et raccourci d’installation

- Catalogue local de **244 pays et territoires** avec drapeau, nom, code ISO et indicatif téléphonique international. Le catalogue est consultable et filtrable par nom, code ISO ou indicatif, et il alimente le sélecteur de pays à l’inscription. Certains pays partagent un indicatif (par exemple +1) ; le choix du pays reste donc nécessaire pour identifier le territoire.
- Icônes PWA de 192 × 192 et 512 × 512 pixels générées directement à partir du même `assets/logo.jpg` que le logo intégré à l’interface. Le manifeste et le cache du service worker ont été mis à jour.
- Bouton « Installer / créer un raccourci » sur l’écran d’accueil. Il utilise la fenêtre d’installation du navigateur quand elle est disponible et fournit les instructions propres au téléphone ou à l’ordinateur dans les autres cas.

### Installation sur les appareils

Déployer le site en HTTPS pour activer le manifeste et le service worker. Sur Android/Chrome et les navigateurs de bureau compatibles, utilisez le bouton d’installation ou le menu du navigateur. Sur iPhone/iPad, utilisez Safari → Partager → « Sur l’écran d’accueil ». Les navigateurs et systèmes ne permettent pas tous à une page web d’installer automatiquement une icône : l’utilisateur doit confirmer l’installation. Une application web progressive ne remplace pas une application native publiée dans chaque boutique.

### Précision des numéros

Les indicatifs servent à sélectionner le pays et à composer le préfixe. La validation avancée des numéros (longueur exacte, plages attribuées, portabilité) nécessite une bibliothèque de téléphonie ou un service serveur dédié ; la liste des indicatifs ne garantit pas à elle seule qu’un numéro est valide ou attribué.


## Version V7 — logo officiel et paramètres du compte
- Le logo fourni est utilisé dans l'interface et comme icône d'installation (192x192, 512x512, icône Apple).
- Le bouton visible « Installer / créer un raccourci » a été retiré de l'écran initial. L'installation reste accessible via le menu du navigateur compatible.
- Chaque espace connecté affiche une icône ⚙️ permettant à l'utilisateur de modifier son nom affiché, son identifiant e-mail et son mot de passe.
- Le formulaire demande le mot de passe actuel, vérifie l'unicité de l'identifiant et la confirmation du nouveau mot de passe, puis enregistre les modifications dans le stockage de démonstration.
- Attention : cette démonstration stocke encore des données dans le navigateur. Pour la production, les changements d'identifiants doivent être traités par une API sécurisée et un système d'authentification serveur.


## Version 8 — Paramètres personnels et connexion
- Le bouton « Remplir le compte de démonstration » a été retiré de l’interface de connexion.
- L’icône ⚙️ des paramètres personnels est accessible dans l’en-tête de chaque espace utilisateur. Elle permet de modifier le nom affiché, l’identifiant/e-mail et le mot de passe avec vérification du mot de passe actuel, puis d’enregistrer les changements.
- Les fonctionnalités et ressources de la version précédente sont conservées.

## Important — mise en production
Cette archive n’est pas encore une application de production sécurisée : elle utilise encore des données de démonstration côté navigateur, et le mot de passe est géré côté client. La suppression du bouton de remplissage ne supprime pas les comptes de démonstration intégrés au code. Avant une ouverture au public, il faut connecter une authentification serveur sécurisée, stocker les mots de passe sous forme de hachages, utiliser une base de données distante avec des règles d’accès, retirer les comptes et données d’exemple, et configurer les services de traduction/taux de change. Ne pas utiliser cette version telle quelle pour des données personnelles réelles.
