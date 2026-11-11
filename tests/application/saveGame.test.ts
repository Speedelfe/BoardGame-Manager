// Tests für die Abläufe "Spiel speichern" (neu anlegen und bearbeiten) und "Spiel löschen"
import { describe, expect, test } from 'vitest'

import { removeGame } from '../../src/application/removeGame'
import { saveGame } from '../../src/application/saveGame'
import type { Game } from '../../src/domain/Game'
import type { GameCollection } from '../../src/domain/GameCollection'
import type { GameRepository } from '../../src/domain/GameRepository'
import { ok, type Result } from '../../src/domain/Result'
import { azul, dixit, expectError, expectOk, games, MemoryGameRepository, names } from '../testData'

// Neues Spiel mit diesen Eingaben speichern
const saveNew = (repository: GameRepository, name: string, playerCount: string) =>
  saveGame(repository, games, { editing: null, name, playerCount })

// Vorhandenes Spiel mit geänderten Eingaben speichern
const saveEdited = (repository: GameRepository, game: Game, name: string, playerCount: string) =>
  saveGame(repository, games, { editing: game, name, playerCount })

// Repository, bei dem das Speichern immer fehlschlägt
class BrokenRepository implements GameRepository {
  async load(): Promise<Result<GameCollection>> {
    return ok(games)
  }

  async save(): Promise<void> {
    throw new Error('Platte voll')
  }
}

describe('Neues Spiel speichern', () => {
  test('Gültige Eingaben: Spiel wird angelegt und die neue Sammlung gespeichert', async () => {
    const repository = new MemoryGameRepository()
    const { collection, game } = expectOk(await saveNew(repository, 'Monopoly', '4'))

    expect(game.name.text).toBe('Monopoly')
    expect(game.playerCount.value).toBe(4)
    expect(names(collection.games)).toEqual(['Dixit', 'Azul', 'Flügelschlag', 'Monopoly'])
    expect(repository.saved).toBe(collection)
  })

  test('Leerzeichen am Anfang und Ende werden entfernt', async () => {
    const { game } = expectOk(await saveNew(new MemoryGameRepository(), '  Monopoly ', ' 4 '))
    expect(game.name.text).toBe('Monopoly')
    expect(game.playerCount.value).toBe(4)
  })

  test.each([
    ['', '3', 'Bitte gib einen Spielnamen ein.'],
    ['   ', '3', 'Bitte gib einen Spielnamen ein.'],
    ['Monopoly', '', 'Die Spieleranzahl muss eine Zahl sein.'],
    ['Monopoly', 'vier', 'Die Spieleranzahl muss eine Zahl sein.'],
    ['Monopoly', '0', 'Die Spieleranzahl muss mindestens 1 sein.'],
    ['Monopoly', '101', 'Die Spieleranzahl darf höchstens 100 sein.'],
  ])('Ungültige Eingaben ("%s", "%s") werden abgelehnt und nicht gespeichert', async (name, players, expected) => {
    const repository = new MemoryGameRepository()
    expect(expectError(await saveNew(repository, name, players))).toBe(expected)
    expect(repository.saveCount).toBe(0)
  })

  test.each(['Dixit', 'dixit', ' DIXIT '])('Vorhandener Name "%s" wird abgelehnt', async (name) => {
    const message = expectError(await saveNew(new MemoryGameRepository(), name, '3'))
    expect(message).toBe(`Das Spiel "${name.trim()}" gibt es schon.`)
  })

  test('Ein doppelter Name wird vor einer falschen Spieleranzahl gemeldet', async () => {
    const message = expectError(await saveNew(new MemoryGameRepository(), 'Dixit', ''))
    expect(message).toBe('Das Spiel "Dixit" gibt es schon.')
  })

  test('Schlägt das Speichern fehl, gibt es eine Fehlermeldung', async () => {
    const message = expectError(await saveNew(new BrokenRepository(), 'Monopoly', '4'))
    expect(message).toBe('Speichern hat nicht geklappt: Platte voll')
  })
})

describe('Bearbeitetes Spiel speichern', () => {
  test('Das Spiel behält seine ID und seinen Platz', async () => {
    const { collection, game } = expectOk(
      await saveEdited(new MemoryGameRepository(), dixit, 'Dixit Odyssey', '6'),
    )
    expect(game.id.equals(dixit.id)).toBe(true)
    expect(game.playerCount.value).toBe(6)
    expect(names(collection.games)).toEqual(['Dixit Odyssey', 'Azul', 'Flügelschlag'])
  })

  test('Das Spiel darf seinen eigenen Namen behalten', async () => {
    const { game } = expectOk(await saveEdited(new MemoryGameRepository(), dixit, 'Dixit', '3'))
    expect(game.name.text).toBe('Dixit')
  })

  test('Das Spiel darf nicht den Namen eines anderen Spiels bekommen', async () => {
    const message = expectError(await saveEdited(new MemoryGameRepository(), dixit, 'azul', '3'))
    expect(message).toBe('Das Spiel "azul" gibt es schon.')
  })

  test('Beim Bearbeiten gelten die gleichen Prüfregeln wie beim Anlegen', async () => {
    const message = expectError(await saveEdited(new MemoryGameRepository(), dixit, 'Dixit', 'null'))
    expect(message).toBe('Die Spieleranzahl muss eine Zahl sein.')
  })
})

describe('Spiel löschen', () => {
  test('Das Spiel wird entfernt und die neue Sammlung gespeichert', async () => {
    const repository = new MemoryGameRepository()
    const collection = expectOk(await removeGame(repository, games, azul.id))

    expect(names(collection.games)).toEqual(['Dixit', 'Flügelschlag'])
    expect(repository.saved).toBe(collection)
  })

  test('Schlägt das Speichern fehl, gibt es eine Fehlermeldung', async () => {
    const message = expectError(await removeGame(new BrokenRepository(), games, azul.id))
    expect(message).toBe('Löschen hat nicht geklappt: Platte voll')
  })
})
