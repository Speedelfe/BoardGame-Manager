<script setup lang="ts">
import type { Game } from '../../domain/Game'
import type { DeleteState } from '../gameManager'

defineProps<{
  game: Game
  deleteState: DeleteState
}>()

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
      <p>Spieler: {{ game.playerCount.value }}</p>
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
