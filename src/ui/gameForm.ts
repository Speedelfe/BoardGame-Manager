import type { Game } from '../domain/Game'

// Was gerade im Formular (neues Spiel oder Spiel bearbeiten) eingetippt ist.
// Beides bleibt erst einmal Text. Geprüft wird beim Speichern (siehe application/saveGame).
export interface GameForm {
  nameInput: string
  playerCountInput: string
  error: string | null
  // null = neues Spiel anlegen, sonst das Spiel, das bearbeitet wird (so wie es vorher war)
  editing: Game | null
}

// Leeres Formular für ein neues Spiel
export function emptyForm(): GameForm {
  return { nameInput: '', playerCountInput: '', error: null, editing: null }
}

// Formular mit den Daten eines vorhandenen Spiels, zum Bearbeiten
export function formFromGame(game: Game): GameForm {
  return {
    nameInput: game.name.text,
    playerCountInput: String(game.playerCount.value),
    error: null,
    editing: game,
  }
}

// Wurde im Formular etwas eingetippt, das noch nicht gespeichert ist?
// Verglichen wird mit dem Stand, mit dem das Formular geöffnet wurde.
export function formHasChanges(form: GameForm): boolean {
  const original = form.editing === null ? emptyForm() : formFromGame(form.editing)

  return (
    form.nameInput !== original.nameInput || form.playerCountInput !== original.playerCountInput
  )
}
