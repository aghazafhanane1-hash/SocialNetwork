<script setup>
import { ref, reactive, onMounted } from "vue";
import { fetchUsers, createUser, deleteUser } from "../services/userService";

const users = ref([]);
const loading = ref(false);
const error = ref("");
const submitting = ref(false);

const form = reactive({
  username: "",
  email: "",
  password: "",
});

async function loadUsers() {
  loading.value = true;
  error.value = "";
  try {
    users.value = await fetchUsers();
  } catch (e) {
    error.value = "Impossible de charger les utilisateurs : " + e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(loadUsers);

async function submit() {
  error.value = "";
  const username = form.username.trim();
  const email = form.email.trim();
  const password = form.password;

  if (!username || !email || !password) {
    error.value = "Pseudo, email et mot de passe sont obligatoires.";
    return;
  }

  submitting.value = true;
  try {
    await createUser({ username, email, password });
    form.username = "";
    form.email = "";
    form.password = "";
    await loadUsers();
  } catch (e) {
    error.value = "Échec de la création : " + e.message;
  } finally {
    submitting.value = false;
  }
}

async function remove(id) {
  error.value = "";
  try {
    await deleteUser(id);
    await loadUsers();
  } catch (e) {
    error.value = "Échec de la suppression : " + e.message;
  }
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}
</script>

<template>
  <div class="admin">
    <div class="admin-head">
      <h2 class="title">Administration des utilisateurs</h2>
      <button class="refresh" :disabled="loading" @click="loadUsers">
        {{ loading ? "Chargement…" : "Rafraîchir" }}
      </button>
    </div>

    <!-- Formulaire de création (POST /api/users : crée aussi le compte Keycloak) -->
    <form class="create-form" @submit.prevent="submit">
      <div class="row">
        <div class="field">
          <label>Pseudo</label>
          <input v-model="form.username" type="text" placeholder="ex: dupont" />
        </div>
        <div class="field">
          <label>Email</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="ex: dupont@mail.com"
          />
        </div>
        <div class="field">
          <label>Mot de passe</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" class="add" :disabled="submitting">
          {{ submitting ? "…" : "+ Créer" }}
        </button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </form>

    <!-- Tableau des utilisateurs -->
    <table class="users">
      <thead>
        <tr>
          <th>Pseudo</th>
          <th>Email</th>
          <th>Keycloak</th>
          <th>Créé le</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td class="name">{{ u.username }}</td>
          <td class="email">{{ u.email }}</td>
          <td>
            <span class="badge" :class="u.keycloakId ? 'ok' : 'ko'">
              {{ u.keycloakId ? "Synchronisé" : "Non lié" }}
            </span>
          </td>
          <td class="date">{{ formatDate(u.createdAt) }}</td>
          <td class="actions">
            <button class="del" title="Supprimer" @click="remove(u.id)">
              ✕
            </button>
          </td>
        </tr>
        <tr v-if="!loading && users.length === 0">
          <td colspan="5" class="empty">Aucun utilisateur pour le moment.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.admin {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 1.25rem 1.5rem 1.5rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}
.admin-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.refresh {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 6px;
  font-size: 12px;
  padding: 5px 12px;
  cursor: pointer;
  color: #6b7280;
}
.create-form {
  background: #f9fafb;
  border: 1px solid #eef0f2;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 1.25rem;
}
.row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}
.field {
  flex: 1;
}
label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 5px;
}
input {
  width: 100%;
  box-sizing: border-box;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: #fff;
}
input:focus {
  border-color: #2563eb;
}
.add {
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.add:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
.error {
  color: #dc2626;
  font-size: 12px;
  margin: 8px 0 0;
}
.users {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.users th {
  text-align: left;
  font-weight: 500;
  color: #6b7280;
  font-size: 12px;
  padding: 8px 10px;
  border-bottom: 1px solid #eef0f2;
}
.users td {
  padding: 10px;
  border-bottom: 1px solid #f3f4f6;
}
.name {
  font-weight: 500;
}
.email {
  color: #6b7280;
}
.date {
  color: #9ca3af;
}
.badge {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 10px;
}
.badge.ok {
  background: #dcfce7;
  color: #166534;
}
.badge.ko {
  background: #fee2e2;
  color: #991b1b;
}
.actions {
  text-align: right;
}
.del {
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
}
.del:hover {
  background: #fee2e2;
  color: #dc2626;
}
.empty {
  text-align: center;
  color: #9ca3af;
  padding: 20px;
}
</style>
