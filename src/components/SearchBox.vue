<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  placeholder?: string
  initialValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '搜索...',
  initialValue: '',
})

const emit = defineEmits<{
  search: [query: string]
  clear: []
}>()

const query = ref(props.initialValue)
const isFocused = ref(false)

watch(
  () => props.initialValue,
  (newVal) => {
    query.value = newVal
  },
)

const handleSearch = () => {
  if (query.value.trim()) {
    emit('search', query.value.trim())
  }
}

const handleClear = () => {
  query.value = ''
  emit('clear')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleSearch()
  }
}
</script>

<template>
  <div class="relative flex items-center" :class="{ 'ring-2 ring-amber-500/20': isFocused }">
    <div class="relative flex-1">
      <!-- Search Icon -->
      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <!-- Input -->
      <input
        v-model="query"
        type="text"
        :placeholder="placeholder"
        class="input-field w-full pl-10 pr-10"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keydown="handleKeydown"
      />

      <!-- Clear Button -->
      <button
        v-if="query"
        type="button"
        class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
        @click="handleClear"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Search Button -->
    <button type="button" class="btn-primary ml-2" @click="handleSearch">搜索</button>
  </div>
</template>
