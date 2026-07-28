<template>
  <div v-if="store.isAuthenticated" class="session-info">
    <q-card class="session-card">
      <q-card-section>
        <div class="text-h6">Session Information</div>
        <div class="text-subtitle2">Welcome, {{ store.currentUser?.name }}</div>
      </q-card-section>
      
      <q-card-section>
        <div class="session-details">
          <div class="session-item">
            <strong>Email:</strong> {{ store.currentUser?.email }}
          </div>
          <div class="session-item">
            <strong>Time Remaining:</strong> 
            <span :class="timeRemainingClass">{{ timeRemaining }}</span>
          </div>
          <div class="session-item">
            <strong>Expires At:</strong> {{ expiresAt }}
          </div>
        </div>
      </q-card-section>
      
      <q-card-actions>
        <q-btn 
          color="primary" 
          label="Extend Session" 
          @click="extendSession"
          :loading="extending"
        />
        <q-btn 
          color="negative" 
          label="Sign Out" 
          @click="signOut"
        />
      </q-card-actions>
    </q-card>
    
    <!-- Session Expiration Warning -->
    <q-banner 
      v-if="isExpiringSoon" 
      class="bg-orange text-white q-mt-md"
      icon="warning"
    >
      <template v-slot:avatar>
        <q-icon name="warning" color="white" />
      </template>
      Your session will expire soon. Click "Extend Session" to continue.
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';

const store = useHoodToCoastStore();
const extending = ref(false);

// Computed properties for session information
const sessionInfo = computed(() => store.getSessionInfo());
const timeRemaining = computed(() => store.getSessionTimeRemaining());
const expiresAt = computed(() => {
  const info = sessionInfo.value;
  if (!info) return 'Unknown';
  return info.expiresAt.toLocaleString();
});

const isExpiringSoon = computed(() => store.isSessionExpiringSoon());

const timeRemainingClass = computed(() => {
  if (!sessionInfo.value) return '';
  
  const { timeRemaining } = sessionInfo.value;
  if (timeRemaining < 30 * 60 * 1000) return 'text-negative'; // Less than 30 minutes
  if (timeRemaining < 2 * 60 * 60 * 1000) return 'text-orange'; // Less than 2 hours
  return 'text-positive'; // More than 2 hours
});

// Methods
const extendSession = () => {
  extending.value = true;
  try {
    const success = store.extendSession();
    if (success) {
      // You could add a notification here
      console.log('Session extended successfully');
    }
  } catch (error) {
    console.error('Failed to extend session:', error);
  } finally {
    extending.value = false;
  }
};

const signOut = () => {
  store.signOut();
};
</script>

<style scoped>
.session-info {
  max-width: 400px;
  margin: 0 auto;
}

.session-card {
  margin-bottom: 1rem;
}

.session-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
}

.session-item strong {
  min-width: 120px;
}
</style>
