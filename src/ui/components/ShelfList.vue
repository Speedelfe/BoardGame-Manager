<script setup lang="ts">
import type { Shelf } from '../../domain/Shelf'

defineProps<{
  shelves: Shelf[]
  markedShelf: Shelf | null
}>()

defineEmits<{
  choose: [shelf: Shelf]
}>()
</script>

<template>
  <!-- Sieht aus wie die Spieleliste und benutzt deshalb dieselben Stilregeln -->
  <ul class="game-list">
    <li v-for="shelf in shelves" :key="shelf.id.value">
      <button
        class="game-list-item"
        :class="{ marked: markedShelf !== null && markedShelf.id.equals(shelf.id) }"
        @click="$emit('choose', shelf)"
      >
        {{ shelf.name.text }}
      </button>
    </li>
  </ul>
</template>
