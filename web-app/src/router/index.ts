import { route } from 'quasar/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';

/*
 * When adding new routes to this file, they will be automatically
 * included in the build. Only add routes that you can see in the app.
 *
 * If the route has a name, it will be added as well.
 * You can pass the following as meta to inject additional query parameters.
 *
 * ```ts
 * {
 *   path: '/profile/:username',
 *   name: 'profile',
 *   component: () => import('pages/ProfilePage.vue'),
 *   meta: {
 *     isPublic: true
 *   }
 * }
 * ```
 */

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory);

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  // Navigation guard removed - causing authentication state issues
  // Will implement proper route protection in components instead

  return Router;
});
