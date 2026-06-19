import { io } from "socket.io-client";
import { config } from "./config";
import { getToken } from "./keycloak";

// Instance Socket.IO partagée.
// - autoConnect: false  => on se connecte manuellement (après l'auth Keycloak).
// - auth (fonction)     => renvoie un token frais à CHAQUE (re)connexion,
//                          que votre backend pourra valider côté serveur.
export const socket = io(config.socketUrl, {
  autoConnect: false,
  auth: (cb) => cb({ token: getToken() }),
});
