import type { GameCollection } from '../domain/GameCollection'
import type { GameId } from '../domain/GameId'
import type { GameRepository } from '../domain/GameRepository'
import { errorMessage, fail, ok, type Result } from '../domain/Result'

// Ablauf "Spiel löschen": aus der Sammlung entfernen und die Sammlung speichern.
// Ergebnis ist die neue Sammlung oder eine Fehlermeldung.
export async function removeGame(
  repository: GameRepository,
  collection: GameCollection,
  id: GameId,
): Promise<Result<GameCollection>> {
  const newCollection = collection.remove(id)

  try {
    await repository.save(newCollection)
  } catch (error) {
    return fail(`Löschen hat nicht geklappt: ${errorMessage(error)}`)
  }
  return ok(newCollection)
}
