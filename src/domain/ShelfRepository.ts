import type { Result } from './Result'
import type { ShelfCollection } from './ShelfCollection'

// Beschreibt nur, WAS mit den Regalen möglich sein muss: laden und speichern.
// WIE das geschieht (Datei, Datenbank, ...), steht in src/infrastructure.
export interface ShelfRepository {
  // Regale laden. Gibt es noch keine, ist das kein Fehler, sondern eine leere Sammlung.
  load(): Promise<Result<ShelfCollection>>

  // Regale speichern. Klappt das nicht, gibt es eine Ausnahme (Error).
  save(shelves: ShelfCollection): Promise<void>
}
