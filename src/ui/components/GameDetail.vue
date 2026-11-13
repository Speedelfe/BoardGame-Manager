<script setup lang="ts">
import { computed } from 'vue'

import type { Game } from '../../domain/Game'
import { genreNames } from '../../domain/GameGenres'
import { gameModeNames } from '../../domain/GameMode'
import { todayIsoDate } from '../../domain/LastPlayed'
import type { DeleteState } from '../gameManager'

// shelfName: der Name des Regals, in dem das Spiel steht. Das Spiel selbst kennt nur die ID des Regals.
const props = defineProps<{
  game: Game
  shelfName: string | null
  deleteState: DeleteState
}>()

// Das steht bei Angaben, die nicht ausgefüllt wurden
const empty = '–'

// Die freiwilligen Angaben als Text für die Anzeige
const info = computed(() => {
  const { playTime, lastPlayed, genres, mode, description } = props.game.details

  return {
    playTime: playTime?.text ?? empty,
    genre: genres.main === null ? empty : genreNames[genres.main],
    secondaryGenres: genres.secondary.map((genre) => genreNames[genre]).join(', ') || empty,
    mode: mode === null ? empty : gameModeNames[mode],
    shelf: props.shelfName ?? empty,
    lastPlayed: lastPlayed?.text ?? empty,
    description: description ?? empty,
  }
})

// Steht bei "zuletzt gespielt" schon der heutige Tag? Dann ist "Heute gespielt" ausgegraut.
const playedToday = computed(() => props.game.details.lastPlayed?.isoDate === todayIsoDate())

// Die Knöpfe schicken nur Ereignisse, nicht das Spiel selbst:
// Der Programmablauf weiß, welches Spiel gerade ausgewählt ist.
defineEmits<{
  playedToday: []
  edit: []
  askDelete: []
  confirmDelete: []
  cancelDelete: []
}>()
</script>

<template>
  <section class="detail">
    <div class="detail-info">
      <h1>{{ game.name.text }}</h1>
      <p>Spieleranzahl: {{ game.playerCount.text }}</p>
      <p>Spieldauer: {{ info.playTime }}</p>
      <p>Genre: {{ info.genre }}</p>
      <p>Nebengenres: {{ info.secondaryGenres }}</p>
      <p>Spielmodus: {{ info.mode }}</p>
      <p>Regal: {{ info.shelf }}</p>
      <p>Zuletzt gespielt: {{ info.lastPlayed }}</p>
      <!-- Zeilenumbrüche der Beschreibung bleiben erhalten (siehe style.css) -->
      <p class="description">Beschreibung: {{ info.description }}</p>
    </div>

    <div class="buttons">
      <!-- Löschen in zwei Schritten: erst nachfragen -->
      <template v-if="deleteState.kind === 'confirming'">
        <span>Wirklich löschen?</span>
        <button @click="$emit('confirmDelete')">Ja, löschen</button>
        <button @click="$emit('cancelDelete')">Abbrechen</button>
      </template>
      <template v-else>
        <span v-if="deleteState.kind === 'failed'" class="error">{{ deleteState.message }}</span>
        <!-- Setzt "zuletzt gespielt" auf heute und speichert sofort -->
        <button :disabled="playedToday" @click="$emit('playedToday')">Heute gespielt</button>
        <button @click="$emit('edit')">Bearbeiten</button>
        <button @click="$emit('askDelete')">Löschen</button>
      </template>
    </div>
  </section>
</template>
