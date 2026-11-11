// Tests für die Value Objects: Spieleranzahl, Name und ID
import { describe, expect, test } from 'vitest'

import { GameId } from '../../src/domain/GameId'
import { GameName } from '../../src/domain/GameName'
import { PlayerCount } from '../../src/domain/PlayerCount'
import { expectError, expectOk } from '../testData'

describe('Spieleranzahl', () => {
  test('Gültige Eingabe wird zur Zahl, Leerzeichen am Rand sind egal', () => {
    expect(expectOk(PlayerCount.fromInput('4')).value).toBe(4)
    expect(expectOk(PlayerCount.fromInput(' 4 ')).value).toBe(4)
  })

  test('Die kleinste und die größte erlaubte Spieleranzahl werden angenommen', () => {
    expect(expectOk(PlayerCount.fromInput('1')).value).toBe(1)
    expect(expectOk(PlayerCount.fromInput('100')).value).toBe(100)
  })

  test.each([
    ['', 'Die Spieleranzahl muss eine Zahl sein.'],
    ['vier', 'Die Spieleranzahl muss eine Zahl sein.'],
    ['2.5', 'Die Spieleranzahl muss eine Zahl sein.'],
    ['0', 'Die Spieleranzahl muss mindestens 1 sein.'],
    ['-2', 'Die Spieleranzahl muss mindestens 1 sein.'],
    ['101', 'Die Spieleranzahl darf höchstens 100 sein.'],
    ['5000', 'Die Spieleranzahl darf höchstens 100 sein.'],
    ['99999999999999999999', 'Die Spieleranzahl darf höchstens 100 sein.'],
  ])('Ungültige Eingabe "%s" ergibt die passende Fehlermeldung', (input, expected) => {
    expect(expectError(PlayerCount.fromInput(input))).toBe(expected)
  })

  test.each([0, -3, 101, 2.5])('Ungültige Zahl %d wird abgelehnt', (value) => {
    expect(PlayerCount.fromNumber(value).ok).toBe(false)
  })
})

describe('Spielname', () => {
  test('Leerzeichen am Anfang und Ende werden entfernt', () => {
    expect(expectOk(GameName.create('  Monopoly ')).text).toBe('Monopoly')
  })

  test.each(['', '   '])('Leerer Name "%s" wird abgelehnt', (input) => {
    expect(expectError(GameName.create(input))).toBe('Bitte gib einen Spielnamen ein.')
  })

  test('Groß- und Kleinschreibung ist beim Vergleichen egal', () => {
    const dixit = expectOk(GameName.create('Dixit'))
    expect(dixit.equals(expectOk(GameName.create(' DIXIT ')))).toBe(true)
    expect(dixit.equals(expectOk(GameName.create('Azul')))).toBe(false)
  })
})

describe('ID', () => {
  test('Neue IDs sind gültig und jedes Mal anders', () => {
    const first = GameId.create()
    const second = GameId.create()
    expect(GameId.fromString(first.value).ok).toBe(true)
    expect(first.equals(second)).toBe(false)
  })

  test('Groß- und Kleinschreibung ist bei IDs egal', () => {
    const lower = expectOk(GameId.fromString('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'))
    const upper = expectOk(GameId.fromString('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA'))
    expect(lower.equals(upper)).toBe(true)
  })

  test.each(['abc', '', GameId.emptyValue])('Ungültige ID "%s" wird abgelehnt', (text) => {
    expect(GameId.fromString(text).ok).toBe(false)
  })
})
