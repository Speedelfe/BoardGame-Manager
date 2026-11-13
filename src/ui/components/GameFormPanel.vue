<script setup lang="ts">
import { genreNames, genres, type Genre } from '../../domain/GameGenres'
import { gameModeNames, gameModes, type GameMode } from '../../domain/GameMode'
import { todayIsoDate } from '../../domain/LastPlayed'
import type { Shelf } from '../../domain/Shelf'
import {
  canEditPlayerCountMax,
  canEditPlayTimeMax,
  canTogglePlayerCountOpenEnded,
  canTogglePlayTimeOpenEnded,
  canToggleSecondaryGenre,
  type GameForm,
} from '../gameForm'

// askDiscard = true: statt Speichern/Abbrechen wird "Änderungen verwerfen?" gefragt
// shelves: die Regale für die Auswahlliste, schon in der Reihenfolge der Anzeige
defineProps<{
  form: GameForm
  shelves: Shelf[]
  askDiscard: boolean
}>()

const emit = defineEmits<{
  changeName: [text: string]
  changePlayerCountMin: [text: string]
  changePlayerCountMax: [text: string]
  changePlayerCountOpenEnded: [openEnded: boolean]
  changePlayTimeMin: [text: string]
  changePlayTimeMax: [text: string]
  changePlayTimeOpenEnded: [openEnded: boolean]
  changeLastPlayed: [text: string]
  changeGenre: [text: string]
  toggleSecondaryGenre: [genre: Genre]
  toggleGameMode: [mode: GameMode]
  changeShelf: [shelfId: string]
  changeDescription: [text: string]
  save: []
  cancel: []
  confirmDiscard: []
  cancelDiscard: []
}>()

// Der Kalender bietet keine Tage in der Zukunft an
const today = todayIsoDate()

// Der eingetippte Text aus einem Eingabefeld (auch Auswahlliste und mehrzeiliges Textfeld)
function textOf(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value
}

// Ist das Häkchen eines Ankreuzfelds gesetzt?
function isChecked(event: Event): boolean {
  return (event.target as HTMLInputElement).checked
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

    <!-- "von" ist Pflicht. "von" allein ist eine einzelne Zahl, mit "bis" ein Bereich. -->
    <label for="player-count-min">Spieleranzahl</label>
    <div class="from-to">
      <input
        id="player-count-min"
        type="text"
        placeholder="von"
        :value="form.playerCountMinInput"
        @input="emit('changePlayerCountMin', textOf($event))"
      />
      <span>bis</span>
      <!-- "bis" lässt sich erst ausfüllen, wenn "von" ausgefüllt ist -->
      <input
        type="text"
        placeholder="bis"
        aria-label="Spieleranzahl bis"
        :disabled="!canEditPlayerCountMax(form)"
        :value="form.playerCountMaxInput"
        @input="emit('changePlayerCountMax', textOf($event))"
      />
    </div>
    <!-- Für Spiele ohne feste Höchstzahl. Mit Häkchen gibt es kein "bis". -->
    <label class="checkbox-line">
      <input
        type="checkbox"
        :checked="form.playerCountOpenEndedInput"
        :disabled="!canTogglePlayerCountOpenEnded(form)"
        @change="emit('changePlayerCountOpenEnded', isChecked($event))"
      />
      nach oben offen (ab "von")
    </label>

    <!-- Ab hier ist alles freiwillig -->
    <label for="play-time-min">Spieldauer in Minuten (freiwillig)</label>
    <div class="from-to">
      <input
        id="play-time-min"
        type="text"
        placeholder="von"
        :value="form.playTimeMinInput"
        @input="emit('changePlayTimeMin', textOf($event))"
      />
      <span>bis</span>
      <!-- "bis" lässt sich erst ausfüllen, wenn "von" ausgefüllt ist -->
      <input
        type="text"
        placeholder="bis"
        aria-label="Spieldauer bis"
        :disabled="!canEditPlayTimeMax(form)"
        :value="form.playTimeMaxInput"
        @input="emit('changePlayTimeMax', textOf($event))"
      />
    </div>
    <!-- Für Spiele, die beliebig lange dauern können. Mit Häkchen gibt es kein "bis". -->
    <label class="checkbox-line">
      <input
        type="checkbox"
        :checked="form.playTimeOpenEndedInput"
        :disabled="!canTogglePlayTimeOpenEnded(form)"
        @change="emit('changePlayTimeOpenEnded', isChecked($event))"
      />
      nach oben offen (ab "von")
    </label>

    <label for="genre">Genre (freiwillig)</label>
    <select id="genre" :value="form.genreInput" @change="emit('changeGenre', textOf($event))">
      <option value="">kein Genre</option>
      <option v-for="genre in genres" :key="genre" :value="genre">{{ genreNames[genre] }}</option>
    </select>

    <!-- Nebengenres gehen nur mit einem Genre, und das Genre selbst ist ausgegraut -->
    <fieldset class="secondary-genres">
      <legend>Nebengenres (freiwillig)</legend>
      <label v-for="genre in genres" :key="genre">
        <input
          type="checkbox"
          :checked="form.secondaryGenresInput.includes(genre)"
          :disabled="!canToggleSecondaryGenre(form, genre)"
          @change="emit('toggleSecondaryGenre', genre)"
        />
        {{ genreNames[genre] }}
      </label>
    </fieldset>

    <!-- Ein Spiel hat höchstens einen Spielmodus:
         Wird einer angekreuzt, verschwindet das Häkchen beim anderen. -->
    <fieldset class="genre-checks">
      <legend>Spielmodus (freiwillig)</legend>
      <label v-for="mode in gameModes" :key="mode">
        <input
          type="checkbox"
          :checked="form.gameModeInput === mode"
          @change="emit('toggleGameMode', mode)"
        />
        {{ gameModeNames[mode] }}
      </label>
    </fieldset>

    <!-- Die Regale selbst pflegt man in der Ansicht "Regale" -->
    <label for="shelf">Regal (freiwillig)</label>
    <select id="shelf" :value="form.shelfIdInput" @change="emit('changeShelf', textOf($event))">
      <option value="">kein Regal</option>
      <option v-for="shelf in shelves" :key="shelf.id.value" :value="shelf.id.value">
        {{ shelf.name.text }}
      </option>
    </select>

    <label for="last-played">Zuletzt gespielt (freiwillig)</label>
    <input
      id="last-played"
      type="date"
      :max="today"
      :value="form.lastPlayedInput"
      @input="emit('changeLastPlayed', textOf($event))"
    />

    <label for="description">Beschreibung (freiwillig)</label>
    <textarea
      id="description"
      rows="4"
      placeholder="Beschreibung"
      :value="form.descriptionInput"
      @input="emit('changeDescription', textOf($event))"
    ></textarea>

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
