import type { Game } from '../domain/Game'
import type { ChangedCollection, GameCollection } from '../domain/GameCollection'
import { GameName } from '../domain/GameName'
import type { GameRepository } from '../domain/GameRepository'
import { PlayerCount } from '../domain/PlayerCount'
import { errorMessage, fail, type Result } from '../domain/Result'

// Die Eingaben aus dem Formular, noch ungeprüft als Text
export interface GameInput {
  // null = neues Spiel anlegen, sonst das Spiel, das bearbeitet wird
  editing: Game | null
  name: string
  playerCount: string
}

// Ablauf "Spiel speichern": Eingaben prüfen, in die Sammlung übernehmen und die Sammlung speichern.
// Ergebnis ist die neue Sammlung mit dem gespeicherten Spiel oder eine Fehlermeldung.
// Bei einem Fehler bleibt die bisherige Sammlung, wie sie war.
export async function saveGame(
  repository: GameRepository,
  collection: GameCollection,
  input: GameInput,
): Promise<Result<ChangedCollection>> {
  const editingId = input.editing?.id ?? null

  const name = GameName.create(input.name)
  if (!name.ok) return name

  // Den doppelten Namen melden wir vor einer falschen Spieleranzahl
  if (collection.isNameTaken(name.value, editingId)) {
    return fail(`Das Spiel "${name.value.text}" gibt es schon.`)
  }

  const playerCount = PlayerCount.fromInput(input.playerCount)
  if (!playerCount.ok) return playerCount

  const changed =
    editingId === null
      ? collection.add(name.value, playerCount.value)
      : collection.change(editingId, name.value, playerCount.value)
  if (!changed.ok) return changed

  try {
    await repository.save(changed.value.collection)
  } catch (error) {
    return fail(`Speichern hat nicht geklappt: ${errorMessage(error)}`)
  }
  return changed
}
