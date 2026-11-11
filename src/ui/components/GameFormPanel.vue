<script setup lang="ts">
import type { GameForm } from '../gameForm'

// askDiscard = true: statt Speichern/Abbrechen wird "Änderungen verwerfen?" gefragt
defineProps<{
  form: GameForm
  askDiscard: boolean
}>()

const emit = defineEmits<{
  changeName: [text: string]
  changePlayerCount: [text: string]
  save: []
  cancel: []
  confirmDiscard: []
  cancelDiscard: []
}>()

// Der eingetippte Text aus einem Eingabefeld
function textOf(event: Event): string {
  return (event.target as HTMLInputElement).value
}
</script>

<template>
  <!-- Enter in einem Eingabefeld speichert, außer während der Nachfrage -->
  <form class="game-form" @submit.prevent="askDiscard || emit('save')">
    <h2>
      {{
        form.editing === null
          ? 'Trage ein neues Spiel ein'
          : `"${form.editing.name.text}" bearbeiten`
      }}
    </h2>

    <label for="game-name">Spielname</label>
    <input
      id="game-name"
      type="text"
      placeholder="Spielname"
      :value="form.nameInput"
      @input="emit('changeName', textOf($event))"
    />

    <label for="player-count">Spieleranzahl</label>
    <input
      id="player-count"
      type="text"
      placeholder="Spieleranzahl"
      :value="form.playerCountInput"
      @input="emit('changePlayerCount', textOf($event))"
    />

    <!-- Fehlermeldung nur anzeigen, wenn es eine gibt -->
    <p v-if="form.error !== null" class="error">{{ form.error }}</p>

    <template v-if="askDiscard">
      <p>Du hast ungespeicherte Eingaben. Änderungen verwerfen?</p>
      <div class="buttons">
        <button type="button" @click="emit('confirmDiscard')">Ja, verwerfen</button>
        <button type="button" @click="emit('cancelDiscard')">Nein, weiter bearbeiten</button>
      </div>
    </template>
    <div v-else class="buttons">
      <button type="submit">Speichern</button>
      <button type="button" @click="emit('cancel')">Abbrechen</button>
    </div>
  </form>
</template>
