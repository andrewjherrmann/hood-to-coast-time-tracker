<template>
  <div v-if="show" class="loading-overlay">
    <div class="loading-content">
      <q-spinner-dots size="50px" color="primary" />
      <div class="text-h6 q-mt-md">{{ message }}</div>
      <div class="text-caption text-grey-6 q-mt-sm">{{ subtitle }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  show: boolean;
  message?: string;
  subtitle?: string;
}

withDefaults(defineProps<Props>(), {
  message: 'Loading...',
  subtitle: 'Please wait while we initialize the application'
});
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.loading-content {
  text-align: center;
  padding: 2rem;
  border-radius: 12px;
  background: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
</style>
