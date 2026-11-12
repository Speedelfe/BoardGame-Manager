<script setup lang="ts">
import type { Shelf } from '../../domain/Shelf'
import type { DeleteState } from '../gameManager'

defineProps<{
  shelf: Shelf
  deleteState: DeleteState
}>()

// Die Knöpfe schicken nur Ereignisse, nicht das Regal selbst:
// Der Programmablauf weiß, welches Regal gerade ausgewählt ist.
defineEmits<{
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
