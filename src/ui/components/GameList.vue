<script setup lang="ts">
import type { Game } from '../../domain/Game'

defineProps<{
  games: Game[]
  markedGame: Game | null
}>()

defineEmits<{
  choose: [game: Game]
}>()
</script>

<template>
  <ul class="game-list">
    <li v-for="game in games" :key="game.id.value">
      <button
        class="game-list-item"
        :class="{ marked: markedGame !== null && markedGame.id.equals(game.id) }"
        @click="$emit('choose', game)"
      >
        {{ game.name.text }}
      </button>
    </li>
  </ul>
</template>
