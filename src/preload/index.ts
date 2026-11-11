import { contextBridge, ipcRenderer } from 'electron'

import {
  loadChannel,
  saveChannel,
  type GameStorageApi,
} from '../infrastructure/ipc/gameStorageApi'

// Die Brücke: Sie stellt der Oberfläche genau zwei Funktionen bereit (window.gameStorage).
// Mehr vom Rechner bekommt die Oberfläche nicht zu sehen.
const gameStorage: GameStorageApi = {
  load: () => ipcRenderer.invoke(loadChannel),
  save: (games) => ipcRenderer.invoke(saveChannel, games),
}

contextBridge.exposeInMainWorld('gameStorage', gameStorage)
