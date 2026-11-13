// Beispielspiele und Helfer, die alle Tests benutzen können
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import type { Game, GameData } from '../src/domain/Game'
import { GameCollection } from '../src/domain/GameCollection'
import type { GameRepository } from '../src/domain/GameRepository'
import { ok, type Result } from '../src/domain/Result'
import type { Shelf, ShelfData } from '../src/domain/Shelf'
import { ShelfCollection } from '../src/domain/ShelfCollection'
import type { ShelfRepository } from '../src/domain/ShelfRepository'

// Die freiwilligen Angaben eines Spiels, alle nicht ausgefüllt
export const noDetailsData = {
  playTimeMin: null,
  playTimeMax: null,
  playTimeOpenEnded: false,
  lastPlayed: null,
  genre: null,
  secondaryGenres: [],
  shelfId: null,
  description: null,
}

// Zwei Regale mit festen IDs
export const sofaShelfData: ShelfData = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Sofaschrank',
}

export const bueroShelfData: ShelfData = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'Büroregal',
}

// Feste IDs, damit man sie in Tests und Fehlermeldungen wiedererkennt.
// Dixit hat keine freiwilligen Angaben, Azul nur eine einzelne Spieldauer, Flügelschlag alle
// (es steht im Sofaschrank). Flügelschlag hat auch als einziges eine Spieleranzahl von-bis.
export const dixitData: GameData = {
  ...noDetailsData,
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Dixit',
  playerCountMin: 3,
  playerCountMax: null,
  playerCountOpenEnded: false,
}

export const azulData: GameData = {
  ...noDetailsData,
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Azul',
  playerCountMin: 4,
  playerCountMax: null,
  playerCountOpenEnded: false,
  playTimeMin: 45,
}

export const fluegelschlagData: GameData = {
  id: '33333333-3333-3333-3333-333333333333',
  name: 'Flügelschlag',
  playerCountMin: 1,
  playerCountMax: 5,
  playerCountOpenEnded: false,
  playTimeMin: 40,
  playTimeMax: 70,
  playTimeOpenEnded: false,
  lastPlayed: '2026-10-03',
  genre: 'engineBuilder',
  secondaryGenres: ['strategy', 'card'],
  shelfId: sofaShelfData.id,
  description: 'Vögel sammeln.\nSchön ruhig.',
}

export const gamesData: GameData[] = [dixitData, azulData, fluegelschlagData]

// Erwartet ein Ok und gibt den Wert zurück, sonst schlägt der Test fehl
export function expectOk<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`Ok erwartet, aber Fehler: ${result.error}`)
  }
  return result.value
}

// Erwartet einen Fehler und gibt die Meldung zurück, sonst schlägt der Test fehl
export function expectError<T>(result: Result<T>): string {
  if (result.ok) {
    throw new Error(`Fehler erwartet, aber Ok: ${JSON.stringify(result.value)}`)
  }
  return result.error
}

// Sammlung aus einfachen Daten. Die Daten müssen gültig sein.
export function collectionOf(data: GameData[]): GameCollection {
  return expectOk(GameCollection.restore(data))
}

// Die drei Beispielspiele als Sammlung und einzeln
export const games = collectionOf(gamesData)
export const [dixit, azul, fluegelschlag] = games.games as [Game, Game, Game]

// Die beiden Beispielregale als Sammlung und einzeln
export const shelves = expectOk(ShelfCollection.restore([sofaShelfData, bueroShelfData]))
export const [sofaShelf, bueroShelf] = shelves.shelves as [Shelf, Shelf]

// Nur die Namen, damit Vergleiche gut lesbar sind
export function names(gameList: readonly Game[]): string[] {
  return gameList.map((game) => game.name.text)
}

// Repository für Tests, das nur im Arbeitsspeicher "speichert" und mitzählt
export class MemoryGameRepository implements GameRepository {
  saved: GameCollection | null = null
  saveCount = 0

  constructor(private readonly stored: GameCollection = GameCollection.empty()) {}

  async load(): Promise<Result<GameCollection>> {
    return ok(this.saved ?? this.stored)
  }

  async save(collection: GameCollection): Promise<void> {
    this.saved = collection
    this.saveCount += 1
  }
}

// Dasselbe für die Regale
export class MemoryShelfRepository implements ShelfRepository {
  saved: ShelfCollection | null = null
  saveCount = 0

  constructor(private readonly stored: ShelfCollection = ShelfCollection.empty()) {}

  async load(): Promise<Result<ShelfCollection>> {
    return ok(this.saved ?? this.stored)
  }

  async save(shelfCollection: ShelfCollection): Promise<void> {
    this.saved = shelfCollection
    this.saveCount += 1
  }
}

// Legt einen frischen, leeren Ordner an, führt den Test damit aus
// und löscht den Ordner danach wieder (auch wenn der Test fehlschlägt).
// Die Ordner liegen im Projekt unter tests/.tmp, nie in der echten Spielesammlung.
export async function withTestFolder(test: (folder: string) => Promise<void>): Promise<void> {
  const folder = join(import.meta.dirname, '.tmp', crypto.randomUUID())
  await mkdir(folder, { recursive: true })

  try {
    await test(folder)
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
}
