// Tests für Laden und Speichern der Regale. Sie liegen in derselben Datei wie die Spiele.
// Alle Dateien landen in einem eigenen Ordner unter tests/.tmp, nie in der echten Spielesammlung.
import { writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

import type { ShelfData } from '../../src/domain/Shelf'
import { ShelfCollection } from '../../src/domain/ShelfCollection'
import { JsonFileGameRepository } from '../../src/infrastructure/JsonFileGameRepository'
import { JsonFileShelfRepository } from '../../src/infrastructure/JsonFileShelfRepository'
import { expectError, expectOk, games, gamesData, withTestFolder } from '../testData'

const sofaData: ShelfData = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Sofaschrank' }
const bueroData: ShelfData = { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Büroregal' }
const shelvesData = [sofaData, bueroData]
const shelves = expectOk(ShelfCollection.restore(shelvesData))

// Lädt die Regale aus der Datei und gibt sie als einfache Daten zurück
async function loadShelves(path: string): Promise<ShelfData[]> {
  return expectOk(await new JsonFileShelfRepository(path).load()).toData()
}

// Lädt die Spiele aus der Datei und gibt sie als einfache Daten zurück
async function loadGames(path: string) {
  return expectOk(await new JsonFileGameRepository(path).load()).toData()
}

async function loadError(path: string): Promise<string> {
  return expectError(await new JsonFileShelfRepository(path).load())
}

describe('Regale laden und speichern', () => {
  test('Fehlende Datei ergibt keine Regale', () =>
    withTestFolder(async (folder) => {
      expect(await loadShelves(join(folder, 'gibtsnicht.json'))).toEqual([])
    }))

  test('Gespeicherte Regale werden genauso wieder geladen', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await new JsonFileShelfRepository(path).save(shelves)
      expect(await loadShelves(path)).toEqual(shelvesData)
    }))

  test('Eine Datei aus der Zeit vor den Regalen hat keine Regale', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeFile(path, '{ "gameList": [] }', 'utf8')
      expect(await loadShelves(path)).toEqual([])
    }))
})

describe('Spiele und Regale in einer Datei', () => {
  test('Regale speichern lässt die Spiele unberührt', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await new JsonFileGameRepository(path).save(games)
      await new JsonFileShelfRepository(path).save(shelves)

      expect(await loadGames(path)).toEqual(gamesData)
      expect(await loadShelves(path)).toEqual(shelvesData)
    }))

  test('Spiele speichern lässt die Regale unberührt', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await new JsonFileShelfRepository(path).save(shelves)
      await new JsonFileGameRepository(path).save(games)

      expect(await loadShelves(path)).toEqual(shelvesData)
      expect(await loadGames(path)).toEqual(gamesData)
    }))

  test('Eine Datei, in der nur Regale stehen, hat keine Spiele', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await new JsonFileShelfRepository(path).save(shelves)
      expect(await loadGames(path)).toEqual([])
    }))

  test('Die Sicherungskopie enthält den Stand vor dem letzten Speichern', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await new JsonFileGameRepository(path).save(games)
      await new JsonFileShelfRepository(path).save(shelves)

      expect(await loadGames(path + '.bak')).toEqual(gamesData)
      expect(await loadShelves(path + '.bak')).toEqual([])
    }))

  test('Eine kaputte Datei wird beim Speichern nicht überschrieben', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeFile(path, 'kein json', 'utf8')

      await expect(new JsonFileShelfRepository(path).save(shelves)).rejects.toThrow()
      await expect(new JsonFileGameRepository(path).save(games)).rejects.toThrow()
    }))
})

describe('Fehler beim Laden der Regale', () => {
  // Schreibt eine Datei mit dieser Regal-Liste, auch mit ungültigen Regalen
  async function writeShelfList(path: string, shelfList: unknown): Promise<void> {
    await writeFile(path, JSON.stringify({ gameList: [], shelfList }), 'utf8')
  }

  test('Kaputte Datei ergibt einen Fehler mit dem Dateipfad', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeFile(path, 'kein json', 'utf8')
      const message = await loadError(path)
      expect(message).toMatch(/^Die Regale/)
      expect(message).toContain(resolve(path))
    }))

  test.each<[unknown, string]>([
    ['Sofaschrank', 'Das Feld "shelfList" ist keine Liste.'],
    [['Sofaschrank'], 'Regal Nr. 1 ist kein gültiger Eintrag.'],
    [[sofaData, { name: 'Büroregal' }], 'Regal Nr. 2: Das Feld "id" fehlt oder ist kein Text.'],
    [[{ id: sofaData.id, name: 7 }], 'Regal Nr. 1: Das Feld "name" fehlt oder ist kein Text.'],
    [[sofaData, { ...bueroData, name: 'sofaschrank' }], 'Den Regalnamen "sofaschrank" gibt es mehrfach.'],
  ])('Ungültige Regal-Liste %j ergibt einen Fehler', (shelfList, expected) =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeShelfList(path, shelfList)
      expect(await loadError(path)).toContain(`konnten nicht gelesen werden: ${expected}`)
    }))
})
