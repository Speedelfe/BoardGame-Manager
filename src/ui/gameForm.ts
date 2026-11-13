import type { Game } from '../domain/Game'
import { genres, isGenre, type Genre } from '../domain/GameGenres'

// Was gerade im Formular (neues Spiel oder Spiel bearbeiten) eingetippt ist.
// Alles bleibt erst einmal Text. Geprüft wird beim Speichern (siehe application/saveGame).
// Nur Name und Spieleranzahl sind Pflicht, alles andere darf leer bleiben.
export interface GameForm {
  nameInput: string
  playerCountInput: string
  // Spieldauer in Minuten: "von" allein ist eine einzelne Zahl, mit "bis" ein Bereich
  playTimeMinInput: string
  playTimeMaxInput: string
  // Häkchen "nach oben offen": Das Spiel kann beliebig lange dauern, dann gibt es kein "bis"
  playTimeOpenEndedInput: boolean
  // Datum in der Form Jahr-Monat-Tag, so liefert es das Datumsfeld. Leer = nie gespielt/unbekannt.
  lastPlayedInput: string
  // Kürzel des Genres, leer = kein Genre
  genreInput: Genre | ''
  // Kürzel der Nebengenres, immer in der Reihenfolge der Auswahlliste
  secondaryGenresInput: readonly Genre[]
  // ID des gewählten Regals, leer = kein Regal
  shelfIdInput: string
  descriptionInput: string
  error: string | null
  // null = neues Spiel anlegen, sonst das Spiel, das bearbeitet wird (so wie es vorher war)
  editing: Game | null
}

// Leeres Formular für ein neues Spiel
export function emptyForm(): GameForm {
  return {
    nameInput: '',
    playerCountInput: '',
    playTimeMinInput: '',
    playTimeMaxInput: '',
    playTimeOpenEndedInput: false,
    lastPlayedInput: '',
    genreInput: '',
    secondaryGenresInput: [],
    shelfIdInput: '',
    descriptionInput: '',
    error: null,
    editing: null,
  }
}

// Formular mit den Daten eines vorhandenen Spiels, zum Bearbeiten
export function formFromGame(game: Game): GameForm {
  const { playTime, lastPlayed, genres: gameGenres, shelfId, description } = game.details

  return {
    nameInput: game.name.text,
    playerCountInput: String(game.playerCount.min),
    playTimeMinInput: playTime === null ? '' : String(playTime.min),
    playTimeMaxInput: playTime === null || playTime.max === null ? '' : String(playTime.max),
    playTimeOpenEndedInput: playTime?.openEnded ?? false,
    lastPlayedInput: lastPlayed?.isoDate ?? '',
    genreInput: gameGenres.main ?? '',
    secondaryGenresInput: gameGenres.secondary,
    shelfIdInput: shelfId?.value ?? '',
    descriptionInput: description ?? '',
    error: null,
    editing: game,
  }
}

// Wurde im Formular etwas eingetippt, das noch nicht gespeichert ist?
// Verglichen wird mit dem Stand, mit dem das Formular geöffnet wurde.
export function formHasChanges(form: GameForm): boolean {
  const original = form.editing === null ? emptyForm() : formFromGame(form.editing)

  return (
    form.nameInput !== original.nameInput ||
    form.playerCountInput !== original.playerCountInput ||
    form.playTimeMinInput !== original.playTimeMinInput ||
    form.playTimeMaxInput !== original.playTimeMaxInput ||
    form.playTimeOpenEndedInput !== original.playTimeOpenEndedInput ||
    form.lastPlayedInput !== original.lastPlayedInput ||
    form.genreInput !== original.genreInput ||
    form.secondaryGenresInput.join() !== original.secondaryGenresInput.join() ||
    form.shelfIdInput !== original.shelfIdInput ||
    form.descriptionInput !== original.descriptionInput
  )
}

// ----- Eingaben, die andere Felder mit verändern -----

// Spieldauer "von" eintippen. "bis" und "nach oben offen" gibt es nur zusammen mit "von":
// Wird "von" geleert, werden auch sie geleert.
export function withPlayTimeMin(form: GameForm, text: string): GameForm {
  if (text.trim() === '') {
    return { ...form, playTimeMinInput: text, playTimeMaxInput: '', playTimeOpenEndedInput: false }
  }
  return { ...form, playTimeMinInput: text }
}

// Kann man das Häkchen "nach oben offen" gerade setzen? Nur wenn "von" schon ausgefüllt ist.
export function canTogglePlayTimeOpenEnded(form: GameForm): boolean {
  return form.playTimeMinInput.trim() !== ''
}

// Kann man "bis" gerade ausfüllen? Nur wenn "von" ausgefüllt und die Spieldauer nicht nach oben offen ist.
export function canEditPlayTimeMax(form: GameForm): boolean {
  return canTogglePlayTimeOpenEnded(form) && !form.playTimeOpenEndedInput
}

// Häkchen "nach oben offen" setzen oder wegnehmen. Mit Häkchen gibt es kein "bis", es wird geleert.
export function withPlayTimeOpenEnded(form: GameForm, openEnded: boolean): GameForm {
  if (!canTogglePlayTimeOpenEnded(form)) return form

  return {
    ...form,
    playTimeOpenEndedInput: openEnded,
    playTimeMaxInput: openEnded ? '' : form.playTimeMaxInput,
  }
}

// Genre auswählen (leerer Text = kein Genre).
// Ohne Genre gibt es keine Nebengenres, und das Genre selbst kann kein Nebengenre sein.
export function withGenre(form: GameForm, text: string): GameForm {
  const genreInput = isGenre(text) ? text : ''
  const secondaryGenresInput =
    genreInput === '' ? [] : form.secondaryGenresInput.filter((genre) => genre !== genreInput)

  return { ...form, genreInput, secondaryGenresInput }
}

// Kann man dieses Nebengenre gerade an- oder abwählen?
export function canToggleSecondaryGenre(form: GameForm, genre: Genre): boolean {
  return form.genreInput !== '' && form.genreInput !== genre
}

// Häkchen bei einem Nebengenre setzen oder wegnehmen
export function withSecondaryGenreToggled(form: GameForm, genre: Genre): GameForm {
  if (!canToggleSecondaryGenre(form, genre)) return form

  const chosen = form.secondaryGenresInput.includes(genre)
    ? form.secondaryGenresInput.filter((other) => other !== genre)
    : [...form.secondaryGenresInput, genre]

  // In die Reihenfolge der Auswahlliste bringen, egal in welcher Reihenfolge geklickt wurde
  return { ...form, secondaryGenresInput: genres.filter((other) => chosen.includes(other)) }
}
