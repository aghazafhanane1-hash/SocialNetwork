import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import { initKeycloak } from "./keycloak";

// On initialise Keycloak AVANT de monter l'app : si l'utilisateur n'est pas
// connecté, il est redirigé vers la page de login Keycloak. L'app n'est montée
// qu'une fois l'authentification confirmée.
initKeycloak()
  .then(() => {
    createApp(App).mount("#app");
  })
  .catch((err) => {
    console.error("Échec de l'initialisation de Keycloak :", err);
  });
