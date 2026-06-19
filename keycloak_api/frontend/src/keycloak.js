import Keycloak from "keycloak-js";
import { config } from "./config";

// Instance unique de Keycloak partagée dans toute l'application.
export const keycloak = new Keycloak({
  url: config.keycloak.url,
  realm: config.keycloak.realm,
  clientId: config.keycloak.clientId,
});

// Initialise Keycloak. "login-required" redirige automatiquement vers la
// page de connexion Keycloak si l'utilisateur n'est pas authentifié.
// À appeler AVANT de monter l'application Vue (voir main.js).
export async function initKeycloak() {
  const authenticated = await keycloak.init({
    onLoad: "login-required",
    checkLoginIframe: false,
    pkceMethod: "S256",
  });

  // Rafraîchit le token avant expiration (toutes les 60 s).
  setInterval(() => {
    keycloak
      .updateToken(70)
      .catch(() => keycloak.login());
  }, 60000);

  return authenticated;
}

// Renvoie le token courant (utilisé par http.js et socket.js).
export function getToken() {
  return keycloak.token;
}

// Vérifie si l'utilisateur possède un rôle (rôle de realm Keycloak).
export function hasRole(role) {
  return keycloak.hasRealmRole(role);
}

// Déconnexion (redirige vers Keycloak).
export function logout() {
  keycloak.logout();
}
