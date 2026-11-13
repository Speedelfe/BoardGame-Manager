// Tests für den Programmablauf der Ansicht "Spiel finden" (ui/findActions)
// und für den Wechsel in diese Ansicht. Gespeichert wird nur im Arbeitsspeicher.
import { describe, expect, test } from 'vitest'

import { emptyFindForm } from '../../src/ui/findActions'
import { createGameManager, initialState, type State } from '../../src/ui/gameManager'
import {
  dixit,
  games,
  MemoryGameRepository,
  MemoryShelfRepository,
  names,
  shelves,
  sofaShelf,
} from '../testData'

// Programmablauf mit den drei Beispielspielen und den zwei Beispielregalen:
// - Dixit: 3 Spieler, keine freiwilligen Angaben
// - Azul: 4 Spieler, 45 Minuten
// - Flügelschlag: 1–5 Spieler, 40–70 Minuten, Enginebuilder (dazu Strategie und Karten), kompetitiv
function managerWith(changes: Partial<State> = {}) {
  return createGameManager(
    { games: new MemoryGameRepository(games), shelves: new MemoryShelfRepository(shelves) },
    { ...initialState(), collection: games, shelves, ...changes },
  )
}

// Die Namen der Spiele, die zur zuletzt gestarteten Suche passen. null = es wurde noch nicht gesucht.
function foundNames(state: State): string[] | null {
  const search = state.findView.search
  return search === null ? null : names(state.collection.find(search))
}

describe('Zur Ansicht "Spiel finden" wechseln', () => {
  test('Am Anfang ist das Suchformular leer und es wurde noch nicht gesucht', () => {
    const manager = managerWith()
    manager.showFind()

    expect(manager.state.value.view).toBe('find')
    expect(manager.state.value.findView.form).toEqual(emptyFindForm())
    expect(manager.state.value.findView.search).toBeNull()
  })

  test('Von den Spielen zur Suche und zurück: das ausgewählte Spiel bleibt ausgewählt', () => {
    const manager = managerWith()
    manager.showDetail(dixit)
    manager.showFind()
    manager.showGames()

    expect(manager.state.value.view).toBe('games')
    expect(manager.state.value.chosenGame).toBe(dixit)
  })

  test('Ein offenes Spiel-Formular ohne Änderungen wird beim Wechsel geschlossen', () => {
    const manager = managerWith()
    manager.showNewGame()
    manager.showFind()

    expect(manager.state.value.view).toBe('find')
    expect(manager.state.value.formOpen).toBe(false)
  })

  test('Ungespeicherte Eingaben im Spiel-Formular: erst nachfragen, dann wechseln', () => {
    const manager = managerWith()
    manager.showNewGame()
    manager.changeName('Monopoly')
    manager.showFind()

    // Noch nicht gewechselt, die Nachfrage läuft
    expect(manager.state.value.view).toBe('games')
    expect(manager.state.value.pending).toEqual({ kind: 'showFind' })

    manager.confirmDiscard()
    expect(manager.state.value.view).toBe('find')
    expect(manager.state.value.formOpen).toBe(false)
    expect(manager.state.value.pending).toBeNull()
  })

  test('"Nein" bei der Nachfrage: Formular und Ansicht bleiben', () => {
    const manager = managerWith()
    manager.showNewGame()
    manager.changeName('Monopoly')
    manager.showFind()
    manager.cancelDiscard()

    expect(manager.state.value.view).toBe('games')
    expect(manager.state.value.formOpen).toBe(true)
    expect(manager.state.value.form.nameInput).toBe('Monopoly')
  })

  test('Von den Regalen zur Suche: Regal-Formular zu, das ausgewählte Regal bleibt', () => {
    const manager = managerWith()
    manager.showShelves()
    manager.showShelfDetail(sofaShelf)
    manager.renameChosenShelf()
    manager.showFind()

    expect(manager.state.value.view).toBe('find')
    expect(manager.state.value.shelfView.formOpen).toBe(false)
    expect(manager.state.value.shelfView.chosenShelf).toBe(sofaShelf)
  })

  test('Eingaben und Ergebnisse der Suche bleiben beim Wechsel der Ansicht stehen', () => {
    const manager = managerWith()
    manager.showFind()
    manager.changeFindPlayers('4')
    manager.findGames()
    manager.showShelves()
    manager.showGames()
    manager.showFind()

    expect(manager.state.value.findView.form.playersInput).toBe('4')
    expect(foundNames(manager.state.value)).toEqual(['Azul', 'Flügelschlag'])
  })
})

describe('Suchformular ausfüllen', () => {
  test('Tippen merkt sich die Eingaben', () => {
    const manager = managerWith()
    manager.changeFindPlayers('4')
    manager.changeFindMinutes('60')

    expect(manager.state.value.findView.form.playersInput).toBe('4')
    expect(manager.state.value.findView.form.minutesInput).toBe('60')
  })

  test('Genres an- und abwählen, immer in der Reihenfolge der Auswahlliste', () => {
    const manager = managerWith()
    manager.toggleFindGenre('party')
    manager.toggleFindGenre('card')
    expect(manager.state.value.findView.form.genresInput).toEqual(['card', 'party'])

    manager.toggleFindGenre('card')
    expect(manager.state.value.findView.form.genresInput).toEqual(['party'])
  })

  test('Spielmodi an- und abwählen: beide dürfen angekreuzt sein', () => {
    const manager = managerWith()
    manager.toggleFindMode('competitive')
    manager.toggleFindMode('cooperative')
    expect(manager.state.value.findView.form.modesInput).toEqual(['cooperative', 'competitive'])

    manager.toggleFindMode('cooperative')
    expect(manager.state.value.findView.form.modesInput).toEqual(['competitive'])
  })

  test('Vor dem Klick auf "Suchen" gibt es keine Ergebnisse', () => {
    const manager = managerWith()
    manager.changeFindPlayers('4')
    expect(foundNames(manager.state.value)).toBeNull()
  })
})

describe('Suchen', () => {
  test('Ohne Eingaben werden alle Spiele gefunden', () => {
    const manager = managerWith()
    manager.findGames()
    expect(foundNames(manager.state.value)).toEqual(['Azul', 'Dixit', 'Flügelschlag'])
  })

  test('Die Eingaben schränken die Ergebnisse ein', () => {
    const manager = managerWith()
    manager.changeFindPlayers('5')
    manager.changeFindMinutes('60')
    manager.toggleFindGenre('card')
    manager.findGames()

    expect(manager.state.value.findView.form.error).toBeNull()
    expect(foundNames(manager.state.value)).toEqual(['Flügelschlag'])
  })

  test('Der Spielmodus schränkt die Ergebnisse ein', () => {
    // Flügelschlag ist kompetitiv, Azul und Dixit haben keinen Spielmodus
    const manager = managerWith()
    manager.toggleFindMode('cooperative')
    manager.findGames()

    expect(manager.state.value.findView.search?.modes).toEqual(['cooperative'])
    expect(foundNames(manager.state.value)).toEqual(['Azul', 'Dixit'])
  })

  test('Passt kein Spiel, ist die Ergebnisliste leer', () => {
    const manager = managerWith()
    manager.changeFindPlayers('9')
    manager.findGames()
    expect(foundNames(manager.state.value)).toEqual([])
  })

  test('Die gemerkte Suche weiß, wonach gesucht wurde', () => {
    const manager = managerWith()
    manager.changeFindMinutes('60')
    manager.findGames()

    const search = manager.state.value.findView.search
    expect(search?.players).toBeNull()
    expect(search?.minutes).toBe(60)
    expect(search?.genres).toEqual([])
  })

  test('Nach dem Suchen ändert Tippen die Ergebnisse erst beim nächsten "Suchen"', () => {
    const manager = managerWith()
    manager.changeFindPlayers('4')
    manager.findGames()
    manager.changeFindPlayers('3')
    expect(foundNames(manager.state.value)).toEqual(['Azul', 'Flügelschlag'])

    manager.findGames()
    expect(foundNames(manager.state.value)).toEqual(['Dixit', 'Flügelschlag'])
  })

  test('Ungültige Eingabe zeigt einen Fehler und keine Ergebnisse', () => {
    const manager = managerWith()
    manager.findGames() // erst eine gültige Suche, damit Ergebnisse da sind
    manager.changeFindPlayers('viele')
    manager.findGames()

    expect(manager.state.value.findView.form.error).toBe('Die Spieleranzahl muss eine Zahl sein.')
    expect(foundNames(manager.state.value)).toBeNull()
  })

  test('Tippen blendet den Fehler wieder aus', () => {
    const manager = managerWith()
    manager.changeFindMinutes('lang')
    manager.findGames()
    expect(manager.state.value.findView.form.error).not.toBeNull()

    manager.changeFindMinutes('60')
    expect(manager.state.value.findView.form.error).toBeNull()
  })

  test('Die Ergebnisse stimmen auch, nachdem ein Spiel geändert wurde', async () => {
    const manager = managerWith()
    manager.changeFindPlayers('6')
    manager.findGames()
    expect(foundNames(manager.state.value)).toEqual([])

    // Dixit bekommt in der Ansicht "Spiele" eine Spieleranzahl von 3 bis 8
    manager.showGames()
    manager.showDetail(dixit)
    manager.editChosenGame()
    manager.changePlayerCountMax('8')
    await manager.saveForm()
    manager.showFind()

    expect(foundNames(manager.state.value)).toEqual(['Dixit'])
  })
})
