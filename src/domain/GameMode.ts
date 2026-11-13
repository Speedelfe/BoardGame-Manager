import { fail, ok, type Result } from './Result'

// Alle Spielmodi, die es gibt, in der Reihenfolge der Anzeige.
// Ein Spiel hat höchstens einen davon: Man spielt entweder miteinander oder gegeneinander.
// Diese Kürzel stehen auch in der Datei, deshalb sollten sie sich nicht mehr ändern.
export const gameModes = ['cooperative', 'competitive'] as const

export type GameMode = (typeof gameModes)[number]

// So heißen die Spielmodi in der Oberfläche
export const gameModeNames: Record<GameMode, string> = {
  cooperative: 'Kooperativ',
  competitive: 'Kompetitiv',
}

export function isGameMode(text: string): text is GameMode {
  return (gameModes as readonly string[]).includes(text)
}

// Spielmodus aus einem Kürzel, z.B. aus der Datei oder dem Formular.
// Der Spielmodus ist freiwillig: null bedeutet "keine Angabe" und bleibt null.
export function gameModeFromText(text: string | null): Result<GameMode | null> {
  if (text === null) {
    return ok(null)
  }
  return isGameMode(text) ? ok(text) : fail(`"${text}" ist kein bekannter Spielmodus.`)
}
