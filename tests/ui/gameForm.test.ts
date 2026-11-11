// Tests für das Formular: leer, zum Bearbeiten gefüllt und ungespeicherte Eingaben erkennen
import { describe, expect, test } from 'vitest'

import { emptyForm, formFromGame, formHasChanges } from '../../src/ui/gameForm'
import { dixit } from '../testData'

describe('Formular', () => {
  test('Leeres Formular hat keine Eingaben und bearbeitet kein Spiel', () => {
    expect(emptyForm()).toEqual({ nameInput: '', playerCountInput: '', error: null, editing: null })
  })

  test('Formular zum Bearbeiten ist mit den Daten des Spiels gefüllt', () => {
    expect(formFromGame(dixit)).toEqual({
      nameInput: 'Dixit',
      playerCountInput: '3',
      error: null,
      editing: dixit,
    })
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

  test('Zurückgetippte Eingaben zählen nicht als Änderung', () => {
    const form = { ...formFromGame(dixit), nameInput: 'Dixit', playerCountInput: '3' }
    expect(formHasChanges(form)).toBe(false)
  })

  test('Eine Fehlermeldung allein zählt nicht als Änderung', () => {
    expect(formHasChanges({ ...emptyForm(), error: 'Fehler' })).toBe(false)
  })
})
