// =====================================================================
//  Appels REST liés aux utilisateurs (consommés par AdminPanel.vue).
//  Alignés sur VOTRE backend : routes /api/users.
//
//  Rappels backend :
//   - POST /api/users est PUBLIC (inscription) et attend un mot de passe ;
//     il crée le compte dans Keycloak puis en base locale.
//   - GET/DELETE sont protégés (token Keycloak ajouté auto par http.js).
//   - Un user renvoyé = { id, username, email, keycloakId, createdAt }.
// =====================================================================

import { http } from "./http";

// GET /api/users -> tableau d'utilisateurs
export function fetchUsers() {
  return http.get("/users");
}

// POST /api/users -> crée l'utilisateur (Keycloak + base). Mot de passe requis.
export function createUser({ username, email, password }) {
  return http.post("/users", { username, email, password });
}

// DELETE /api/users/:id -> supprime l'utilisateur (Keycloak + base)
export function deleteUser(id) {
  return http.delete(`/users/${id}`);
}
