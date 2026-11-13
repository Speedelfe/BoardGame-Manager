<script setup lang="ts">
import { genreNames, genres, type Genre } from '../../domain/GameGenres'
import type { FindForm } from '../findActions'

defineProps<{
  form: FindForm
}>()

const emit = defineEmits<{
  changePlayers: [text: string]
  changeMinutes: [text: string]
  toggleGenre: [genre: Genre]
  find: []
}>()

// Der eingetippte Text aus einem Eingabefeld
function textOf(event: Event): string {
  return (event.target as HTMLInputElement).value
}
</script>

<template>
  <!-- Enter in einem Eingabefeld startet die Suche -->
  <form class="game-form" @submit.prevent="emit('find')">
    <h2>Welches Spiel passt zu eurer Runde?</h2>

    <!-- Alles ist freiwillig. Was leer bleibt, schränkt die Suche nicht ein. -->
    <label for="find-players">Anzahl Spieler (freiwillig)</label>
    <input
      id="find-players"
      type="text"
      placeholder="Anzahl Spieler"
      :value="form.playersInput"
      @input="emit('changePlayers', textOf($event))"
    />

    <label for="find-minutes">Zeit in Minuten (freiwillig)</label>
    <input
      id="find-minutes"
      type="text"
      placeholder="Zeit in Minuten"
      :value="form.minutesInput"
      @input="emit('changeMinutes', textOf($event))"
    />

    <!-- Bei mehreren Häkchen reicht es, wenn eins der Genres zum Spiel passt -->
    <fieldset class="genre-checks">
      <legend>Genres (freiwillig)</legend>
      <label v-for="genre in genres" :key="genre">
        <input
          type="checkbox"
          :checked="form.genresInput.includes(genre)"
          @change="emit('toggleGenre', genre)"
        />
        {{ genreNames[genre] }}
      </label>
    </fieldset>

    <!-- Fehlermeldung nur anzeigen, wenn es eine gibt -->
    <p v-if="form.error !== null" class="error">{{ form.error }}</p>

    <div class="buttons">
      <button type="submit">Suchen</button>
    </div>
  </form>
</template>
