import type { GameCollection } from '../domain/GameCollection'
import { errorMessage, fail, ok, type Result } from '../domain/Result'
import type { ShelfCollection } from '../domain/ShelfCollection'
import type { ShelfId } from '../domain/ShelfId'
import type { ShelfRepository } from '../domain/ShelfRepository'

// Ablauf "Regal löschen": aus den Regalen entfernen und die Regale speichern.
// Ein Regal, in dem noch Spiele stehen, kann nicht gelöscht werden.
// Dafür werden die Spiele gebraucht. Ergebnis sind die neuen Regale oder eine Fehlermeldung.
export async function removeShelf(
  repository: ShelfRepository,
  shelves: ShelfCollection,
  games: GameCollection,
  id: ShelfId,
): Promise<Result<ShelfCollection>> {
  const gameCount = games.gamesOnShelf(id).length
  if (gameCount > 0) {
    const stillThere = gameCount === 1 ? 'steht noch 1 Spiel' : `stehen noch ${gameCount} Spiele`
    return fail(`In diesem Regal ${stillThere}. Es kann erst gelöscht werden, wenn es leer ist.`)
  }

  const newShelves = shelves.remove(id)

  try {
    await repository.save(newShelves)
  } catch (error) {
    return fail(`Löschen hat nicht geklappt: ${errorMessage(error)}`)
  }
  return ok(newShelves)
}
