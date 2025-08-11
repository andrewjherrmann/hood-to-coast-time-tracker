import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: () => import('pages/DashboardPage.vue') },
      { path: 'legs', name: 'legs', component: () => import('pages/LegsPage.vue') },
      { path: 'times', name: 'times', component: () => import('pages/TimesPage.vue') },
      { path: 'runners', name: 'runners', component: () => import('pages/RunnersPage.vue') },
      { path: 'settings', name: 'settings', component: () => import('pages/SettingsPage.vue') }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
];

export default routes;
