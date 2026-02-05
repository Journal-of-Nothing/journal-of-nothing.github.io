<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchRecentActivities, fetchStats } from '../services/supabaseApi'

type StatItem = { label: string; value: string }
type ActivityItem = { id: string; title: string; meta: string; status: 'in_review' | 'accepted' }

const defaultStats: StatItem[] = [
  { label: '已发表', value: '128' },
  { label: '在审', value: '42' },
  { label: '活跃审稿人', value: '17' },
  { label: '本周评论', value: '64' },
]

const stats = ref<StatItem[]>([...defaultStats])

const isLoadingStats = ref(true)
const isLoadingActivities = ref(true)

const activities = ref<ActivityItem[]>([])

const errorMessage = ref('')

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '刚刚'
  }
  return date.toLocaleDateString()
}

onMounted(async () => {
  const { data, error } = await fetchStats()

  if (error) {
    errorMessage.value = '暂时无法加载统计数据'
    isLoadingStats.value = false
  } else {
    const statMap = new Map<string, string>()
    data?.forEach((row) => {
      const raw = row.value as { value?: unknown } | number | string | null
      const normalized =
        typeof raw === 'number'
          ? raw
          : typeof raw === 'string'
            ? raw
            : raw?.value ?? raw
      statMap.set(row.key, String(normalized ?? '0'))
    })

    stats.value = [
      { label: '已发表', value: statMap.get('accepted') || defaultStats[0]?.value || '0' },
      { label: '在审', value: statMap.get('in_review') || defaultStats[1]?.value || '0' },
      { label: '活跃审稿人', value: statMap.get('reviewers') || defaultStats[2]?.value || '0' },
      { label: '本周评论', value: statMap.get('weekly_comments') || defaultStats[3]?.value || '0' },
    ]
    isLoadingStats.value = false
  }

  const activityRes = await fetchRecentActivities()
  if (activityRes.error) {
    errorMessage.value = errorMessage.value || '暂时无法加载近期活动'
    isLoadingActivities.value = false
    return
  }

  activities.value =
    activityRes.data?.map((row) => ({
      id: row.id,
      title: row.title,
      meta: `作者 ${row.author?.username ? `@${row.author.username}` : '未知作者'} · ${formatDate(row.updated_at)}`,
      status: row.status === 'accepted' ? 'accepted' : 'in_review',
    })) ?? []
  isLoadingActivities.value = false
})
</script>

<template>
  <section class="space-y-4">
    <header class="space-y-1">
      <h1 class="text-lg font-semibold text-slate-900">{{ $t('home.title') }}</h1>
      <p class="text-xs text-slate-500">{{ $t('home.subtitle') }}</p>
    </header>

    <p v-if="errorMessage" class="text-sm text-amber-600">{{ errorMessage }}</p>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div v-if="isLoadingStats" v-for="index in 4" :key="index" class="rounded-lg border border-slate-200 bg-white p-3">
        <div class="skeleton-text h-3 w-16" />
        <div class="skeleton-text mt-2 h-6 w-20" />
      </div>
      <div
        v-else
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-lg border border-slate-200 bg-white p-3"
      >
        <p class="text-xs text-slate-500">{{ stat.label }}</p>
        <p class="mt-1 text-xl font-semibold text-slate-900">{{ stat.value }}</p>
      </div>
    </div>

    <div class="grid gap-4">
      <section class="rounded-lg border border-slate-200 bg-white p-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-slate-900">{{ $t('home.recent') }}</h2>
          <span class="text-xs text-slate-500">{{ $t('home.updatedNow') }}</span>
        </div>
        <ul class="mt-3 space-y-3">
          <li v-if="isLoadingActivities" v-for="index in 3" :key="index" class="flex items-center justify-between border-b border-slate-100 pb-2 last:border-b-0">
            <div class="space-y-2">
              <div class="skeleton-text h-4 w-48" />
              <div class="skeleton-text h-3 w-36" />
            </div>
            <div class="skeleton-text h-5 w-12" />
          </li>
          <li
            v-else
            v-for="activity in activities"
            :key="activity.id"
            class="flex items-center justify-between border-b border-slate-100 pb-2 last:border-b-0"
          >
            <div>
              <router-link
                class="text-sm font-medium text-slate-900 hover:text-slate-700"
                :to="`/submissions/${activity.id}`"
              >
                {{ activity.title }}
              </router-link>
              <p class="text-xs text-slate-500">{{ activity.meta }}</p>
            </div>
            <span
              class="rounded-full px-2 py-0.5 text-[11px] font-medium"
              :class="
                activity.status === 'accepted'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              "
            >
              {{ activity.status === 'accepted' ? '已发表' : '在审' }}
            </span>
          </li>
          <li v-if="!isLoadingActivities && !activities.length" class="py-6 text-center text-xs text-slate-400">
            {{ $t('home.empty') }}
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>
