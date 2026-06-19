// Centralise toute la configuration lue depuis les variables d'environnement
// (fichier .env). Les variables exposées au client DOIVENT commencer par VITE_.

export const config = {
  // URL de base de l'API REST. Le backend expose /api/users, /api/channels
  // et écoute par défaut sur le port 3000.
  apiUrl: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",

  // URL du serveur Socket.IO (même serveur que l'API).
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3000",

  // Paramètres Keycloak (doivent correspondre au realm du backend).
  keycloak: {
    url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080",
    realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "social-network",
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "social-net-front",
  },
};
