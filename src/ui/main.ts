import { createApp } from 'vue'

import { IpcGameRepository } from '../infrastructure/ipc/IpcGameRepository'
import { IpcShelfRepository } from '../infrastructure/ipc/IpcShelfRepository'
import App from './App.vue'
import { createGameManager } from './gameManager'
import './style.css'

// Hier wird alles zusammengesteckt: Die Repositorys sprechen über die Brücke mit dem Hintergrundteil,
// der Programmablauf bekommt die Repositorys, und die Vue-App bekommt den Programmablauf.
const manager = createGameManager({
  games: new IpcGameRepository(window.gameStorage),
  shelves: new IpcShelfRepository(window.shelfStorage),
})

// Erst laden, dann anzeigen. So kann niemand speichern, bevor die Sammlung gelesen wurde.
void manager.load().then(() => {
  createApp(App, { manager }).mount('#app')
})
