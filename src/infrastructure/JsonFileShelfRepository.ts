import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { errorMessage, fail, ok, type Result } from '../domain/Result'
import type { ShelfData } from '../domain/Shelf'
import { ShelfCollection } from '../domain/ShelfCollection'
import type { ShelfRepository } from '../domain/ShelfRepository'
import { isObject, readJson, writeListToJsonFile } from './jsonFile'

// Speichert die Regale als Liste "shelfList" in derselben JSON-Datei wie die Spiele
// (siehe JsonFileGameRepository). Läuft nur im Hintergrundteil von Electron (Node).
export class JsonFileShelfRepository implements ShelfRepository {
  constructor(private readonly dataPath: string) {}

  // Gibt es die Datei noch nicht, ist das kein Fehler, sondern eine leere Sammlung.
  async load(): Promise<Result<ShelfCollection>> {
    if (!existsSync(this.dataPath)) {
      return ok(ShelfCollection.empty())
    }

    let result: Result<ShelfCollection>
    try {
      const data = readShelfList(await readJson(this.dataPath))
      result = data.ok ? ShelfCollection.restore(data.value) : data
    } catch (error) {
      result = fail(errorMessage(error))
    }

    if (result.ok) return result
    return fail(
      `Die Regale (${resolve(this.dataPath)}) konnten nicht gelesen werden: ${result.error}`,
    )
  }

  // Ersetzt nur die Regale in der Datei, die Spiele bleiben, wie sie sind.
  async save(shelves: ShelfCollection): Promise<void> {
    await writeListToJsonFile(this.dataPath, 'shelfList', shelves.toData())
  }
}

// Prüft, ob der Inhalt der Datei die erwartete Form hat, und übersetzt ihn in einfache Regaldaten.
function readShelfList(content: unknown): Result<ShelfData[]> {
  if (!isObject(content)) {
    return fail('Die Datei hat nicht die erwartete Form.')
  }
  // Dateien aus der Zeit vor den Regalen haben noch keine Regal-Liste
  const shelfList = content['shelfList'] ?? []
  if (!Array.isArray(shelfList)) {
    return fail('Das Feld "shelfList" ist keine Liste.')
  }

  const shelves: ShelfData[] = []
  for (const [index, entry] of shelfList.entries()) {
    const position = `Regal Nr. ${index + 1}`

    if (!isObject(entry)) {
      return fail(`${position} ist kein gültiger Eintrag.`)
    }
    const { id, name } = entry
    if (typeof id !== 'string') {
      return fail(`${position}: Das Feld "id" fehlt oder ist kein Text.`)
    }
    if (typeof name !== 'string') {
      return fail(`${position}: Das Feld "name" fehlt oder ist kein Text.`)
    }
    shelves.push({ id, name })
  }
  return ok(shelves)
}
