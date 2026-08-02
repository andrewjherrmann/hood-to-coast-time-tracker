<template>
  <q-page class="flex flex-center">
    <div class="text-center">
      <q-spinner-dots color="primary" size="60px" />
      <div class="q-mt-md text-subtitle1">Signing you in...</div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { handleAuthCallback } from '../services/auth';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';

const router = useRouter();
const store = useHoodToCoastStore();

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');

  if (error) {
    console.error('Auth error:', error, params.get('error_description'));
    router.replace('/');
    return;
  }

  if (code) {
    const user = await handleAuthCallback(code);
    if (user) {
      store.setAuthenticatedUser(user);
      router.replace('/');
    } else {
      console.error('Failed to complete authentication');
      router.replace('/');
    }
  } else {
    router.replace('/');
  }
});
</script>
