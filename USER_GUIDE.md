# Festiv'AR (expoAPP) - Guide Complet de l'Administrateur & du Conservateur

Ce guide vous accompagne pas à pas dans la création, la personnalisation, le déploiement, la modération et le suivi de vos parcours d'expositions interactives sur **Festiv'AR (expoAPP)**. Conçu spécialement pour les centres culturels, les musées, les galeries et les espaces urbains, vous y découvrirez comment enrichir l'expérience de vos visiteurs en un clin d'œil.

---

## 📖 Sommaire
1. [Vue d'ensemble de Festiv'AR](#1-vue-densemble-de-festivar)
2. [Création et configuration d'une exposition & Auto-sauvegarde PostgreSQL](#2-création-et-configuration-dune-exposition--auto-sauvegarde-postgresql)
3. [Importation de Médias depuis Google Drive](#3-importation-de-médias-depuis-google-drive)
4. [Configuration des Murs & Carte GPS Interactive (Leaflet)](#4-configuration-des-murs--carte-gps-interactive-leaflet)
5. [Configuration des modules de médiation et d'engagement](#5-configuration-des-modules-de-médiation-et-dengagement)
   * [Audioguide Immersif & Multimédia](#audioguide-immersif--multimédia)
   * [Atelier AR Graffiti & La Fresque Collective](#atelier-ar-graffiti--la-fresque-collective)
   * [Ateliers, Guides de Visite & Fiches Créatives](#ateliers-guides-de-visite--fiches-créatives)
   * [Apprentissage Ludique (Quiz, Roue, Révélations)](#apprentissage-ludique-quiz-roue-révélations)
   * [Livre d'or vidéo & Souvenirs photo](#livre-dor-vidéo--souvenirs-photo)
6. [Modération & Validation des Graffitis](#6-modération--validation-des-graffitis)
7. [Analyse de l'affluence et Intégrations Google Workspace](#7-analyse-de-laffluence-et-intégrations-google-workspace)
8. [Déploiement physique & Impression des QR Codes d'œuvres](#8-déploiement-physique--impression-des-qr-codes-dœuvres)

---

## 1. Vue d'ensemble de Festiv'AR

La plateforme Festiv'AR propose deux espaces distincts et connectés en temps réel :
* **La Vue Administrateur & Curation (SetupView)** : C'est votre outil de gestion et de scénographie. Vous y créez vos parcours, importez vos médias depuis Google Drive, configurez les coordonnées GPS des murs, définissez les audioguides, modérez les graffitis virtuels et analysez le comportement des visiteurs.
* **La Vue Visiteur (CustomerView)** : L'application mobile. Lorsque les visiteurs scannent un QR Code placé sur un mur ou devant une œuvre, ils accèdent instantanément aux contenus (Carte GPS, Parcours, Activités, Fresque) sans aucune application à installer.

---

## 2. Création et configuration d'une exposition & Auto-sauvegarde PostgreSQL

Pour lancer votre première exposition digitale :
1. Connectez-vous à votre portail d'administration.
2. Cliquez sur **"Créer une exposition"** ou sélectionnez l'un des modèles pré-configurés (*Picasso & l'Art Moderne*, *Street Art & Fresques Urbaines*, *Trésors de l'Égypte Antique*, etc.).
3. Dans l'onglet **"Général"**, renseignez les informations fondamentales (Nom, Lieu, Couleur Thématique, Contact WhatsApp, etc.).
4. **Sauvegarde Automatique PostgreSQL** : Toutes vos modifications sont enregistrées automatiquement en arrière-plan avec un délai de courtoisie (debounce 1,5s). Un indicateur d'état en bas et en haut de l'écran vous indique en temps réel :
   * 🟡 *Enregistrement...*
   * 🟢 *Auto-sauvegardé à HH:MM*
   * 🔴 *Échec de sauvegarde*

---

## 3. Importation de Médias depuis Google Drive

Pour accélérer la scénographie et éviter de devoir téléverser fichier par fichier :
1. Dans la section de configuration (Image d'en-tête, Murs d'art, Œuvres, Frise chronologique), cliquez sur le bouton **"Cloud Drive"**.
2. Le sélecteur Google Drive officiel s'ouvre.
3. Sélectionnez vos visuels ou modèles 3D directement depuis vos dossiers Drive.
4. Pour les œuvres d'art d'un mur, vous pouvez effectuer un **import en masse (bulk upload)** : toutes les images sélectionnées seront automatiquement converties en fiches d'œuvres titrées et rattachées au mur physique.

---

## 4. Configuration des Murs & Carte GPS Interactive (Leaflet)

Les expositions en extérieur ou dans de grands espaces s'appuient sur la navigation cartographique :
1. Allez dans l'onglet **"Parcours d'Exposition (Murs & Œuvres)"**.
2. Pour chaque mur, renseignez le Nom, la Description et ses **coordonnées GPS** (Latitude et Longitude).
3. Ajoutez ou importez depuis Drive les œuvres d'art rattachées à ce mur.
4. **Rendu Visiteur (Carte GPS Leaflet)** :
   * La carte interactive OpenStreetMap s'affiche avec la ligne de parcours pointillée reliant les étapes.
   * La géolocalisation en temps réel indique au visiteur sa position exacte (point bleu pulsant) et calcule la distance en mètres jusqu'au mur le plus proche.
   * Le visiteur peut basculer en 1 clic entre **Carte GPS 📍**, **Plan Intérieur 🗺️** et **Liste 📋**.
   * Un bouton **"Simuler GPS"** permet de tester le parcours même sur ordinateur ou sans signal.

---

## 5. Configuration des modules de médiation et d'engagement

Personnalisez le parcours en fonction des publics visés (scolaires, amateurs d'art, familles).

### 🎧 Audioguide Immersif & Multimédia
Donnez vie aux pièces exposées en ajoutant une dimension sonore et vidéo.
* **Audioguide** : Activez l'audioguide, entrez son titre (ex: *Description audio - Guernica*) et fournissez l'adresse de votre fichier audio (MP3 ou flux).
* **Coulisses & Conférences** : Cochez l'option vidéo pour présenter l'interview d'un historien de l'art, une séance de restauration ou une animation 3D.

### 🎨 Atelier AR Graffiti & La Fresque Collective
Offrez une expérience de Street Art participatif unique !
* **Atelier Virtuel** : Sur chaque mur du parcours, le visiteur peut cliquer sur **"AR Graffiti sur ce mur 🎨"**.
* **Outils de Création** :
  * **Bombe Spray** : Particules de peinture avec coulures réalistes (*drips*).
  * **Néon Fluo** : Trait lumineux avec effet de lueur.
  * **Gomme & Annulation** : Ajustement facile de la taille des pinceaux et retour arrière (*undo*).
* **Soumission & Publication** : Une fois l'œuvre figée par-dessus la caméra arrière du smartphone, le graffiti est envoyé vers le serveur et lié au mur sélectionné.
* **Onglet "La Fresque"** : Présente l'ensemble des graffitis validés sous forme de galerie collective pour tous les visiteurs.

### 🎨 Ateliers, Guides de Visite & Fiches Créatives
Prolongez l'expérience pédagogique et proposez des ateliers pratiques.
* Rendez-vous dans l'onglet **"Ateliers & Guides"** de l'administration.
* Ajoutez des modules avec leurs illustrations, descriptions et **étapes de réalisation**.

### 🎮 Apprentissage Ludique (Quiz, Roue, Révélations)
Stimulez l'apprentissage de manière plaisante grâce à la gamification.
1. **Quiz Culturel** : Rédigez des questions sur l'exposition pour valider les notions acquises.
2. **Roue des Découvertes** : Une roue ludique qui délivre au hasard des faits insolites.
3. **Révélation d'Œuvre (Grattage)** : Permet aux visiteurs de gratter l'écran tactile pour révéler un croquis préparatoire.

### 📷 Livre d'or vidéo & Souvenirs photo
Offrez des souvenirs mémorables et encouragez le partage sur les réseaux sociaux.
* **Livre d'or vidéo** : Les visiteurs s'enregistrent en vidéo pour témoigner de leur émotion.
* **Filtres sur-mesure** : Importez votre propre visuel PNG transparent pour habiller les selfies.

---

## 6. Modération & Validation des Graffitis

Pour conserver une fresque respectueuse et de haute qualité :
1. Dans l'espace d'administration, ouvrez la section **Modération Graffiti**.
2. **Mode Approbation Automatique** : Vous pouvez activer ou désactiver l'approbation automatique dans la configuration de la campagne.
3. **Validation / Suppression** : Visualisez les graffitis soumis en attente, puis cliquez sur **Approuver** pour les publier instantanément dans l'onglet *La Fresque* des visiteurs, ou sur **Supprimer** pour les rejeter.

---

## 7. Analyse de l'affluence et Intégrations Google Workspace

Le tableau de bord de Festiv'AR collecte et synthétise l'activité de vos parcours physiques en temps réel.
* **Scans** : Nombre de visites digitales générées par les QR Codes de vos salles.
* **Lectures Audio / Audioguides** : Nombre total d'écoutes lancées sur vos commentaires d'œuvres.
* **Participations AR Graffiti & Ateliers** : Nombre de graffitis créés et de fiches consultées.
* **Inscriptions au Club** : Base d'abonnés qualifiés collectée pour vos prochains vernissages.
* **Intégrations Workspace** : Synchronisation automatique des données vers Google Sheets et alertes en temps réel sur Google Chat.

---

## 8. Déploiement physique & Impression des QR Codes d'œuvres

Un bon parcours de médiation numérique nécessite une signalétique physique claire et élégante.
1. Depuis votre espace d'administration, accédez à l'onglet **"QR Code"** de l'exposition concernée.
2. Personnalisez les couleurs du QR Code.
3. Téléchargez le fichier haute résolution sous forme d'image **PNG** ou de fichier vectoriel **SVG**.
4. **Cartels & Accueil** : Imprimez le QR Code à côté du cartel classique avec la mention *"Scannez pour la carte GPS, l'audioguide et l'AR Graffiti"*.

---
Pour toute question ou demande d'intégration technique avancée, contactez l'assistance technique de Festiv'AR.
