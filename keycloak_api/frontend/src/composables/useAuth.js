import { reactive } from "vue";
import { keycloak, hasRole, logout } from "../keycloak";
export const auth = reactive({
  username: keycloak.tokenParsed?.preferred_username ?? "",
  name: keycloak.tokenParsed?.name ?? "",
  email: keycloak.tokenParsed?.email ?? "",
  isAdmin: "admin",
});

export function signOut() {
  logout();
}
