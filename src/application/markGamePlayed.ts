import type { Game } from '../domain/Game'
import type { ChangedCollection, GameCollection } from '../domain/GameCollection'
import type { GameRepository } from '../domain/GameRepository'
import { LastPlayed, todayIsoDate } from '../domain/LastPlayed'
import { errorMessage, fail, type Result } from '../domain/Result'

// Ablauf "Heute gespielt": bei einem Spiel "zuletzt gespielt" auf heute setzen
// und die Sammlung speichern. Alle anderen Angaben des Spiels bleiben, wie sie sind.
// Ergebnis ist die neue Sammlung mit dem geänderten Spiel oder eine Fehlermeldung.
// "today" (Form Jahr-Monat-Tag) kann man für Tests vorgeben.
export async function markGamePlayed(
  repository: GameRepository,
  collection: GameCollection,
  game: Game,
  today: string = todayIsoDate(),
): Promise<Result<ChangedCollection>> {
  const lastPlayed = LastPlayed.fromString(today)
  if (!lastPlayed.ok) return lastPlayed

  const changed = collection.change(game.id, game.name, game.playerCount, {
    ...game.details,
    lastPlayed: lastPlayed.value,
  })
  if (!changed.ok) return changed

  try {
    await repository.save(changed.value.collection)
  } catch (error) {
    return fail(`Speichern hat nicht geklappt: ${errorMessage(error)}`)
  }
  return changed
}
