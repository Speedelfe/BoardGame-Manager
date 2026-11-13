import { fail, ok, type Result } from './Result'

// Alle Genres, die es gibt, in der Reihenfolge der Auswahlliste:
// alphabetisch nach dem deutschen Namen, "Sonstiges" am Ende.
// Die Liste mischt mit Absicht, was für eine Art Spiel es ist (z.B. Familie, Party)
// und wie es funktioniert (z.B. Deckbuilding, Legespiel).
// Diese Kürzel stehen auch in der Datei, deshalb sollten sie sich nicht mehr ändern.
// Die Reihenfolge darf sich ändern, sie steht nicht in der Datei.
export const genres = [
  'deckBuilding',
  'deduction',
  'engineBuilder',
  'family',
  'dexterity',
  'card',
  'children',
  'tilePlacement',
  'party',
  'quiz',
  'puzzle',
  'rollAndWrite',
  'setCollection',
  'trickTaking',
  'strategy',
  'workerPlacement',
  'word',
  'dice',
  'other',
] as const

export type Genre = (typeof genres)[number]

// So heißen die Genres in der Oberfläche
export const genreNames: Record<Genre, string> = {
  deckBuilding: 'Deckbuilding',
  deduction: 'Deduktion und Bluff',
  engineBuilder: 'Enginebuilder',
  family: 'Familie',
  dexterity: 'Geschicklichkeit',
  card: 'Karten',
  children: 'Kinder',
  tilePlacement: 'Legespiel',
  party: 'Party',
  quiz: 'Quiz',
  puzzle: 'Rätsel',
  rollAndWrite: 'Roll & Write',
  setCollection: 'Sammelspiel',
  trickTaking: 'Stichspiel',
  strategy: 'Strategie',
  workerPlacement: 'Worker Placement',
  word: 'Wortspiel',
  dice: 'Würfel',
  other: 'Sonstiges',
}

export function isGenre(text: string): text is Genre {
  return (genres as readonly string[]).includes(text)
}

// Genre und Nebengenres eines Spiels (Value Object). Beides ist freiwillig.
// Regeln: Nebengenres gibt es nur zusammen mit einem Genre,
// und das Genre kann nicht zugleich Nebengenre sein.
export class GameGenres {
  // Weder Genre noch Nebengenres
  static readonly none = new GameGenres(null, [])

  // Die Nebengenres stehen immer in der Reihenfolge der Auswahlliste, keins doppelt
  private constructor(
    readonly main: Genre | null,
    readonly secondary: readonly Genre[],
  ) {}

  // Aus Kürzeln, z.B. aus der Datei oder dem Formular. null = kein Genre gewählt.
  static create(main: string | null, secondary: readonly string[]): Result<GameGenres> {
    const unknown = [...(main === null ? [] : [main]), ...secondary].find((text) => !isGenre(text))
    if (unknown !== undefined) {
      return fail(`"${unknown}" ist kein bekanntes Genre.`)
    }

    if (main === null) {
      return secondary.length === 0
        ? ok(GameGenres.none)
        : fail('Nebengenres gehen nur zusammen mit einem Genre.')
    }
    if (secondary.includes(main)) {
      return fail('Das Genre kann nicht zugleich Nebengenre sein.')
    }

    const sorted = genres.filter((genre) => secondary.includes(genre))
    return ok(new GameGenres(main as Genre, sorted))
  }

  // Ist mindestens eins dieser Genres das Genre oder ein Nebengenre?
  hasAnyOf(wanted: readonly Genre[]): boolean {
    return wanted.some((genre) => genre === this.main || this.secondary.includes(genre))
  }
}
