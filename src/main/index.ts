import { app, BrowserWindow, ipcMain } from 'electron'
import { join, resolve } from 'node:path'

import { registerGameStorageHandlers } from '../infrastructure/ipc/registerGameStorageHandlers'
import { registerShelfStorageHandlers } from '../infrastructure/ipc/registerShelfStorageHandlers'
import { JsonFileGameRepository } from '../infrastructure/JsonFileGameRepository'
import { JsonFileShelfRepository } from '../infrastructure/JsonFileShelfRepository'

// Der Hintergrundteil von Electron: öffnet das Fenster und kümmert sich um die Datei.

// Fester Speicherort der Spieleliste im Benutzerordner, derselbe wie in der alten F#-App.
// Windows: C:\Users\<Name>\AppData\Roaming\BoardGame-Manager\games.json
// Linux:   ~/.config/BoardGame-Manager/games.json
//
// Zum Ausprobieren kann man einen anderen Ordner angeben, damit die echte Sammlung unberührt bleibt:
// Umgebungsvariable BOARDGAME_MANAGER_DATA (siehe "npm run dev:test" in package.json).
const dataFolder = process.env['BOARDGAME_MANAGER_DATA']
  ? resolve(process.env['BOARDGAME_MANAGER_DATA'])
  : join(app.getPath('appData'), 'BoardGame-Manager')

// Electron legt eigene Hilfsdateien an (Zwischenspeicher usw.). Die kommen in einen Unterordner,
// damit sie nicht zwischen der Spieleliste herumliegen.
app.setPath('userData', join(dataFolder, 'electron'))

// Spiele und Regale liegen zusammen in derselben Datei
const dataPath = join(dataFolder, 'games.json')
registerGameStorageHandlers(ipcMain, new JsonFileGameRepository(dataPath))
registerShelfStorageHandlers(ipcMain, new JsonFileShelfRepository(dataPath))

function createWindow(): void {
  const window = new BrowserWindow({
    title: 'Boardgame Manager',
    // So groß, dass Formular und Details eines Spiels ohne Rollbalken hineinpassen
    width: 1000,
    height: 760,
    backgroundColor: '#1e1e1e',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  // Beim Entwickeln kommt die Oberfläche von einem Entwicklungsserver (Änderungen erscheinen sofort),
  // im fertigen Programm aus den gebauten Dateien.
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devServerUrl) {
    void window.loadURL(devServerUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

void app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})
