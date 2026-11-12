import { fail, ok, type Result } from './Result'

// Name eines Regals (Value Object): nie leer, ohne Leerzeichen am Rand.
export class ShelfName {
  private constructor(readonly text: string) {}

  static create(input: string): Result<ShelfName> {
    const text = input.trim()

    if (text === '') {
      return fail('Bitte gib einen Namen für das Regal ein.')
    }
    return ok(new ShelfName(text))
  }

  // Zwei Namen gelten als gleich, wenn sie sich nur in Groß-/Kleinschreibung unterscheiden
  equals(other: ShelfName): boolean {
    return this.text.toUpperCase() === other.text.toUpperCase()
  }
}
