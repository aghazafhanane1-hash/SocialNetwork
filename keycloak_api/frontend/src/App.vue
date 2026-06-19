<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { socket } from "./socket";
import { auth, signOut } from "./composables/useAuth";
import ChatRoom from "./components/ChatRoom.vue";
import AdminPanel from "./components/AdminPanel.vue";

const connected = ref(false);
const activeTab = ref("chat");

function onConnect() {
  connected.value = true;
}
function onDisconnect() {
  connected.value = false;
}

onMounted(() => {
  socket.on("connect", onConnect);
  socket.on("disconnect", onDisconnect);
  socket.connect();
});

onUnmounted(() => {
  socket.off("connect", onConnect);
  socket.off("disconnect", onDisconnect);
});
</script>

<template>
  <div class="app">
    <div class="workspace">
      <nav class="tabs">
        <div class="tab-group">
          <button
            class="tab"
            :class="{ active: activeTab === 'chat' }"
            @click="activeTab = 'chat'"
          >
            Chatroom
          </button>
          <button
            v-if="auth.isAdmin"
            class="tab"
            :class="{ active: activeTab === 'admin' }"
            @click="activeTab = 'admin'"
          >
            Administrer
          </button>
        </div>
        <div class="tab-right">
          <span class="me">{{ auth.name || auth.username }}</span>
          <button class="leave" @click="signOut">Déconnexion</button>
        </div>
      </nav>

      <KeepAlive>
        <ChatRoom
          v-if="activeTab === 'chat'"
          :username="auth.username"
          :connected="connected"
        />
        <AdminPanel v-else-if="auth.isAdmin" />
      </KeepAlive>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.workspace {
  width: 1000px;
  max-width: 100%;
}
.tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.tab-group {
  display: inline-flex;
  background: #e5e7eb;
  border-radius: 10px;
  padding: 3px;
  gap: 3px;
}
.tab {
  border: none;
  background: transparent;
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
}
.tab.active {
  background: #fff;
  color: #111827;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.tab-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.me {
  font-size: 13px;
  color: #6b7280;
}
.leave {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 6px;
  font-size: 12px;
  padding: 5px 12px;
  cursor: pointer;
  color: #6b7280;
}
</style>
