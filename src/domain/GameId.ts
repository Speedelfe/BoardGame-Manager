import { fail, ok, type Result } from './Result'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// Feste, eindeutige Kennung eines Spiels (Value Object).
// Ändert sich nie, auch nicht beim Umbenennen.
export class GameId {
  // Die "leere" ID aus lauter Nullen ist keine gültige Kennung
  static readonly emptyValue = '00000000-0000-0000-0000-000000000000'

  private constructor(readonly value: string) {}

  // Neue, zufällige ID für ein neues Spiel
  static create(): GameId {
    return new GameId(globalThis.crypto.randomUUID())
  }

  // ID aus einem gespeicherten Text, z.B. aus der Datei
  static fromString(text: string): Result<GameId> {
    const value = text.trim().toLowerCase()

    if (!uuidPattern.test(value)) {
      return fail(`"${text}" ist keine gültige ID.`)
    }
    if (value === GameId.emptyValue) {
      return fail('Die ID darf nicht leer sein.')
    }
    return ok(new GameId(value))
  }

  equals(other: GameId): boolean {
    return this.value === other.value
  }
}
