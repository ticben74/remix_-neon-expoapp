# Festiv'AR (expoAPP) - Plateforme de Médiation Culturelle & d'Expositions Interactives

Festiv'AR (expoAPP) est une plateforme SaaS moderne et robuste conçue pour transformer l'expérience des visiteurs dans les centres culturels, les galeries d'art, les musées et les parcours urbains d'exposition. Elle permet de digitaliser les parcours physiques en proposant une carte GPS interactive pas-à-pas, des modules de médiation audio et vidéo enrichis, un atelier **AR Graffiti** sur murs physiques, une galerie collective et la gestion complète des médias via Google Drive et PostgreSQL.

---

## 🚀 Fonctionnalités Clés & Modules

### 🗺️ Carte GPS Interactive du Parcours (Leaflet) & Géolocalisation
* **Composant Cartographique Leaflet** : Carte interactive OpenStreetMap affichant l'ensemble du parcours, les murs physiques et les œuvres géolocalisées.
* **Géolocalisation en Temps Réel** : Détection dynamique de la position du visiteur avec calcul de la distance exacte (en mètres via formule d'Haversine) jusqu'à la prochaine étape du parcours.
* **Prochaine Étape & Proximité** : Notification et bannière intelligente indiquant l'œuvre la plus proche et permettant un accès direct en un clic.
* **Trois Modes de Vue** : Alternance fluide entre la **Carte GPS 📍**, le **Plan Intérieur 🗺️** (layout visuel) et la **Liste des Murs 📋**.
* **Mode Simulation GPS** : Bouton de démonstration permettant d'éprouver la navigation géolocalisée même hors réseau ou sans signal GPS.

### 🎧 Médiation Immersive (Audioguides & Vidéos des Coulisses)
* **Audioguide Intégré** : Permet aux visiteurs d'écouter les récits et explications des œuvres directement depuis leur propre smartphone, sans matériel physique supplémentaire à louer.
* **Coulisses & Entretiens** : Module vidéo permettant de visionner des interviews d'artistes ou des démonstrations de restauration d'œuvres.
* **Branding & Charte Personnalisée** : Adaptation complète de l'interface graphique à la thématique de chaque exposition (couleurs, visuels, logo).

### 🎨 Atelier AR Graffiti & La Fresque Collective
* **Graffiti en Réalité Augmentée** : Les visiteurs peuvent graffer virtuellement sur le mur physique sélectionné via la caméra arrière de leur smartphone.
* **Moteur d'Effets Réalistes** : Bombe de spray à particules avec coulures fluides (drips), marqueur néon lumineux, gomme, palette de couleurs fluo et système d'annulation (undo).
* **Composition & Publication** : Fusion instantanée du flux caméra et du dessin avec publication sécurisée vers la base de données.
* **La Fresque Collective** : Onglet dédié dans la vue visiteur présentant la galerie de toutes les créations validées.
* **Modération Administrateur** : Validation ou suppression des graffitis soumis depuis le tableau de bord grâce aux routes d'API sécurisées JWT.

### 📁 Importation de Médias depuis Google Drive & Auto-sauvegarde PostgreSQL
* **Sélecteur Google Drive Intégré** : Importation directe et par lots (bulk) d'images et de modèles 3D depuis Google Drive pour les œuvres d'art, banners hero, logos et frises chronologiques.
* **Auto-sauvegarde en arrière-plan (PostgreSQL)** : Persistance automatique débouclée des configurations de campagnes et modifications dans la base de données PostgreSQL avec indicateur d'état en temps réel.

### 🎮 Gamification, Apprentissage Ludique & Studio Souvenir
* **Roue des Découvertes** : Anecdotes aléatoires et souvenirs culturels.
* **Quiz Culturel** : Évaluation ludique des connaissances acquises.
* **Révélation d'Œuvre (Jeu à gratter)** : Grattage tactile interactif révélant des informations cachées.
* **Livre d'or vidéo & Photobooth** : Capture de photos et vidéos témoignages avec surimpression du logo de l'exposition.

---

## 🛠 Tech Stack

* **Frontend** : React 18, TypeScript, Vite.
* **Cartographie & GPS** : Leaflet (`leaflet`), OpenStreetMap, Geolocation API, formule d'Haversine.
* **Styling & UI** : Tailwind CSS, Lucide React (Icônes), Radix UI (Composants), Sonner (Toasts).
* **Animations** : Motion (`motion/react`).
* **Backend & Base de Données** : Express (Node.js/TypeScript), PostgreSQL (persistence débouclée auto-save), authentification JWT, intégration Google Drive Picker API.
* **Analyse de données** : Recharts, D3.js.

---

## 📦 Installation & Déploiement

### Prérequis
* Node.js (v18 ou supérieur)
* PostgreSQL (Base de données relationnelle)

### Installation & Démarrage
1. Installez les dépendances à la racine du projet :
   ```bash
   npm install
   ```
2. Lancez le serveur de développement full-stack :
   ```bash
   npm run dev
   ```
3. Compilez l'application pour la production :
   ```bash
   npm run build
   ```
4. Lancez le serveur en mode production :
   ```bash
   npm start
   ```

---

## 🔐 Sécurité & Authentification

Les données et endpoints d'administration de Festiv'AR (expoAPP) sont protégés :
* **Routes Publiques** : Permettent aux visiteurs d'accéder aux expositions actives, à la carte GPS, aux audioguides, et de soumettre leurs graffitis virtuels.
* **Routes Protégées (JWT)** : L'accès aux tableaux de bord d'administration, la modification des campagnes et la modération des graffitis (`/api/campaigns/:id/graffiti/:graffitiId/approve`) nécessitent un token JWT valide et la vérification de propriété de la campagne (`checkCampaignOwnership`).

---
Développé avec ❤️ pour réinventer l'expérience des visiteurs et moderniser la médiation culturelle.
