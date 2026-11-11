import type { GameId } from './GameId'
import type { GameName } from './GameName'
import type { PlayerCount } from './PlayerCount'

// Ein Spiel der Sammlung (Entity).
// Zwei Spiele sind dasselbe Spiel, wenn ihre ID gleich ist, egal wie sie heißen.
// Ein Spiel wird nie verändert: Beim Bearbeiten entsteht ein neues mit derselben ID.
export class Game {
  constructor(
    readonly id: GameId,
    readonly name: GameName,
    readonly playerCount: PlayerCount,
  ) {}
}

// Ein Spiel als einfache Daten ohne Regeln, zum Speichern und Weiterreichen.
export interface GameData {
  id: string
  name: string
  playerCount: number
}
