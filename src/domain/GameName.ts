import { fail, ok, type Result } from './Result'

// Name eines Spiels (Value Object): nie leer, ohne Leerzeichen am Rand.
export class GameName {
  private constructor(readonly text: string) {}

  static create(input: string): Result<GameName> {
    const text = input.trim()

    if (text === '') {
      return fail('Bitte gib einen Spielnamen ein.')
    }
    return ok(new GameName(text))
  }

  // Zwei Namen gelten als gleich, wenn sie sich nur in Groß-/Kleinschreibung unterscheiden
  equals(other: GameName): boolean {
    return this.text.toUpperCase() === other.text.toUpperCase()
  }
}
