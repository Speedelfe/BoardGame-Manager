import type { Result } from '../../domain/Result'
import { ShelfCollection } from '../../domain/ShelfCollection'
import type { ShelfRepository } from '../../domain/ShelfRepository'
import type { ShelfStorageApi } from './shelfStorageApi'

// Repository für die Oberfläche: lädt und speichert die Regale, indem es den Hintergrundteil fragt.
export class IpcShelfRepository implements ShelfRepository {
  constructor(private readonly api: ShelfStorageApi) {}

  async load(): Promise<Result<ShelfCollection>> {
    const loaded = await this.api.load()
    return loaded.ok ? ShelfCollection.restore(loaded.value) : loaded
  }

  async save(shelves: ShelfCollection): Promise<void> {
    const saved = await this.api.save(shelves.toData())
    if (!saved.ok) {
      throw new Error(saved.error)
    }
  }
}
