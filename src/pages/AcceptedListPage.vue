<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchSubmissionListWithMeta } from '../services/supabaseApi'

type ListItem = {
  id: string
  title: string
  author: string
  updatedAt: string
  tags: string[]
  comments: number
  reviews: number
}

const items = ref<ListItem[]>([])
const isLoading = ref(true)

const errorMessage = ref('')

onMounted(async () => {
  const { data, error } = await fetchSubmissionListWithMeta('accepted')

  if (error) {
    errorMessage.value = '暂时无法加载已发表列表'
    isLoading.value = false
    return
  }

  items.value =
    data?.map((row) => ({
      id: row.id,
      title: row.title,
      author: row.author?.username ? `@${row.author.username}` : '未知作者',
      updatedAt: new Date(row.updated_at).toLocaleDateString(),
      tags: ['Accepted'],
      comments: row.comments_count,
      reviews: row.reviews_count,
    })) ?? []
  isLoading.value = false
})
</script>

<template>
  <section class="space-y-4">
    <header class="space-y-2">
      <h1 class="text-xl font-semibold text-slate-900">{{ $t('list.acceptedTitle') }}</h1>
      <p class="text-sm text-slate-600">{{ $t('list.acceptedSubtitle') }}</p>
    </header>

    <p v-if="errorMessage" class="text-sm text-amber-600">{{ errorMessage }}</p>

    <div class="rounded-lg border border-slate-200 bg-white">
      <template v-if="isLoading">
        <div
          v-for="index in 4"
          :key="index"
          class="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0"
        >
          <div class="skeleton-text h-4 w-56" />
          <div class="skeleton-text h-3 w-40" />
        </div>
      </template>
      <template v-else>
        <div
          v-for="item in items"
          :key="item.id"
          class="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0 md:flex-row md:items-center md:justify-between"
        >
          <div class="space-y-2">
            <router-link
              class="text-base font-semibold text-slate-900 hover:text-slate-700"
              :to="`/submissions/${item.id}`"
            >
              {{ item.title }}
            </router-link>
            <div class="flex flex-wrap gap-2 text-sm text-slate-500">
              <span>{{ item.author }}</span>
              <span>{{ $t('list.updatedAt', { date: item.updatedAt }) }}</span>
              <span
                v-for="tag in item.tags"
                :key="tag"
                class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
              >
                {{ tag === 'Accepted' ? $t('list.tagAccepted') : tag }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-3 text-xs text-slate-500">
            <span class="flex items-center gap-1">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {{ $t('list.comments') }}
              {{ item.comments }}
            </span>
            <span class="flex items-center gap-1">
              <span class="h-1.5 w-1.5 rounded-full bg-indigo-500" /> {{ $t('list.reviews') }}
              {{ item.reviews }}
            </span>
          </div>
        </div>
      </template>
      <div v-if="!isLoading && !items.length" class="px-4 py-8 text-center text-sm text-slate-400">
        {{ $t('list.emptyAccepted') }}
      </div>
    </div>
  </section>
</template>
