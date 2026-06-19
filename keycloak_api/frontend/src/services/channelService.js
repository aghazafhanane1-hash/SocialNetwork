// =====================================================================
//  Appels REST liés aux channels (salons) — consommés par ChatRoom.vue.
//  Routes backend : /api/channels (protégées).
//  Un channel = { id, name, description, createdAt }.
// =====================================================================

import { http } from "./http";

// GET /api/channels -> liste des channels
export function fetchChannels() {
  return http.get("/channels");
}

// POST /api/channels -> crée un channel (le serveur émet aussi "channel_created")
export function createChannel({ name, description }) {
  return http.post("/channels", { name, description });
}
