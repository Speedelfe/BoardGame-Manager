import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import type { GameData } from '../domain/Game'
import { GameCollection } from '../domain/GameCollection'
import type { GameRepository } from '../domain/GameRepository'
import { errorMessage, fail, ok, type Result } from '../domain/Result'
import { isObject, readJson, writeListToJsonFile } from './jsonFile'

// So steht ein Spiel in der Datei. Das Format ist dasselbe wie in der alten F#-App,
// deshalb heißt die Spieleranzahl hier weiter "playerNumbers".
// Die freiwilligen Angaben kannte die alte App noch nicht. Sie dürfen in der Datei fehlen.
interface StoredGame {
  id: string
  name: string
  playerNumbers: number
  playTimeMin: number | null
  playTimeMax: number | null
  playTimeOpenEnded: boolean
  lastPlayed: string | null
  genre: string | null
  secondaryGenres: string[]
  description: string | null
}

// Speichert die Sammlung als Liste "gameList" in einer JSON-Datei.
// In derselben Datei liegen auch die Regale (siehe JsonFileShelfRepository).
// Läuft nur im Hintergrundteil von Electron (Node).
export class JsonFileGameRepository implements GameRepository {
  constructor(private readonly dataPath: string) {}

  // Gibt es die Datei noch nicht, ist das kein Fehler, sondern eine leere Sammlung.
  async load(): Promise<Result<GameCollection>> {
    if (!existsSync(this.dataPath)) {
      return ok(GameCollection.empty())
    }

    // Erst lesen, dann IDs und Inhalt prüfen. Bei einem Fehler wird nicht weitergeprüft.
    let result: Result<GameCollection>
    try {
      const data = readGameList(await readJson(this.dataPath))
      result = data.ok ? GameCollection.restore(data.value) : data
    } catch (error) {
      result = fail(errorMessage(error))
    }

    if (result.ok) return result
    return fail(
      `Die Spieleliste (${resolve(this.dataPath)}) konnte nicht gelesen werden: ${result.error}`,
    )
  }

  // Ersetzt nur die Spiele in der Datei, die Regale bleiben, wie sie sind.
  // Wie sicher geschrieben wird (Hilfsdatei, Sicherungskopie), steht in jsonFile.ts.
  async save(collection: GameCollection): Promise<void> {
    const gameList: StoredGame[] = collection.toData().map((game) => ({
      id: game.id,
      name: game.name,
      playerNumbers: game.playerCount,
      playTimeMin: game.playTimeMin,
      playTimeMax: game.playTimeMax,
      playTimeOpenEnded: game.playTimeOpenEnded,
      lastPlayed: game.lastPlayed,
      genre: game.genre,
      secondaryGenres: game.secondaryGenres,
      description: game.description,
    }))
    await writeListToJsonFile(this.dataPath, 'gameList', gameList)
  }
}

// Prüft, ob der Inhalt der Datei die erwartete Form hat, und übersetzt ihn in einfache Spieldaten.
function readGameList(content: unknown): Result<GameData[]> {
  if (!isObject(content)) {
    return fail('Das Feld "gameList" mit der Liste der Spiele fehlt.')
  }
  // Eine Datei, in der bisher nur Regale stehen, hat noch keine Spiele
  const gameList = content['gameList'] ?? []
  if (!Array.isArray(gameList)) {
    return fail('Das Feld "gameList" ist keine Liste.')
  }

  const games: GameData[] = []
  for (const [index, entry] of gameList.entries()) {
    const position = `Spiel Nr. ${index + 1}`

    if (!isObject(entry)) {
      return fail(`${position} ist kein gültiger Eintrag.`)
    }
    const { id, name, playerNumbers } = entry
    if (typeof id !== 'string') {
      return fail(`${position}: Das Feld "id" fehlt oder ist kein Text.`)
    }
    if (typeof name !== 'string') {
      return fail(`${position}: Das Feld "name" fehlt oder ist kein Text.`)
    }
    if (typeof playerNumbers !== 'number') {
      return fail(`${position}: Das Feld "playerNumbers" fehlt oder ist keine Zahl.`)
    }

    // Freiwillige Angaben: Fehlt ein Feld (oder ist es null), gilt es als nicht ausgefüllt
    const field = (fieldName: string) => `${position}: Das Feld "${fieldName}"`
    const { playTimeMin, playTimeMax, lastPlayed, genre, description } = entry
    const secondaryGenres = entry['secondaryGenres'] ?? []
    const playTimeOpenEnded = entry['playTimeOpenEnded'] ?? false

    if (!isNumberOrMissing(playTimeMin)) return fail(`${field('playTimeMin')} ist keine Zahl.`)
    if (!isNumberOrMissing(playTimeMax)) return fail(`${field('playTimeMax')} ist keine Zahl.`)
    if (typeof playTimeOpenEnded !== 'boolean') {
      return fail(`${field('playTimeOpenEnded')} ist weder true noch false.`)
    }
    if (!isTextOrMissing(lastPlayed)) return fail(`${field('lastPlayed')} ist kein Text.`)
    if (!isTextOrMissing(genre)) return fail(`${field('genre')} ist kein Text.`)
    if (!isTextOrMissing(description)) return fail(`${field('description')} ist kein Text.`)
    if (!isTextList(secondaryGenres)) {
      return fail(`${field('secondaryGenres')} ist keine Liste von Texten.`)
    }

    games.push({
      id,
      name,
      playerCount: playerNumbers,
      playTimeMin: playTimeMin ?? null,
      playTimeMax: playTimeMax ?? null,
      playTimeOpenEnded,
      lastPlayed: lastPlayed ?? null,
      genre: genre ?? null,
      secondaryGenres,
      description: description ?? null,
    })
  }
  return ok(games)
}

function isNumberOrMissing(value: unknown): value is number | null | undefined {
  return value === null || value === undefined || typeof value === 'number'
}

function isTextOrMissing(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || typeof value === 'string'
}

function isTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}
