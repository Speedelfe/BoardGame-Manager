<script setup lang="ts">
import { computed } from 'vue'

import GameDetail from './components/GameDetail.vue'
import GameFormPanel from './components/GameFormPanel.vue'
import GameList from './components/GameList.vue'
import type { GameManager } from './gameManager'

const props = defineProps<{ manager: GameManager }>()
const manager = props.manager

const state = computed(() => manager.state.value)

// Nur die Anzeige wird sortiert, die Datei behält die Reihenfolge des Anlegens
const games = computed(() => state.value.collection.sortedByName())

// Welches Spiel in der Liste markiert ist.
// Läuft gerade die Nachfrage "Änderungen verwerfen?" für ein angeklicktes Spiel,
// ist dieses markiert. Bei "Nein" springt die Markierung zurück.
const markedGame = computed(() => {
  const pending = state.value.pending
  return pending?.kind === 'showDetail' ? pending.game : state.value.chosenGame
})
</script>

<template>
  <!-- Menüleiste oben -->
  <header class="menu">
    <!-- Nach einem Ladefehler ausgegraut, weil Speichern dann gesperrt ist -->
    <button :disabled="state.loadError !== null" @click="manager.showNewGame()">Neues Spiel</button>
  </header>

  <!-- Fehler beim Laden, unter dem Menü -->
  <p v-if="state.loadError !== null" class="error load-error">
    {{ state.loadError }}
    <br /><br />
    Solange das so ist, können keine Spiele angelegt oder geändert werden, damit die Datei nicht
    überschrieben wird. Bitte die Datei reparieren oder wegschieben und die App neu starten.
  </p>

  <main class="content">
    <!-- Liste der Spiele, links -->
    <GameList :games="games" :marked-game="markedGame" @choose="manager.showDetail($event)" />

    <!-- Rechts entweder das Formular oder die Details des ausgewählten Spiels -->
    <GameFormPanel
      v-if="state.formOpen"
      :form="state.form"
      :ask-discard="state.pending !== null"
      @change-name="manager.changeName($event)"
      @change-player-count="manager.changePlayerCount($event)"
      @change-play-time-min="manager.changePlayTimeMin($event)"
      @change-play-time-max="manager.changePlayTimeMax($event)"
      @change-play-time-open-ended="manager.changePlayTimeOpenEnded($event)"
      @change-last-played="manager.changeLastPlayed($event)"
      @change-genre="manager.changeGenre($event)"
      @toggle-secondary-genre="manager.toggleSecondaryGenre($event)"
      @change-description="manager.changeDescription($event)"
      @save="manager.saveForm()"
      @cancel="manager.cancelForm()"
      @confirm-discard="manager.confirmDiscard()"
      @cancel-discard="manager.cancelDiscard()"
    />
    <GameDetail
      v-else-if="state.chosenGame !== null"
      :game="state.chosenGame"
      :delete-state="state.deleteState"
      @edit="manager.editChosenGame()"
      @ask-delete="manager.askDeleteChosenGame()"
      @confirm-delete="manager.confirmDelete()"
      @cancel-delete="manager.cancelDelete()"
    />
  </main>
</template>
