import { GameGenres } from './GameGenres'
import type { GameId } from './GameId'
import type { GameName } from './GameName'
import type { LastPlayed } from './LastPlayed'
import type { PlayerCount } from './PlayerCount'
import type { PlayTime } from './PlayTime'
import type { ShelfId } from './ShelfId'

// Die freiwilligen Angaben zu einem Spiel. null bedeutet: nicht ausgefüllt.
export interface GameDetails {
  playTime: PlayTime | null
  lastPlayed: LastPlayed | null
  genres: GameGenres
  // Das Regal, in dem das Spiel steht. Gemerkt wird die ID des Regals, nicht sein Name:
  // So muss das Spiel nicht angefasst werden, wenn das Regal umbenannt wird.
  shelfId: ShelfId | null
  description: string | null
}

// Ein Spiel, bei dem keine der freiwilligen Angaben ausgefüllt ist
export const noDetails: GameDetails = {
  playTime: null,
  lastPlayed: null,
  genres: GameGenres.none,
  shelfId: null,
  description: null,
}

// Ein Spiel der Sammlung (Entity).
// Zwei Spiele sind dasselbe Spiel, wenn ihre ID gleich ist, egal wie sie heißen.
// Ein Spiel wird nie verändert: Beim Bearbeiten entsteht ein neues mit derselben ID.
export class Game {
  constructor(
    readonly id: GameId,
    readonly name: GameName,
    readonly playerCount: PlayerCount,
    readonly details: GameDetails = noDetails,
  ) {}
}

// Beschreibung aufräumen: Leerzeichen am Rand weg. Bleibt nichts übrig, gibt es keine Beschreibung.
export function cleanDescription(input: string | null): string | null {
  const text = (input ?? '').trim()
  return text === '' ? null : text
}

// Ein Spiel als einfache Daten ohne Regeln, zum Speichern und Weiterreichen.
// null bedeutet bei den freiwilligen Angaben: nicht ausgefüllt.
export interface GameData {
  id: string
  name: string
  playerCount: number
  // Spieldauer in Minuten. Ist nur "playTimeMin" gesetzt, ist es eine einzelne Zahl, sonst von-bis.
  playTimeMin: number | null
  playTimeMax: number | null
  // true = nach oben offen ("ab ... Minuten"). Geht nur mit "playTimeMin" und ohne "playTimeMax".
  playTimeOpenEnded: boolean
  // Datum in der Form Jahr-Monat-Tag, z.B. "2026-11-12"
  lastPlayed: string | null
  // Kürzel der Genres, siehe GameGenres
  genre: string | null
  secondaryGenres: string[]
  // ID des Regals, in dem das Spiel steht
  shelfId: string | null
  description: string | null
}
