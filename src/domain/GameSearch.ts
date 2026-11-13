import type { Game } from './Game'
import { genres, isGenre, type Genre } from './GameGenres'
import { PlayerCount } from './PlayerCount'
import { PlayTime } from './PlayTime'
import { fail, ok, type Result } from './Result'

// Eine Suche nach passenden Spielen für eine Runde (Value Object).
// Alle drei Angaben sind freiwillig. Was nicht angegeben ist, schränkt die Suche nicht ein.
export class GameSearch {
  // players: so viele Leute spielen mit (null = egal)
  // minutes: so viel Zeit ist da (null = egal)
  // genres: gewünschte Genres in der Reihenfolge der Auswahlliste, keins doppelt (leer = egal)
  private constructor(
    readonly players: number | null,
    readonly minutes: number | null,
    readonly genres: readonly Genre[],
  ) {}

  // Suche aus den Eingaben im Suchformular: die beiden Texte und die Kürzel der angekreuzten Genres.
  // Für die Zahlen gelten dieselben Regeln wie beim Anlegen eines Spiels.
  static fromInput(
    playersInput: string,
    minutesInput: string,
    genreInputs: readonly string[],
  ): Result<GameSearch> {
    let players: number | null = null
    if (playersInput.trim() !== '') {
      const count = PlayerCount.fromInput(playersInput, '')
      if (!count.ok) return count
      players = count.value.min
    }

    const time = PlayTime.fromInput(minutesInput, '')
    if (!time.ok) return time
    const minutes = time.value?.min ?? null

    const unknown = genreInputs.find((text) => !isGenre(text))
    if (unknown !== undefined) {
      return fail(`"${unknown}" ist kein bekanntes Genre.`)
    }
    const wanted = genres.filter((genre) => genreInputs.includes(genre))

    return ok(new GameSearch(players, minutes, wanted))
  }

  // Passt das Spiel zu dieser Suche? Es muss zu jeder Angabe passen, die gemacht wurde.
  matches(game: Game): boolean {
    if (this.players !== null && !game.playerCount.allows(this.players)) {
      return false
    }

    // Ein Spiel ohne Spieldauer passt vielleicht, deshalb wird es nicht aussortiert
    const playTime = game.details.playTime
    if (this.minutes !== null && playTime !== null && !playTime.canFitInto(this.minutes)) {
      return false
    }

    // Auch ein Spiel ohne Genre passt vielleicht und wird nicht aussortiert
    const gameGenres = game.details.genres
    if (this.genres.length > 0 && gameGenres.main !== null && !gameGenres.hasAnyOf(this.genres)) {
      return false
    }
    return true
  }
}
