<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SearchBox from '../components/SearchBox.vue'
import Pagination from '../components/Pagination.vue'
import { supabase } from '../lib/supabaseClient'

const route = useRoute()
const router = useRouter()

const searchQuery = ref('')
const isLoading = ref(false)
const results = ref<
  Array<{
    id: string
    title: string
    author: string
    status: 'accepted' | 'in_review'
    updated_at: string
  }>
>([])

const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)

const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value))

const performSearch = async (query: string, page = 1) => {
  if (!query.trim()) {
    results.value = []
    totalItems.value = 0
    return
  }

  isLoading.value = true
  currentPage.value = page

  const from = (page - 1) * pageSize.value
  const to = from + pageSize.value - 1

  try {
    const { data, count, error } = await supabase
      .from('submissions')
      .select('id, title, status, updated_at, author:users(username)', { count: 'exact' })
      .or(`title.ilike.%${query}%,abstract.ilike.%${query}%,content_md.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .range(from, to)

    if (!error && data) {
      results.value = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        author: item.author?.username ? `@${item.author.username}` : '未知作者',
        status: item.status,
        updated_at: new Date(item.updated_at).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      }))
      totalItems.value = count || 0
    } else {
      results.value = []
      totalItems.value = 0
    }
  } catch {
    results.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

const handleSearch = (query: string) => {
  searchQuery.value = query
  router.replace({ query: { q: query } })
  performSearch(query, 1)
}

const handlePageChange = (page: number) => {
  performSearch(searchQuery.value, page)
}

onMounted(() => {
  const query = route.query.q as string
  if (query) {
    searchQuery.value = query
    performSearch(query)
  }
})

watch(
  () => route.query.q,
  (newQuery) => {
    if (newQuery && newQuery !== searchQuery.value) {
      searchQuery.value = newQuery as string
      performSearch(newQuery as string)
    }
  },
)
</script>

<template>
  <section class="space-y-6">
    <!-- Header -->
    <header class="fade-rise">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <div>
          <h1 class="font-serif text-2xl font-bold text-slate-900">搜索</h1>
          <p class="text-sm text-slate-500">搜索标题、摘要或正文内容</p>
        </div>
      </div>
    </header>

    <!-- Search Box -->
    <div class="card-surface p-6 fade-rise fade-rise-delay-1">
      <SearchBox
        :initial-value="searchQuery"
        placeholder="输入关键词搜索投稿..."
        @search="handleSearch"
      />
    </div>

    <!-- Results -->
    <div v-if="searchQuery" class="card-surface overflow-hidden fade-rise fade-rise-delay-2">
      <div class="border-b border-slate-100 p-4">
        <p class="text-sm text-slate-500">
          "<span class="font-medium text-slate-900">{{ searchQuery }}</span
          >" 的搜索结果
        </p>
      </div>

      <!-- Loading -->
      <template v-if="isLoading">
        <div
          v-for="index in 3"
          :key="index"
          class="flex items-center gap-4 border-b border-slate-100 p-5 last:border-b-0"
        >
          <div class="flex-1 space-y-3">
            <div class="skeleton-text h-5 w-2/3" />
            <div class="skeleton-text h-4 w-1/3" />
          </div>
          <div class="skeleton-text h-6 w-16 rounded-full" />
        </div>
      </template>

      <!-- Results List -->
      <template v-else-if="results.length > 0">
        <div
          v-for="item in results"
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
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                {{ item.author }}
              </span>
              <span class="text-slate-300">|</span>
              <span class="flex items-center gap-1">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {{ item.updated_at }}
              </span>
            </div>
          </div>

          <span
            class="badge shrink-0"
            :class="item.status === 'accepted' ? 'badge-success' : 'badge-warning'"
          >
            {{ item.status === 'accepted' ? '已发表' : '在审' }}
          </span>
        </div>

        <!-- Pagination -->
        <div class="border-t border-slate-100 p-4">
          <Pagination
            :current-page="currentPage"
            :total-pages="totalPages"
            :total-items="totalItems"
            :page-size="pageSize"
            @page-change="handlePageChange"
          />
        </div>
      </template>

      <!-- Empty State -->
      <div v-else class="empty-state py-16">
        <div class="empty-state-icon h-20 w-20">
          <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 class="font-serif text-lg font-semibold text-slate-900">未找到结果</h3>
        <p class="mt-1 text-sm text-slate-500">请尝试其他关键词</p>
      </div>
    </div>

    <!-- Initial State -->
    <div v-else class="card-surface p-12 text-center fade-rise fade-rise-delay-2">
      <div
        class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-500"
      >
        <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 class="mt-4 font-serif text-lg font-semibold text-slate-900">开始搜索</h3>
      <p class="mt-1 text-sm text-slate-500">输入关键词搜索投稿、作者或内容</p>
    </div>
  </section>
</template>
