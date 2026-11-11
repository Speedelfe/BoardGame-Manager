// Ergebnis einer Prüfung oder eines Ablaufs:
// entweder hat es geklappt (ok: true, mit dem Wert)
// oder nicht (ok: false, mit einer Fehlermeldung für die Anzeige).
export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function fail(error: string): Result<never> {
  return { ok: false, error }
}

// Text einer abgefangenen Ausnahme (in "catch" kann alles Mögliche ankommen)
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
