/// <reference types="vite/client" />
import type { GameStorageApi } from '../infrastructure/ipc/gameStorageApi'

// Die Brücke (src/preload) stellt der Oberfläche diese Funktionen bereit
declare global {
  interface Window {
    gameStorage: GameStorageApi
  }
}

export {}
