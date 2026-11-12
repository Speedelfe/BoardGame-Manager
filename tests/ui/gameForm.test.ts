// Tests für das Formular: leer, zum Bearbeiten gefüllt und ungespeicherte Eingaben erkennen
import { describe, expect, test } from 'vitest'

import type { Game } from '../../src/domain/Game'
import {
  canEditPlayTimeMax,
  canTogglePlayTimeOpenEnded,
  canToggleSecondaryGenre,
  emptyForm,
  formFromGame,
  formHasChanges,
  withGenre,
  withPlayTimeMin,
  withPlayTimeOpenEnded,
  withSecondaryGenreToggled,
} from '../../src/ui/gameForm'
import { azul, collectionOf, dixit, dixitData, fluegelschlag, sofaShelfData } from '../testData'

// Die freiwilligen Felder, alle leer
const noDetailInputs = {
  playTimeMinInput: '',
  playTimeMaxInput: '',
  playTimeOpenEndedInput: false,
  lastPlayedInput: '',
  genreInput: '',
  secondaryGenresInput: [],
  shelfIdInput: '',
  descriptionInput: '',
}

describe('Formular', () => {
  test('Leeres Formular hat keine Eingaben und bearbeitet kein Spiel', () => {
    expect(emptyForm()).toEqual({
      ...noDetailInputs,
      nameInput: '',
      playerCountInput: '',
      error: null,
      editing: null,
    })
  })

  test('Formular zum Bearbeiten ist mit den Daten des Spiels gefüllt', () => {
    expect(formFromGame(dixit)).toEqual({
      ...noDetailInputs,
      nameInput: 'Dixit',
      playerCountInput: '3',
      error: null,
      editing: dixit,
    })
  })

  test('Auch die freiwilligen Angaben des Spiels stehen im Formular', () => {
    expect(formFromGame(fluegelschlag)).toEqual({
      nameInput: 'Flügelschlag',
      playerCountInput: '5',
      playTimeMinInput: '40',
      playTimeMaxInput: '70',
      playTimeOpenEndedInput: false,
      lastPlayedInput: '2026-10-03',
      genreInput: 'engineBuilder',
      secondaryGenresInput: ['strategy', 'card'],
      shelfIdInput: sofaShelfData.id,
      descriptionInput: 'Vögel sammeln.\nSchön ruhig.',
      error: null,
      editing: fluegelschlag,
    })
  })

  test('Eine einzelne Spieldauer füllt nur "von"', () => {
    const form = formFromGame(azul)
    expect(form.playTimeMinInput).toBe('45')
    expect(form.playTimeMaxInput).toBe('')
  })
})

describe('Spieldauer im Formular', () => {
  test('"bis" lässt sich erst ausfüllen, wenn "von" ausgefüllt ist', () => {
    expect(canEditPlayTimeMax(emptyForm())).toBe(false)
    expect(canEditPlayTimeMax(withPlayTimeMin(emptyForm(), '  '))).toBe(false)
    expect(canEditPlayTimeMax(withPlayTimeMin(emptyForm(), '30'))).toBe(true)
  })

  test('Wird "von" geleert, wird auch "bis" geleert', () => {
    const form = withPlayTimeMin(formFromGame(fluegelschlag), '')
    expect(form.playTimeMinInput).toBe('')
    expect(form.playTimeMaxInput).toBe('')
  })

  test('"Nach oben offen" lässt sich erst ankreuzen, wenn "von" ausgefüllt ist', () => {
    expect(canTogglePlayTimeOpenEnded(emptyForm())).toBe(false)
    expect(withPlayTimeOpenEnded(emptyForm(), true).playTimeOpenEndedInput).toBe(false)
    expect(canTogglePlayTimeOpenEnded(withPlayTimeMin(emptyForm(), '60'))).toBe(true)
  })

  test('"Nach oben offen" leert und sperrt "bis"', () => {
    const form = withPlayTimeOpenEnded(formFromGame(fluegelschlag), true)
    expect(form.playTimeOpenEndedInput).toBe(true)
    expect(form.playTimeMaxInput).toBe('')
    expect(canEditPlayTimeMax(form)).toBe(false)

    // Häkchen wieder weg: "bis" lässt sich wieder ausfüllen
    expect(canEditPlayTimeMax(withPlayTimeOpenEnded(form, false))).toBe(true)
  })

  test('Wird "von" geleert, verschwindet auch das Häkchen "nach oben offen"', () => {
    const open = withPlayTimeOpenEnded(withPlayTimeMin(emptyForm(), '60'), true)
    expect(withPlayTimeMin(open, '').playTimeOpenEndedInput).toBe(false)
  })

  test('Ein Spiel mit Spieldauer nach oben offen füllt "von" und das Häkchen', () => {
    const data = [{ ...dixitData, playTimeMin: 60, playTimeOpenEnded: true }]
    const form = formFromGame(collectionOf(data).games[0] as Game)
    expect(form.playTimeMinInput).toBe('60')
    expect(form.playTimeMaxInput).toBe('')
    expect(form.playTimeOpenEndedInput).toBe(true)
  })

  test('Wird "von" nur geändert, bleibt "bis" stehen', () => {
    const form = withPlayTimeMin(formFromGame(fluegelschlag), '4')
    expect(form.playTimeMinInput).toBe('4')
    expect(form.playTimeMaxInput).toBe('70')
  })
})

describe('Genres im Formular', () => {
  const withCard = withGenre(emptyForm(), 'card')

  test('Ohne Genre lassen sich keine Nebengenres ankreuzen', () => {
    expect(canToggleSecondaryGenre(emptyForm(), 'dice')).toBe(false)
    expect(withSecondaryGenreToggled(emptyForm(), 'dice').secondaryGenresInput).toEqual([])
  })

  test('Das gewählte Genre lässt sich nicht als Nebengenre ankreuzen', () => {
    expect(canToggleSecondaryGenre(withCard, 'card')).toBe(false)
    expect(canToggleSecondaryGenre(withCard, 'dice')).toBe(true)
    expect(withSecondaryGenreToggled(withCard, 'card').secondaryGenresInput).toEqual([])
  })

  test('Nebengenres an- und abwählen, immer in der Reihenfolge der Auswahlliste', () => {
    const two = withSecondaryGenreToggled(withSecondaryGenreToggled(withCard, 'party'), 'dice')
    expect(two.secondaryGenresInput).toEqual(['dice', 'party'])
    expect(withSecondaryGenreToggled(two, 'dice').secondaryGenresInput).toEqual(['party'])
  })

  test('Wird ein Nebengenre zum Genre, verschwindet es aus den Nebengenres', () => {
    const form = withGenre(formFromGame(fluegelschlag), 'card')
    expect(form.genreInput).toBe('card')
    expect(form.secondaryGenresInput).toEqual(['strategy'])
  })

  test('Wird das Genre abgewählt, verschwinden alle Nebengenres', () => {
    const form = withGenre(formFromGame(fluegelschlag), '')
    expect(form.genreInput).toBe('')
    expect(form.secondaryGenresInput).toEqual([])
  })
})

describe('Ungespeicherte Eingaben erkennen', () => {
  test('Frisch geöffnetes Formular hat keine Änderungen', () => {
    expect(formHasChanges(emptyForm())).toBe(false)
    expect(formHasChanges(formFromGame(dixit))).toBe(false)
  })

  test('Eingaben im neuen Formular zählen als Änderung', () => {
    expect(formHasChanges({ ...emptyForm(), nameInput: 'Monopoly' })).toBe(true)
    expect(formHasChanges({ ...emptyForm(), playerCountInput: '4' })).toBe(true)
  })

  test('Geänderte Eingaben beim Bearbeiten zählen als Änderung', () => {
    expect(formHasChanges({ ...formFromGame(dixit), nameInput: 'Dixit Odyssey' })).toBe(true)
    expect(formHasChanges({ ...formFromGame(dixit), playerCountInput: '6' })).toBe(true)
  })

  test.each([
    { playTimeMinInput: '41' },
    { playTimeMaxInput: '71' },
    { playTimeOpenEndedInput: true },
    { lastPlayedInput: '2026-10-04' },
    { genreInput: 'party' as const },
    { secondaryGenresInput: ['strategy' as const] },
    { shelfIdInput: '' },
    { descriptionInput: 'Anders' },
  ])('Geänderte freiwillige Angabe %j zählt als Änderung', (changes) => {
    expect(formHasChanges({ ...formFromGame(fluegelschlag), ...changes })).toBe(true)
  })

  test('Zurückgetippte Eingaben zählen nicht als Änderung', () => {
    const form = { ...formFromGame(dixit), nameInput: 'Dixit', playerCountInput: '3' }
    expect(formHasChanges(form)).toBe(false)
  })

  test('Eine Fehlermeldung allein zählt nicht als Änderung', () => {
    expect(formHasChanges({ ...emptyForm(), error: 'Fehler' })).toBe(false)
  })
})
