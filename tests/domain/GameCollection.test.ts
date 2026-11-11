// Tests für die Sammlung: hinzufügen, ändern, löschen, sortieren und gespeicherte Daten prüfen
import { describe, expect, test } from 'vitest'

import type { GameData } from '../../src/domain/Game'
import { GameCollection } from '../../src/domain/GameCollection'
import { GameId } from '../../src/domain/GameId'
import { GameName } from '../../src/domain/GameName'
import { PlayerCount } from '../../src/domain/PlayerCount'
import {
  azul,
  azulData,
  collectionOf,
  dixit,
  dixitData,
  expectError,
  expectOk,
  fluegelschlagData,
  games,
  gamesData,
  names,
} from '../testData'

const name = (text: string) => expectOk(GameName.create(text))
const count = (value: number) => expectOk(PlayerCount.fromNumber(value))

describe('Hinzufügen', () => {
  test('Neues Spiel wird hinten an die Sammlung angehängt', () => {
    const { collection, game } = expectOk(games.add(name('Monopoly'), count(4)))
    expect(names(collection.games)).toEqual(['Dixit', 'Azul', 'Flügelschlag', 'Monopoly'])
    expect(game.playerCount.value).toBe(4)
  })

  test('Neues Spiel bekommt eine neue ID', () => {
    const { game } = expectOk(games.add(name('Monopoly'), count(4)))
    expect(games.findById(game.id)).toBeNull()
  })

  test.each(['Dixit', 'dixit', 'DIXIT'])('Vorhandener Name "%s" wird abgelehnt', (text) => {
    expect(expectError(games.add(name(text), count(3)))).toBe(`Das Spiel "${text}" gibt es schon.`)
  })

  test('Hinzufügen ändert die ursprüngliche Sammlung nicht', () => {
    games.add(name('Monopoly'), count(4))
    expect(names(games.games)).toEqual(['Dixit', 'Azul', 'Flügelschlag'])
  })
})

describe('Ändern', () => {
  test('Geändertes Spiel ersetzt das alte an derselben Stelle und behält die ID', () => {
    const { collection, game } = expectOk(
      games.change(azul.id, name('Azul Sommerpavillon'), count(2)),
    )
    expect(names(collection.games)).toEqual(['Dixit', 'Azul Sommerpavillon', 'Flügelschlag'])
    expect(collection.games[1]?.playerCount.value).toBe(2)
    expect(game.id.equals(azul.id)).toBe(true)
  })

  test('Ändern ändert die Anzahl der Spiele nicht', () => {
    const { collection } = expectOk(games.change(dixit.id, name('Dixit'), count(8)))
    expect(collection.games).toHaveLength(games.games.length)
  })

  test('Ein Spiel darf seinen eigenen Namen behalten', () => {
    const { game } = expectOk(games.change(dixit.id, name('Dixit'), count(3)))
    expect(game.name.text).toBe('Dixit')
  })

  test('Ein Spiel darf nicht den Namen eines anderen Spiels bekommen', () => {
    const message = expectError(games.change(dixit.id, name('azul'), count(3)))
    expect(message).toBe('Das Spiel "azul" gibt es schon.')
  })

  test('Ein unbekanntes Spiel kann nicht geändert werden', () => {
    expect(games.change(GameId.create(), name('Monopoly'), count(4)).ok).toBe(false)
  })
})

describe('Löschen', () => {
  test('Gelöschtes Spiel ist nicht mehr in der Sammlung', () => {
    expect(names(games.remove(azul.id).games)).toEqual(['Dixit', 'Flügelschlag'])
  })

  test('Löschen eines unbekannten Spiels ändert nichts', () => {
    expect(names(games.remove(GameId.create()).games)).toEqual(names(games.games))
  })
})

describe('Sortieren', () => {
  // Sammlung nur aus Namen, für die Sortier-Tests
  const sortedNames = (gameNames: string[]) => {
    const data = gameNames.map((text) => ({
      id: GameId.create().value,
      name: text,
      playerCount: 2,
    }))
    return names(collectionOf(data).sortedByName())
  }

  test('Spiele werden alphabetisch sortiert', () => {
    expect(names(games.sortedByName())).toEqual(['Azul', 'Dixit', 'Flügelschlag'])
  })

  test('Beim Sortieren ist Groß- und Kleinschreibung egal', () => {
    expect(sortedNames(['dixit', 'Azul', 'carcassonne', 'Brass'])).toEqual([
      'Azul',
      'Brass',
      'carcassonne',
      'dixit',
    ])
  })

  test('Umlaute werden wie im Wörterbuch einsortiert', () => {
    // Ä zählt wie A, Ü wie U. Danach wird Buchstabe für Buchstabe verglichen:
    // "Ärger" (Ä-r) vor "Azul" (A-z), und "Überleben" (Ü-b-e) vor "Ubongo" (U-b-o).
    expect(sortedNames(['Zug um Zug', 'Azul', 'Ubongo', 'Ärger', 'Überleben'])).toEqual([
      'Ärger',
      'Azul',
      'Überleben',
      'Ubongo',
      'Zug um Zug',
    ])
  })

  test('Sortieren ändert die Reihenfolge in der Sammlung nicht', () => {
    games.sortedByName()
    expect(names(games.games)).toEqual(['Dixit', 'Azul', 'Flügelschlag'])
  })

  test('Leere Sammlung sortieren ergibt eine leere Liste', () => {
    expect(GameCollection.empty().sortedByName()).toEqual([])
  })
})

describe('Gespeicherte Daten prüfen', () => {
  const restoreError = (data: GameData[]) => expectError(GameCollection.restore(data))

  test('Gültige Daten ergeben die Sammlung und lassen sich wieder in Daten umwandeln', () => {
    expect(expectOk(GameCollection.restore(gamesData)).toData()).toEqual(gamesData)
  })

  test('Leere Liste ist in Ordnung', () => {
    expect(expectOk(GameCollection.restore([])).games).toEqual([])
  })

  test('Spiel mit leerer ID wird erkannt', () => {
    const message = restoreError([dixitData, { ...azulData, id: GameId.emptyValue }])
    expect(message).toBe('Diese Spiele haben eine leere ID: "Azul"')
  })

  test('Spiel mit ungültiger ID wird erkannt', () => {
    const message = restoreError([dixitData, { ...azulData, id: 'abc' }])
    expect(message).toBe('Diese Spiele haben eine ungültige ID: "Azul" (abc)')
  })

  test('Spiele mit gleicher ID werden erkannt', () => {
    const copy = { ...dixitData, name: 'Kopie von Dixit' }
    const message = restoreError([dixitData, azulData, copy])
    expect(message).toMatch(/^Diese Spiele haben die gleiche ID:/)
    expect(message).toContain('"Dixit"')
    expect(message).toContain('"Kopie von Dixit"')
    expect(message).toContain(dixitData.id)
    expect(message).not.toContain('Azul')
  })

  test.each(['', '   '])('Spiel ohne Namen ("%s") wird erkannt', (text) => {
    const message = restoreError([dixitData, { ...azulData, name: text }])
    expect(message).toBe(`Diese Spiele haben keinen Namen (ID): ${azulData.id}`)
  })

  test.each([0, -3, 101])('Spiel mit ungültiger Spieleranzahl %d wird erkannt', (players) => {
    const message = restoreError([dixitData, { ...azulData, playerCount: players }])
    expect(message).toBe(`Diese Spiele haben eine ungültige Spieleranzahl: "Azul" (${players})`)
  })

  test.each(['Dixit', 'dixit', ' DIXIT '])('Doppelter Spielname "%s" wird erkannt', (text) => {
    const message = restoreError([dixitData, azulData, { ...fluegelschlagData, name: text }])
    expect(message).toBe('Diese Spielnamen gibt es mehrfach: "Dixit"')
  })

  test('IDs werden vor dem Inhalt geprüft', () => {
    const message = restoreError([{ ...dixitData, id: GameId.emptyValue, name: '' }])
    expect(message).toContain('leere ID')
  })
})
