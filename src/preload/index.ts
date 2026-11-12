import { contextBridge, ipcRenderer } from 'electron'

import {
  loadChannel,
  saveChannel,
  type GameStorageApi,
} from '../infrastructure/ipc/gameStorageApi'
import {
  loadShelvesChannel,
  saveShelvesChannel,
  type ShelfStorageApi,
} from '../infrastructure/ipc/shelfStorageApi'

// Die Brücke: Sie stellt der Oberfläche je zwei Funktionen für Spiele (window.gameStorage)
// und Regale (window.shelfStorage) bereit. Mehr vom Rechner bekommt die Oberfläche nicht zu sehen.
const gameStorage: GameStorageApi = {
  load: () => ipcRenderer.invoke(loadChannel),
  save: (games) => ipcRenderer.invoke(saveChannel, games),
}

const shelfStorage: ShelfStorageApi = {
  load: () => ipcRenderer.invoke(loadShelvesChannel),
  save: (shelves) => ipcRenderer.invoke(saveShelvesChannel, shelves),
}

contextBridge.exposeInMainWorld('gameStorage', gameStorage)
contextBridge.exposeInMainWorld('shelfStorage', shelfStorage)
