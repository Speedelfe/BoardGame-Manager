import { cleanDescription, Game, noDetails, type GameData, type GameDetails } from './Game'
import { GameGenres } from './GameGenres'
import { GameId } from './GameId'
import { GameName } from './GameName'
import { LastPlayed } from './LastPlayed'
import { PlayerCount } from './PlayerCount'
import { PlayTime } from './PlayTime'
import { fail, ok, type Result } from './Result'
import { ShelfId } from './ShelfId'

// Deutsche Sortierregeln, unabhängig von der Spracheinstellung des Rechners:
// Groß-/Kleinschreibung egal, Umlaute wie im Wörterbuch (Ä bei A).
const germanOrder = new Intl.Collator('de-DE')

// Ergebnis von "Spiel hinzufügen" und "Spiel ändern": die neue Sammlung und das betroffene Spiel
export interface ChangedCollection {
  collection: GameCollection
  game: Game
}

// Die Spielesammlung (Aggregate).
// Sie achtet auf die Regeln, die mehrere Spiele betreffen: keine ID und kein Name doppelt.
// Eine Sammlung wird nie verändert: Jede Änderung ergibt eine neue Sammlung.
export class GameCollection {
  // Spiele in der Reihenfolge, in der sie angelegt wurden
  private constructor(readonly games: readonly Game[]) {}

  static empty(): GameCollection {
    return new GameCollection([])
  }

  // Sammlung aus gespeicherten Daten wieder aufbauen und dabei alles prüfen.
  // Beim ersten Fehler wird nicht weitergeprüft.
  static restore(data: readonly GameData[]): Result<GameCollection> {
    const problem = findProblem(data)
    if (problem !== null) {
      return fail(problem)
    }

    const games: Game[] = []
    for (const entry of data) {
      const id = GameId.fromString(entry.id)
      if (!id.ok) return id
      const name = GameName.create(entry.name)
      if (!name.ok) return name
      const playerCount = PlayerCount.fromNumber(entry.playerCount)
      if (!playerCount.ok) return playerCount
      const details = detailsFromData(entry)
      if (!details.ok) return fail(`Spiel "${entry.name}": ${details.error}`)

      games.push(new Game(id.value, name.value, playerCount.value, details.value))
    }
    return ok(new GameCollection(games))
  }

  // Die Sammlung als einfache Daten, zum Speichern
  toData(): GameData[] {
    return this.games.map((game) => ({
      id: game.id.value,
      name: game.name.text,
      playerCount: game.playerCount.value,
      playTimeMin: game.details.playTime?.min ?? null,
      playTimeMax: game.details.playTime?.max ?? null,
      playTimeOpenEnded: game.details.playTime?.openEnded ?? false,
      lastPlayed: game.details.lastPlayed?.isoDate ?? null,
      genre: game.details.genres.main,
      secondaryGenres: [...game.details.genres.secondary],
      shelfId: game.details.shelfId?.value ?? null,
      description: game.details.description,
    }))
  }

  // Für die Anzeige: alphabetisch nach Namen. Die Sammlung selbst behält ihre Reihenfolge.
  sortedByName(): Game[] {
    return [...this.games].sort((a, b) => germanOrder.compare(a.name.text, b.name.text))
  }

  findById(id: GameId): Game | null {
    return this.games.find((game) => game.id.equals(id)) ?? null
  }

  // Alle Spiele, die in diesem Regal stehen, alphabetisch nach Namen
  gamesOnShelf(shelfId: ShelfId): Game[] {
    return this.sortedByName().filter((game) => game.details.shelfId?.equals(shelfId) ?? false)
  }

  // Gibt es den Namen schon bei einem anderen Spiel?
  // Beim Bearbeiten darf ein Spiel seinen eigenen Namen behalten, deshalb lässt man es mit "except" weg.
  isNameTaken(name: GameName, except: GameId | null = null): boolean {
    return this.games.some(
      (game) => game.name.equals(name) && !(except !== null && game.id.equals(except)),
    )
  }

  // Neues Spiel hinten anhängen. Es bekommt eine neue ID.
  add(
    name: GameName,
    playerCount: PlayerCount,
    details: GameDetails = noDetails,
  ): Result<ChangedCollection> {
    if (this.isNameTaken(name)) {
      return fail(nameTakenMessage(name))
    }

    const game = new Game(GameId.create(), name, playerCount, details)
    return ok({ collection: new GameCollection([...this.games, game]), game })
  }

  // Vorhandenes Spiel ändern. Es behält seine ID und seinen Platz in der Sammlung.
  change(
    id: GameId,
    name: GameName,
    playerCount: PlayerCount,
    details: GameDetails = noDetails,
  ): Result<ChangedCollection> {
    if (this.findById(id) === null) {
      return fail('Dieses Spiel gibt es in der Sammlung nicht mehr.')
    }
    if (this.isNameTaken(name, id)) {
      return fail(nameTakenMessage(name))
    }

    const game = new Game(id, name, playerCount, details)
    const games = this.games.map((existing) => (existing.id.equals(id) ? game : existing))
    return ok({ collection: new GameCollection(games), game })
  }

  // Spiel mit dieser ID entfernen. Gibt es das Spiel nicht, bleibt alles, wie es ist.
  remove(id: GameId): GameCollection {
    return new GameCollection(this.games.filter((game) => !game.id.equals(id)))
  }
}

function nameTakenMessage(name: GameName): string {
  return `Das Spiel "${name.text}" gibt es schon.`
}

// ----- Prüfen gespeicherter Daten -----

// Sucht den ersten Fehler in gespeicherten Daten. Ohne Fehler ist das Ergebnis null.
// Die Meldungen nennen alle betroffenen Spiele, damit man die Datei leichter reparieren kann.
function findProblem(data: readonly GameData[]): string | null {
  const names = (entries: readonly GameData[]) =>
    entries.map((entry) => `"${entry.name}"`).join(', ')
  const normalizedId = (entry: GameData) => entry.id.trim().toLowerCase()

  const emptyIds = data.filter((entry) => normalizedId(entry) === GameId.emptyValue)
  if (emptyIds.length > 0) {
    return `Diese Spiele haben eine leere ID: ${names(emptyIds)}`
  }

  const invalidIds = data.filter((entry) => !GameId.fromString(entry.id).ok)
  if (invalidIds.length > 0) {
    const details = invalidIds.map((entry) => `"${entry.name}" (${entry.id})`).join(', ')
    return `Diese Spiele haben eine ungültige ID: ${details}`
  }

  const duplicateIds = groupsWithSeveral(data, normalizedId)
  if (duplicateIds.length > 0) {
    const details = duplicateIds
      .map((group) => `${names(group)} (ID ${group[0] ? normalizedId(group[0]) : ''})`)
      .join('; ')
    return `Diese Spiele haben die gleiche ID: ${details}`
  }

  const nameless = data.filter((entry) => entry.name.trim() === '')
  if (nameless.length > 0) {
    return `Diese Spiele haben keinen Namen (ID): ${nameless.map(normalizedId).join(', ')}`
  }

  const wrongPlayerCounts = data.filter((entry) => !PlayerCount.fromNumber(entry.playerCount).ok)
  if (wrongPlayerCounts.length > 0) {
    const details = wrongPlayerCounts
      .map((entry) => `"${entry.name}" (${entry.playerCount})`)
      .join(', ')
    return `Diese Spiele haben eine ungültige Spieleranzahl: ${details}`
  }

  // Groß-/Kleinschreibung und Leerzeichen am Rand sind egal, wie im Formular
  const duplicateNames = groupsWithSeveral(data, (entry) => entry.name.trim().toUpperCase())
  if (duplicateNames.length > 0) {
    const details = duplicateNames.map((group) => `"${group[0]?.name.trim()}"`).join(', ')
    return `Diese Spielnamen gibt es mehrfach: ${details}`
  }

  return null
}

// Prüft die freiwilligen Angaben eines gespeicherten Spiels
function detailsFromData(entry: GameData): Result<GameDetails> {
  let playTime: PlayTime | null = null
  if (entry.playTimeMin !== null) {
    const result = PlayTime.fromNumbers(
      entry.playTimeMin,
      entry.playTimeMax,
      entry.playTimeOpenEnded,
    )
    if (!result.ok) return result
    playTime = result.value
  } else if (entry.playTimeMax !== null) {
    return fail('Die Spieldauer hat ein "bis", aber kein "von".')
  } else if (entry.playTimeOpenEnded) {
    return fail('Die Spieldauer ist nach oben offen, hat aber kein "von".')
  }

  let lastPlayed: LastPlayed | null = null
  if (entry.lastPlayed !== null) {
    const result = LastPlayed.fromString(entry.lastPlayed)
    if (!result.ok) return result
    lastPlayed = result.value
  }

  const genres = GameGenres.create(entry.genre, entry.secondaryGenres)
  if (!genres.ok) return genres

  // Hier wird nur geprüft, ob die ID gültig aussieht. Ob es das Regal gibt, weiß die Sammlung nicht.
  let shelfId: ShelfId | null = null
  if (entry.shelfId !== null) {
    const result = ShelfId.fromString(entry.shelfId)
    if (!result.ok) return fail(`Das Regal hat keine gültige ID (${entry.shelfId}).`)
    shelfId = result.value
  }

  return ok({
    playTime,
    lastPlayed,
    genres: genres.value,
    shelfId,
    description: cleanDescription(entry.description),
  })
}

// Sortiert Einträge nach einem Merkmal in Gruppen und gibt nur die Gruppen mit mehreren Einträgen zurück
function groupsWithSeveral<T>(entries: readonly T[], key: (entry: T) => string): T[][] {
  const groups = new Map<string, T[]>()

  for (const entry of entries) {
    const group = groups.get(key(entry))
    if (group) {
      group.push(entry)
    } else {
      groups.set(key(entry), [entry])
    }
  }
  return [...groups.values()].filter((group) => group.length > 1)
}
