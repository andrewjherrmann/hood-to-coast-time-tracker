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

        <div>Quasar v{{ $q.version }}</div>
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
          v-for="link in linksList"
          :key="link.title"
          v-bind="link"
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import EssentialLink from '../components/EssentialLink.vue';

const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
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
</script>
