// Tests für den Programmablauf (ui/gameManager):
// Was passiert mit dem Stand der App, wenn man etwas anklickt oder eintippt?
// Gespeichert wird im Arbeitsspeicher oder in einen eigenen Testordner, nie in die echte Spielesammlung.
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

import type { GameCollection } from '../../src/domain/GameCollection'
import type { GameRepository } from '../../src/domain/GameRepository'
import { JsonFileGameRepository } from '../../src/infrastructure/JsonFileGameRepository'
import { JsonFileShelfRepository } from '../../src/infrastructure/JsonFileShelfRepository'
import { emptyForm, formFromGame } from '../../src/ui/gameForm'
import {
  createGameManager,
  initialState,
  type Repositories,
  type State,
} from '../../src/ui/gameManager'
import {
  azul,
  dixit,
  expectOk,
  games,
  MemoryGameRepository,
  MemoryShelfRepository,
  names,
  shelves,
  withTestFolder,
} from '../testData'

// Stand der App mit dieser Sammlung, nichts ausgewählt, kein Formular offen
function stateWith(collection: GameCollection, changes: Partial<State> = {}): State {
  return { ...initialState(), collection, shelves, ...changes }
}

// Repositorys für den Programmablauf: die Spiele wie angegeben,
// die beiden Beispielregale nur im Arbeitsspeicher
function repositoriesWith(gameRepository: GameRepository): Repositories {
  return { games: gameRepository, shelves: new MemoryShelfRepository(shelves) }
}

// Repositorys, die Spiele und Regale in derselben Datei speichern, wie in der echten App
function fileRepositories(path: string): Repositories {
  return { games: new JsonFileGameRepository(path), shelves: new JsonFileShelfRepository(path) }
}

// Programmablauf mit den drei Beispielspielen und den zwei Beispielregalen
function managerWith(repository: GameRepository, changes: Partial<State> = {}) {
  return createGameManager(repositoriesWith(repository), stateWith(games, changes))
}

// Programmablauf, in dem "Dixit" gerade bearbeitet wird und der Name schon geändert wurde
function editingDixitWithChanges(repository: GameRepository = new MemoryGameRepository()) {
  const manager = managerWith(repository)
  manager.showDetail(dixit)
  manager.editChosenGame()
  manager.changeName('Dixit Odyssey')
  return manager
}

// Was in der Datei steht, als Sammlung gelesen
async function loadFrom(path: string): Promise<GameCollection> {
  return expectOk(await new JsonFileGameRepository(path).load())
}

describe('Start', () => {
  test('Start ohne Datei: leere Sammlung und kein Fehler', () =>
    withTestFolder(async (folder) => {
      const manager = createGameManager(fileRepositories(join(folder, 'games.json')))
      await manager.load()
      expect(manager.state.value.collection.games).toEqual([])
      expect(manager.state.value.loadError).toBeNull()
      expect(manager.state.value.formOpen).toBe(false)
    }))

  test('Start mit gespeicherter Sammlung lädt die Spiele und die Regale', () =>
    withTestFolder(async (folder) => {
      const repositories = fileRepositories(join(folder, 'games.json'))
      await repositories.games.save(games)
      await repositories.shelves.save(shelves)
      const manager = createGameManager(repositories)
      await manager.load()
      expect(manager.state.value.collection).toEqual(games)
      expect(manager.state.value.shelves).toEqual(shelves)
      expect(manager.state.value.loadError).toBeNull()
    }))

  test('Start mit einem Spiel in einem Regal, das es nicht gibt: Ladefehler', () =>
    withTestFolder(async (folder) => {
      // In den Beispielspielen steht Flügelschlag im Sofaschrank, Regale werden aber keine gespeichert
      const repositories = fileRepositories(join(folder, 'games.json'))
      await repositories.games.save(games)
      const manager = createGameManager(repositories)
      await manager.load()
      expect(manager.state.value.collection.games).toEqual([])
      expect(manager.state.value.loadError).toBe(
        'Das Spiel "Flügelschlag" steht in einem Regal, das es nicht gibt.',
      )
    }))

  test('Start mit kaputter Datei: leere Sammlung und Ladefehler', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeFile(path, 'kein json', 'utf8')
      const manager = createGameManager(fileRepositories(path))
      await manager.load()
      expect(manager.state.value.collection.games).toEqual([])
      expect(manager.state.value.loadError).not.toBeNull()
    }))
})

describe('Auswählen und Formular öffnen', () => {
  test('Spiel anklicken zeigt seine Details', () => {
    const manager = managerWith(new MemoryGameRepository())
    manager.showDetail(azul)
    expect(manager.state.value.chosenGame).toBe(azul)
    expect(manager.state.value.formOpen).toBe(false)
  })

  test('Neues Spiel öffnet ein leeres Formular ohne Auswahl', () => {
    const manager = managerWith(new MemoryGameRepository())
    manager.showDetail(azul)
    manager.showNewGame()
    expect(manager.state.value.formOpen).toBe(true)
    expect(manager.state.value.form).toEqual(emptyForm())
    expect(manager.state.value.chosenGame).toBeNull()
  })

  test('Nach einem Ladefehler öffnet Neues Spiel kein Formular', () => {
    const manager = managerWith(new MemoryGameRepository(), { loadError: 'kaputt' })
    const before = manager.state.value
    manager.showNewGame()
    expect(manager.state.value).toEqual(before)
  })

  test('Bearbeiten füllt das Formular mit dem ausgewählten Spiel', () => {
    const manager = managerWith(new MemoryGameRepository())
    manager.showDetail(azul)
    manager.editChosenGame()
    expect(manager.state.value.formOpen).toBe(true)
    expect(manager.state.value.form).toEqual(formFromGame(azul))
    expect(manager.state.value.chosenGame).toBe(azul)
  })

  test('Bearbeiten ohne ausgewähltes Spiel ändert nichts', () => {
    const manager = managerWith(new MemoryGameRepository())
    const before = manager.state.value
    manager.editChosenGame()
    expect(manager.state.value).toEqual(before)
  })

  test('Tippen merkt sich die Eingaben und blendet einen alten Fehler aus', async () => {
    const manager = managerWith(new MemoryGameRepository())
    manager.showNewGame()
    await manager.saveForm() // leerer Name ergibt einen Fehler
    expect(manager.state.value.form.error).not.toBeNull()

    manager.changeName('Monopoly')
    manager.changePlayerCount('4')
    expect(manager.state.value.form.nameInput).toBe('Monopoly')
    expect(manager.state.value.form.playerCountInput).toBe('4')
    expect(manager.state.value.form.error).toBeNull()
  })

  test('Abbrechen beim Bearbeiten führt zurück zu den Details', () => {
    const manager = editingDixitWithChanges()
    manager.cancelForm()
    expect(manager.state.value.formOpen).toBe(false)
    expect(manager.state.value.chosenGame).toBe(dixit)
    expect(manager.state.value.collection).toBe(games)
  })

  test('Abbrechen bei einem neuen Spiel schließt das Formular ohne Auswahl', () => {
    const manager = managerWith(new MemoryGameRepository())
    manager.showNewGame()
    manager.changeName('Monopoly')
    manager.cancelForm()
    expect(manager.state.value.formOpen).toBe(false)
    expect(manager.state.value.chosenGame).toBeNull()
  })
})

describe('Speichern', () => {
  test('Speichern eines neuen Spiels: in Sammlung, in Datei und ausgewählt', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      const manager = managerWith(new JsonFileGameRepository(path))
      manager.showNewGame()
      manager.changeName('Monopoly')
      manager.changePlayerCount('4')
      await manager.saveForm()

      const state = manager.state.value
      expect(state.formOpen).toBe(false)
      expect(names(state.collection.games)).toEqual(['Dixit', 'Azul', 'Flügelschlag', 'Monopoly'])
      expect(state.chosenGame?.name.text).toBe('Monopoly')
      expect(await loadFrom(path)).toEqual(state.collection)
    }))

  test('Speichern mit freiwilligen Angaben: im Spiel und in der Datei', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      const manager = managerWith(new JsonFileGameRepository(path))
      manager.showNewGame()
      manager.changeName('Monopoly')
      manager.changePlayerCount('4')
      manager.changePlayTimeMin('60')
      manager.changePlayTimeMax('180')
      manager.changeGenre('dice')
      manager.toggleSecondaryGenre('party')
      manager.changeLastPlayed('2025-12-24')
      manager.changeDescription('Dauert ewig.')
      await manager.saveForm()

      const state = manager.state.value
      expect(state.form.error).toBeNull()
      expect(state.chosenGame?.details.playTime?.text).toBe('60–180 Minuten')
      expect(state.chosenGame?.details.genres.main).toBe('dice')
      expect(state.chosenGame?.details.genres.secondary).toEqual(['party'])
      expect(state.chosenGame?.details.lastPlayed?.text).toBe('24.12.2025')
      expect(state.chosenGame?.details.description).toBe('Dauert ewig.')
      expect(await loadFrom(path)).toEqual(state.collection)
    }))

  test('Ungültige freiwillige Angabe zeigt den Fehler, Tippen blendet ihn wieder aus', async () => {
    const manager = managerWith(new MemoryGameRepository())
    manager.showNewGame()
    manager.changeName('Monopoly')
    manager.changePlayerCount('4')
    manager.changePlayTimeMin('90')
    manager.changePlayTimeMax('60')
    await manager.saveForm()
    expect(manager.state.value.form.error).toBe(
      'Bei der Spieldauer darf "von" nicht größer als "bis" sein.',
    )

    manager.changePlayTimeMax('120')
    expect(manager.state.value.form.error).toBeNull()
  })

  test('Speichern eines bearbeiteten Spiels ersetzt es in Sammlung und Datei', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      const manager = editingDixitWithChanges(new JsonFileGameRepository(path))
      await manager.saveForm()

      const state = manager.state.value
      expect(state.formOpen).toBe(false)
      expect(names(state.collection.games)).toEqual(['Dixit Odyssey', 'Azul', 'Flügelschlag'])
      expect(state.chosenGame?.id.equals(dixit.id)).toBe(true)
      expect(await loadFrom(path)).toEqual(state.collection)
    }))

  test('Speichern mit ungültigen Eingaben zeigt den Fehler und schreibt nichts', async () => {
    const repository = new MemoryGameRepository()
    const manager = managerWith(repository)
    manager.showNewGame()
    manager.changeName('Dixit')
    await manager.saveForm()

    expect(manager.state.value.formOpen).toBe(true)
    expect(manager.state.value.form.error).toBe('Das Spiel "Dixit" gibt es schon.')
    expect(manager.state.value.collection).toBe(games)
    expect(repository.saveCount).toBe(0)
  })

  test('Nach einem Ladefehler ist Speichern gesperrt und die Datei bleibt unberührt', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      await writeFile(path, 'kein json', 'utf8')

      // Das Formular kann man in diesem Zustand gar nicht öffnen, wir erzwingen es hier
      const manager = createGameManager(fileRepositories(path), {
        ...initialState(),
        loadError: 'kaputt',
        formOpen: true,
        form: { ...emptyForm(), nameInput: 'Monopoly', playerCountInput: '4' },
      })
      await manager.saveForm()

      expect(manager.state.value.form.error).toMatch(/^Speichern ist gesperrt/)
      expect(await readFile(path, 'utf8')).toBe('kein json')
    }))

  test('Schlägt das Speichern fehl, bleibt das Formular mit Fehlermeldung offen', () =>
    withTestFolder(async (folder) => {
      // Der "Ordner" der Spieleliste ist in Wirklichkeit eine Datei, darum klappt das Speichern nicht
      const blocker = join(folder, 'blockiert')
      await writeFile(blocker, '', 'utf8')

      const manager = managerWith(new JsonFileGameRepository(join(blocker, 'games.json')))
      manager.showNewGame()
      manager.changeName('Monopoly')
      manager.changePlayerCount('4')
      await manager.saveForm()

      expect(manager.state.value.formOpen).toBe(true)
      expect(manager.state.value.form.error).toMatch(/^Speichern hat nicht geklappt/)
      expect(manager.state.value.collection).toBe(games)
    }))
})

describe('Ungespeicherte Eingaben: "Änderungen verwerfen?"', () => {
  test('Anderes Spiel anklicken mit ungespeicherten Eingaben fragt erst nach', () => {
    const manager = editingDixitWithChanges()
    const before = manager.state.value
    manager.showDetail(azul)

    expect(manager.state.value.pending).toEqual({ kind: 'showDetail', game: azul })
    expect(manager.state.value.formOpen).toBe(true)
    expect(manager.state.value.form).toEqual(before.form)
    expect(manager.state.value.chosenGame).toBe(dixit)
  })

  test('Neues Spiel mit ungespeicherten Eingaben fragt erst nach', () => {
    const manager = editingDixitWithChanges()
    manager.showNewGame()
    expect(manager.state.value.pending).toEqual({ kind: 'showNewGame' })
    expect(manager.state.value.form.nameInput).toBe('Dixit Odyssey')
  })

  test('Ja, verwerfen: das angeklickte Spiel wird angezeigt', () => {
    const manager = editingDixitWithChanges()
    manager.showDetail(azul)
    manager.confirmDiscard()

    expect(manager.state.value.pending).toBeNull()
    expect(manager.state.value.formOpen).toBe(false)
    expect(manager.state.value.chosenGame).toBe(azul)
    expect(manager.state.value.collection).toBe(games)
  })

  test('Ja, verwerfen nach Neues Spiel: ein leeres Formular wird geöffnet', () => {
    const manager = editingDixitWithChanges()
    manager.showNewGame()
    manager.confirmDiscard()

    expect(manager.state.value.pending).toBeNull()
    expect(manager.state.value.formOpen).toBe(true)
    expect(manager.state.value.form).toEqual(emptyForm())
    expect(manager.state.value.chosenGame).toBeNull()
  })

  test('Nein: das Formular bleibt mit den Eingaben offen', () => {
    const manager = editingDixitWithChanges()
    const before = manager.state.value
    manager.showDetail(azul)
    manager.cancelDiscard()
    expect(manager.state.value).toEqual(before)
  })

  test('Ohne Änderungen wird ohne Nachfrage gewechselt', () => {
    const manager = managerWith(new MemoryGameRepository())
    manager.showDetail(dixit)
    manager.editChosenGame()
    manager.showDetail(azul)

    expect(manager.state.value.pending).toBeNull()
    expect(manager.state.value.formOpen).toBe(false)
    expect(manager.state.value.chosenGame).toBe(azul)
  })

  test('Klick auf das Spiel, das gerade bearbeitet wird, lässt das Formular offen', () => {
    const manager = editingDixitWithChanges()
    const before = manager.state.value

    manager.showDetail(dixit)
    expect(manager.state.value).toEqual(before)

    // Eine offene Nachfrage ist damit erledigt
    manager.showDetail(azul)
    manager.showDetail(dixit)
    expect(manager.state.value).toEqual(before)
  })

  test('Verwerfen-Antwort ohne offene Nachfrage ändert nichts', () => {
    const manager = editingDixitWithChanges()
    const before = manager.state.value

    manager.confirmDiscard()
    expect(manager.state.value).toEqual(before)
    manager.cancelDiscard()
    expect(manager.state.value).toEqual(before)
  })
})

describe('Löschen', () => {
  test('Löschen fragt erst nach und lässt sich abbrechen', () => {
    const manager = managerWith(new MemoryGameRepository())
    manager.showDetail(azul)
    manager.askDeleteChosenGame()
    expect(manager.state.value.deleteState).toEqual({ kind: 'confirming' })

    manager.cancelDelete()
    expect(manager.state.value.deleteState).toEqual({ kind: 'notAsked' })
    expect(manager.state.value.collection).toBe(games)
  })

  test('Bestätigtes Löschen entfernt das Spiel aus Sammlung und Datei', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      const repository = new JsonFileGameRepository(path)
      await repository.save(games)

      const manager = managerWith(repository)
      manager.showDetail(azul)
      manager.askDeleteChosenGame()
      await manager.confirmDelete()

      const state = manager.state.value
      expect(names(state.collection.games)).toEqual(['Dixit', 'Flügelschlag'])
      expect(state.chosenGame).toBeNull()
      expect(state.deleteState).toEqual({ kind: 'notAsked' })
      expect(await loadFrom(path)).toEqual(state.collection)
    }))

  test('Schlägt das Löschen fehl, bleibt das Spiel und es gibt eine Fehlermeldung', () =>
    withTestFolder(async (folder) => {
      const blocker = join(folder, 'blockiert')
      await writeFile(blocker, '', 'utf8')

      const manager = managerWith(new JsonFileGameRepository(join(blocker, 'games.json')))
      manager.showDetail(azul)
      manager.askDeleteChosenGame()
      await manager.confirmDelete()

      const state = manager.state.value
      expect(state.collection).toBe(games)
      expect(state.chosenGame).toBe(azul)
      expect(state.deleteState.kind).toBe('failed')
      expect(state.deleteState).toMatchObject({
        message: expect.stringMatching(/^Löschen hat nicht geklappt/),
      })
    }))

  test('Nach einem Ladefehler ist Löschen gesperrt', () =>
    withTestFolder(async (folder) => {
      const path = join(folder, 'games.json')
      const manager = managerWith(new JsonFileGameRepository(path), {
        loadError: 'kaputt',
        chosenGame: azul,
      })
      manager.askDeleteChosenGame()
      await manager.confirmDelete()

      const state = manager.state.value
      expect(state.collection).toBe(games)
      expect(existsSync(path)).toBe(false)
      expect(state.deleteState).toMatchObject({
        kind: 'failed',
        message: expect.stringMatching(/^Löschen ist gesperrt/),
      })
    }))

  test('Löschen bestätigen ohne ausgewähltes Spiel ändert nichts', async () => {
    const repository = new MemoryGameRepository()
    const manager = managerWith(repository)
    const before = manager.state.value
    await manager.confirmDelete()

    expect(manager.state.value).toEqual(before)
    expect(repository.saveCount).toBe(0)
  })
})
