<script setup lang="ts">
interface Props {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  pageChange: [page: number]
}>()

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('pageChange', page)
  }
}

const getPageNumbers = () => {
  const pages: (number | string)[] = []
  const delta = 2

  for (let i = 1; i <= props.totalPages; i++) {
    if (
      i === 1 ||
      i === props.totalPages ||
      (i >= props.currentPage - delta && i <= props.currentPage + delta)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return pages
}
</script>

<template>
  <div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
    <!-- Info -->
    <p class="text-sm text-slate-500">
      显示第
      <span class="font-medium text-slate-900">{{ (currentPage - 1) * pageSize + 1 }}</span> 到
      <span class="font-medium text-slate-900">{{
        Math.min(currentPage * pageSize, totalItems)
      }}</span>
      条， 共 <span class="font-medium text-slate-900">{{ totalItems }}</span> 条
    </p>

    <!-- Pagination -->
    <nav class="flex items-center gap-1">
      <!-- Previous -->
      <button
        :disabled="currentPage === 1"
        class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-all hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        @click="goToPage(currentPage - 1)"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <!-- Page Numbers -->
      <template v-for="(page, index) in getPageNumbers()" :key="index">
        <button
          v-if="page !== '...'"
          :class="[
            'flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-3 text-sm font-medium transition-all',
            currentPage === page
              ? 'border border-amber-500 bg-amber-50 text-amber-700'
              : 'border border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50',
          ]"
          @click="goToPage(page as number)"
        >
          {{ page }}
        </button>
        <span v-else class="px-2 text-slate-400">...</span>
      </template>

      <!-- Next -->
      <button
        :disabled="currentPage === totalPages"
        class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-all hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        @click="goToPage(currentPage + 1)"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  </div>
</template>
