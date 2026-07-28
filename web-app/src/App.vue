<template>
  <LoadingOverlay 
    :show="!store.isInitialized" 
    message="Initializing Hood to Coast Time Tracker"
    subtitle="Loading race data and configuration..."
  />
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useHoodToCoastStore } from './stores/hood-to-coast-store';
import LoadingOverlay from './components/LoadingOverlay.vue';

const store = useHoodToCoastStore();

// Initialize the store when the app mounts
onMounted(() => {
  // The store initialization happens automatically, but we can add any additional setup here
  console.log('App mounted, store initialization in progress...');
});
</script>
