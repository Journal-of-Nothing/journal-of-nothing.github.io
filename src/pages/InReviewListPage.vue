<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchSubmissionListWithMeta } from '../services/supabaseApi'

type ListItem = {
  id: string
  title: string
  author: string
  updatedAt: string
  status: string
  slots: number
  comments: number
  reviews: number
}

const items = ref<ListItem[]>([])
const isLoading = ref(true)

const errorMessage = ref('')

onMounted(async () => {
  const { data, error } = await fetchSubmissionListWithMeta('in_review')

  if (error) {
    errorMessage.value = '暂时无法加载在审列表'
    isLoading.value = false
    return
  }

  items.value =
    data?.map((row) => ({
      id: row.id,
      title: row.title,
      author: row.author?.username ? `@${row.author.username}` : '未知作者',
      updatedAt: new Date(row.updated_at).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      status: '在审',
      slots: row.slots_count ?? 0,
      comments: row.comments_count,
      reviews: row.reviews_count,
    })) ?? []
  isLoading.value = false
})
</script>

<template>
  <section class="space-y-6">
    <!-- Header -->
    <header class="fade-rise">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 class="font-serif text-2xl font-bold text-slate-900">{{ $t('list.inReviewTitle') }}</h1>
          <p class="text-sm text-slate-500">{{ $t('list.inReviewSubtitle') }}</p>
        </div>
      </div>
    </header>

    <!-- Error Message -->
    <p v-if="errorMessage" class="rounded-lg bg-amber-50 p-4 text-sm text-amber-700 fade-rise">
      {{ errorMessage }}
    </p>

    <!-- List -->
    <div class="card-surface overflow-hidden fade-rise fade-rise-delay-1">
      <template v-if="isLoading">
        <div
          v-for="index in 4"
          :key="index"
          class="flex items-center gap-4 border-b border-slate-100 p-5 last:border-b-0"
        >
          <div class="flex-1 space-y-3">
            <div class="skeleton-text h-5 w-2/3" />
            <div class="skeleton-text h-4 w-1/3" />
          </div>
          <div class="flex gap-4">
            <div class="skeleton-text h-8 w-20 rounded-full" />
            <div class="skeleton-text h-8 w-20 rounded-full" />
            <div class="skeleton-text h-8 w-20 rounded-full" />
          </div>
        </div>
      </template>
      
      <template v-else>
        <div
          v-for="item in items"
          :key="item.id"
          class="group flex flex-col gap-3 border-b border-slate-100 p-5 transition-colors hover:bg-slate-50/50 last:border-b-0 md:flex-row md:items-center md:justify-between"
        >
          <div class="min-w-0 flex-1 space-y-2">
            <router-link
              class="block truncate font-serif text-lg font-semibold text-slate-900 transition-colors group-hover:text-amber-700"
              :to="`/submissions/${item.id}`"
            >
              {{ item.title }}
            </router-link>
            <div class="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span class="flex items-center gap-1">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {{ item.author }}
              </span>
              <span class="text-slate-300">|</span>
              <span class="flex items-center gap-1">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ item.updatedAt }}
              </span>
              <span class="badge badge-warning">{{ $t('list.statusInReview') }}</span>
            </div>
          </div>
          
          <div class="flex items-center gap-3 text-sm">
            <span 
              class="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              :class="item.slots > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {{ item.slots }} 审稿槽
            </span>
            <span class="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
              <svg class="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {{ item.comments }}
            </span>
            <span class="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
              <svg class="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {{ item.reviews }}
            </span>
          </div>
        </div>
      </template>
      
      <!-- Empty State -->
      <div v-if="!isLoading && !items.length" class="empty-state py-16">
        <div class="empty-state-icon h-20 w-20">
          <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="font-serif text-lg font-semibold text-slate-900">暂无在审稿件</h3>
        <p class="mt-1 text-sm text-slate-500">当前没有在审的投稿</p>
      </div>
    </div>
  </section>
</template>
