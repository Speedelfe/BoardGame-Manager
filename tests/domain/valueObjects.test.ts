// Tests für die Value Objects: Spieleranzahl, Spieldauer, Datum, Genres, Spielmodus, Name und ID
import { describe, expect, test } from 'vitest'

import { GameGenres, genreNames, genres, isGenre } from '../../src/domain/GameGenres'
import { GameId } from '../../src/domain/GameId'
import { gameModeFromText, gameModeNames, gameModes } from '../../src/domain/GameMode'
import { GameName } from '../../src/domain/GameName'
import { LastPlayed, todayIsoDate } from '../../src/domain/LastPlayed'
import { PlayerCount } from '../../src/domain/PlayerCount'
import { PlayTime } from '../../src/domain/PlayTime'
import { expectError, expectOk } from '../testData'

describe('Spieleranzahl', () => {
  const playerCount = (min: string, max: string) => expectOk(PlayerCount.fromInput(min, max))

  test('Nur "von" ergibt eine einzelne Zahl, Leerzeichen am Rand sind egal', () => {
    const single = playerCount(' 4 ', '')
    expect(single.min).toBe(4)
    expect(single.max).toBeNull()
    expect(single.text).toBe('4 Spieler')
  })

  test('"von" und "bis" ergeben einen Bereich', () => {
    const range = playerCount('2', ' 5 ')
    expect(range.min).toBe(2)
    expect(range.max).toBe(5)
    expect(range.text).toBe('2–5 Spieler')
  })

  test('Gleiche Zahlen bei "von" und "bis" werden zu einer einzelnen Zahl', () => {
    const single = playerCount('4', '4')
    expect(single.max).toBeNull()
    expect(single.text).toBe('4 Spieler')
  })

  test('Die kleinste und die größte erlaubte Spieleranzahl werden angenommen', () => {
    expect(playerCount('1', '100').text).toBe('1–100 Spieler')
    expect(playerCount('1', '').text).toBe('1 Spieler')
    expect(playerCount('100', '').text).toBe('100 Spieler')
  })

  test('Nach oben offen: "ab ..." ohne "bis"', () => {
    const open = expectOk(PlayerCount.fromInput('4', '', true))
    expect(open.min).toBe(4)
    expect(open.max).toBeNull()
    expect(open.openEnded).toBe(true)
    expect(open.text).toBe('ab 4 Spieler')
  })

  test('Ohne Häkchen ist die Spieleranzahl nicht nach oben offen', () => {
    expect(playerCount('4', '').openEnded).toBe(false)
    expect(playerCount('2', '5').openEnded).toBe(false)
  })

  test('Nach oben offen geht nicht ohne "von" und nicht zusammen mit "bis"', () => {
    expect(expectError(PlayerCount.fromInput('', '', true))).toBe(
      'Bitte gib bei der Spieleranzahl zuerst "von" an.',
    )
    expect(expectError(PlayerCount.fromInput('2', '5', true))).toBe(
      'Eine Spieleranzahl, die nach oben offen ist, kann kein "bis" haben.',
    )
  })

  test.each([
    ['', '', 'Die Spieleranzahl muss eine Zahl sein.'],
    ['', '5', 'Bitte gib bei der Spieleranzahl zuerst "von" an.'],
    ['vier', '', 'Die Spieleranzahl muss eine Zahl sein.'],
    ['2.5', '', 'Die Spieleranzahl muss eine Zahl sein.'],
    ['2', 'viele', 'Die Spieleranzahl muss eine Zahl sein.'],
    ['0', '', 'Die Spieleranzahl muss mindestens 1 sein.'],
    ['-2', '', 'Die Spieleranzahl muss eine Zahl sein.'],
    ['+4', '', 'Die Spieleranzahl muss eine Zahl sein.'],
    ['101', '', 'Die Spieleranzahl darf höchstens 100 sein.'],
    ['5000', '', 'Die Spieleranzahl darf höchstens 100 sein.'],
    ['2', '101', 'Die Spieleranzahl darf höchstens 100 sein.'],
    ['2', '99999999999999999999', 'Die Spieleranzahl darf höchstens 100 sein.'],
    ['5', '2', 'Bei der Spieleranzahl darf "von" nicht größer als "bis" sein.'],
  ])('Ungültige Eingabe ("%s", "%s") ergibt die passende Fehlermeldung', (min, max, expected) => {
    expect(expectError(PlayerCount.fromInput(min, max))).toBe(expected)
  })

  test.each([
    [0, null],
    [-3, null],
    [101, null],
    [2.5, null],
    [2, 101],
    [5, 2],
  ])('Ungültige Zahlen (%d, %d) werden abgelehnt', (min, max) => {
    expect(PlayerCount.fromNumbers(min, max).ok).toBe(false)
  })
})

describe('Spieldauer', () => {
  const playTime = (min: string, max: string) => expectOk(PlayTime.fromInput(min, max))

  test('Beide Felder leer: keine Spieldauer', () => {
    expect(playTime('', '')).toBeNull()
    expect(playTime('  ', ' ')).toBeNull()
  })

  test('Nur "von" ergibt eine einzelne Zahl', () => {
    const single = playTime(' 45 ', '')
    expect(single?.min).toBe(45)
    expect(single?.max).toBeNull()
    expect(single?.text).toBe('45 Minuten')
  })

  test('"von" und "bis" ergeben einen Bereich', () => {
    const range = playTime('30', '60')
    expect(range?.min).toBe(30)
    expect(range?.max).toBe(60)
    expect(range?.text).toBe('30–60 Minuten')
  })

  test('Gleiche Zahlen bei "von" und "bis" werden zu einer einzelnen Zahl', () => {
    const single = playTime('60', '60')
    expect(single?.max).toBeNull()
    expect(single?.text).toBe('60 Minuten')
  })

  test('Die kleinste und die größte erlaubte Spieldauer werden angenommen', () => {
    expect(playTime('1', '1440')?.text).toBe('1–1440 Minuten')
    expect(playTime('1', '')?.text).toBe('1 Minute')
  })

  test('Nach oben offen: "ab ..." ohne "bis"', () => {
    const open = expectOk(PlayTime.fromInput('60', '', true))
    expect(open?.min).toBe(60)
    expect(open?.max).toBeNull()
    expect(open?.openEnded).toBe(true)
    expect(open?.text).toBe('ab 60 Minuten')
    expect(expectOk(PlayTime.fromInput('1', '', true))?.text).toBe('ab 1 Minute')
  })

  test('Ohne Häkchen ist die Spieldauer nicht nach oben offen', () => {
    expect(playTime('45', '')?.openEnded).toBe(false)
    expect(playTime('30', '60')?.openEnded).toBe(false)
  })

  test('Nach oben offen geht nicht ohne "von" und nicht zusammen mit "bis"', () => {
    expect(expectError(PlayTime.fromInput('', '', true))).toBe(
      'Bitte gib bei der Spieldauer zuerst "von" an.',
    )
    expect(expectError(PlayTime.fromInput('30', '60', true))).toBe(
      'Eine Spieldauer, die nach oben offen ist, kann kein "bis" haben.',
    )
  })

  test.each([
    ['', '60', 'Bitte gib bei der Spieldauer zuerst "von" an.'],
    ['lang', '', 'Die Spieldauer muss eine ganze Zahl in Minuten sein.'],
    ['1,5', '', 'Die Spieldauer muss eine ganze Zahl in Minuten sein.'],
    ['30', 'ewig', 'Die Spieldauer muss eine ganze Zahl in Minuten sein.'],
    ['-5', '', 'Die Spieldauer muss eine ganze Zahl in Minuten sein.'],
    ['0', '', 'Die Spieldauer muss mindestens 1 Minute sein.'],
    ['1441', '', 'Die Spieldauer darf höchstens 1440 Minuten sein.'],
    ['30', '99999999999999999999', 'Die Spieldauer darf höchstens 1440 Minuten sein.'],
    ['60', '30', 'Bei der Spieldauer darf "von" nicht größer als "bis" sein.'],
  ])('Ungültige Eingabe ("%s", "%s") ergibt die passende Fehlermeldung', (min, max, expected) => {
    expect(expectError(PlayTime.fromInput(min, max))).toBe(expected)
  })

  test.each([
    [0, null],
    [2.5, null],
    [30, 1441],
    [60, 30],
  ])('Ungültige Zahlen (%d, %d) werden abgelehnt', (min, max) => {
    expect(PlayTime.fromNumbers(min, max).ok).toBe(false)
  })
})

describe('Zuletzt gespielt', () => {
  const today = '2026-11-12'

  test('Leeres Feld: kein Datum', () => {
    expect(expectOk(LastPlayed.fromInput('', today))).toBeNull()
  })

  test('Heute und frühere Tage werden angenommen und deutsch angezeigt', () => {
    expect(expectOk(LastPlayed.fromInput('2026-11-12', today))?.text).toBe('12.11.2026')
    expect(expectOk(LastPlayed.fromInput('2025-03-07', today))?.text).toBe('07.03.2025')
  })

  test('Ein Tag in der Zukunft wird abgelehnt', () => {
    expect(expectError(LastPlayed.fromInput('2026-11-13', today))).toBe(
      '"Zuletzt gespielt" darf nicht in der Zukunft liegen.',
    )
  })

  test.each(['12.11.2026', '2026-13-01', '2026-02-30', 'gestern'])(
    'Ungültiges Datum "%s" wird abgelehnt',
    (text) => {
      expect(expectError(LastPlayed.fromString(text))).toBe(`"${text}" ist kein gültiges Datum.`)
    },
  )

  test('Der heutige Tag hat die Form Jahr-Monat-Tag', () => {
    expect(LastPlayed.fromString(todayIsoDate()).ok).toBe(true)
  })
})

describe('Genres', () => {
  test('Ohne Genre und Nebengenres ist alles leer', () => {
    const none = expectOk(GameGenres.create(null, []))
    expect(none.main).toBeNull()
    expect(none.secondary).toEqual([])
  })

  test('Nebengenres stehen in der Reihenfolge der Auswahlliste, keins doppelt', () => {
    const chosen = expectOk(GameGenres.create('party', ['dice', 'card', 'dice']))
    expect(chosen.main).toBe('party')
    expect(chosen.secondary).toEqual(['card', 'dice'])
  })

  test('Jedes Genre hat einen Namen für die Anzeige', () => {
    expect(genres.map((genre) => genreNames[genre])).toEqual([
      'Deckbuilding',
      'Deduktion und Bluff',
      'Enginebuilder',
      'Familie',
      'Geschicklichkeit',
      'Karten',
      'Kinder',
      'Legespiel',
      'Party',
      'Quiz',
      'Rätsel',
      'Roll & Write',
      'Sammelspiel',
      'Stichspiel',
      'Strategie',
      'Worker Placement',
      'Wortspiel',
      'Würfel',
      'Sonstiges',
    ])
  })

  test('Die Genres stehen alphabetisch, "Sonstiges" am Ende', () => {
    const names = genres.map((genre) => genreNames[genre])
    const withoutOther = names.slice(0, -1)

    expect(names.at(-1)).toBe('Sonstiges')
    expect(withoutOther).toEqual([...withoutOther].sort(new Intl.Collator('de-DE').compare))
  })

  test('Die Kürzel der bisherigen Genres gibt es weiter', () => {
    // Sie stehen in gespeicherten Sammlungen und dürfen deshalb nicht verschwinden
    for (const old of ['strategy', 'card', 'puzzle', 'dice', 'engineBuilder', 'party', 'other']) {
      expect(isGenre(old)).toBe(true)
    }
  })

  test.each<[string | null, string[], string]>([
    [null, ['card'], 'Nebengenres gehen nur zusammen mit einem Genre.'],
    ['card', ['card', 'dice'], 'Das Genre kann nicht zugleich Nebengenre sein.'],
    ['quatsch', [], '"quatsch" ist kein bekanntes Genre.'],
    ['card', ['quatsch'], '"quatsch" ist kein bekanntes Genre.'],
  ])('Ungültige Auswahl (%s, %j) wird abgelehnt', (main, secondary, expected) => {
    expect(expectError(GameGenres.create(main, secondary))).toBe(expected)
  })
})

describe('Spielmodus', () => {
  test('Bekannte Kürzel werden angenommen', () => {
    expect(expectOk(gameModeFromText('cooperative'))).toBe('cooperative')
    expect(expectOk(gameModeFromText('competitive'))).toBe('competitive')
  })

  test('Ohne Angabe gibt es keinen Spielmodus', () => {
    expect(expectOk(gameModeFromText(null))).toBeNull()
  })

  test.each(['quatsch', '', 'Kooperativ'])('Unbekanntes Kürzel "%s" wird abgelehnt', (text) => {
    expect(expectError(gameModeFromText(text))).toBe(`"${text}" ist kein bekannter Spielmodus.`)
  })

  test('Jeder Spielmodus hat einen Namen für die Anzeige', () => {
    expect(gameModes.map((mode) => gameModeNames[mode])).toEqual(['Kooperativ', 'Kompetitiv'])
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
