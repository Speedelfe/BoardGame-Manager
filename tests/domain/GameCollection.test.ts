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
  bueroShelf,
  sofaShelf,
  collectionOf,
  dixit,
  dixitData,
  expectError,
  expectOk,
  fluegelschlag,
  fluegelschlagData,
  games,
  gamesData,
  names,
  noDetailsData,
} from '../testData'

const name = (text: string) => expectOk(GameName.create(text))
const count = (value: number) => expectOk(PlayerCount.fromNumbers(value, null))

describe('Hinzufügen', () => {
  test('Neues Spiel wird hinten an die Sammlung angehängt', () => {
    const { collection, game } = expectOk(games.add(name('Monopoly'), count(4)))
    expect(names(collection.games)).toEqual(['Dixit', 'Azul', 'Flügelschlag', 'Monopoly'])
    expect(game.playerCount.min).toBe(4)
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
    expect(collection.games[1]?.playerCount.min).toBe(2)
    expect(game.id.equals(azul.id)).toBe(true)
  })

  test('Die freiwilligen Angaben werden beim Hinzufügen und Ändern übernommen', () => {
    const details = fluegelschlag.details
    expect(expectOk(games.add(name('Monopoly'), count(4), details)).game.details).toBe(details)
    expect(expectOk(games.change(dixit.id, name('Dixit'), count(3), details)).game.details).toBe(
      details,
    )
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

describe('Spiele in einem Regal', () => {
  test('Nur die Spiele dieses Regals, alphabetisch sortiert', () => {
    const collection = collectionOf([
      fluegelschlagData,
      { ...dixitData, shelfId: bueroShelf.id.value },
      { ...azulData, shelfId: sofaShelf.id.value },
    ])
    expect(names(collection.gamesOnShelf(sofaShelf.id))).toEqual(['Azul', 'Flügelschlag'])
    expect(names(collection.gamesOnShelf(bueroShelf.id))).toEqual(['Dixit'])
  })

  test('Ein Regal ohne Spiele ergibt eine leere Liste', () => {
    expect(games.gamesOnShelf(bueroShelf.id)).toEqual([])
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
      ...noDetailsData,
      id: GameId.create().value,
      name: text,
      playerCountMin: 2,
      playerCountMax: null,
      playerCountOpenEnded: false,
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
    const message = restoreError([dixitData, { ...azulData, playerCountMin: players }])
    expect(message).toBe(`Diese Spiele haben eine ungültige Spieleranzahl: "Azul" (${players})`)
  })

  test.each<[Partial<GameData>, string]>([
    [{ playerCountMin: 5, playerCountMax: 2 }, '5–2'],
    [{ playerCountMin: 2, playerCountMax: 101 }, '2–101'],
    [
      { playerCountMin: 2, playerCountMax: 5, playerCountOpenEnded: true },
      '2–5, nach oben offen',
    ],
  ])('Spiel mit ungültiger Spieleranzahl von-bis %j wird erkannt', (playerCount, shown) => {
    const message = restoreError([dixitData, { ...azulData, ...playerCount }])
    expect(message).toBe(`Diese Spiele haben eine ungültige Spieleranzahl: "Azul" (${shown})`)
  })

  test('Spieleranzahl von-bis und nach oben offen bleiben erhalten', () => {
    const data = [
      { ...dixitData, playerCountMin: 2, playerCountMax: 5 },
      { ...azulData, playerCountMin: 4, playerCountOpenEnded: true },
    ]
    const restored = expectOk(GameCollection.restore(data))

    expect(restored.games.map((game) => game.playerCount.text)).toEqual([
      '2–5 Spieler',
      'ab 4 Spieler',
    ])
    expect(restored.toData()).toEqual(data)
  })

  test.each(['Dixit', 'dixit', ' DIXIT '])('Doppelter Spielname "%s" wird erkannt', (text) => {
    const message = restoreError([dixitData, azulData, { ...fluegelschlagData, name: text }])
    expect(message).toBe('Diese Spielnamen gibt es mehrfach: "Dixit"')
  })

  test('IDs werden vor dem Inhalt geprüft', () => {
    const message = restoreError([{ ...dixitData, id: GameId.emptyValue, name: '' }])
    expect(message).toContain('leere ID')
  })

  test.each<[Partial<GameData>, string]>([
    [{ playTimeMin: 0 }, 'Die Spieldauer muss mindestens 1 Minute sein.'],
    [{ playTimeMin: 60, playTimeMax: 30 }, 'Bei der Spieldauer darf "von" nicht größer als "bis" sein.'],
    [{ playTimeMin: null, playTimeMax: 30 }, 'Die Spieldauer hat ein "bis", aber kein "von".'],
    [
      { playTimeMin: null, playTimeOpenEnded: true },
      'Die Spieldauer ist nach oben offen, hat aber kein "von".',
    ],
    [
      { playTimeMin: 30, playTimeMax: 60, playTimeOpenEnded: true },
      'Eine Spieldauer, die nach oben offen ist, kann kein "bis" haben.',
    ],
    [{ lastPlayed: '2026-02-30' }, '"2026-02-30" ist kein gültiges Datum.'],
    [{ genre: 'quatsch' }, '"quatsch" ist kein bekanntes Genre.'],
    [{ shelfId: 'abc' }, 'Das Regal hat keine gültige ID (abc).'],
    [{ genre: null, secondaryGenres: ['card'] }, 'Nebengenres gehen nur zusammen mit einem Genre.'],
    [{ genre: 'card', secondaryGenres: ['card'] }, 'Das Genre kann nicht zugleich Nebengenre sein.'],
  ])('Ungültige freiwillige Angabe %j wird mit dem Spielnamen gemeldet', (changes, expected) => {
    const message = restoreError([dixitData, { ...azulData, ...changes }])
    expect(message).toBe(`Spiel "Azul": ${expected}`)
  })

  test('Eine Spieldauer nach oben offen bleibt beim Wiederherstellen erhalten', () => {
    const data = [{ ...dixitData, playTimeMin: 60, playTimeOpenEnded: true }]
    const collection = expectOk(GameCollection.restore(data))
    expect(collection.games[0]?.details.playTime?.text).toBe('ab 60 Minuten')
    expect(collection.toData()).toEqual(data)
  })

  test('Eine Beschreibung nur aus Leerzeichen gilt als nicht ausgefüllt', () => {
    const collection = expectOk(GameCollection.restore([{ ...dixitData, description: '   ' }]))
    expect(collection.games[0]?.details.description).toBeNull()
  })
})
