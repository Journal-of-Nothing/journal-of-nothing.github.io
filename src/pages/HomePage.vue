<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../stores/auth'
import { fetchAnnouncements, fetchRecentActivities } from '../services/supabaseApi'
import siteConfig from '../../site.json'

type ActivityItem = { id: string; title: string; meta: string; status: 'in_review' | 'accepted' }
type AnnouncementItem = { id: string; title: string; excerpt: string; createdAt: string }

const { profile } = useAuth()
const isAdmin = computed(() => profile.value?.role === 'admin')
const heroImage = computed(() => siteConfig?.heroImage || '/journal_hero')
const siteName = computed(() => siteConfig?.name || 'Journal')

const isLoadingActivities = ref(true)
const isLoadingAnnouncements = ref(true)

const activities = ref<ActivityItem[]>([])
const announcements = ref<AnnouncementItem[]>([])

const activityError = ref('')
const announcementError = ref('')

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '刚刚'
  }
  return date.toLocaleDateString()
}

const toExcerpt = (value: string | null) => {
  if (!value) return ''
  return value
    .replace(/[#*_>`-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

onMounted(async () => {
  const [activityRes, announcementRes] = await Promise.all([
    fetchRecentActivities(),
    fetchAnnouncements(5),
  ])

  if (activityRes.error) {
    activityError.value = '暂时无法加载近期活动'
    isLoadingActivities.value = false
  } else {
    activities.value =
      activityRes.data?.map((row) => ({
        id: row.id,
        title: row.title,
        meta: `作者 ${row.author?.username ? `@${row.author.username}` : '未知作者'} · ${formatDate(row.updated_at)}`,
        status: row.status === 'accepted' ? 'accepted' : 'in_review',
      })) ?? []
    isLoadingActivities.value = false
  }

  if (announcementRes.error) {
    announcementError.value = '暂时无法加载公告'
    isLoadingAnnouncements.value = false
  } else {
    announcements.value =
      announcementRes.data?.map((row) => ({
        id: row.id,
        title: row.title,
        excerpt: toExcerpt(row.body_md),
        createdAt: formatDate(row.created_at),
      })) ?? []
    isLoadingAnnouncements.value = false
  }
})
</script>

<template>
  <section class="space-y-8">
    <header class="card-surface fade-rise overflow-hidden p-6 md:p-10">
      <div class="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
        <div class="space-y-4">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ $t('home.heroLead') }}</p>
          <h1 class="text-3xl font-semibold text-slate-900 md:text-5xl">{{ siteName }}</h1>
          <p class="text-sm text-slate-600 md:text-base">{{ $t('home.heroSubtitle') }}</p>
          <div class="flex flex-wrap items-center gap-3">
            <router-link
              class="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              to="/submit"
            >
              {{ $t('home.heroAction') }}
            </router-link>
            <span class="text-xs text-slate-500">{{ $t('home.subtitle') }}</span>
          </div>
        </div>
        <div class="relative h-48 overflow-hidden rounded-2xl border border-slate-200/70 sm:h-64">
          <img :src="heroImage" alt="Hero" class="h-full w-full object-cover" />
          <div
            class="absolute inset-0 bg-gradient-to-tr from-slate-950/20 via-transparent to-amber-200/20"
          />
        </div>
      </div>
    </header>

    <div class="grid items-start gap-6 lg:grid-cols-[1.4fr_0.9fr]">
      <section class="card-surface p-5">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-slate-900">{{ $t('home.recent') }}</h2>
          <span class="text-xs text-slate-500">{{ $t('home.updatedNow') }}</span>
        </div>
        <p v-if="activityError" class="mt-2 text-sm text-amber-600">{{ activityError }}</p>
        <ul class="mt-4 space-y-3">
          <template v-if="isLoadingActivities">
            <li
              v-for="index in 3"
              :key="index"
              class="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0"
            >
              <div class="space-y-2">
                <div class="skeleton-text h-4 w-48" />
                <div class="skeleton-text h-3 w-36" />
              </div>
              <div class="skeleton-text h-5 w-12" />
            </li>
          </template>
          <template v-else>
            <li
              v-for="activity in activities"
              :key="activity.id"
              class="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0"
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
          </template>
          <li
            v-if="!isLoadingActivities && !activities.length"
            class="py-6 text-center text-xs text-slate-400"
          >
            {{ $t('home.empty') }}
          </li>
        </ul>
      </section>

      <aside class="card-surface p-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-slate-900">{{ $t('home.announcements') }}</h2>
            <p class="text-xs text-slate-500">{{ $t('home.announcementsSubtitle') }}</p>
          </div>
          <router-link
            v-if="isAdmin"
            class="text-xs font-medium text-slate-600 hover:text-slate-900"
            to="/me"
          >
            {{ $t('user.adminAnnouncementEdit') }}
          </router-link>
        </div>
        <p v-if="announcementError" class="mt-2 text-sm text-amber-600">{{ announcementError }}</p>
        <ul class="mt-4 space-y-4">
          <template v-if="isLoadingAnnouncements">
            <li
              v-for="index in 3"
              :key="index"
              class="space-y-2 border-b border-slate-100 pb-4 last:border-b-0"
            >
              <div class="skeleton-text h-4 w-40" />
              <div class="skeleton-text h-3 w-28" />
              <div class="skeleton-text h-3 w-52" />
            </li>
          </template>
          <template v-else>
            <li
              v-for="item in announcements"
              :key="item.id"
              class="space-y-1 border-b border-slate-100 pb-4 last:border-b-0"
            >
              <p class="text-sm font-semibold text-slate-900">{{ item.title }}</p>
              <p v-if="item.excerpt" class="text-xs text-slate-600">{{ item.excerpt }}</p>
              <p class="text-[11px] text-slate-400">{{ item.createdAt }}</p>
            </li>
          </template>
          <li
            v-if="!isLoadingAnnouncements && !announcements.length"
            class="py-6 text-center text-xs text-slate-400"
          >
            {{ $t('home.announcementEmpty') }}
          </li>
        </ul>
      </aside>
    </div>
  </section>
</template>
