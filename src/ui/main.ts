import { createApp } from 'vue'

import { IpcGameRepository } from '../infrastructure/ipc/IpcGameRepository'
import App from './App.vue'
import { createGameManager } from './gameManager'
import './style.css'

// Hier wird alles zusammengesteckt: Das Repository spricht über die Brücke mit dem Hintergrundteil,
// der Programmablauf bekommt das Repository, und die Vue-App bekommt den Programmablauf.
const manager = createGameManager(new IpcGameRepository(window.gameStorage))

// Erst laden, dann anzeigen. So kann niemand speichern, bevor die Sammlung gelesen wurde.
void manager.load().then(() => {
  createApp(App, { manager }).mount('#app')
})
