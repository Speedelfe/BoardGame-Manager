import { fail, ok, type Result } from './Result'

// Der Tag, an dem ein Spiel zuletzt gespielt wurde (Value Object). Nur das Datum, ohne Uhrzeit.
export class LastPlayed {
  // Das Datum als Text in der Form Jahr-Monat-Tag, z.B. "2026-11-12".
  // So speichert es die Datei, und so liefert es auch das Datumsfeld im Formular.
  private constructor(readonly isoDate: string) {}

  // Datum aus einem gespeicherten Text, z.B. aus der Datei
  static fromString(text: string): Result<LastPlayed> {
    const isoDate = text.trim()

    if (!isRealDate(isoDate)) {
      return fail(`"${text}" ist kein gültiges Datum.`)
    }
    return ok(new LastPlayed(isoDate))
  }

  // Datum aus dem Datumsfeld im Formular.
  // Das Datum ist freiwillig: Ist das Feld leer, ist das Ergebnis null.
  // Ein Tag in der Zukunft wird abgelehnt. "today" kann man für Tests vorgeben.
  static fromInput(input: string, today: string = todayIsoDate()): Result<LastPlayed | null> {
    if (input.trim() === '') {
      return ok(null)
    }

    const date = LastPlayed.fromString(input)
    if (!date.ok) return date

    // Bei der Form Jahr-Monat-Tag stimmt die Reihenfolge der Texte mit der der Tage überein
    if (date.value.isoDate > today) {
      return fail('"Zuletzt gespielt" darf nicht in der Zukunft liegen.')
    }
    return date
  }

  // Für die Anzeige: deutsche Schreibweise, z.B. "12.11.2026"
  get text(): string {
    const [year, month, day] = this.isoDate.split('-')
    return `${day}.${month}.${year}`
  }
}

// Der heutige Tag (nach der Uhr dieses Rechners) in der Form Jahr-Monat-Tag
export function todayIsoDate(): string {
  const now = new Date()
  const twoDigits = (value: number) => String(value).padStart(2, '0')

  return `${now.getFullYear()}-${twoDigits(now.getMonth() + 1)}-${twoDigits(now.getDate())}`
}

// Hat der Text die Form Jahr-Monat-Tag und gibt es diesen Tag wirklich (also kein 30. Februar)?
function isRealDate(isoDate: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (match === null) return false

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))

  // Einen 30. Februar würde "Date" stillschweigend zum 2. März machen. Dann passt der Tag nicht mehr.
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}
