import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Laporanmu - Portal Kedisiplinan',
        short_name: 'Laporanmu',
        description: 'Aplikasi monitoring kedisiplinan dan poin siswa MBS Tanggul.',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components/layout': path.resolve(__dirname, './src/core/layouts'),
      '@components/ui': path.resolve(__dirname, './src/shared/components'),
      [path.resolve(__dirname, './src/components/ui')]: path.resolve(__dirname, './src/shared/components'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks/students': path.resolve(__dirname, './src/features/students/hooks'),
      '@hooks/enrollment': path.resolve(__dirname, './src/features/enrollment/hooks'),
      '@hooks/reports': path.resolve(__dirname, './src/hooks/reports'),
      '@hooks/gate': path.resolve(__dirname, './src/hooks/gate'),
      '@hooks/dorms': path.resolve(__dirname, './src/features/dorms/hooks'),
      '@hooks': path.resolve(__dirname, './src/shared/hooks'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils/dorms': path.resolve(__dirname, './src/features/dorms/utils'),
      '@utils/enrollment': path.resolve(__dirname, './src/features/enrollment/utils'),
      '@utils/gate': path.resolve(__dirname, './src/utils/gate'),
      '@utils/reports': path.resolve(__dirname, './src/utils/reports'),
      '@utils/students': path.resolve(__dirname, './src/features/students/utils'),
      '@utils': path.resolve(__dirname, './src/shared/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@context': path.resolve(__dirname, './src/core/context'),
      '@lib': path.resolve(__dirname, './src/core/lib'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@features': path.resolve(__dirname, './src/features'),
      '@core': path.resolve(__dirname, './src/core'),
      '@shared': path.resolve(__dirname, './src/shared'),
    }
  },
  server: {
    host: true,       // expose ke jaringan lokal
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['@fortawesome/fontawesome-svg-core', '@fortawesome/free-solid-svg-icons', '@fortawesome/react-fontawesome'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  }
})
