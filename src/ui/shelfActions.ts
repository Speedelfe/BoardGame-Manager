import type { ShallowRef } from 'vue'

import { removeShelf } from '../application/removeShelf'
import { saveShelf } from '../application/saveShelf'
import type { Shelf } from '../domain/Shelf'
import type { ShelfRepository } from '../domain/ShelfRepository'
import type { DeleteState, State } from './gameManager'

// Was gerade im Regal-Formular (neues Regal oder Regal umbenennen) eingetippt ist
export interface ShelfForm {
  nameInput: string
  error: string | null
  // null = neues Regal anlegen, sonst das Regal, das umbenannt wird
  editing: Shelf | null
}

// Der Stand der Ansicht "Regale". Er ist ein Teil des gesamten Stands (siehe gameManager.ts).
export interface ShelfViewState {
  chosenShelf: Shelf | null
  formOpen: boolean
  form: ShelfForm
  deleteState: DeleteState
}

export function emptyShelfForm(): ShelfForm {
  return { nameInput: '', error: null, editing: null }
}

export function initialShelfView(): ShelfViewState {
  return {
    chosenShelf: null,
    formOpen: false,
    form: emptyShelfForm(),
    deleteState: { kind: 'notAsked' },
  }
}

// Der Programmablauf der Ansicht "Regale": alles, was man dort tun kann.
// Die Funktionen arbeiten auf demselben Stand wie der übrige Programmablauf
// und werden in gameManager.ts mit eingebaut.
export function createShelfActions(state: ShallowRef<State>, repository: ShelfRepository) {
  // Ein paar Felder im Stand der Regal-Ansicht ersetzen, der Rest bleibt
  function change(changes: Partial<ShelfViewState>): void {
    state.value = { ...state.value, shelfView: { ...state.value.shelfView, ...changes } }
  }

  // Klick auf ein Regal in der Liste. Ein offenes Formular wird dabei geschlossen.
  function showShelfDetail(shelf: Shelf): void {
    change({ ...initialShelfView(), chosenShelf: shelf })
  }

  // Klick auf "Neues Regal"
  function showNewShelf(): void {
    // Nach einem Ladefehler kann nichts gespeichert werden, also auch kein Formular öffnen
    if (state.value.loadError !== null) return

    change({ ...initialShelfView(), formOpen: true })
  }

  // Das gerade ausgewählte Regal ins Formular laden, zum Umbenennen.
  // Es bleibt in der Liste markiert, damit man sieht, was man umbenennt.
  function renameChosenShelf(): void {
    const shelf = state.value.shelfView.chosenShelf
    if (shelf === null) return

    change({
      formOpen: true,
      form: { nameInput: shelf.name.text, error: null, editing: shelf },
      deleteState: { kind: 'notAsked' },
    })
  }

  // Bei jeder Eingabe merken wir uns den Text und blenden einen alten Fehler aus
  function changeShelfName(text: string): void {
    change({ form: { ...state.value.shelfView.form, nameInput: text, error: null } })
  }

  // Beim Umbenennen zurück zum Regal, sonst einfach Formular schließen
  function cancelShelfForm(): void {
    change({ ...initialShelfView(), chosenShelf: state.value.shelfView.form.editing })
  }

  async function saveShelfForm(): Promise<void> {
    const { loadError, shelves, shelfView } = state.value
    const form = shelfView.form

    if (loadError !== null) {
      change({
        form: {
          ...form,
          error:
            'Speichern ist gesperrt, weil die Spieleliste beim Start nicht gelesen werden konnte.',
        },
      })
      return
    }

    const saved = await saveShelf(repository, shelves, {
      editing: form.editing,
      name: form.nameInput,
    })

    if (!saved.ok) {
      change({ form: { ...form, error: saved.error } })
      return
    }
    // Formular schließen und das gespeicherte Regal gleich anzeigen
    state.value = {
      ...state.value,
      shelves: saved.value.shelves,
      shelfView: { ...initialShelfView(), chosenShelf: saved.value.shelf },
    }
  }

  // Löschen in zwei Schritten: erst nachfragen, dann wirklich löschen
  function askDeleteChosenShelf(): void {
    change({ deleteState: { kind: 'confirming' } })
  }

  function cancelDeleteShelf(): void {
    change({ deleteState: { kind: 'notAsked' } })
  }

  async function confirmDeleteShelf(): Promise<void> {
    const { loadError, shelves, collection, shelfView } = state.value

    // Wie beim Speichern: nach einem Ladefehler wird die Datei nicht angefasst
    if (loadError !== null) {
      change({
        deleteState: {
          kind: 'failed',
          message:
            'Löschen ist gesperrt, weil die Spieleliste beim Start nicht gelesen werden konnte.',
        },
      })
      return
    }
    if (shelfView.chosenShelf === null) return

    // Stehen noch Spiele im Regal, lehnt der Ablauf das Löschen mit einer Meldung ab
    const removed = await removeShelf(repository, shelves, collection, shelfView.chosenShelf.id)

    if (!removed.ok) {
      change({ deleteState: { kind: 'failed', message: removed.error } })
      return
    }
    state.value = { ...state.value, shelves: removed.value, shelfView: initialShelfView() }
  }

  return {
    showShelfDetail,
    showNewShelf,
    renameChosenShelf,
    changeShelfName,
    cancelShelfForm,
    saveShelfForm,
    askDeleteChosenShelf,
    cancelDeleteShelf,
    confirmDeleteShelf,
  }
}
