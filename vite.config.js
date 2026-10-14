import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { seoPlugin } from './scripts/vite-plugin-seo.js'

/** GitHub project Pages base path, e.g. `/Native-Oldies/` (see deploy workflow). */
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [tailwindcss(), seoPlugin()],
  server: {
    watch: {
      // Bulk cover downloads touch hundreds of files; ignore them so dev HMR stays stable.
      ignored: ['**/src/assets/covers/**'],
    },
  },
})
