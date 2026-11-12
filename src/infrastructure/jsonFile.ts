import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

// Helfer für die Datei, in der Spiele und Regale gemeinsam liegen.
// Die Datei enthält ein Objekt mit mehreren Listen ("gameList", "shelfList").
// Jedes Repository kümmert sich nur um seine eigene Liste und lässt die anderen unberührt.

// Liest die Datei und gibt ihren Inhalt zurück. Was für ein Inhalt es ist, muss der Aufrufer prüfen.
// Ist die Datei kein gültiges JSON, gibt es eine Ausnahme (Error).
export async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'))
}

// Ersetzt eine der Listen in der Datei, alles andere in der Datei bleibt, wie es ist.
// Gibt es die Datei noch nicht, wird sie angelegt.
//
// Geschrieben wird erst in eine Hilfsdatei (.tmp), die dann die echte Datei ersetzt.
// So bleibt der alte Stand heil, falls beim Schreiben etwas schiefgeht.
// Der Stand vor dem Speichern bleibt als Sicherungskopie (.bak) liegen.
export async function writeListToJsonFile(
  path: string,
  listName: string,
  list: readonly object[],
): Promise<void> {
  const exists = existsSync(path)
  const before = exists ? await readJson(path) : {}

  // Eine Datei, die wir nicht verstehen, überschreiben wir lieber nicht
  if (!isObject(before)) {
    throw new Error('Die vorhandene Datei hat nicht die erwartete Form.')
  }
  const json = JSON.stringify({ ...before, [listName]: list }, null, 2)

  // Ordner anlegen, falls es ihn noch nicht gibt
  await mkdir(dirname(resolve(path)), { recursive: true })

  const tempPath = path + '.tmp'
  await writeFile(tempPath, json, 'utf8')

  if (exists) {
    await copyFile(path, path + '.bak')
  }
  await rename(tempPath, path)
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
