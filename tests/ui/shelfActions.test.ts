// Tests für den Programmablauf der Ansicht "Regale" (ui/shelfActions)
// und für den Wechsel zwischen den Ansichten "Spiele" und "Regale".
// Gespeichert wird nur im Arbeitsspeicher.
import { describe, expect, test } from 'vitest'

import type { ShelfRepository } from '../../src/domain/ShelfRepository'
import { emptyForm } from '../../src/ui/gameForm'
import { createGameManager, initialState, type State } from '../../src/ui/gameManager'
import { emptyShelfForm } from '../../src/ui/shelfActions'
import {
  bueroShelf,
  dixit,
  games,
  MemoryGameRepository,
  MemoryShelfRepository,
  shelves,
  sofaShelf,
} from '../testData'

// Programmablauf mit den drei Beispielspielen und den zwei Beispielregalen.
// Flügelschlag steht im Sofaschrank, das Büroregal ist leer.
function managerWith(
  shelfRepository: ShelfRepository = new MemoryShelfRepository(shelves),
  changes: Partial<State> = {},
) {
  return createGameManager(
    { games: new MemoryGameRepository(games), shelves: shelfRepository },
    { ...initialState(), collection: games, shelves, ...changes },
  )
}

const shelfNames = (state: State) => state.shelves.shelves.map((shelf) => shelf.name.text)

// Repository, bei dem das Speichern immer fehlschlägt
class BrokenShelfRepository extends MemoryShelfRepository {
  override async save(): Promise<void> {
    throw new Error('Platte voll')
  }
}

describe('Zwischen Spielen und Regalen wechseln', () => {
  test('Am Anfang sind die Spiele zu sehen', () => {
    expect(managerWith().state.value.view).toBe('games')
  })

  test('Regale und wieder Spiele: das ausgewählte Spiel bleibt ausgewählt', () => {
    const manager = managerWith()
    manager.showDetail(dixit)
    manager.showShelves()
    expect(manager.state.value.view).toBe('shelves')

    manager.showGames()
    expect(manager.state.value.view).toBe('games')
    expect(manager.state.value.chosenGame).toBe(dixit)
  })

  test('Ein offenes Spiel-Formular ohne Änderungen wird beim Wechsel geschlossen', () => {
    const manager = managerWith()
    manager.showNewGame()
    manager.showShelves()
    expect(manager.state.value.view).toBe('shelves')
    expect(manager.state.value.formOpen).toBe(false)
  })

  test('Ungespeicherte Eingaben im Spiel-Formular: erst nachfragen, dann wechseln', () => {
    const manager = managerWith()
    manager.showNewGame()
    manager.changeName('Monopoly')
    manager.showShelves()
    expect(manager.state.value.view).toBe('games')
    expect(manager.state.value.pending).toEqual({ kind: 'showShelves' })

    manager.confirmDiscard()
    expect(manager.state.value.view).toBe('shelves')
    expect(manager.state.value.formOpen).toBe(false)
    expect(manager.state.value.form).toEqual(emptyForm())
    expect(manager.state.value.pending).toBeNull()
  })

  test('Nein bei der Nachfrage: die Spiele bleiben zu sehen, das Formular bleibt offen', () => {
    const manager = managerWith()
    manager.showNewGame()
    manager.changeName('Monopoly')
    manager.showShelves()
    manager.cancelDiscard()
    expect(manager.state.value.view).toBe('games')
    expect(manager.state.value.form.nameInput).toBe('Monopoly')
  })

  test('Zurück zu den Spielen schließt ein offenes Regal-Formular, das Regal bleibt ausgewählt', () => {
    const manager = managerWith()
    manager.showShelves()
    manager.showShelfDetail(sofaShelf)
    manager.renameChosenShelf()
    manager.changeShelfName('Sofa')
    manager.showGames()

    expect(manager.state.value.shelfView.formOpen).toBe(false)
    expect(manager.state.value.shelfView.form).toEqual(emptyShelfForm())
    expect(manager.state.value.shelfView.chosenShelf).toBe(sofaShelf)
  })
})

describe('Regal auswählen und Formular öffnen', () => {
  test('Regal anklicken wählt es aus', () => {
    const manager = managerWith()
    manager.showShelfDetail(bueroShelf)
    expect(manager.state.value.shelfView.chosenShelf).toBe(bueroShelf)
    expect(manager.state.value.shelfView.formOpen).toBe(false)
  })

  test('Neues Regal öffnet ein leeres Formular ohne Auswahl', () => {
    const manager = managerWith()
    manager.showShelfDetail(bueroShelf)
    manager.showNewShelf()
    expect(manager.state.value.shelfView.formOpen).toBe(true)
    expect(manager.state.value.shelfView.form).toEqual(emptyShelfForm())
    expect(manager.state.value.shelfView.chosenShelf).toBeNull()
  })

  test('Nach einem Ladefehler öffnet Neues Regal kein Formular', () => {
    const manager = managerWith(undefined, { loadError: 'kaputt' })
    manager.showNewShelf()
    expect(manager.state.value.shelfView.formOpen).toBe(false)
  })

  test('Umbenennen füllt das Formular mit dem Namen des ausgewählten Regals', () => {
    const manager = managerWith()
    manager.showShelfDetail(sofaShelf)
    manager.renameChosenShelf()
    expect(manager.state.value.shelfView.formOpen).toBe(true)
    expect(manager.state.value.shelfView.form).toEqual({
      nameInput: 'Sofaschrank',
      error: null,
      editing: sofaShelf,
    })
    expect(manager.state.value.shelfView.chosenShelf).toBe(sofaShelf)
  })

  test('Umbenennen ohne ausgewähltes Regal ändert nichts', () => {
    const manager = managerWith()
    const before = manager.state.value
    manager.renameChosenShelf()
    expect(manager.state.value).toEqual(before)
  })

  test('Abbrechen beim Umbenennen führt zurück zum Regal', () => {
    const manager = managerWith()
    manager.showShelfDetail(sofaShelf)
    manager.renameChosenShelf()
    manager.changeShelfName('Sofa')
    manager.cancelShelfForm()
    expect(manager.state.value.shelfView.formOpen).toBe(false)
    expect(manager.state.value.shelfView.chosenShelf).toBe(sofaShelf)
    expect(manager.state.value.shelves).toBe(shelves)
  })

  test('Ein anderes Regal anklicken schließt das Formular', () => {
    const manager = managerWith()
    manager.showNewShelf()
    manager.changeShelfName('Keller')
    manager.showShelfDetail(bueroShelf)
    expect(manager.state.value.shelfView.formOpen).toBe(false)
    expect(manager.state.value.shelfView.chosenShelf).toBe(bueroShelf)
  })
})

describe('Regal speichern', () => {
  test('Neues Regal: in den Regalen, gespeichert und ausgewählt', async () => {
    const repository = new MemoryShelfRepository(shelves)
    const manager = managerWith(repository)
    manager.showNewShelf()
    manager.changeShelfName('Wohnwand links')
    await manager.saveShelfForm()

    const state = manager.state.value
    expect(shelfNames(state)).toEqual(['Sofaschrank', 'Büroregal', 'Wohnwand links'])
    expect(state.shelfView.formOpen).toBe(false)
    expect(state.shelfView.chosenShelf?.name.text).toBe('Wohnwand links')
    expect(repository.saved).toBe(state.shelves)
  })

  test('Umbenanntes Regal behält seine ID, die Spiele darin bleiben unberührt', async () => {
    const manager = managerWith()
    manager.showShelfDetail(sofaShelf)
    manager.renameChosenShelf()
    manager.changeShelfName('Sofa')
    await manager.saveShelfForm()

    const state = manager.state.value
    expect(shelfNames(state)).toEqual(['Sofa', 'Büroregal'])
    expect(state.shelfView.chosenShelf?.id.equals(sofaShelf.id)).toBe(true)
    expect(state.collection).toBe(games)
  })

  test('Ungültiger Name zeigt den Fehler, Tippen blendet ihn wieder aus', async () => {
    const repository = new MemoryShelfRepository(shelves)
    const manager = managerWith(repository)
    manager.showNewShelf()
    manager.changeShelfName('büroregal')
    await manager.saveShelfForm()

    expect(manager.state.value.shelfView.formOpen).toBe(true)
    expect(manager.state.value.shelfView.form.error).toBe('Das Regal "büroregal" gibt es schon.')
    expect(manager.state.value.shelves).toBe(shelves)
    expect(repository.saveCount).toBe(0)

    manager.changeShelfName('Keller')
    expect(manager.state.value.shelfView.form.error).toBeNull()
  })

  test('Nach einem Ladefehler ist Speichern gesperrt', async () => {
    const repository = new MemoryShelfRepository(shelves)
    // Das Formular kann man in diesem Zustand gar nicht öffnen, wir erzwingen es hier
    const manager = managerWith(repository, {
      loadError: 'kaputt',
      shelfView: {
        chosenShelf: null,
        formOpen: true,
        form: { ...emptyShelfForm(), nameInput: 'Keller' },
        deleteState: { kind: 'notAsked' },
      },
    })
    await manager.saveShelfForm()

    expect(manager.state.value.shelfView.form.error).toMatch(/^Speichern ist gesperrt/)
    expect(repository.saveCount).toBe(0)
  })

  test('Schlägt das Speichern fehl, bleibt das Formular mit Fehlermeldung offen', async () => {
    const manager = managerWith(new BrokenShelfRepository(shelves))
    manager.showNewShelf()
    manager.changeShelfName('Keller')
    await manager.saveShelfForm()

    expect(manager.state.value.shelfView.formOpen).toBe(true)
    expect(manager.state.value.shelfView.form.error).toBe('Speichern hat nicht geklappt: Platte voll')
    expect(manager.state.value.shelves).toBe(shelves)
  })
})

describe('Regal löschen', () => {
  test('Löschen fragt erst nach und lässt sich abbrechen', () => {
    const manager = managerWith()
    manager.showShelfDetail(bueroShelf)
    manager.askDeleteChosenShelf()
    expect(manager.state.value.shelfView.deleteState).toEqual({ kind: 'confirming' })

    manager.cancelDeleteShelf()
    expect(manager.state.value.shelfView.deleteState).toEqual({ kind: 'notAsked' })
    expect(manager.state.value.shelves).toBe(shelves)
  })

  test('Bestätigtes Löschen entfernt ein leeres Regal', async () => {
    const repository = new MemoryShelfRepository(shelves)
    const manager = managerWith(repository)
    manager.showShelfDetail(bueroShelf)
    manager.askDeleteChosenShelf()
    await manager.confirmDeleteShelf()

    const state = manager.state.value
    expect(shelfNames(state)).toEqual(['Sofaschrank'])
    expect(state.shelfView.chosenShelf).toBeNull()
    expect(state.shelfView.deleteState).toEqual({ kind: 'notAsked' })
    expect(repository.saved).toBe(state.shelves)
  })

  test('Ein Regal mit Spielen bleibt, und es gibt eine Meldung', async () => {
    const repository = new MemoryShelfRepository(shelves)
    const manager = managerWith(repository)
    manager.showShelfDetail(sofaShelf)
    manager.askDeleteChosenShelf()
    await manager.confirmDeleteShelf()

    const state = manager.state.value
    expect(state.shelves).toBe(shelves)
    expect(state.shelfView.chosenShelf).toBe(sofaShelf)
    expect(state.shelfView.deleteState).toEqual({
      kind: 'failed',
      message: 'In diesem Regal steht noch 1 Spiel. Es kann erst gelöscht werden, wenn es leer ist.',
    })
    expect(repository.saveCount).toBe(0)
  })

  test('Nach einem Ladefehler ist Löschen gesperrt', async () => {
    const repository = new MemoryShelfRepository(shelves)
    const manager = managerWith(repository, { loadError: 'kaputt' })
    manager.showShelfDetail(bueroShelf)
    await manager.confirmDeleteShelf()

    expect(manager.state.value.shelves).toBe(shelves)
    expect(manager.state.value.shelfView.deleteState).toMatchObject({
      kind: 'failed',
      message: expect.stringMatching(/^Löschen ist gesperrt/),
    })
    expect(repository.saveCount).toBe(0)
  })

  test('Löschen bestätigen ohne ausgewähltes Regal ändert nichts', async () => {
    const repository = new MemoryShelfRepository(shelves)
    const manager = managerWith(repository)
    const before = manager.state.value
    await manager.confirmDeleteShelf()

    expect(manager.state.value).toEqual(before)
    expect(repository.saveCount).toBe(0)
  })
})
