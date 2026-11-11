import { GameCollection } from '../../domain/GameCollection'
import type { GameRepository } from '../../domain/GameRepository'
import type { Result } from '../../domain/Result'
import type { GameStorageApi } from './gameStorageApi'

// Repository für die Oberfläche: lädt und speichert, indem es den Hintergrundteil fragt.
export class IpcGameRepository implements GameRepository {
  constructor(private readonly api: GameStorageApi) {}

  async load(): Promise<Result<GameCollection>> {
    const loaded = await this.api.load()
    return loaded.ok ? GameCollection.restore(loaded.value) : loaded
  }

  async save(collection: GameCollection): Promise<void> {
    const saved = await this.api.save(collection.toData())
    if (!saved.ok) {
      throw new Error(saved.error)
    }
  }
}
