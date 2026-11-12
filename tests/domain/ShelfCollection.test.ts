// Tests für die Regale: Name, ID und die Sammlung (hinzufügen, umbenennen, löschen, sortieren, prüfen)
import { describe, expect, test } from 'vitest'

import type { Shelf, ShelfData } from '../../src/domain/Shelf'
import { ShelfCollection } from '../../src/domain/ShelfCollection'
import { ShelfId } from '../../src/domain/ShelfId'
import { ShelfName } from '../../src/domain/ShelfName'
import { expectError, expectOk } from '../testData'

const sofaData: ShelfData = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Sofaschrank' }
const bueroData: ShelfData = { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Büroregal' }
const shelvesData = [sofaData, bueroData]

const shelves = expectOk(ShelfCollection.restore(shelvesData))
const [sofa, buero] = shelves.shelves as [Shelf, Shelf]

const name = (text: string) => expectOk(ShelfName.create(text))
const names = (list: readonly Shelf[]) => list.map((shelf) => shelf.name.text)

describe('Regalname und Regal-ID', () => {
  test('Leerzeichen am Anfang und Ende werden entfernt', () => {
    expect(name('  Wohnwand links ').text).toBe('Wohnwand links')
  })

  test.each(['', '   '])('Leerer Name "%s" wird abgelehnt', (input) => {
    expect(expectError(ShelfName.create(input))).toBe('Bitte gib einen Namen für das Regal ein.')
  })

  test('Groß- und Kleinschreibung ist beim Vergleichen egal', () => {
    expect(name('Sofaschrank').equals(name(' SOFASCHRANK '))).toBe(true)
    expect(name('Sofaschrank').equals(name('Büroregal'))).toBe(false)
  })

  test('Neue IDs sind gültig und jedes Mal anders', () => {
    const first = ShelfId.create()
    expect(ShelfId.fromString(first.value).ok).toBe(true)
    expect(first.equals(ShelfId.create())).toBe(false)
  })

  test.each(['abc', ''])('Ungültige ID "%s" wird abgelehnt', (text) => {
    expect(ShelfId.fromString(text).ok).toBe(false)
  })
})

describe('Regal hinzufügen', () => {
  test('Neues Regal wird hinten angehängt und bekommt eine neue ID', () => {
    const changed = expectOk(shelves.add(name('Wohnwand links')))
    expect(names(changed.shelves.shelves)).toEqual(['Sofaschrank', 'Büroregal', 'Wohnwand links'])
    expect(shelves.findById(changed.shelf.id)).toBeNull()
  })

  test.each(['Sofaschrank', 'sofaschrank'])('Vorhandener Name "%s" wird abgelehnt', (text) => {
    expect(expectError(shelves.add(name(text)))).toBe(`Das Regal "${text}" gibt es schon.`)
  })

  test('Hinzufügen ändert die ursprüngliche Sammlung nicht', () => {
    shelves.add(name('Wohnwand links'))
    expect(names(shelves.shelves)).toEqual(['Sofaschrank', 'Büroregal'])
  })
})

describe('Regal umbenennen', () => {
  test('Das Regal behält seine ID und seinen Platz', () => {
    const changed = expectOk(shelves.rename(sofa.id, name('Sofa')))
    expect(names(changed.shelves.shelves)).toEqual(['Sofa', 'Büroregal'])
    expect(changed.shelf.id.equals(sofa.id)).toBe(true)
  })

  test('Ein Regal darf seinen eigenen Namen behalten', () => {
    expect(expectOk(shelves.rename(sofa.id, name('SOFASCHRANK'))).shelf.name.text).toBe(
      'SOFASCHRANK',
    )
  })

  test('Ein Regal darf nicht den Namen eines anderen Regals bekommen', () => {
    expect(expectError(shelves.rename(sofa.id, name('büroregal')))).toBe(
      'Das Regal "büroregal" gibt es schon.',
    )
  })

  test('Ein unbekanntes Regal kann nicht umbenannt werden', () => {
    expect(shelves.rename(ShelfId.create(), name('Keller')).ok).toBe(false)
  })
})

describe('Regal löschen', () => {
  test('Gelöschtes Regal ist nicht mehr in der Sammlung', () => {
    expect(names(shelves.remove(buero.id).shelves)).toEqual(['Sofaschrank'])
  })

  test('Löschen eines unbekannten Regals ändert nichts', () => {
    expect(names(shelves.remove(ShelfId.create()).shelves)).toEqual(names(shelves.shelves))
  })
})

describe('Regale sortieren', () => {
  test('Regale werden alphabetisch sortiert, die Sammlung behält ihre Reihenfolge', () => {
    expect(names(shelves.sortedByName())).toEqual(['Büroregal', 'Sofaschrank'])
    expect(names(shelves.shelves)).toEqual(['Sofaschrank', 'Büroregal'])
  })
})

describe('Gespeicherte Regale prüfen', () => {
  const restoreError = (data: ShelfData[]) => expectError(ShelfCollection.restore(data))

  test('Gültige Daten ergeben die Sammlung und lassen sich wieder in Daten umwandeln', () => {
    expect(shelves.toData()).toEqual(shelvesData)
  })

  test('Leere Liste ist in Ordnung', () => {
    expect(expectOk(ShelfCollection.restore([])).shelves).toEqual([])
  })

  test('Ungültige ID wird erkannt', () => {
    expect(restoreError([{ ...sofaData, id: 'abc' }])).toBe(
      'Regal "Sofaschrank": "abc" ist keine gültige ID.',
    )
  })

  test('Regal ohne Namen wird erkannt', () => {
    expect(restoreError([{ ...sofaData, name: '  ' }])).toBe(
      `Das Regal mit der ID ${sofaData.id} hat keinen Namen.`,
    )
  })

  test('Doppelte ID wird erkannt', () => {
    expect(restoreError([sofaData, { ...bueroData, id: sofaData.id }])).toBe(
      `Die Regal-ID ${sofaData.id} gibt es mehrfach.`,
    )
  })

  test('Doppelter Name wird erkannt', () => {
    expect(restoreError([sofaData, { ...bueroData, name: 'sofaschrank' }])).toBe(
      'Den Regalnamen "sofaschrank" gibt es mehrfach.',
    )
  })
})
