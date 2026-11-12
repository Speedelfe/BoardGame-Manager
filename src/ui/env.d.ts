/// <reference types="vite/client" />
import type { GameStorageApi } from '../infrastructure/ipc/gameStorageApi'
import type { ShelfStorageApi } from '../infrastructure/ipc/shelfStorageApi'

// Die Brücke (src/preload) stellt der Oberfläche diese Funktionen bereit
declare global {
  interface Window {
    gameStorage: GameStorageApi
    shelfStorage: ShelfStorageApi
  }
}

export {}
