import { fail, ok, type Result } from './Result'

// Spieleranzahl eines Spiels (Value Object).
// Es gibt drei Formen, wie bei der Spieldauer:
// - eine einzelne Zahl (z.B. 4 Spieler)
// - ein Bereich von-bis (z.B. 2–5 Spieler)
// - nach oben offen (z.B. ab 4 Spieler), für Spiele ohne feste Höchstzahl
export class PlayerCount {
  // Größte erlaubte Spieleranzahl. Fängt Tippfehler wie 5000 ab.
  static readonly maxPlayers = 100

  // max = null bedeutet: es gibt kein "bis".
  // openEnded = true bedeutet: nach oben offen. Dann gibt es nie ein "bis".
  private constructor(
    readonly min: number,
    readonly max: number | null,
    readonly openEnded: boolean,
  ) {}

  // Spieleranzahl aus gespeicherten Werten, z.B. aus der Datei
  static fromNumbers(min: number, max: number | null, openEnded = false): Result<PlayerCount> {
    const minProblem = countProblem(min)
    if (minProblem !== null) return fail(minProblem)

    if (openEnded) {
      return max === null
        ? ok(new PlayerCount(min, null, true))
        : fail('Eine Spieleranzahl, die nach oben offen ist, kann kein "bis" haben.')
    }
    if (max === null) {
      return ok(new PlayerCount(min, null, false))
    }

    const maxProblem = countProblem(max)
    if (maxProblem !== null) return fail(maxProblem)

    if (min > max) {
      return fail('Bei der Spieleranzahl darf "von" nicht größer als "bis" sein.')
    }
    // "4 bis 4" ist einfach "4"
    return ok(new PlayerCount(min, min === max ? null : max, false))
  }

  // Spieleranzahl aus den Eingaben im Formular: die beiden Texte und das Häkchen "nach oben offen".
  // Anders als die Spieldauer ist die Spieleranzahl Pflicht: "von" muss ausgefüllt sein.
  static fromInput(minInput: string, maxInput = '', openEnded = false): Result<PlayerCount> {
    const minText = minInput.trim()
    const maxText = maxInput.trim()

    if (minText === '' && (maxText !== '' || openEnded)) {
      return fail('Bitte gib bei der Spieleranzahl zuerst "von" an.')
    }

    const min = countFromText(minText)
    if (!min.ok) return min

    if (maxText === '') {
      return PlayerCount.fromNumbers(min.value, null, openEnded)
    }
    const max = countFromText(maxText)
    if (!max.ok) return max

    return PlayerCount.fromNumbers(min.value, max.value, openEnded)
  }

  // Für die Anzeige: "4 Spieler", "2–5 Spieler" oder "ab 4 Spieler"
  get text(): string {
    if (this.max !== null) {
      return `${this.min}–${this.max} Spieler`
    }
    return this.openEnded ? `ab ${this.min} Spieler` : `${this.min} Spieler`
  }
}

// Prüft eine Anzahl. Ohne Fehler ist das Ergebnis null.
function countProblem(count: number): string | null {
  if (!Number.isInteger(count)) {
    return 'Die Spieleranzahl muss eine Zahl sein.'
  }
  if (count < 1) {
    return 'Die Spieleranzahl muss mindestens 1 sein.'
  }
  if (count > PlayerCount.maxPlayers) {
    return `Die Spieleranzahl darf höchstens ${PlayerCount.maxPlayers} sein.`
  }
  return null
}

// Macht aus eingetipptem Text eine Zahl. Erlaubt sind nur Ziffern, also kein "2.5", "+4" oder "vier".
function countFromText(text: string): Result<number> {
  if (!/^\d+$/.test(text)) {
    return fail('Die Spieleranzahl muss eine Zahl sein.')
  }

  // Riesige Zahlen an der Länge erkennen, damit auch sie die Meldung "höchstens ..." bekommen
  const digits = text.replace(/^0+/, '')
  if (digits.length > String(PlayerCount.maxPlayers).length) {
    return fail(`Die Spieleranzahl darf höchstens ${PlayerCount.maxPlayers} sein.`)
  }
  return ok(Number(digits))
}
