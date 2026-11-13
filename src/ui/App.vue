<script setup lang="ts">
import { computed } from 'vue'

import type { Game } from '../domain/Game'
import FindFormPanel from './components/FindFormPanel.vue'
import FindResults, { type FoundGame } from './components/FindResults.vue'
import GameDetail from './components/GameDetail.vue'
import GameFormPanel from './components/GameFormPanel.vue'
import GameList from './components/GameList.vue'
import ShelfDetail from './components/ShelfDetail.vue'
import ShelfFormPanel from './components/ShelfFormPanel.vue'
import ShelfList from './components/ShelfList.vue'
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

// Die Regale, ebenfalls alphabetisch sortiert, und der Stand der Ansicht "Regale"
const shelves = computed(() => state.value.shelves.sortedByName())
const shelfView = computed(() => state.value.shelfView)

// Die Spiele, die im ausgewählten Regal stehen, alphabetisch sortiert
const chosenShelfGames = computed(() => {
  const shelf = shelfView.value.chosenShelf
  return shelf === null ? [] : state.value.collection.gamesOnShelf(shelf.id)
})

// Der Name des Regals, in dem ein Spiel steht (null = kein Regal).
// Er wird hier nachgeschlagen, weil das Spiel selbst nur die ID des Regals kennt.
function shelfNameOf(game: Game | null): string | null {
  const shelfId = game?.details.shelfId ?? null
  if (shelfId === null) return null

  return state.value.shelves.findById(shelfId)?.name.text ?? null
}

const chosenGameShelfName = computed(() => shelfNameOf(state.value.chosenGame))

// Der Stand der Ansicht "Spiel finden"
const findView = computed(() => state.value.findView)

// Die Spiele, die zur zuletzt gestarteten Suche passen, jedes mit dem Namen seines Regals.
// Die Reihenfolge legt die Sammlung fest: das am längsten nicht gespielte zuerst.
const foundGames = computed<FoundGame[]>(() => {
  const search = findView.value.search
  if (search === null) return []

  return state.value.collection
    .find(search)
    .map((game) => ({ game, shelfName: shelfNameOf(game) }))
})
</script>

<template>
  <!-- Menüleiste oben -->
  <header class="menu">
    <!-- Wechsel zwischen den Ansichten. Die gerade sichtbare ist hervorgehoben. -->
    <button :class="{ active: state.view === 'games' }" @click="manager.showGames()">Spiele</button>
    <button :class="{ active: state.view === 'shelves' }" @click="manager.showShelves()">
      Regale
    </button>
    <button :class="{ active: state.view === 'find' }" @click="manager.showFind()">
      Spiel finden
    </button>

    <!-- Nach einem Ladefehler ausgegraut, weil Speichern dann gesperrt ist -->
    <button
      v-if="state.view === 'games'"
      class="menu-new"
      :disabled="state.loadError !== null"
      @click="manager.showNewGame()"
    >
      Neues Spiel
    </button>
    <button
      v-else-if="state.view === 'shelves'"
      class="menu-new"
      :disabled="state.loadError !== null"
      @click="manager.showNewShelf()"
    >
      Neues Regal
    </button>
  </header>

  <!-- Fehler beim Laden, unter dem Menü -->
  <p v-if="state.loadError !== null" class="error load-error">
    {{ state.loadError }}
    <br /><br />
    Solange das so ist, können keine Spiele und Regale angelegt oder geändert werden, damit die
    Datei nicht überschrieben wird. Bitte die Datei reparieren oder wegschieben und die App neu starten.
  </p>

  <!-- Ansicht "Spiele" -->
  <main v-if="state.view === 'games'" class="content">
    <!-- Liste der Spiele, links -->
    <GameList :games="games" :marked-game="markedGame" @choose="manager.showDetail($event)" />

    <!-- Rechts entweder das Formular oder die Details des ausgewählten Spiels -->
    <GameFormPanel
      v-if="state.formOpen"
      :form="state.form"
      :shelves="shelves"
      :ask-discard="state.pending !== null"
      @change-name="manager.changeName($event)"
      @change-player-count-min="manager.changePlayerCountMin($event)"
      @change-player-count-max="manager.changePlayerCountMax($event)"
      @change-player-count-open-ended="manager.changePlayerCountOpenEnded($event)"
      @change-play-time-min="manager.changePlayTimeMin($event)"
      @change-play-time-max="manager.changePlayTimeMax($event)"
      @change-play-time-open-ended="manager.changePlayTimeOpenEnded($event)"
      @change-last-played="manager.changeLastPlayed($event)"
      @change-genre="manager.changeGenre($event)"
      @toggle-secondary-genre="manager.toggleSecondaryGenre($event)"
      @toggle-game-mode="manager.toggleGameMode($event)"
      @change-shelf="manager.changeShelf($event)"
      @change-description="manager.changeDescription($event)"
      @save="manager.saveForm()"
      @cancel="manager.cancelForm()"
      @confirm-discard="manager.confirmDiscard()"
      @cancel-discard="manager.cancelDiscard()"
    />
    <GameDetail
      v-else-if="state.chosenGame !== null"
      :game="state.chosenGame"
      :shelf-name="chosenGameShelfName"
      :delete-state="state.deleteState"
      @played-today="manager.markChosenGamePlayedToday()"
      @edit="manager.editChosenGame()"
      @ask-delete="manager.askDeleteChosenGame()"
      @confirm-delete="manager.confirmDelete()"
      @cancel-delete="manager.cancelDelete()"
    />
  </main>

  <!-- Ansicht "Regale", genauso aufgebaut -->
  <main v-else-if="state.view === 'shelves'" class="content">
    <!-- Liste der Regale, links -->
    <ShelfList
      :shelves="shelves"
      :marked-shelf="shelfView.chosenShelf"
      @choose="manager.showShelfDetail($event)"
    />

    <!-- Rechts entweder das Formular oder das ausgewählte Regal -->
    <ShelfFormPanel
      v-if="shelfView.formOpen"
      :form="shelfView.form"
      @change-name="manager.changeShelfName($event)"
      @save="manager.saveShelfForm()"
      @cancel="manager.cancelShelfForm()"
    />
    <ShelfDetail
      v-else-if="shelfView.chosenShelf !== null"
      :shelf="shelfView.chosenShelf"
      :games="chosenShelfGames"
      :delete-state="shelfView.deleteState"
      @choose-game="manager.showGameFromShelf($event)"
      @rename="manager.renameChosenShelf()"
      @ask-delete="manager.askDeleteChosenShelf()"
      @confirm-delete="manager.confirmDeleteShelf()"
      @cancel-delete="manager.cancelDeleteShelf()"
    />
  </main>

  <!-- Ansicht "Spiel finden": links das Suchformular, rechts die passenden Spiele -->
  <main v-else class="content">
    <FindFormPanel
      :form="findView.form"
      @change-players="manager.changeFindPlayers($event)"
      @change-minutes="manager.changeFindMinutes($event)"
      @toggle-genre="manager.toggleFindGenre($event)"
      @toggle-mode="manager.toggleFindMode($event)"
      @find="manager.findGames()"
    />
    <FindResults :search="findView.search" :found="foundGames" />
  </main>
</template>
