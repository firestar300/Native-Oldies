import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

/** GitHub project Pages base path, e.g. `/Native-Oldies/` (see deploy workflow). */
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [tailwindcss()],
})
