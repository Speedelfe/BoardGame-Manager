import { shallowRef, type ShallowRef } from 'vue'

import { removeGame } from '../application/removeGame'
import { saveGame } from '../application/saveGame'
import type { Game } from '../domain/Game'
import { GameCollection } from '../domain/GameCollection'
import type { Genre } from '../domain/GameGenres'
import type { GameRepository } from '../domain/GameRepository'
import { ShelfCollection } from '../domain/ShelfCollection'
import {
  emptyForm,
  formFromGame,
  formHasChanges,
  withGenre,
  withPlayTimeMin,
  withPlayTimeOpenEnded,
  withSecondaryGenreToggled,
  type GameForm,
} from './gameForm'

// Wo wir beim Löschen des ausgewählten Spiels gerade stehen
export type DeleteState =
  | { kind: 'notAsked' } // nichts passiert, normale Detailansicht
  | { kind: 'confirming' } // "Wirklich löschen?" wird angezeigt
  | { kind: 'failed'; message: string } // Löschen hat nicht geklappt

// Ein Klick, der das offene Formular mit ungespeicherten Eingaben schließen würde.
// Er wartet auf die Antwort zu "Änderungen verwerfen?".
export type PendingAction = { kind: 'showDetail'; game: Game } | { kind: 'showNewGame' }

// Der gesamte Stand der Oberfläche
export interface State {
  collection: GameCollection
  // Die Regale, in denen Spiele stehen können
  shelves: ShelfCollection
  chosenGame: Game | null
  formOpen: boolean
  form: GameForm
  // Fehler beim Laden der Datei. Solange es einen gibt, ist Speichern gesperrt,
  // damit die (vielleicht nur kaputte) Datei nicht überschrieben wird.
  loadError: string | null
  deleteState: DeleteState
  pending: PendingAction | null
}

export function initialState(): State {
  return {
    collection: GameCollection.empty(),
    shelves: ShelfCollection.empty(),
    chosenGame: null,
    formOpen: false,
    form: emptyForm(),
    loadError: null,
    deleteState: { kind: 'notAsked' },
    pending: null,
  }
}

export type GameManager = ReturnType<typeof createGameManager>

// Der Programmablauf: Jede Funktion steht für etwas, das man in der Oberfläche tun kann,
// und macht aus dem alten Stand einen neuen. Der Stand wird nie verändert, sondern immer ersetzt.
// Die Vue-Komponenten zeigen nur den Stand an und rufen diese Funktionen auf.
export function createGameManager(repository: GameRepository, startState: State = initialState()) {
  const state: ShallowRef<State> = shallowRef(startState)

  // Ein paar Felder des Stands ersetzen, der Rest bleibt
  function change(changes: Partial<State>): void {
    state.value = { ...state.value, ...changes }
  }

  // Formular ist offen und enthält Eingaben, die noch nicht gespeichert sind
  function hasUnsavedInput(): boolean {
    return state.value.formOpen && formHasChanges(state.value.form)
  }

  function setFormError(message: string): void {
    change({ form: { ...state.value.form, error: message } })
  }

  // Beim Start die gespeicherte Sammlung laden
  async function load(): Promise<void> {
    const loaded = await repository.load()

    if (loaded.ok) {
      change({ collection: loaded.value, loadError: null })
    } else {
      change({ collection: GameCollection.empty(), loadError: loaded.error })
    }
  }

  // Klick auf ein Spiel in der Liste
  function showDetail(game: Game): void {
    const { formOpen, form } = state.value

    // Klick auf das Spiel, das gerade bearbeitet wird: dort sind wir schon.
    // Das Formular bleibt offen, eine offene Nachfrage ist damit erledigt.
    if (formOpen && form.editing !== null && form.editing.id.equals(game.id)) {
      change({ pending: null })
      return
    }
    // Ungespeicherte Eingaben: nicht einfach schließen, sondern den Klick merken und erst nachfragen
    if (hasUnsavedInput()) {
      change({ pending: { kind: 'showDetail', game } })
      return
    }
    change({ chosenGame: game, formOpen: false, deleteState: { kind: 'notAsked' }, pending: null })
  }

  // Klick auf "Neues Spiel"
  function showNewGame(): void {
    // Nach einem Ladefehler kann nichts gespeichert werden, also auch kein Formular öffnen
    if (state.value.loadError !== null) return

    if (hasUnsavedInput()) {
      change({ pending: { kind: 'showNewGame' } })
      return
    }
    change({
      chosenGame: null,
      formOpen: true,
      form: emptyForm(),
      deleteState: { kind: 'notAsked' },
      pending: null,
    })
  }

  // "Ja, verwerfen": Formular schließen und den gemerkten Klick jetzt ausführen
  function confirmDiscard(): void {
    const pending = state.value.pending
    if (pending === null) return

    change({ formOpen: false, pending: null })
    if (pending.kind === 'showDetail') {
      showDetail(pending.game)
    } else {
      showNewGame()
    }
  }

  // "Nein": Formular bleibt offen, wie es ist
  function cancelDiscard(): void {
    change({ pending: null })
  }

  // Das gerade ausgewählte Spiel ins Formular laden.
  // Es bleibt in der Liste markiert, damit man sieht, was man bearbeitet.
  function editChosenGame(): void {
    const game = state.value.chosenGame
    if (game === null) return

    change({ formOpen: true, form: formFromGame(game), deleteState: { kind: 'notAsked' } })
  }

  // Bei jeder Eingabe merken wir uns das geänderte Formular und blenden einen alten Fehler aus
  function changeForm(form: GameForm): void {
    change({ form: { ...form, error: null } })
  }

  function changeName(text: string): void {
    changeForm({ ...state.value.form, nameInput: text })
  }

  function changePlayerCount(text: string): void {
    changeForm({ ...state.value.form, playerCountInput: text })
  }

  // Spieldauer "von". Wird sie geleert, wird auch "bis" geleert.
  function changePlayTimeMin(text: string): void {
    changeForm(withPlayTimeMin(state.value.form, text))
  }

  function changePlayTimeMax(text: string): void {
    changeForm({ ...state.value.form, playTimeMaxInput: text })
  }

  // Häkchen "nach oben offen" bei der Spieldauer. Mit Häkchen wird "bis" geleert.
  function changePlayTimeOpenEnded(openEnded: boolean): void {
    changeForm(withPlayTimeOpenEnded(state.value.form, openEnded))
  }

  function changeLastPlayed(text: string): void {
    changeForm({ ...state.value.form, lastPlayedInput: text })
  }

  // Genre auswählen. Die Nebengenres werden dabei passend bereinigt.
  function changeGenre(text: string): void {
    changeForm(withGenre(state.value.form, text))
  }

  // Häkchen bei einem Nebengenre setzen oder wegnehmen
  function toggleSecondaryGenre(genre: Genre): void {
    changeForm(withSecondaryGenreToggled(state.value.form, genre))
  }

  function changeDescription(text: string): void {
    changeForm({ ...state.value.form, descriptionInput: text })
  }

  // Beim Bearbeiten zurück zu den Details des Spiels, sonst einfach Formular schließen
  function cancelForm(): void {
    change({
      chosenGame: state.value.form.editing,
      formOpen: false,
      form: emptyForm(),
      pending: null,
    })
  }

  async function saveForm(): Promise<void> {
    const { loadError, collection, shelves, form } = state.value

    if (loadError !== null) {
      setFormError(
        'Speichern ist gesperrt, weil die Spieleliste beim Start nicht gelesen werden konnte.',
      )
      return
    }

    const saved = await saveGame(repository, collection, shelves, {
      editing: form.editing,
      name: form.nameInput,
      playerCount: form.playerCountInput,
      playTimeMin: form.playTimeMinInput,
      playTimeMax: form.playTimeMaxInput,
      playTimeOpenEnded: form.playTimeOpenEndedInput,
      lastPlayed: form.lastPlayedInput,
      genre: form.genreInput,
      secondaryGenres: form.secondaryGenresInput,
      shelfId: form.shelfIdInput,
      description: form.descriptionInput,
    })

    if (!saved.ok) {
      setFormError(saved.error)
      return
    }
    // Formular schließen und das gespeicherte Spiel gleich anzeigen
    change({
      collection: saved.value.collection,
      chosenGame: saved.value.game,
      formOpen: false,
      form: emptyForm(),
      pending: null,
    })
  }

  // Löschen in zwei Schritten: erst nachfragen, dann wirklich löschen
  function askDeleteChosenGame(): void {
    change({ deleteState: { kind: 'confirming' } })
  }

  function cancelDelete(): void {
    change({ deleteState: { kind: 'notAsked' } })
  }

  async function confirmDelete(): Promise<void> {
    const { loadError, collection, chosenGame } = state.value

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
    if (chosenGame === null) return

    const removed = await removeGame(repository, collection, chosenGame.id)

    if (!removed.ok) {
      change({ deleteState: { kind: 'failed', message: removed.error } })
      return
    }
    change({ collection: removed.value, chosenGame: null, deleteState: { kind: 'notAsked' } })
  }

  return {
    state,
    load,
    showDetail,
    showNewGame,
    confirmDiscard,
    cancelDiscard,
    editChosenGame,
    changeName,
    changePlayerCount,
    changePlayTimeMin,
    changePlayTimeMax,
    changePlayTimeOpenEnded,
    changeLastPlayed,
    changeGenre,
    toggleSecondaryGenre,
    changeDescription,
    cancelForm,
    saveForm,
    askDeleteChosenGame,
    cancelDelete,
    confirmDelete,
  }
}
