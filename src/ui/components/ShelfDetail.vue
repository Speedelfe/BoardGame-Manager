<script setup lang="ts">
import type { Game } from '../../domain/Game'
import type { Shelf } from '../../domain/Shelf'
import type { DeleteState } from '../gameManager'

// games: die Spiele, die in diesem Regal stehen, schon in der Reihenfolge der Anzeige
defineProps<{
  shelf: Shelf
  games: Game[]
  deleteState: DeleteState
}>()

// Die Knöpfe schicken nur Ereignisse, nicht das Regal selbst:
// Der Programmablauf weiß, welches Regal gerade ausgewählt ist.
defineEmits<{
  chooseGame: [game: Game]
  rename: []
  askDelete: []
  confirmDelete: []
  cancelDelete: []
}>()
</script>

<template>
  <section class="detail">
    <div class="detail-info">
      <h1>{{ shelf.name.text }}</h1>

      <p v-if="games.length === 0">In diesem Regal stehen noch keine Spiele.</p>
      <template v-else>
        <p>Spiele in diesem Regal ({{ games.length }}):</p>
        <!-- Ein Klick auf ein Spiel springt zu seinen Details -->
        <ul class="shelf-games">
          <li v-for="game in games" :key="game.id.value">
            <button class="game-list-item" @click="$emit('chooseGame', game)">
              {{ game.name.text }}
            </button>
          </li>
        </ul>
      </template>
    </div>

    <div class="buttons">
      <!-- Löschen in zwei Schritten: erst nachfragen -->
      <template v-if="deleteState.kind === 'confirming'">
        <span>Wirklich löschen?</span>
        <button @click="$emit('confirmDelete')">Ja, löschen</button>
        <button @click="$emit('cancelDelete')">Abbrechen</button>
      </template>
      <template v-else>
        <!-- Hier steht auch der Hinweis, wenn im Regal noch Spiele stehen -->
        <span v-if="deleteState.kind === 'failed'" class="error">{{ deleteState.message }}</span>
        <button @click="$emit('rename')">Umbenennen</button>
        <button @click="$emit('askDelete')">Löschen</button>
      </template>
    </div>
  </section>
</template>
