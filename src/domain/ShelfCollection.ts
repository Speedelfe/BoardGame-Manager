import { fail, ok, type Result } from './Result'
import { Shelf, type ShelfData } from './Shelf'
import { ShelfId } from './ShelfId'
import { ShelfName } from './ShelfName'

// Deutsche Sortierregeln, unabhängig von der Spracheinstellung des Rechners:
// Groß-/Kleinschreibung egal, Umlaute wie im Wörterbuch (Ä bei A).
const germanOrder = new Intl.Collator('de-DE')

// Ergebnis von "Regal hinzufügen" und "Regal umbenennen": die neue Sammlung und das betroffene Regal
export interface ChangedShelves {
  shelves: ShelfCollection
  shelf: Shelf
}

// Alle Regale (Aggregate).
// Sie achtet auf die Regeln, die mehrere Regale betreffen: keine ID und kein Name doppelt.
// Eine Sammlung wird nie verändert: Jede Änderung ergibt eine neue Sammlung.
export class ShelfCollection {
  // Regale in der Reihenfolge, in der sie angelegt wurden
  private constructor(readonly shelves: readonly Shelf[]) {}

  static empty(): ShelfCollection {
    return new ShelfCollection([])
  }

  // Sammlung aus gespeicherten Daten wieder aufbauen und dabei alles prüfen.
  // Beim ersten Fehler wird nicht weitergeprüft.
  static restore(data: readonly ShelfData[]): Result<ShelfCollection> {
    let collection = ShelfCollection.empty()

    for (const entry of data) {
      const id = ShelfId.fromString(entry.id)
      if (!id.ok) return fail(`Regal "${entry.name}": ${id.error}`)
      const name = ShelfName.create(entry.name)
      if (!name.ok) return fail(`Das Regal mit der ID ${entry.id} hat keinen Namen.`)

      if (collection.findById(id.value) !== null) {
        return fail(`Die Regal-ID ${id.value.value} gibt es mehrfach.`)
      }
      if (collection.isNameTaken(name.value)) {
        return fail(`Den Regalnamen "${name.value.text}" gibt es mehrfach.`)
      }
      collection = new ShelfCollection([...collection.shelves, new Shelf(id.value, name.value)])
    }
    return ok(collection)
  }

  // Die Sammlung als einfache Daten, zum Speichern
  toData(): ShelfData[] {
    return this.shelves.map((shelf) => ({ id: shelf.id.value, name: shelf.name.text }))
  }

  // Für die Anzeige: alphabetisch nach Namen. Die Sammlung selbst behält ihre Reihenfolge.
  sortedByName(): Shelf[] {
    return [...this.shelves].sort((a, b) => germanOrder.compare(a.name.text, b.name.text))
  }

  findById(id: ShelfId): Shelf | null {
    return this.shelves.find((shelf) => shelf.id.equals(id)) ?? null
  }

  // Gibt es den Namen schon bei einem anderen Regal?
  // Beim Umbenennen darf ein Regal seinen eigenen Namen behalten, deshalb lässt man es mit "except" weg.
  isNameTaken(name: ShelfName, except: ShelfId | null = null): boolean {
    return this.shelves.some(
      (shelf) => shelf.name.equals(name) && !(except !== null && shelf.id.equals(except)),
    )
  }

  // Neues Regal hinten anhängen. Es bekommt eine neue ID.
  add(name: ShelfName): Result<ChangedShelves> {
    if (this.isNameTaken(name)) {
      return fail(nameTakenMessage(name))
    }

    const shelf = new Shelf(ShelfId.create(), name)
    return ok({ shelves: new ShelfCollection([...this.shelves, shelf]), shelf })
  }

  // Vorhandenes Regal umbenennen. Es behält seine ID und seinen Platz in der Sammlung.
  rename(id: ShelfId, name: ShelfName): Result<ChangedShelves> {
    if (this.findById(id) === null) {
      return fail('Dieses Regal gibt es nicht mehr.')
    }
    if (this.isNameTaken(name, id)) {
      return fail(nameTakenMessage(name))
    }

    const shelf = new Shelf(id, name)
    const shelves = this.shelves.map((existing) => (existing.id.equals(id) ? shelf : existing))
    return ok({ shelves: new ShelfCollection(shelves), shelf })
  }

  // Regal mit dieser ID entfernen. Gibt es das Regal nicht, bleibt alles, wie es ist.
  remove(id: ShelfId): ShelfCollection {
    return new ShelfCollection(this.shelves.filter((shelf) => !shelf.id.equals(id)))
  }
}

function nameTakenMessage(name: ShelfName): string {
  return `Das Regal "${name.text}" gibt es schon.`
}
