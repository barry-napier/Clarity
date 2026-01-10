import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    port: 3000,
    host: true, // Allow external connections for Capacitor live reload
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths(),
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    // IMPORTANT: React plugin MUST come AFTER TanStack Start plugin
    viteReact(),
  ],
})
