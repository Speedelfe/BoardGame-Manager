import type { ShelfId } from './ShelfId'
import type { ShelfName } from './ShelfName'

// Ein Regal (Schrankplatz), in dem Spiele stehen können (Entity).
// Zwei Regale sind dasselbe Regal, wenn ihre ID gleich ist, egal wie sie heißen.
// Ein Regal wird nie verändert: Beim Umbenennen entsteht ein neues mit derselben ID.
export class Shelf {
  constructor(
    readonly id: ShelfId,
    readonly name: ShelfName,
  ) {}
}

// Ein Regal als einfache Daten ohne Regeln, zum Speichern und Weiterreichen.
export interface ShelfData {
  id: string
  name: string
}
