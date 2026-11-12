// Tests für die Abläufe "Regal speichern" (neu anlegen und umbenennen) und "Regal löschen"
import { describe, expect, test } from 'vitest'

import { removeShelf } from '../../src/application/removeShelf'
import { saveShelf } from '../../src/application/saveShelf'
import { ok, type Result } from '../../src/domain/Result'
import type { Shelf } from '../../src/domain/Shelf'
import type { ShelfCollection } from '../../src/domain/ShelfCollection'
import type { ShelfRepository } from '../../src/domain/ShelfRepository'
import {
  azulData,
  bueroShelf,
  collectionOf,
  expectError,
  expectOk,
  fluegelschlagData,
  games,
  MemoryShelfRepository,
  shelves,
  sofaShelf,
} from '../testData'

const shelfNames = (collection: ShelfCollection) => collection.shelves.map((s) => s.name.text)

// Neues Regal mit diesem Namen speichern
const saveNew = (repository: ShelfRepository, name: string) =>
  saveShelf(repository, shelves, { editing: null, name })

// Vorhandenes Regal mit neuem Namen speichern
const saveRenamed = (repository: ShelfRepository, shelf: Shelf, name: string) =>
  saveShelf(repository, shelves, { editing: shelf, name })

// Repository, bei dem das Speichern immer fehlschlägt
class BrokenRepository implements ShelfRepository {
  async load(): Promise<Result<ShelfCollection>> {
    return ok(shelves)
  }

  async save(): Promise<void> {
    throw new Error('Platte voll')
  }
}

describe('Neues Regal speichern', () => {
  test('Gültiger Name: Regal wird angelegt und die neuen Regale gespeichert', async () => {
    const repository = new MemoryShelfRepository()
    const changed = expectOk(await saveNew(repository, '  Wohnwand links '))

    expect(changed.shelf.name.text).toBe('Wohnwand links')
    expect(shelfNames(changed.shelves)).toEqual(['Sofaschrank', 'Büroregal', 'Wohnwand links'])
    expect(repository.saved).toBe(changed.shelves)
  })

  test.each([
    ['', 'Bitte gib einen Namen für das Regal ein.'],
    ['   ', 'Bitte gib einen Namen für das Regal ein.'],
    ['sofaschrank', 'Das Regal "sofaschrank" gibt es schon.'],
  ])('Ungültiger Name "%s" wird abgelehnt und nicht gespeichert', async (name, expected) => {
    const repository = new MemoryShelfRepository()
    expect(expectError(await saveNew(repository, name))).toBe(expected)
    expect(repository.saveCount).toBe(0)
  })

  test('Schlägt das Speichern fehl, gibt es eine Fehlermeldung', async () => {
    expect(expectError(await saveNew(new BrokenRepository(), 'Keller'))).toBe(
      'Speichern hat nicht geklappt: Platte voll',
    )
  })
})

describe('Regal umbenennen', () => {
  test('Das Regal behält seine ID und seinen Platz', async () => {
    const changed = expectOk(await saveRenamed(new MemoryShelfRepository(), sofaShelf, 'Sofa'))
    expect(changed.shelf.id.equals(sofaShelf.id)).toBe(true)
    expect(shelfNames(changed.shelves)).toEqual(['Sofa', 'Büroregal'])
  })

  test('Das Regal darf seinen eigenen Namen behalten', async () => {
    const changed = expectOk(
      await saveRenamed(new MemoryShelfRepository(), sofaShelf, 'Sofaschrank'),
    )
    expect(changed.shelf.name.text).toBe('Sofaschrank')
  })

  test('Das Regal darf nicht den Namen eines anderen Regals bekommen', async () => {
    expect(
      expectError(await saveRenamed(new MemoryShelfRepository(), sofaShelf, 'Büroregal')),
    ).toBe('Das Regal "Büroregal" gibt es schon.')
  })
})

describe('Regal löschen', () => {
  test('Ein leeres Regal wird entfernt und die neuen Regale gespeichert', async () => {
    const repository = new MemoryShelfRepository()
    const remaining = expectOk(await removeShelf(repository, shelves, games, bueroShelf.id))

    expect(shelfNames(remaining)).toEqual(['Sofaschrank'])
    expect(repository.saved).toBe(remaining)
  })

  test('Ein Regal mit einem Spiel kann nicht gelöscht werden', async () => {
    // In den Beispielspielen steht Flügelschlag im Sofaschrank
    const repository = new MemoryShelfRepository()
    const message = expectError(await removeShelf(repository, shelves, games, sofaShelf.id))

    expect(message).toBe(
      'In diesem Regal steht noch 1 Spiel. Es kann erst gelöscht werden, wenn es leer ist.',
    )
    expect(repository.saveCount).toBe(0)
  })

  test('Bei mehreren Spielen nennt die Meldung die Anzahl', async () => {
    const twoInSofa = collectionOf([
      fluegelschlagData,
      { ...azulData, shelfId: sofaShelf.id.value },
    ])
    const message = expectError(
      await removeShelf(new MemoryShelfRepository(), shelves, twoInSofa, sofaShelf.id),
    )
    expect(message).toBe(
      'In diesem Regal stehen noch 2 Spiele. Es kann erst gelöscht werden, wenn es leer ist.',
    )
  })

  test('Schlägt das Speichern fehl, gibt es eine Fehlermeldung', async () => {
    const message = expectError(
      await removeShelf(new BrokenRepository(), shelves, games, bueroShelf.id),
    )
    expect(message).toBe('Löschen hat nicht geklappt: Platte voll')
  })
})
