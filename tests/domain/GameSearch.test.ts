// Tests für die Suche nach passenden Spielen für eine Runde
import { describe, expect, test } from 'vitest'

import type { GameData } from '../../src/domain/Game'
import { GameSearch } from '../../src/domain/GameSearch'
import {
  azulData,
  collectionOf,
  dixitData,
  expectError,
  expectOk,
  fluegelschlagData,
  games,
  names,
} from '../testData'

// Die Beispielspiele:
// - Dixit: 3 Spieler, keine freiwilligen Angaben
// - Azul: 4 Spieler, 45 Minuten
// - Flügelschlag: 1–5 Spieler, 40–70 Minuten, Enginebuilder (dazu Strategie und Karten),
//   zuletzt gespielt am 03.10.2026

// Suche aus Eingaben, wie sie im Suchformular stehen
const search = (players: string, minutes: string, genres: string[] = []) =>
  expectOk(GameSearch.fromInput(players, minutes, genres))

// Die Namen der gefundenen Beispielspiele, in der Reihenfolge der Ergebnisliste
const found = (players: string, minutes: string, genres: string[] = []) =>
  names(games.find(search(players, minutes, genres)))

// Die Namen der Spiele einer eigenen Sammlung, die zur Suche passen
const foundIn = (data: GameData[], players: string, minutes: string, genres: string[] = []) =>
  names(collectionOf(data).find(search(players, minutes, genres)))

describe('Suche aus Eingaben', () => {
  test('Ohne Eingaben ist nichts eingeschränkt', () => {
    const empty = search('', ' ')
    expect(empty.players).toBeNull()
    expect(empty.minutes).toBeNull()
    expect(empty.genres).toEqual([])
  })

  test('Zahlen werden übernommen, Leerzeichen am Rand sind egal', () => {
    const filled = search(' 4 ', ' 45 ')
    expect(filled.players).toBe(4)
    expect(filled.minutes).toBe(45)
  })

  test('Genres stehen in der Reihenfolge der Auswahlliste, keins doppelt', () => {
    expect(search('', '', ['party', 'card', 'party']).genres).toEqual(['card', 'party'])
  })

  test.each<[string, string, string[], string]>([
    ['vier', '', [], 'Die Spieleranzahl muss eine Zahl sein.'],
    ['0', '', [], 'Die Spieleranzahl muss mindestens 1 sein.'],
    ['101', '', [], 'Die Spieleranzahl darf höchstens 100 sein.'],
    ['', 'lang', [], 'Die Spieldauer muss eine ganze Zahl in Minuten sein.'],
    ['', '0', [], 'Die Spieldauer muss mindestens 1 Minute sein.'],
    ['', '1441', [], 'Die Spieldauer darf höchstens 1440 Minuten sein.'],
    ['', '', ['quatsch'], '"quatsch" ist kein bekanntes Genre.'],
  ])('Ungültige Eingabe ("%s", "%s", %j) wird abgelehnt', (players, minutes, genres, expected) => {
    expect(expectError(GameSearch.fromInput(players, minutes, genres))).toBe(expected)
  })
})

describe('Suche nach Spieleranzahl', () => {
  test('Eine einzelne Zahl passt nur genau', () => {
    expect(foundIn([azulData], '4', '')).toEqual(['Azul'])
    expect(foundIn([azulData], '3', '')).toEqual([])
    expect(foundIn([azulData], '5', '')).toEqual([])
  })

  test('Ein Bereich passt von "von" bis "bis", beide eingeschlossen', () => {
    const data = [{ ...dixitData, playerCountMin: 2, playerCountMax: 5 }]
    expect(foundIn(data, '1', '')).toEqual([])
    expect(foundIn(data, '2', '')).toEqual(['Dixit'])
    expect(foundIn(data, '5', '')).toEqual(['Dixit'])
    expect(foundIn(data, '6', '')).toEqual([])
  })

  test('Nach oben offen passt ab "von"', () => {
    const data = [{ ...dixitData, playerCountMin: 4, playerCountOpenEnded: true }]
    expect(foundIn(data, '3', '')).toEqual([])
    expect(foundIn(data, '4', '')).toEqual(['Dixit'])
    expect(foundIn(data, '100', '')).toEqual(['Dixit'])
  })
})

describe('Suche nach Zeit', () => {
  test('Eine einzelne Spieldauer passt, wenn sie in die Zeit passt', () => {
    expect(foundIn([azulData], '', '44')).toEqual([])
    expect(foundIn([azulData], '', '45')).toEqual(['Azul'])
    expect(foundIn([azulData], '', '120')).toEqual(['Azul'])
  })

  test('Bei einem Bereich zählt die kürzeste Dauer', () => {
    // Flügelschlag dauert 40–70 Minuten
    expect(foundIn([fluegelschlagData], '', '39')).toEqual([])
    expect(foundIn([fluegelschlagData], '', '40')).toEqual(['Flügelschlag'])
    expect(foundIn([fluegelschlagData], '', '50')).toEqual(['Flügelschlag'])
  })

  test('Nach oben offen passt, sobald die kürzeste Dauer passt', () => {
    const data = [{ ...dixitData, playTimeMin: 60, playTimeOpenEnded: true }]
    expect(foundIn(data, '', '59')).toEqual([])
    expect(foundIn(data, '', '60')).toEqual(['Dixit'])
  })

  test('Ein Spiel ohne Spieldauer wird trotzdem gefunden', () => {
    expect(foundIn([dixitData], '', '10')).toEqual(['Dixit'])
  })
})

describe('Suche nach Genres', () => {
  test('Das Genre des Spiels passt', () => {
    expect(foundIn([fluegelschlagData], '', '', ['engineBuilder'])).toEqual(['Flügelschlag'])
  })

  test('Ein Nebengenre des Spiels passt auch', () => {
    expect(foundIn([fluegelschlagData], '', '', ['card'])).toEqual(['Flügelschlag'])
  })

  test('Bei mehreren Genres muss nur eins passen', () => {
    expect(foundIn([fluegelschlagData], '', '', ['party', 'strategy'])).toEqual(['Flügelschlag'])
  })

  test('Passt keins der Genres, wird das Spiel nicht gefunden', () => {
    expect(foundIn([fluegelschlagData], '', '', ['party', 'dice'])).toEqual([])
  })

  test('Ein Spiel ohne Genre wird trotzdem gefunden', () => {
    expect(foundIn([dixitData], '', '', ['card'])).toEqual(['Dixit'])
  })
})

describe('Mehrere Angaben zusammen', () => {
  test('Ein Spiel muss zu jeder Angabe passen', () => {
    // Flügelschlag: 1–5 Spieler, 40–70 Minuten, Karten als Nebengenre
    const data = [fluegelschlagData]
    expect(foundIn(data, '4', '60', ['card'])).toEqual(['Flügelschlag'])
    expect(foundIn(data, '6', '60', ['card'])).toEqual([])
    expect(foundIn(data, '4', '30', ['card'])).toEqual([])
    expect(foundIn(data, '4', '60', ['party'])).toEqual([])
  })

  test('Fehlende Angaben am Spiel schließen es nicht aus', () => {
    // Azul hat kein Genre, Dixit weder Genre noch Spieldauer (aber nur 3 Spieler)
    expect(found('4', '60', ['party'])).toEqual(['Azul'])
    expect(found('3', '10', ['party'])).toEqual(['Dixit'])
  })

  test('Vier Spieler mit einer Stunde Zeit: Azul und Flügelschlag', () => {
    expect(found('4', '60')).toEqual(['Azul', 'Flügelschlag'])
  })
})

describe('Reihenfolge der Ergebnisse', () => {
  test('Ohne Eingaben werden alle Spiele gefunden, die ohne Datum zuerst', () => {
    // Azul und Dixit haben kein Datum (alphabetisch), Flügelschlag wurde schon gespielt
    expect(found('', '')).toEqual(['Azul', 'Dixit', 'Flügelschlag'])
  })

  test('Das am längsten nicht gespielte Spiel steht vor den später gespielten', () => {
    const data = [
      { ...dixitData, lastPlayed: '2026-11-01' },
      { ...azulData, lastPlayed: '2025-03-07' },
      { ...fluegelschlagData, lastPlayed: '2026-01-15' },
    ]
    expect(foundIn(data, '', '')).toEqual(['Azul', 'Flügelschlag', 'Dixit'])
  })

  test('Spiele ohne Datum stehen vor allen Spielen mit Datum', () => {
    const data = [
      { ...dixitData, lastPlayed: '2020-01-01' },
      azulData,
      { ...fluegelschlagData, lastPlayed: null },
    ]
    expect(foundIn(data, '', '')).toEqual(['Azul', 'Flügelschlag', 'Dixit'])
  })

  test('Am selben Tag gespielte Spiele stehen alphabetisch', () => {
    const data = [
      { ...fluegelschlagData, lastPlayed: '2026-10-03' },
      { ...dixitData, lastPlayed: '2026-10-03' },
      { ...azulData, lastPlayed: '2026-10-03' },
    ]
    expect(foundIn(data, '', '')).toEqual(['Azul', 'Dixit', 'Flügelschlag'])
  })

  test('Die Sammlung selbst behält ihre Reihenfolge', () => {
    games.find(search('', ''))
    expect(names(games.games)).toEqual(['Dixit', 'Azul', 'Flügelschlag'])
  })
})
