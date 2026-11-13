<script setup lang="ts">
import { computed } from 'vue'

import type { Game } from '../../domain/Game'
import { genreNames } from '../../domain/GameGenres'
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
  const { playTime, lastPlayed, genres, description } = props.game.details

  return {
    playTime: playTime?.text ?? empty,
    genre: genres.main === null ? empty : genreNames[genres.main],
    secondaryGenres: genres.secondary.map((genre) => genreNames[genre]).join(', ') || empty,
    shelf: props.shelfName ?? empty,
    lastPlayed: lastPlayed?.text ?? empty,
    description: description ?? empty,
  }
})

// Die Knöpfe schicken nur Ereignisse, nicht das Spiel selbst:
// Der Programmablauf weiß, welches Spiel gerade ausgewählt ist.
defineEmits<{
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
      <p>Spieler: {{ game.playerCount.min }}</p>
      <p>Spieldauer: {{ info.playTime }}</p>
      <p>Genre: {{ info.genre }}</p>
      <p>Nebengenres: {{ info.secondaryGenres }}</p>
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
        <button @click="$emit('edit')">Bearbeiten</button>
        <button @click="$emit('askDelete')">Löschen</button>
      </template>
    </div>
  </section>
</template>
