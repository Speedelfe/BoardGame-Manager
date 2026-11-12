<script setup lang="ts">
import type { ShelfForm } from '../shelfActions'

defineProps<{
  form: ShelfForm
}>()

const emit = defineEmits<{
  changeName: [text: string]
  save: []
  cancel: []
}>()

// Der eingetippte Text aus dem Eingabefeld
function textOf(event: Event): string {
  return (event.target as HTMLInputElement).value
}
</script>

<template>
  <!-- Enter im Eingabefeld speichert -->
  <form class="game-form" @submit.prevent="emit('save')">
    <h2>
      {{
        form.editing === null
          ? 'Lege ein neues Regal an'
          : `"${form.editing.name.text}" umbenennen`
      }}
    </h2>

    <label for="shelf-name">Name des Regals</label>
    <input
      id="shelf-name"
      type="text"
      placeholder="z.B. Wohnwand links"
      :value="form.nameInput"
      @input="emit('changeName', textOf($event))"
    />

    <!-- Fehlermeldung nur anzeigen, wenn es eine gibt -->
    <p v-if="form.error !== null" class="error">{{ form.error }}</p>

    <div class="buttons">
      <button type="submit">Speichern</button>
      <button type="button" @click="emit('cancel')">Abbrechen</button>
    </div>
  </form>
</template>
