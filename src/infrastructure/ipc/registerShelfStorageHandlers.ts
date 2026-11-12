import type { IpcMain } from 'electron'

import { errorMessage, fail, ok, type Result } from '../../domain/Result'
import type { ShelfData } from '../../domain/Shelf'
import { ShelfCollection } from '../../domain/ShelfCollection'
import type { ShelfRepository } from '../../domain/ShelfRepository'
import { loadShelvesChannel, saveShelvesChannel } from './shelfStorageApi'

// Hintergrundteil: beantwortet die Nachrichten der Oberfläche zu den Regalen mit Hilfe des Repositorys.
export function registerShelfStorageHandlers(ipcMain: IpcMain, repository: ShelfRepository): void {
  ipcMain.handle(loadShelvesChannel, async (): Promise<Result<ShelfData[]>> => {
    const loaded = await repository.load()
    return loaded.ok ? ok(loaded.value.toData()) : loaded
  })

  ipcMain.handle(
    saveShelvesChannel,
    async (_event, shelves: ShelfData[]): Promise<Result<null>> => {
      // Was von der Oberfläche kommt, wird noch einmal geprüft, bevor es in der Datei landet
      const collection = ShelfCollection.restore(shelves)
      if (!collection.ok) return collection

      try {
        await repository.save(collection.value)
        return ok(null)
      } catch (error) {
        return fail(errorMessage(error))
      }
    },
  )
}
