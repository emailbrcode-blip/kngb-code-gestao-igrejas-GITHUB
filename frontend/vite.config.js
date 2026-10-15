
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'prompt',
      injectRegister: false,

      manifest: {
        name: 'BrCode Sistema de gestão inteligente',
        short_name: 'BrCode',
        description: 'Sistema de gestão e site institucional para igrejas — O justo viverá pela Fé!',
        start_url: '/',
        lang: 'pt-BR',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F5F5F5',
        theme_color: '#111111',

        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        globPatterns: [
          '**/*.{js,css,html,svg,png,ico,jpg,jpeg}',
        ],

        // Imagens do site público ficam fora do pré-cache (são maiores e
        // o administrador pode trocá-las) — entram no cache só quando vistas.
        globIgnores: ['site/**'],

        navigateFallbackDenylist: [
          /^\/(auth|members|workers|schedules|finance|donations|worships|users|notifications|events|announcements|reports|pdf|availability|roles|permissions|audit|dashboard|ecclesiastical-roles)(\/|$)/,
        ],

        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/site/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'site-images',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',

            handler: 'CacheFirst',

            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,

    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});

