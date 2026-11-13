import type { ShallowRef } from 'vue'

import { genres, type Genre } from '../domain/GameGenres'
import { GameSearch } from '../domain/GameSearch'
import type { State } from './gameManager'

// Was gerade im Suchformular der Ansicht "Spiel finden" eingetippt ist.
// Alles ist freiwillig. Geprüft wird erst beim Klick auf "Suchen".
export interface FindForm {
  // So viele Leute spielen mit, leer = egal
  playersInput: string
  // So viel Zeit ist da, in Minuten, leer = egal
  minutesInput: string
  // Kürzel der angekreuzten Genres, immer in der Reihenfolge der Auswahlliste. Leer = egal.
  genresInput: readonly Genre[]
  error: string | null
}

// Der Stand der Ansicht "Spiel finden". Er ist ein Teil des gesamten Stands (siehe gameManager.ts).
export interface FindViewState {
  form: FindForm
  // Die Suche, die zuletzt mit "Suchen" gestartet wurde. null = es wurde noch nicht gesucht.
  // Gemerkt wird die Suche, nicht die gefundenen Spiele: Die Ergebnisliste wird daraus immer
  // frisch berechnet und stimmt deshalb auch, nachdem ein Spiel geändert wurde.
  search: GameSearch | null
}

export function emptyFindForm(): FindForm {
  return { playersInput: '', minutesInput: '', genresInput: [], error: null }
}

export function initialFindView(): FindViewState {
  return { form: emptyFindForm(), search: null }
}

// Der Programmablauf der Ansicht "Spiel finden": alles, was man dort tun kann.
// Die Funktionen arbeiten auf demselben Stand wie der übrige Programmablauf
// und werden in gameManager.ts mit eingebaut.
export function createFindActions(state: ShallowRef<State>) {
  // Ein paar Felder im Stand der Ansicht ersetzen, der Rest bleibt
  function change(changes: Partial<FindViewState>): void {
    state.value = { ...state.value, findView: { ...state.value.findView, ...changes } }
  }

  // Bei jeder Eingabe merken wir uns das geänderte Formular und blenden einen alten Fehler aus.
  // Die Ergebnisliste bleibt stehen, bis wieder auf "Suchen" geklickt wird.
  function changeForm(changes: Partial<FindForm>): void {
    change({ form: { ...state.value.findView.form, ...changes, error: null } })
  }

  function changeFindPlayers(text: string): void {
    changeForm({ playersInput: text })
  }

  function changeFindMinutes(text: string): void {
    changeForm({ minutesInput: text })
  }

  // Häkchen bei einem Genre setzen oder wegnehmen
  function toggleFindGenre(genre: Genre): void {
    const before = state.value.findView.form.genresInput
    const chosen = before.includes(genre)
      ? before.filter((other) => other !== genre)
      : [...before, genre]

    // In die Reihenfolge der Auswahlliste bringen, egal in welcher Reihenfolge geklickt wurde
    changeForm({ genresInput: genres.filter((other) => chosen.includes(other)) })
  }

  // Klick auf "Suchen": Eingaben prüfen und die Suche merken.
  // Bei einer ungültigen Eingabe gibt es eine Fehlermeldung und keine Ergebnisliste.
  function findGames(): void {
    const form = state.value.findView.form
    const search = GameSearch.fromInput(form.playersInput, form.minutesInput, form.genresInput)

    if (!search.ok) {
      change({ form: { ...form, error: search.error }, search: null })
      return
    }
    change({ form: { ...form, error: null }, search: search.value })
  }

  return {
    changeFindPlayers,
    changeFindMinutes,
    toggleFindGenre,
    findGames,
  }
}
