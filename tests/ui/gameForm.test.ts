// Tests für das Formular: leer, zum Bearbeiten gefüllt und ungespeicherte Eingaben erkennen
import { describe, expect, test } from 'vitest'

import type { Game } from '../../src/domain/Game'
import {
  canEditPlayerCountMax,
  canEditPlayTimeMax,
  canTogglePlayerCountOpenEnded,
  canTogglePlayTimeOpenEnded,
  canToggleSecondaryGenre,
  emptyForm,
  formFromGame,
  formHasChanges,
  withGameModeToggled,
  withGenre,
  withPlayerCountMin,
  withPlayerCountOpenEnded,
  withPlayTimeMin,
  withPlayTimeOpenEnded,
  withSecondaryGenreToggled,
} from '../../src/ui/gameForm'
import { azul, collectionOf, dixit, dixitData, fluegelschlag, sofaShelfData } from '../testData'

// "bis" und "nach oben offen" der Spieleranzahl und die freiwilligen Felder, alle leer
const noDetailInputs = {
  playerCountMaxInput: '',
  playerCountOpenEndedInput: false,
  playTimeMinInput: '',
  playTimeMaxInput: '',
  playTimeOpenEndedInput: false,
  lastPlayedInput: '',
  genreInput: '',
  secondaryGenresInput: [],
  gameModeInput: '',
  shelfIdInput: '',
  descriptionInput: '',
}

describe('Formular', () => {
  test('Leeres Formular hat keine Eingaben und bearbeitet kein Spiel', () => {
    expect(emptyForm()).toEqual({
      ...noDetailInputs,
      nameInput: '',
      playerCountMinInput: '',
      error: null,
      editing: null,
    })
  })

  test('Formular zum Bearbeiten ist mit den Daten des Spiels gefüllt', () => {
    expect(formFromGame(dixit)).toEqual({
      ...noDetailInputs,
      nameInput: 'Dixit',
      playerCountMinInput: '3',
      error: null,
      editing: dixit,
    })
  })

  test('Auch die freiwilligen Angaben des Spiels stehen im Formular', () => {
    expect(formFromGame(fluegelschlag)).toEqual({
      nameInput: 'Flügelschlag',
      playerCountMinInput: '1',
      playerCountMaxInput: '5',
      playerCountOpenEndedInput: false,
      playTimeMinInput: '40',
      playTimeMaxInput: '70',
      playTimeOpenEndedInput: false,
      lastPlayedInput: '2026-10-03',
      genreInput: 'engineBuilder',
      secondaryGenresInput: ['strategy', 'card'],
      gameModeInput: 'competitive',
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

describe('Spieleranzahl im Formular', () => {
  test('Eine einzelne Spieleranzahl füllt nur "von"', () => {
    const form = formFromGame(dixit)
    expect(form.playerCountMinInput).toBe('3')
    expect(form.playerCountMaxInput).toBe('')
    expect(form.playerCountOpenEndedInput).toBe(false)
  })

  test('"bis" lässt sich erst ausfüllen, wenn "von" ausgefüllt ist', () => {
    expect(canEditPlayerCountMax(emptyForm())).toBe(false)
    expect(canEditPlayerCountMax(withPlayerCountMin(emptyForm(), '  '))).toBe(false)
    expect(canEditPlayerCountMax(withPlayerCountMin(emptyForm(), '2'))).toBe(true)
  })

  test('Wird "von" geleert, wird auch "bis" geleert', () => {
    const form = withPlayerCountMin(formFromGame(fluegelschlag), '')
    expect(form.playerCountMinInput).toBe('')
    expect(form.playerCountMaxInput).toBe('')
  })

  test('Wird "von" nur geändert, bleibt "bis" stehen', () => {
    const form = withPlayerCountMin(formFromGame(fluegelschlag), '2')
    expect(form.playerCountMinInput).toBe('2')
    expect(form.playerCountMaxInput).toBe('5')
  })

  test('"Nach oben offen" lässt sich erst ankreuzen, wenn "von" ausgefüllt ist', () => {
    expect(canTogglePlayerCountOpenEnded(emptyForm())).toBe(false)
    expect(withPlayerCountOpenEnded(emptyForm(), true).playerCountOpenEndedInput).toBe(false)
    expect(canTogglePlayerCountOpenEnded(withPlayerCountMin(emptyForm(), '4'))).toBe(true)
  })

  test('"Nach oben offen" leert und sperrt "bis"', () => {
    const form = withPlayerCountOpenEnded(formFromGame(fluegelschlag), true)
    expect(form.playerCountOpenEndedInput).toBe(true)
    expect(form.playerCountMaxInput).toBe('')
    expect(canEditPlayerCountMax(form)).toBe(false)

    // Häkchen wieder weg: "bis" lässt sich wieder ausfüllen
    expect(canEditPlayerCountMax(withPlayerCountOpenEnded(form, false))).toBe(true)
  })

  test('Wird "von" geleert, verschwindet auch das Häkchen "nach oben offen"', () => {
    const open = withPlayerCountOpenEnded(withPlayerCountMin(emptyForm(), '4'), true)
    expect(withPlayerCountMin(open, '').playerCountOpenEndedInput).toBe(false)
  })

  test('Ein Spiel mit Spieleranzahl nach oben offen füllt "von" und das Häkchen', () => {
    const data = [{ ...dixitData, playerCountMin: 4, playerCountOpenEnded: true }]
    const form = formFromGame(collectionOf(data).games[0] as Game)
    expect(form.playerCountMinInput).toBe('4')
    expect(form.playerCountMaxInput).toBe('')
    expect(form.playerCountOpenEndedInput).toBe(true)
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

describe('Spielmodus im Formular', () => {
  test('Ohne Angabe ist kein Spielmodus angekreuzt', () => {
    expect(emptyForm().gameModeInput).toBe('')
    expect(formFromGame(dixit).gameModeInput).toBe('')
  })

  test('Der Spielmodus des Spiels ist angekreuzt', () => {
    // Flügelschlag ist kompetitiv
    expect(formFromGame(fluegelschlag).gameModeInput).toBe('competitive')
  })

  test('Ein Häkchen setzt den Spielmodus', () => {
    expect(withGameModeToggled(emptyForm(), 'cooperative').gameModeInput).toBe('cooperative')
  })

  test('Wird der andere Spielmodus angekreuzt, verschwindet das erste Häkchen', () => {
    const cooperative = withGameModeToggled(emptyForm(), 'cooperative')
    expect(withGameModeToggled(cooperative, 'competitive').gameModeInput).toBe('competitive')
  })

  test('Ein Klick auf den angekreuzten Spielmodus nimmt das Häkchen weg', () => {
    const cooperative = withGameModeToggled(emptyForm(), 'cooperative')
    expect(withGameModeToggled(cooperative, 'cooperative').gameModeInput).toBe('')
  })
})

describe('Ungespeicherte Eingaben erkennen', () => {
  test('Frisch geöffnetes Formular hat keine Änderungen', () => {
    expect(formHasChanges(emptyForm())).toBe(false)
    expect(formHasChanges(formFromGame(dixit))).toBe(false)
  })

  test('Eingaben im neuen Formular zählen als Änderung', () => {
    expect(formHasChanges({ ...emptyForm(), nameInput: 'Monopoly' })).toBe(true)
    expect(formHasChanges({ ...emptyForm(), playerCountMinInput: '4' })).toBe(true)
  })

  test('Geänderte Eingaben beim Bearbeiten zählen als Änderung', () => {
    expect(formHasChanges({ ...formFromGame(dixit), nameInput: 'Dixit Odyssey' })).toBe(true)
    expect(formHasChanges({ ...formFromGame(dixit), playerCountMinInput: '6' })).toBe(true)
  })

  test.each([
    { playerCountMinInput: '2' },
    { playerCountMaxInput: '6' },
    { playerCountOpenEndedInput: true },
    { playTimeMinInput: '41' },
    { playTimeMaxInput: '71' },
    { playTimeOpenEndedInput: true },
    { lastPlayedInput: '2026-10-04' },
    { genreInput: 'party' as const },
    { gameModeInput: 'cooperative' as const },
    { gameModeInput: '' as const },
    { secondaryGenresInput: ['strategy' as const] },
    { shelfIdInput: '' },
    { descriptionInput: 'Anders' },
  ])('Geänderte Angabe %j zählt als Änderung', (changes) => {
    expect(formHasChanges({ ...formFromGame(fluegelschlag), ...changes })).toBe(true)
  })

  test('Zurückgetippte Eingaben zählen nicht als Änderung', () => {
    const form = { ...formFromGame(dixit), nameInput: 'Dixit', playerCountMinInput: '3' }
    expect(formHasChanges(form)).toBe(false)
  })

  test('Eine Fehlermeldung allein zählt nicht als Änderung', () => {
    expect(formHasChanges({ ...emptyForm(), error: 'Fehler' })).toBe(false)
  })
})
