<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          Hood to Coast Tracker
        </q-toolbar-title>

        <!-- Authentication Section -->
        <div class="row items-center q-gutter-sm">
          <div v-if="!isAuthenticated" class="row q-gutter-xs">
            <q-btn
              flat
              dense
              label="Sign In"
              @click="showAuthDialog = true"
            />
          </div>

          <div v-else class="row items-center q-gutter-sm">
            <q-chip
              :label="currentUser?.name || 'User'"
              color="primary"
              text-color="white"
              size="sm"
            />
            <q-btn
              flat
              dense
              round
              icon="account_circle"
              size="sm"
            >
              <q-menu>
                <q-list style="min-width: 150px">
                  <q-item clickable v-close-popup @click="showProfileDialog = true">
                    <q-item-section>Profile</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item clickable v-close-popup @click="handleSignOut">
                    <q-item-section class="text-negative">Sign Out</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
      <q-list>
        <q-item-label header>
          Navigation
        </q-item-label>

        <EssentialLink
          v-for="link in visibleLinks"
          :key="link.title"
          v-bind="link"
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Authentication Dialog -->
    <AuthDialog
      v-model="showAuthDialog"
    />

    <!-- Profile Dialog -->
    <q-dialog v-model="showProfileDialog">
      <q-card style="min-width: 400px;">
        <q-card-section>
          <div class="text-h6">User Profile</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="q-gutter-md">
            <div>
              <strong>Name:</strong> {{ currentUser?.name || 'N/A' }}
            </div>
            <div>
              <strong>Email:</strong> {{ currentUser?.email || 'N/A' }}
            </div>
            <div>
              <strong>User ID:</strong> {{ currentUser?.id || 'N/A' }}
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';
import EssentialLink from '../components/EssentialLink.vue';
import AuthDialog from '../components/AuthDialog.vue';

const $q = useQuasar();
const store = useHoodToCoastStore();

// Local state
const leftDrawerOpen = ref(false);
const showAuthDialog = ref(false);
const showProfileDialog = ref(false);

// Store computed properties
const isAuthenticated = computed(() => store.isAuthenticated);
const currentUser = computed(() => store.currentUser);

// Methods
function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function handleSignOut() {
  store.signOut();
  $q.notify({
    type: 'positive',
    message: 'Signed out successfully'
  });
}

const linksList = [
  {
    title: 'Dashboard',
    caption: 'Race overview and progress',
    icon: 'dashboard',
    link: '/dashboard'
  },
  {
    title: 'Races',
    caption: 'Manage multiple races',
    icon: 'flag',
    link: '/races'
  },
  {
    title: 'Legs',
    caption: 'Configure race legs',
    icon: 'route',
    link: '/legs'
  },
  {
    title: 'Times',
    caption: 'Record race times',
    icon: 'timer',
    link: '/times'
  },
  {
    title: 'Runners',
    caption: 'Manage team runners',
    icon: 'people',
    link: '/runners'
  },
  {
    title: 'Settings',
    caption: 'App configuration',
    icon: 'settings',
    link: '/settings'
  }
];

const visibleLinks = computed(() => {
  if (isAuthenticated.value) {
    return linksList;
  } else {
    return linksList.filter(link => link.title === 'Dashboard');
  }
});
</script>
