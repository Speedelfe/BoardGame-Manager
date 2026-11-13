// Tests für den Ablauf "Heute gespielt"
import { describe, expect, test } from 'vitest'

import { markGamePlayed } from '../../src/application/markGamePlayed'
import type { GameCollection } from '../../src/domain/GameCollection'
import type { GameRepository } from '../../src/domain/GameRepository'
import { todayIsoDate } from '../../src/domain/LastPlayed'
import { ok, type Result } from '../../src/domain/Result'
import {
  collectionOf,
  dixit,
  dixitData,
  expectError,
  expectOk,
  fluegelschlag,
  games,
  MemoryGameRepository,
  names,
} from '../testData'

const today = '2026-11-13'

// Repository, bei dem das Speichern immer fehlschlägt
class BrokenRepository implements GameRepository {
  async load(): Promise<Result<GameCollection>> {
    return ok(games)
  }

  async save(): Promise<void> {
    throw new Error('Platte voll')
  }
}

describe('Heute gespielt', () => {
  test('Ein Spiel ohne Datum bekommt das heutige Datum und wird gespeichert', async () => {
    const repository = new MemoryGameRepository()
    const { collection, game } = expectOk(await markGamePlayed(repository, games, dixit, today))

    expect(game.details.lastPlayed?.text).toBe('13.11.2026')
    expect(collection.findById(dixit.id)).toBe(game)
    expect(repository.saved).toBe(collection)
  })

  test('Ein älteres Datum wird durch heute ersetzt', async () => {
    // Flügelschlag wurde zuletzt am 03.10.2026 gespielt
    const { game } = expectOk(
      await markGamePlayed(new MemoryGameRepository(), games, fluegelschlag, today),
    )
    expect(game.details.lastPlayed?.isoDate).toBe(today)
  })

  test('Alle anderen Angaben des Spiels bleiben, wie sie sind', async () => {
    const { collection, game } = expectOk(
      await markGamePlayed(new MemoryGameRepository(), games, fluegelschlag, today),
    )

    expect(game.id.equals(fluegelschlag.id)).toBe(true)
    expect(game.name).toBe(fluegelschlag.name)
    expect(game.playerCount).toBe(fluegelschlag.playerCount)
    expect(game.details).toEqual({ ...fluegelschlag.details, lastPlayed: game.details.lastPlayed })
    // Das Spiel behält seinen Platz, die anderen Spiele sind unverändert
    expect(names(collection.games)).toEqual(['Dixit', 'Azul', 'Flügelschlag'])
    expect(collection.games[0]).toBe(dixit)
  })

  test('Ohne Vorgabe gilt der heutige Tag nach der Uhr des Rechners', async () => {
    const { game } = expectOk(await markGamePlayed(new MemoryGameRepository(), games, dixit))
    expect(game.details.lastPlayed?.isoDate).toBe(todayIsoDate())
  })

  test('Ein Spiel, das es in der Sammlung nicht mehr gibt, wird abgelehnt', async () => {
    const repository = new MemoryGameRepository()
    const withoutDixit = games.remove(dixit.id)

    expect(expectError(await markGamePlayed(repository, withoutDixit, dixit, today))).toBe(
      'Dieses Spiel gibt es in der Sammlung nicht mehr.',
    )
    expect(repository.saveCount).toBe(0)
  })

  test('Schlägt das Speichern fehl, gibt es eine Fehlermeldung', async () => {
    const message = expectError(await markGamePlayed(new BrokenRepository(), games, dixit, today))
    expect(message).toBe('Speichern hat nicht geklappt: Platte voll')
  })

  test('Das Datum steht danach auch in den gespeicherten Daten', async () => {
    const { collection } = expectOk(
      await markGamePlayed(new MemoryGameRepository(), collectionOf([dixitData]), dixit, today),
    )
    expect(collection.toData()).toEqual([{ ...dixitData, lastPlayed: today }])
  })
})
