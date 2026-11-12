import type { GameCollection } from '../domain/GameCollection'
import type { GameRepository } from '../domain/GameRepository'
import { fail, ok, type Result } from '../domain/Result'
import type { ShelfCollection } from '../domain/ShelfCollection'
import type { ShelfRepository } from '../domain/ShelfRepository'

// Alles, was die App beim Start lädt: die Spiele und die Regale
export interface Library {
  games: GameCollection
  shelves: ShelfCollection
}

// Ablauf "Beim Start laden": Spiele und Regale laden und prüfen, ob sie zusammenpassen.
// Ergebnis ist beides zusammen oder die erste Fehlermeldung.
export async function loadLibrary(
  gameRepository: GameRepository,
  shelfRepository: ShelfRepository,
): Promise<Result<Library>> {
  const games = await gameRepository.load()
  if (!games.ok) return games

  const shelves = await shelfRepository.load()
  if (!shelves.ok) return shelves

  // Jedes Spiel darf nur in einem Regal stehen, das es auch gibt
  const lost = games.value.games.find(
    (game) => game.details.shelfId !== null && shelves.value.findById(game.details.shelfId) === null,
  )
  if (lost !== undefined) {
    return fail(`Das Spiel "${lost.name.text}" steht in einem Regal, das es nicht gibt.`)
  }

  return ok({ games: games.value, shelves: shelves.value })
}
