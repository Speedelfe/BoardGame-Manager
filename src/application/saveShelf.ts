import { errorMessage, fail, type Result } from '../domain/Result'
import type { Shelf } from '../domain/Shelf'
import type { ChangedShelves, ShelfCollection } from '../domain/ShelfCollection'
import { ShelfName } from '../domain/ShelfName'
import type { ShelfRepository } from '../domain/ShelfRepository'

// Die Eingaben aus dem Formular, noch ungeprüft als Text
export interface ShelfInput {
  // null = neues Regal anlegen, sonst das Regal, das umbenannt wird
  editing: Shelf | null
  name: string
}

// Ablauf "Regal speichern": Eingabe prüfen, in die Regale übernehmen und die Regale speichern.
// Ergebnis sind die neuen Regale mit dem gespeicherten Regal oder eine Fehlermeldung.
// Bei einem Fehler bleiben die bisherigen Regale, wie sie waren.
export async function saveShelf(
  repository: ShelfRepository,
  shelves: ShelfCollection,
  input: ShelfInput,
): Promise<Result<ChangedShelves>> {
  const name = ShelfName.create(input.name)
  if (!name.ok) return name

  const changed =
    input.editing === null ? shelves.add(name.value) : shelves.rename(input.editing.id, name.value)
  if (!changed.ok) return changed

  try {
    await repository.save(changed.value.shelves)
  } catch (error) {
    return fail(`Speichern hat nicht geklappt: ${errorMessage(error)}`)
  }
  return changed
}
