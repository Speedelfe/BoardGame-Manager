import type { GameData } from '../../domain/Game'
import type { Result } from '../../domain/Result'

// Die Oberfläche darf selbst keine Dateien anfassen. Sie schickt deshalb Nachrichten
// an den Hintergrundteil (das nennt Electron "IPC"). Hier steht, welche Nachrichten es gibt.
// Über die Leitung gehen nur einfache Daten, keine Objekte mit Regeln.
export interface GameStorageApi {
  load(): Promise<Result<GameData[]>>
  save(games: GameData[]): Promise<Result<null>>
}

// Namen der Nachrichten
export const loadChannel = 'games:load'
export const saveChannel = 'games:save'
