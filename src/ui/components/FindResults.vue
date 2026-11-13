<script setup lang="ts">
import type { Game } from '../../domain/Game'
import { genreNames } from '../../domain/GameGenres'
import { gameModeNames } from '../../domain/GameMode'
import type { GameSearch } from '../../domain/GameSearch'

// Ein gefundenes Spiel mit dem Namen seines Regals (null = kein Regal).
// Das Spiel selbst kennt nur die ID des Regals.
export interface FoundGame {
  game: Game
  shelfName: string | null
}

// search: die Suche, die zuletzt gestartet wurde. null = es wurde noch nicht gesucht.
// found: die Spiele, die zu dieser Suche passen, schon in der Reihenfolge der Anzeige
defineProps<{
  search: GameSearch | null
  found: FoundGame[]
}>()

// Das steht bei Angaben, die nicht ausgefüllt wurden
const empty = '–'

// Genre und Nebengenres eines Spiels als Text, das Genre zuerst
function genresText(game: Game): string {
  const { main, secondary } = game.details.genres
  if (main === null) return empty

  return [main, ...secondary].map((genre) => genreNames[genre]).join(', ')
}

// Der Spielmodus eines Spiels als Text
function modeText(game: Game): string {
  const mode = game.details.mode
  return mode === null ? empty : gameModeNames[mode]
}
</script>

<template>
  <section class="find-results">
    <p v-if="search === null">
      Gib links ein, wonach du suchst, und klicke auf „Suchen“. Ohne Angaben werden alle Spiele
      angezeigt.
    </p>
    <p v-else-if="found.length === 0">Zu dieser Suche passt kein Spiel.</p>
    <template v-else>
      <p>Passende Spiele ({{ found.length }}), das am längsten nicht gespielte zuerst:</p>

      <!-- Regal und "zuletzt gespielt" stehen immer da.
           Die anderen Spalten gibt es nur, wenn danach gesucht wurde. -->
      <table>
        <thead>
          <tr>
            <th>Spiel</th>
            <th>Regal</th>
            <th>Zuletzt gespielt</th>
            <th v-if="search.players !== null">Spieleranzahl</th>
            <th v-if="search.minutes !== null">Spieldauer</th>
            <th v-if="search.genres.length > 0">Genres</th>
            <th v-if="search.modes.length > 0">Spielmodus</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ game, shelfName } in found" :key="game.id.value">
            <td>{{ game.name.text }}</td>
            <td>{{ shelfName ?? empty }}</td>
            <td>{{ game.details.lastPlayed?.text ?? empty }}</td>
            <td v-if="search.players !== null">{{ game.playerCount.text }}</td>
            <td v-if="search.minutes !== null">{{ game.details.playTime?.text ?? empty }}</td>
            <td v-if="search.genres.length > 0">{{ genresText(game) }}</td>
            <td v-if="search.modes.length > 0">{{ modeText(game) }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </section>
</template>
