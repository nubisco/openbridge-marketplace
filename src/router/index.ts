import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
        },
        {
          path: 'plugins/:name(.*)',
          name: 'plugin',
          component: () => import('@/views/PluginView.vue'),
        },
        {
          path: 'auth/callback',
          name: 'auth-callback',
          component: () => import('@/views/AuthCallbackView.vue'),
        },
        {
          path: 'privacy',
          name: 'privacy',
          component: () => import('@/views/PrivacyView.vue'),
        },
        {
          path: 'terms',
          name: 'terms',
          component: () => import('@/views/TermsView.vue'),
        },
      ],
    },
  ],
})
