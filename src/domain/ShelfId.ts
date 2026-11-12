import { fail, ok, type Result } from './Result'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// Feste, eindeutige Kennung eines Regals (Value Object).
// Ändert sich nie, auch nicht beim Umbenennen. So merkt sich ein Spiel sein Regal über die ID
// und muss nicht angefasst werden, wenn das Regal einen neuen Namen bekommt.
export class ShelfId {
  private constructor(readonly value: string) {}

  // Neue, zufällige ID für ein neues Regal
  static create(): ShelfId {
    return new ShelfId(globalThis.crypto.randomUUID())
  }

  // ID aus einem gespeicherten Text, z.B. aus der Datei
  static fromString(text: string): Result<ShelfId> {
    const value = text.trim().toLowerCase()

    if (!uuidPattern.test(value)) {
      return fail(`"${text}" ist keine gültige ID.`)
    }
    return ok(new ShelfId(value))
  }

  equals(other: ShelfId): boolean {
    return this.value === other.value
  }
}
