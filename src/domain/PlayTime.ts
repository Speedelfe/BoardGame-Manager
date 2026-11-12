import { fail, ok, type Result } from './Result'

// Spieldauer eines Spiels in Minuten (Value Object).
// Es gibt drei Formen:
// - eine einzelne Zahl (z.B. 45 Minuten)
// - ein Bereich von-bis (z.B. 30–60 Minuten)
// - nach oben offen (z.B. ab 60 Minuten), für Spiele, die beliebig lange dauern können
export class PlayTime {
  // Längste erlaubte Spieldauer: 24 Stunden. Fängt Tippfehler wie 50000 ab.
  static readonly maxMinutes = 1440

  // max = null bedeutet: es gibt kein "bis".
  // openEnded = true bedeutet: nach oben offen. Dann gibt es nie ein "bis".
  private constructor(
    readonly min: number,
    readonly max: number | null,
    readonly openEnded: boolean,
  ) {}

  // Spieldauer aus gespeicherten Werten, z.B. aus der Datei
  static fromNumbers(min: number, max: number | null, openEnded = false): Result<PlayTime> {
    const minProblem = minutesProblem(min)
    if (minProblem !== null) return fail(minProblem)

    if (openEnded) {
      return max === null
        ? ok(new PlayTime(min, null, true))
        : fail('Eine Spieldauer, die nach oben offen ist, kann kein "bis" haben.')
    }
    if (max === null) {
      return ok(new PlayTime(min, null, false))
    }

    const maxProblem = minutesProblem(max)
    if (maxProblem !== null) return fail(maxProblem)

    if (min > max) {
      return fail('Bei der Spieldauer darf "von" nicht größer als "bis" sein.')
    }
    // "60 bis 60" ist einfach "60"
    return ok(new PlayTime(min, min === max ? null : max, false))
  }

  // Spieldauer aus den Eingaben im Formular: die beiden Texte und das Häkchen "nach oben offen".
  // Die Spieldauer ist freiwillig: Ist nichts ausgefüllt, ist das Ergebnis null.
  static fromInput(
    minInput: string,
    maxInput: string,
    openEnded = false,
  ): Result<PlayTime | null> {
    const minText = minInput.trim()
    const maxText = maxInput.trim()

    if (minText === '' && maxText === '' && !openEnded) {
      return ok(null)
    }
    if (minText === '') {
      return fail('Bitte gib bei der Spieldauer zuerst "von" an.')
    }

    const min = minutesFromText(minText)
    if (!min.ok) return min

    if (maxText === '') {
      return PlayTime.fromNumbers(min.value, null, openEnded)
    }
    const max = minutesFromText(maxText)
    if (!max.ok) return max

    return PlayTime.fromNumbers(min.value, max.value, openEnded)
  }

  // Für die Anzeige: "45 Minuten", "30–60 Minuten" oder "ab 60 Minuten"
  get text(): string {
    if (this.max !== null) {
      return `${this.min}–${this.max} Minuten`
    }
    const minutes = this.min === 1 ? '1 Minute' : `${this.min} Minuten`
    return this.openEnded ? `ab ${minutes}` : minutes
  }
}

// Prüft eine Minutenzahl. Ohne Fehler ist das Ergebnis null.
function minutesProblem(minutes: number): string | null {
  if (!Number.isInteger(minutes)) {
    return 'Die Spieldauer muss eine ganze Zahl in Minuten sein.'
  }
  if (minutes < 1) {
    return 'Die Spieldauer muss mindestens 1 Minute sein.'
  }
  if (minutes > PlayTime.maxMinutes) {
    return `Die Spieldauer darf höchstens ${PlayTime.maxMinutes} Minuten sein.`
  }
  return null
}

// Macht aus eingetipptem Text eine Zahl. Erlaubt sind nur Ziffern, also kein "1,5" oder "eine Stunde".
function minutesFromText(text: string): Result<number> {
  if (!/^\d+$/.test(text)) {
    return fail('Die Spieldauer muss eine ganze Zahl in Minuten sein.')
  }

  // Riesige Zahlen an der Länge erkennen, damit auch sie die Meldung "höchstens ..." bekommen
  const digits = text.replace(/^0+/, '')
  if (digits.length > String(PlayTime.maxMinutes).length) {
    return fail(`Die Spieldauer darf höchstens ${PlayTime.maxMinutes} Minuten sein.`)
  }
  return ok(Number(digits))
}
