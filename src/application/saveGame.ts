import { cleanDescription, type Game, type GameDetails } from '../domain/Game'
import type { ChangedCollection, GameCollection } from '../domain/GameCollection'
import { GameGenres } from '../domain/GameGenres'
import { GameName } from '../domain/GameName'
import type { GameRepository } from '../domain/GameRepository'
import { LastPlayed } from '../domain/LastPlayed'
import { PlayerCount } from '../domain/PlayerCount'
import { PlayTime } from '../domain/PlayTime'
import { errorMessage, fail, ok, type Result } from '../domain/Result'
import type { ShelfCollection } from '../domain/ShelfCollection'
import { ShelfId } from '../domain/ShelfId'

// Die Eingaben aus dem Formular, noch ungeprüft als Text
export interface GameInput {
  // null = neues Spiel anlegen, sonst das Spiel, das bearbeitet wird
  editing: Game | null
  name: string
  // Spieleranzahl: "von" ist Pflicht, "bis" und das Häkchen "nach oben offen" sind freiwillig
  playerCountMin: string
  playerCountMax: string
  playerCountOpenEnded: boolean
  // Die freiwilligen Angaben. Leerer Text (bzw. leere Liste) bedeutet: nicht ausgefüllt.
  playTimeMin: string
  playTimeMax: string
  // Häkchen "nach oben offen"
  playTimeOpenEnded: boolean
  lastPlayed: string
  genre: string
  secondaryGenres: readonly string[]
  // ID des gewählten Regals
  shelfId: string
  description: string
}

// Ablauf "Spiel speichern": Eingaben prüfen, in die Sammlung übernehmen und die Sammlung speichern.
// Ergebnis ist die neue Sammlung mit dem gespeicherten Spiel oder eine Fehlermeldung.
// Bei einem Fehler bleibt die bisherige Sammlung, wie sie war.
// Die Regale werden gebraucht, um zu prüfen, ob es das gewählte Regal gibt.
export async function saveGame(
  repository: GameRepository,
  collection: GameCollection,
  shelves: ShelfCollection,
  input: GameInput,
): Promise<Result<ChangedCollection>> {
  const editingId = input.editing?.id ?? null

  const name = GameName.create(input.name)
  if (!name.ok) return name

  // Den doppelten Namen melden wir vor einer falschen Spieleranzahl
  if (collection.isNameTaken(name.value, editingId)) {
    return fail(`Das Spiel "${name.value.text}" gibt es schon.`)
  }

  const playerCount = PlayerCount.fromInput(
    input.playerCountMin,
    input.playerCountMax,
    input.playerCountOpenEnded,
  )
  if (!playerCount.ok) return playerCount

  const playTime = PlayTime.fromInput(
    input.playTimeMin,
    input.playTimeMax,
    input.playTimeOpenEnded,
  )
  if (!playTime.ok) return playTime

  const lastPlayed = LastPlayed.fromInput(input.lastPlayed)
  if (!lastPlayed.ok) return lastPlayed

  const genres = GameGenres.create(input.genre === '' ? null : input.genre, input.secondaryGenres)
  if (!genres.ok) return genres

  const shelfId = chosenShelfId(shelves, input.shelfId)
  if (!shelfId.ok) return shelfId

  const details: GameDetails = {
    playTime: playTime.value,
    lastPlayed: lastPlayed.value,
    genres: genres.value,
    shelfId: shelfId.value,
    description: cleanDescription(input.description),
  }

  const changed =
    editingId === null
      ? collection.add(name.value, playerCount.value, details)
      : collection.change(editingId, name.value, playerCount.value, details)
  if (!changed.ok) return changed

  try {
    await repository.save(changed.value.collection)
  } catch (error) {
    return fail(`Speichern hat nicht geklappt: ${errorMessage(error)}`)
  }
  return changed
}

// Die ID des gewählten Regals. Das Regal ist freiwillig: Ist nichts gewählt, ist das Ergebnis null.
// Ein Regal, das es nicht (mehr) gibt, wird abgelehnt.
function chosenShelfId(shelves: ShelfCollection, input: string): Result<ShelfId | null> {
  if (input === '') {
    return ok(null)
  }

  const id = ShelfId.fromString(input)
  if (!id.ok || shelves.findById(id.value) === null) {
    return fail('Das gewählte Regal gibt es nicht mehr.')
  }
  return id
}
