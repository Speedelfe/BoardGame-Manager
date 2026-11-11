import type { IpcMain } from 'electron'

import type { GameData } from '../../domain/Game'
import { GameCollection } from '../../domain/GameCollection'
import type { GameRepository } from '../../domain/GameRepository'
import { errorMessage, fail, ok, type Result } from '../../domain/Result'
import { loadChannel, saveChannel } from './gameStorageApi'

// Hintergrundteil: beantwortet die Nachrichten der Oberfläche mit Hilfe des Repositorys.
export function registerGameStorageHandlers(ipcMain: IpcMain, repository: GameRepository): void {
  ipcMain.handle(loadChannel, async (): Promise<Result<GameData[]>> => {
    const loaded = await repository.load()
    return loaded.ok ? ok(loaded.value.toData()) : loaded
  })

  ipcMain.handle(saveChannel, async (_event, games: GameData[]): Promise<Result<null>> => {
    // Was von der Oberfläche kommt, wird noch einmal geprüft, bevor es in der Datei landet
    const collection = GameCollection.restore(games)
    if (!collection.ok) return collection

    try {
      await repository.save(collection.value)
      return ok(null)
    } catch (error) {
      return fail(errorMessage(error))
    }
  })
}
