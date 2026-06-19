import { config } from "../config";
import { getToken } from "../keycloak";

// Petit client HTTP basé sur fetch. Il préfixe automatiquement chaque appel
// par config.apiUrl et ajoute le token Keycloak dans l'en-tête Authorization.
// Vous n'avez normalement PAS besoin de modifier ce fichier : déclarez vos
// endpoints dans services/userService.js (ou d'autres services).

async function request(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Erreur HTTP ${res.status}`);
  }

  if (res.status === 204) return null; // No Content
  return res.json();
}

export const http = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) =>
    request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
};
