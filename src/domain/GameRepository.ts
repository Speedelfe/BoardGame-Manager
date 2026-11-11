import type { GameCollection } from './GameCollection'
import type { Result } from './Result'

// Beschreibt nur, WAS mit der Sammlung möglich sein muss: laden und speichern.
// WIE das geschieht (Datei, Datenbank, ...), steht in src/infrastructure.
// So bleibt die Fachlogik unabhängig vom Speicherort.
export interface GameRepository {
  // Sammlung laden. Gibt es noch keine, ist das kein Fehler, sondern eine leere Sammlung.
  load(): Promise<Result<GameCollection>>

  // Sammlung speichern. Klappt das nicht, gibt es eine Ausnahme (Error).
  save(collection: GameCollection): Promise<void>
}
