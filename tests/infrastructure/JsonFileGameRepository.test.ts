// Tests für Laden und Speichern der Spieleliste als Datei.
// Alle Dateien landen in einem eigenen Ordner unter tests/.tmp, nie in der echten Spielesammlung.
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

import type { GameData } from '../../src/domain/Game'
import { GameId } from '../../src/domain/GameId'
import { JsonFileGameRepository } from '../../src/infrastructure/JsonFileGameRepository'
import {
  azulData,
  collectionOf,
  dixitData,
  expectError,
  expectOk,
  games,
  gamesData,
  withTestFolder,
} from '../testData'

// Lädt die Datei und gibt die Spiele als einfache Daten zurück
async function loadData(path: string): Promise<GameData[]> {
  return expectOk(await new JsonFileGameRepository(path).load()).toData()
}

// Erwartet einen Fehler beim Laden und gibt die Meldung zurück
async function loadError(path: string): Promise<string> {
  return expectError(await new JsonFileGameRepository(path).load())
}

// Nur die eigentliche Ursache aus der Fehlermeldung, also der Teil hinter dem Dateipfad
function causeOf(message: string): string {
  const marker = 'konnte nicht gelesen werden: '
  return message.slice(message.indexOf(marker) + marker.length)
}

// Schreibt eine Datei im Format der Spieleliste, auch mit ungültigen Spielen
async function writeGameList(path: string, gameList: object[]): Promise<void> {
  await writeFile(path, JSON.stringify({ gameList }), 'utf8')
}

// Ein Spiel so, wie es in der Datei steht: Die Spieleranzahl heißt dort "playerNumbers"
const stored = ({ playerCount, ...rest }: GameData) => ({ ...rest, playerNumbers: playerCount })

describe('Laden und Speichern', () => {
  test('Fehlende Datei ergibt eine leere Sammlung', () =>
    withTestFolder(async (folder) => {
      expect(await loadData(join(folder, 'gibtsnicht.json'))).toEqual([])
    }))

  test('Gespeicherte Spiele werden genauso wieder geladen', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await new JsonFileGameRepository(path).save(games)
      expect(await loadData(path)).toEqual(gamesData)
    }))

  test('Eine Spieldauer nach oben offen wird genauso wieder geladen', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      const data = [{ ...dixitData, playTimeMin: 60, playTimeOpenEnded: true }]
      await new JsonFileGameRepository(path).save(collectionOf(data))
      expect(await loadData(path)).toEqual(data)
    }))

  test('Speichern legt einen fehlenden Ordner an', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'data', 'games.json')
      await new JsonFileGameRepository(path).save(games)
      expect(existsSync(path)).toBe(true)
    }))

  test('Speichern einer leeren Sammlung und Laden ergibt eine leere Sammlung', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await new JsonFileGameRepository(path).save(collectionOf([]))
      expect(await loadData(path)).toEqual([])
    }))

  test('Eine Datei der alten F#-App wird gelesen', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeFile(
        path,
        `{
  "gameList": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Dixit",
      "playerNumbers": 3
    }
  ]
}`,
        'utf8',
      )
      expect(await loadData(path)).toEqual([dixitData])
    }))
})

describe('Fehler beim Laden', () => {
  test('Kaputte Datei ergibt einen Fehler mit dem Dateipfad', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeFile(path, '{ "gameList": [ { "name": "Dixit" ', 'utf8')
      const message = await loadError(path)
      expect(message).toMatch(/^Die Spieleliste/)
      expect(message).toContain(resolve(path))
    }))

  test('Datei ohne Spieleliste ergibt einen Fehler', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeFile(path, '[]', 'utf8')
      expect(causeOf(await loadError(path))).toContain('gameList')
    }))

  test('Spiel ohne ID ergibt einen Fehler', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeGameList(path, [{ name: 'Dixit', playerNumbers: 3 }])
      // Nur die Ursache prüfen, nicht den Dateipfad davor (der könnte zufällig "id" enthalten)
      expect(causeOf(await loadError(path))).toContain('"id"')
    }))

  test('Spieleranzahl als Text ergibt einen Fehler', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeGameList(path, [{ ...stored(dixitData), playerNumbers: '3' }])
      expect(causeOf(await loadError(path))).toContain('"playerNumbers"')
    }))

  test('Ungültige ID ergibt einen Fehler', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeGameList(path, [{ ...stored(dixitData), id: 'abc' }])
      expect(await loadError(path)).toContain('ungültige ID')
    }))

  test('Doppelte IDs in der Datei ergeben einen Fehler', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeGameList(path, [stored(dixitData), stored({ ...dixitData, name: 'Kopie' })])
      expect(await loadError(path)).toContain('gleiche ID')
    }))

  test('Leere ID in der Datei ergibt einen Fehler', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeGameList(path, [stored({ ...dixitData, id: GameId.emptyValue })])
      expect(await loadError(path)).toContain('leere ID')
    }))

  test('Ungültige Spieleranzahl in der Datei ergibt einen Fehler', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeGameList(path, [stored({ ...dixitData, playerCount: 0 })])
      expect(await loadError(path)).toContain('ungültige Spieleranzahl')
    }))

  test.each([
    ['playTimeMin', '45'],
    ['playTimeMax', '60'],
    ['playTimeOpenEnded', 'ja'],
    ['lastPlayed', 20261112],
    ['genre', 3],
    ['shelfId', 7],
    ['secondaryGenres', 'card'],
    ['secondaryGenres', [1, 2]],
    ['description', true],
  ])('Freiwilliges Feld "%s" mit falscher Art von Wert (%j) ergibt einen Fehler', (field, value) =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeGameList(path, [{ ...stored(dixitData), [field]: value }])
      expect(causeOf(await loadError(path))).toContain(`Spiel Nr. 1: Das Feld "${field}"`)
    }))

  test('Ungültige freiwillige Angabe in der Datei ergibt einen Fehler', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeGameList(path, [stored({ ...dixitData, genre: 'quatsch' })])
      expect(causeOf(await loadError(path))).toBe('Spiel "Dixit": "quatsch" ist kein bekanntes Genre.')
    }))

  test('Doppelter Spielname in der Datei ergibt einen Fehler', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeGameList(path, [stored(dixitData), stored({ ...azulData, name: 'dixit' })])
      expect(await loadError(path)).toContain('mehrfach')
    }))
})

describe('Sicheres Speichern mit Sicherungskopie', () => {
  test('Erstes Speichern legt noch keine Sicherungskopie an', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await new JsonFileGameRepository(path).save(games)
      expect(existsSync(path + '.bak')).toBe(false)
    }))

  test('Sicherungskopie enthält den Stand vor dem letzten Speichern', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      const repository = new JsonFileGameRepository(path)
      await repository.save(collectionOf([dixitData]))
      await repository.save(games)
      expect(await loadData(path)).toEqual(gamesData)
      expect(await loadData(path + '.bak')).toEqual([dixitData])
    }))

  test('Nach dem Speichern bleibt keine Hilfsdatei liegen', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      const repository = new JsonFileGameRepository(path)
      await repository.save(collectionOf([dixitData]))
      await repository.save(games)
      expect(existsSync(path + '.tmp')).toBe(false)
    }))

  test('Schlägt das Speichern fehl, gibt es eine Ausnahme', () =>
    withTestFolder(async (folder) => {
      // Der "Ordner" der Spieleliste ist in Wirklichkeit eine Datei, darum klappt das Speichern nicht
      const blocker = join(folder, 'blockiert')
      await writeFile(blocker, '', 'utf8')
      const repository = new JsonFileGameRepository(join(blocker, 'games.json'))
      await expect(repository.save(games)).rejects.toThrow()
    }))
})
