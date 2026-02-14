<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../stores/auth'
import { fetchAnnouncements, fetchRecentActivities } from '../services/supabaseApi'
import siteConfig from '../../site.json'

type ActivityItem = {
  id: string
  title: string
  meta: string
  status: 'in_review' | 'accepted'
}

type AnnouncementItem = {
  id: string
  title: string
  excerpt: string
  createdAt: string
}

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

// Quick stats
const stats = computed(() => [
  { label: '已发表', value: activities.value.filter((a) => a.status === 'accepted').length },
  { label: '审稿中', value: activities.value.filter((a) => a.status === 'in_review').length },
  { label: '公告', value: announcements.value.length },
])

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
    <!-- Hero Section -->
    <header class="card-elevated fade-rise overflow-hidden p-6 md:p-10">
      <div class="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
        <div class="space-y-5">
          <p
            class="text-xs uppercase tracking-[0.3em] text-slate-500 fade-rise"
            style="animation-delay: 0.05s"
          >
            {{ $t('home.heroLead') }}
          </p>
          <h1
            class="font-serif text-3xl font-semibold text-slate-900 md:text-5xl fade-rise"
            style="animation-delay: 0.1s"
          >
            {{ siteName }}
          </h1>
          <p
            class="text-sm leading-relaxed text-slate-600 md:text-base fade-rise"
            style="animation-delay: 0.15s"
          >
            {{ $t('home.heroSubtitle') }}
          </p>
          <div class="flex flex-wrap items-center gap-4 fade-rise" style="animation-delay: 0.2s">
            <router-link class="btn-primary" to="/submit">
              {{ $t('home.heroAction') }}
            </router-link>
          </div>
          <p class="text-xs text-slate-400 fade-rise" style="animation-delay: 0.25s">
            {{ $t('home.subtitle') }}
          </p>
        </div>
        <div
          class="relative h-48 overflow-hidden rounded-2xl border border-slate-200/70 sm:h-64 fade-rise"
          style="animation-delay: 0.15s"
        >
          <img :src="heroImage" alt="Hero" class="h-full w-full object-cover" />
          <div
            class="absolute inset-0 bg-gradient-to-tr from-slate-950/20 via-transparent to-amber-200/20"
          />
        </div>
      </div>
    </header>

    <!-- Main Content Grid -->
    <div class="grid items-start gap-6 lg:grid-cols-[1.4fr_0.9fr]">
      <!-- Recent Activities -->
      <section class="card-surface p-6 fade-rise" style="animation-delay: 0.1s">
        <div class="flex items-center justify-between">
          <h2 class="font-serif text-lg font-semibold text-slate-900">{{ $t('home.recent') }}</h2>
          <span class="badge-info">{{ $t('home.updatedNow') }}</span>
        </div>

        <p v-if="activityError" class="mt-3 text-sm text-amber-600">{{ activityError }}</p>

        <ul class="mt-5 space-y-3">
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
              class="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0 transition-colors hover:bg-slate-50/50 rounded-lg px-2 -mx-2 py-1"
            >
              <div class="min-w-0 flex-1">
                <router-link
                  class="block truncate text-sm font-medium text-slate-900 hover:text-slate-700 transition-colors"
                  :to="`/submissions/${activity.id}`"
                >
                  {{ activity.title }}
                </router-link>
                <p class="text-xs text-slate-500 mt-0.5">{{ activity.meta }}</p>
              </div>
              <span
                :class="activity.status === 'accepted' ? 'badge-success' : 'badge-warning'"
                class="ml-3 flex-shrink-0"
              >
                {{ activity.status === 'accepted' ? '已发表' : '在审' }}
              </span>
            </li>
          </template>

          <!-- Empty State -->
          <li v-if="!isLoadingActivities && !activities.length" class="empty-state">
            <svg
              class="empty-state-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"
              />
            </svg>
            <p class="empty-state-title">暂无投稿</p>
            <p class="empty-state-desc">{{ $t('home.empty') }}</p>
          </li>
        </ul>
      </section>

      <!-- Announcements -->
      <aside class="card-surface p-6 fade-rise" style="animation-delay: 0.2s">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif text-lg font-semibold text-slate-900">
              {{ $t('home.announcements') }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ $t('home.announcementsSubtitle') }}</p>
          </div>
          <router-link
            v-if="isAdmin"
            class="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            to="/me"
          >
            {{ $t('user.adminAnnouncementEdit') }}
          </router-link>
        </div>

        <p v-if="announcementError" class="mt-3 text-sm text-amber-600">{{ announcementError }}</p>

        <ul class="mt-5 space-y-4">
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
              class="space-y-1.5 border-b border-slate-100 pb-4 last:border-b-0"
            >
              <p class="text-sm font-semibold text-slate-900">{{ item.title }}</p>
              <p v-if="item.excerpt" class="text-xs text-slate-600 line-clamp-2">
                {{ item.excerpt }}
              </p>
              <p class="text-[11px] text-slate-400">{{ item.createdAt }}</p>
            </li>
          </template>

          <!-- Empty State -->
          <li v-if="!isLoadingAnnouncements && !announcements.length" class="empty-state">
            <svg
              class="empty-state-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
              />
            </svg>
            <p class="empty-state-title">暂无公告</p>
            <p class="empty-state-desc">{{ $t('home.announcementEmpty') }}</p>
          </li>
        </ul>
      </aside>
    </div>

    <!-- Quick Stats Section -->
    <section class="card-elevated p-6 fade-rise" style="animation-delay: 0.3s">
      <h3 class="font-serif text-base font-semibold text-slate-900 mb-4">快速统计</h3>
      <div class="grid grid-cols-3 gap-4">
        <div
          v-for="(stat, index) in stats"
          :key="stat.label"
          class="text-center p-4 rounded-xl bg-slate-50/50 border border-slate-100 transition-all hover:bg-slate-100/50 hover:shadow-sm"
          :style="{ animationDelay: `${0.35 + index * 0.05}s` }"
        >
          <p class="font-serif text-2xl font-bold text-slate-900">{{ stat.value }}</p>
          <p class="text-xs text-slate-500 mt-1">{{ stat.label }}</p>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
/* Card Styles */
.card-elevated {
  background: white;
  border-radius: 1rem;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.02),
    0 4px 8px rgba(0, 0, 0, 0.03),
    0 8px 16px rgba(0, 0, 0, 0.03),
    0 16px 32px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.card-surface {
  background: white;
  border-radius: 0.875rem;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.02),
    0 4px 12px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(226, 232, 240, 0.6);
}

/* Button Styles */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.1);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  background: white;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}

/* Badge Styles */
.badge-success {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 500;
  color: #047857;
  background: #ecfdf5;
  border-radius: 9999px;
  border: 1px solid #a7f3d0;
}

.badge-warning {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 500;
  color: #b45309;
  background: #fffbeb;
  border-radius: 9999px;
  border: 1px solid #fde68a;
}

.badge-info {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 500;
  color: #0369a1;
  background: #f0f9ff;
  border-radius: 9999px;
  border: 1px solid #bae6fd;
}

/* Empty State Styles */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1rem;
  text-align: center;
}

.empty-state-icon {
  width: 3rem;
  height: 3rem;
  color: #cbd5e1;
  margin-bottom: 0.75rem;
}

.empty-state-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  margin-bottom: 0.25rem;
}

.empty-state-desc {
  font-size: 0.75rem;
  color: #94a3b8;
  max-width: 16rem;
}

/* Animation */
.fade-rise {
  animation: fadeRise 0.5s ease-out both;
}

@keyframes fadeRise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Skeleton */
.skeleton-text {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 0.25rem;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Line Clamp */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Font Serif */
.font-serif {
  font-family: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;
}
</style>
