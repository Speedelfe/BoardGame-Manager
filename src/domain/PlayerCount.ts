import { fail, ok, type Result } from './Result'

// Spieleranzahl eines Spiels (Value Object): ganze Zahl von 1 bis max.
export class PlayerCount {
  // Größte erlaubte Spieleranzahl. Fängt Tippfehler wie 5000 ab.
  static readonly max = 100

  private constructor(readonly value: number) {}

  // Spieleranzahl aus einer Zahl, z.B. aus der Datei
  static fromNumber(value: number): Result<PlayerCount> {
    if (!Number.isInteger(value)) {
      return fail('Die Spieleranzahl muss eine Zahl sein.')
    }
    if (value < 1) {
      return fail('Die Spieleranzahl muss mindestens 1 sein.')
    }
    if (value > PlayerCount.max) {
      return fail(`Die Spieleranzahl darf höchstens ${PlayerCount.max} sein.`)
    }
    return ok(new PlayerCount(value))
  }

  // Spieleranzahl aus dem Text, der im Formular eingetippt wurde
  static fromInput(input: string): Result<PlayerCount> {
    const text = input.trim()

    // Nur ganze Zahlen, auf Wunsch mit Vorzeichen. "2.5" oder "vier" sind keine.
    if (!/^[+-]?\d+$/.test(text)) {
      return fail('Die Spieleranzahl muss eine Zahl sein.')
    }
    if (text.startsWith('-')) {
      return fail('Die Spieleranzahl muss mindestens 1 sein.')
    }

    // Riesige Zahlen an der Länge erkennen, damit auch sie die Meldung "höchstens ..." bekommen
    const digits = text.replace(/^\+/, '').replace(/^0+/, '')
    if (digits.length > String(PlayerCount.max).length) {
      return fail(`Die Spieleranzahl darf höchstens ${PlayerCount.max} sein.`)
    }
    return PlayerCount.fromNumber(Number(digits))
  }
}
