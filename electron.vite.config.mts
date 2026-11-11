import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'electron-vite'
import { resolve } from 'node:path'

// Eine Electron-App besteht aus drei Teilen, die getrennt gebaut werden:
// main     = Hintergrundteil (src/main), darf Dateien lesen und schreiben
// preload  = Brücke (src/preload) zwischen Hintergrundteil und Oberfläche
// renderer = Oberfläche (src/ui), also die Vue-App im Fenster
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    root: 'src/ui',
    build: {
      rollupOptions: {
        input: resolve(import.meta.dirname, 'src/ui/index.html'),
      },
    },
    plugins: [vue()],
  },
})
