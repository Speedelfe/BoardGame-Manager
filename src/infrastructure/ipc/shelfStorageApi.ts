import type { Result } from '../../domain/Result'
import type { ShelfData } from '../../domain/Shelf'

// Wie bei den Spielen (siehe gameStorageApi.ts): Die Oberfläche schickt Nachrichten
// an den Hintergrundteil, um die Regale zu laden und zu speichern.
// Über die Leitung gehen nur einfache Daten, keine Objekte mit Regeln.
export interface ShelfStorageApi {
  load(): Promise<Result<ShelfData[]>>
  save(shelves: ShelfData[]): Promise<Result<null>>
}

// Namen der Nachrichten
export const loadShelvesChannel = 'shelves:load'
export const saveShelvesChannel = 'shelves:save'
