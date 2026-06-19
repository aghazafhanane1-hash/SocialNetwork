# SociaLink - Application de Réseau Social en Temps Réel

SociaLink est une application de réseau social complète intégrant un chat en temps réel découpé en salons (channels), une authentification robuste gérée par **Keycloak (IAM)**, une base de données **PostgreSQL** persistante et un espace d'administration avec un **CRUD utilisateur REST**.

Toutes les briques applicatives sont assemblées et prêtes à être déployées localement à l'aide de **Docker Compose**.

---

## Architecture du Projet

Le projet est découpé en 4 conteneurs principaux :
1. **Frontend (`frontend`)** : Interface en **Vue.js 3 (Vite)** au design sombre et épuré. Utilise `keycloak-js` pour sécuriser les routes et `socket.io-client` pour le chat en temps réel.
2. **Backend (`backend`)** : API REST **Node.js (Express)** et serveur WebSocket **Socket.io**. Valide les sessions via les clés publiques de Keycloak (JWKS) et interagit avec PostgreSQL et Keycloak (via l'API d'administration Keycloak).
3. **IAM (`keycloak`)** : Gère les identités, clients OAuth2, et l'authentification sécurisée (flux d'autorisation PKCE). Configuré pour importer automatiquement le royaume au démarrage.
4. **Base de données (`db`)** : Instance **PostgreSQL** hébergeant deux bases distinctes : une pour Keycloak et une pour le réseau social (messages historiques, salons et comptes utilisateurs synchronisés).

---

## Lancement Rapide (Docker)

### Prérequis
Assurez-vous que **Docker** et **Docker Compose** sont installés et démarrés sur votre machine.

### Instructions de démarrage
1. Ouvrez un terminal dans le répertoire racine du projet.
2. Lancez l'ensemble des conteneurs en exécutant :
   ```bash
   docker compose up --build -d
   ```
3. Laissez les conteneurs s'initialiser. 
   >  **Note** : Keycloak prend généralement entre 15 et 30 secondes pour importer le royaume et être pleinement disponible. Si le frontend affiche un écran d'erreur au premier chargement, attendez quelques instants puis actualisez la page.

---

##  Informations de Connexion & Comptes de Test

### Adresses d'accès local
- **Application Web (Frontend)** : [http://localhost:5173](http://localhost:5173)
- **API Rest Backend** : [http://localhost:3000](http://localhost:3000)
- **Console Admin Keycloak** : [http://localhost:8080](http://localhost:8080)

### Comptes prédéfinis
- **Utilisateur de Test (Social Chat)** :
  - **Pseudo** : `testuser`
  - **Mot de passe** : `password`
- **Administrateur Keycloak** :
  - **Identifiant** : `admin`
  - **Mot de passe** : `admin`

---

##  Scénario de Test de Discussion Multi-Utilisateurs

Pour tester la discussion instantanée en temps réel et la gestion des utilisateurs, suivez ces étapes :

### Étape 1 : Connexion du premier utilisateur
1. Allez sur [http://localhost:5173](http://localhost:5173). Vous êtes automatiquement redirigé vers Keycloak.
2. Connectez-vous avec `testuser` / `password`.
3. Vous accédez au chat. Rejoignez par exemple le salon `#general`.

### Étape 2 : Inscription d'un second utilisateur via le CRUD REST
1. Dans l'application, cliquez sur l'onglet **"Annuaire & CRUD Admin"** en haut de l'écran.
2. Dans le formulaire de droite ("Inscrire un nouvel utilisateur"), complétez les champs :
   - **Pseudo** : `benjamin`
   - **Email** : `benjamin@example.com`
   - **Mot de passe** : `monmotdepasse`
3. Cliquez sur **Inscrire**.
4. Le nouvel utilisateur apparaît instantanément dans le tableau de gauche ("Annuaire des Membres"). *L'API Node.js l'a automatiquement inséré en base PostgreSQL locale et a créé son profil correspondant dans Keycloak.*

### Étape 3 : Lancer la conversation temps réel (Websockets)
1. Ouvrez une **fenêtre de navigation privée** dans votre navigateur.
2. Rendez-vous sur [http://localhost:5173](http://localhost:5173).
3. Connectez-vous avec le compte fraîchement créé : `benjamin` / `monmotdepasse`.
4. Sélectionnez le salon `#general` dans le menu de gauche.
5. Écrivez un message : vous le verrez s'afficher instantanément sur les deux fenêtres de navigateur en temps réel !
6. Vous pouvez voir les avatars et pseudos correspondants, ainsi que la liste des membres actifs en ligne sur le panneau de droite.

### Étape 4 : Vérifier la persistance des messages
1. Changez de salon pour aller dans `#technologie` ou `#loisirs`.
2. Écrivez des messages.
3. Actualisez complètement les pages de vos navigateurs.
4. Reconnectez-vous ou accédez de nouveau aux salons : l'historique complet des messages s'affiche, chargé depuis la base de données PostgreSQL via le WebSocket.

---

##  Endpoints API CRUD REST (Backend - http://localhost:3000)

Toutes les requêtes REST (sauf la création d'utilisateur initiale `POST /api/users`) doivent être accompagnées d'un Token Bearer valide dans l'en-tête HTTP `Authorization: Bearer <votre_token_keycloak>`.

- **Créer un utilisateur (inscription)** : `POST /api/users`  
  *Payload* : `{ "username": "...", "email": "...", "password": "..." }`
- **Lister les utilisateurs** : `GET /api/users`
- **Détails d'un utilisateur** : `GET /api/users/:id`
- **Mettre à jour un utilisateur** : `PUT /api/users/:id`  
  *Payload* : `{ "username": "...", "email": "...", "password": "..." }` *(password optionnel)*
- **Supprimer un utilisateur** : `DELETE /api/users/:id`
