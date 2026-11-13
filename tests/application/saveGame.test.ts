// Tests für die Abläufe "Spiel speichern" (neu anlegen und bearbeiten) und "Spiel löschen"
import { describe, expect, test } from 'vitest'

import { removeGame } from '../../src/application/removeGame'
import { saveGame, type GameInput } from '../../src/application/saveGame'
import { noDetails, type Game } from '../../src/domain/Game'
import type { GameCollection } from '../../src/domain/GameCollection'
import type { GameRepository } from '../../src/domain/GameRepository'
import { ok, type Result } from '../../src/domain/Result'
import {
  azul,
  dixit,
  expectError,
  expectOk,
  fluegelschlag,
  games,
  MemoryGameRepository,
  names,
  shelves,
  sofaShelf,
} from '../testData'

// Die freiwilligen Angaben, alle leer gelassen
const noDetailsInput = {
  playTimeMin: '',
  playTimeMax: '',
  playTimeOpenEnded: false,
  lastPlayed: '',
  genre: '',
  secondaryGenres: [],
  shelfId: '',
  description: '',
}

// Neues Spiel mit diesen Eingaben speichern
const saveNew = (repository: GameRepository, name: string, playerCount: string) =>
  saveGame(repository, games, shelves, { ...noDetailsInput, editing: null, name, playerCount })

// Vorhandenes Spiel mit geänderten Eingaben speichern
const saveEdited = (repository: GameRepository, game: Game, name: string, playerCount: string) =>
  saveGame(repository, games, shelves, { ...noDetailsInput, editing: game, name, playerCount })

// Neues Spiel "Monopoly" mit diesen freiwilligen Angaben speichern
const saveWithDetails = (details: Partial<GameInput>) =>
  saveGame(new MemoryGameRepository(), games, shelves, {
    ...noDetailsInput,
    editing: null,
    name: 'Monopoly',
    playerCount: '4',
    ...details,
  })

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
    expect(game.playerCount.min).toBe(4)
    expect(names(collection.games)).toEqual(['Dixit', 'Azul', 'Flügelschlag', 'Monopoly'])
    expect(repository.saved).toBe(collection)
  })

  test('Leerzeichen am Anfang und Ende werden entfernt', async () => {
    const { game } = expectOk(await saveNew(new MemoryGameRepository(), '  Monopoly ', ' 4 '))
    expect(game.name.text).toBe('Monopoly')
    expect(game.playerCount.min).toBe(4)
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

describe('Freiwillige Angaben speichern', () => {
  test('Ohne freiwillige Angaben bleibt alles leer', async () => {
    const { game } = expectOk(await saveWithDetails({}))
    expect(game.details).toEqual(noDetails)
  })

  test('Alle freiwilligen Angaben werden übernommen', async () => {
    const { game } = expectOk(
      await saveWithDetails({
        playTimeMin: '60',
        playTimeMax: '180',
        lastPlayed: '2025-12-24',
        genre: 'dice',
        secondaryGenres: ['party', 'strategy'],
        description: '  Dauert ewig.  ',
      }),
    )
    expect(game.details.playTime?.text).toBe('60–180 Minuten')
    expect(game.details.lastPlayed?.text).toBe('24.12.2025')
    expect(game.details.genres.main).toBe('dice')
    expect(game.details.genres.secondary).toEqual(['strategy', 'party'])
    expect(game.details.description).toBe('Dauert ewig.')
  })

  test('Das gewählte Regal wird übernommen', async () => {
    const { game } = expectOk(await saveWithDetails({ shelfId: sofaShelf.id.value }))
    expect(game.details.shelfId?.equals(sofaShelf.id)).toBe(true)
  })

  test.each(['cccccccc-cccc-cccc-cccc-cccccccccccc', 'quatsch'])(
    'Ein Regal, das es nicht gibt ("%s"), wird abgelehnt',
    async (shelfId) => {
      expect(expectError(await saveWithDetails({ shelfId }))).toBe(
        'Das gewählte Regal gibt es nicht mehr.',
      )
    },
  )

  test('Spieldauer nach oben offen wird übernommen', async () => {
    const { game } = expectOk(await saveWithDetails({ playTimeMin: '60', playTimeOpenEnded: true }))
    expect(game.details.playTime?.text).toBe('ab 60 Minuten')
  })

  test.each<[Partial<GameInput>, string]>([
    [{ playTimeOpenEnded: true }, 'Bitte gib bei der Spieldauer zuerst "von" an.'],
    [{ playTimeMin: 'lang' }, 'Die Spieldauer muss eine ganze Zahl in Minuten sein.'],
    [{ playTimeMax: '60' }, 'Bitte gib bei der Spieldauer zuerst "von" an.'],
    [{ playTimeMin: '90', playTimeMax: '60' }, 'Bei der Spieldauer darf "von" nicht größer als "bis" sein.'],
    [{ lastPlayed: '9999-01-01' }, '"Zuletzt gespielt" darf nicht in der Zukunft liegen.'],
    [{ secondaryGenres: ['card'] }, 'Nebengenres gehen nur zusammen mit einem Genre.'],
    [{ genre: 'card', secondaryGenres: ['card'] }, 'Das Genre kann nicht zugleich Nebengenre sein.'],
  ])('Ungültige Angabe %j wird abgelehnt', async (details, expected) => {
    expect(expectError(await saveWithDetails(details))).toBe(expected)
  })

  test('Beim Bearbeiten ersetzen die neuen Angaben die alten', async () => {
    const { game } = expectOk(
      await saveGame(new MemoryGameRepository(), games, shelves, {
        ...noDetailsInput,
        editing: fluegelschlag,
        name: 'Flügelschlag',
        playerCount: '5',
        playTimeMin: '50',
      }),
    )
    expect(game.details.playTime?.text).toBe('50 Minuten')
    expect(game.details.lastPlayed).toBeNull()
    expect(game.details.genres.main).toBeNull()
    expect(game.details.description).toBeNull()
  })
})

describe('Bearbeitetes Spiel speichern', () => {
  test('Das Spiel behält seine ID und seinen Platz', async () => {
    const { collection, game } = expectOk(
      await saveEdited(new MemoryGameRepository(), dixit, 'Dixit Odyssey', '6'),
    )
    expect(game.id.equals(dixit.id)).toBe(true)
    expect(game.playerCount.min).toBe(6)
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
