<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncementsPage,
  fetchUserReviewOpinionsPage,
  fetchUserSubmissionsPage,
  updateAnnouncement,
  updateUserPermissions,
} from '../services/supabaseApi'
import type { AnnouncementRecord } from '../types/domain'

const router = useRouter()
const { user, profile, signOut } = useAuth()
const { t } = useI18n()
const authUser = computed(() => user.value)
const isAdmin = computed(() => profile.value?.role === 'admin')

// Tab navigation
const activeTab = ref<'submissions' | 'reviews'>('submissions')
const adminActiveTab = ref<'permissions' | 'announcements'>('permissions')

const adminTargetId = ref('')
const adminRole = ref<'author' | 'reviewer' | 'deputy_editor' | 'admin'>('author')
const adminCanSubmit = ref(true)
const adminCanReview = ref(true)
const adminCanComment = ref(true)
const adminMessage = ref('')

const submissionRows = ref<
  Array<{ id: string; title: string; status: string; updated_at: string }>
>([])
const reviewRows = ref<
  Array<{
    id: string
    submission_id: string
    status: string
    decision: string | null
    created_at: string
  }>
>([])

const submissionsPage = ref(1)
const submissionsPageSize = 5
const submissionsOrderBy = ref<'updated_at' | 'status' | 'title'>('updated_at')
const submissionsAscending = ref(false)
const submissionsCount = ref(0)
const submissionsError = ref('')
const isLoadingSubmissions = ref(true)

const reviewsPage = ref(1)
const reviewsPageSize = 5
const reviewsOrderBy = ref<'created_at' | 'status'>('created_at')
const reviewsAscending = ref(false)
const reviewsCount = ref(0)
const reviewsError = ref('')
const isLoadingReviews = ref(true)

const announcementsPage = ref(1)
const announcementsPageSize = 5
const announcementsOrderBy = ref<'created_at' | 'updated_at' | 'title'>('created_at')
const announcementsAscending = ref(false)
const announcementsCount = ref(0)
const announcementsError = ref('')
const isLoadingAnnouncements = ref(true)
const announcements = ref<AnnouncementRecord[]>([])

const announcementTitle = ref('')
const announcementBody = ref('')
const editingAnnouncementId = ref<string | null>(null)
const announcementMessage = ref('')

const submissionsTotalPages = computed(() =>
  Math.max(1, Math.ceil(submissionsCount.value / submissionsPageSize)),
)
const reviewsTotalPages = computed(() =>
  Math.max(1, Math.ceil(reviewsCount.value / reviewsPageSize)),
)
const announcementsTotalPages = computed(() =>
  Math.max(1, Math.ceil(announcementsCount.value / announcementsPageSize)),
)

const formatDate = (value: string) => new Date(value).toLocaleDateString()

const getStatusBadgeClass = (status: string): string => {
  const statusMap: Record<string, string> = {
    'submitted': 'badge-info',
    'in_review': 'badge-warning',
    'reviewed': 'badge-info',
    'accepted': 'badge-success',
    'rejected': 'badge-error',
    'published': 'badge-success',
    'pending': 'badge-neutral',
    'approved': 'badge-success',
    'declined': 'badge-error',
    'major_revision': 'badge-warning',
    'minor_revision': 'badge-warning',
  }
  return statusMap[status.toLowerCase()] || 'badge-neutral'
}

const handleSignOut = async () => {
  await signOut()
  router.replace('/login')
}

const updatePermissions = async () => {
  adminMessage.value = ''
  if (!adminTargetId.value.trim()) {
    adminMessage.value = t('user.adminMissingId')
    return
  }
  const { error } = await updateUserPermissions({
    id: adminTargetId.value.trim(),
    role: adminRole.value,
    can_submit: adminCanSubmit.value,
    can_review: adminCanReview.value,
    can_comment: adminCanComment.value,
  })
  if (error) {
    adminMessage.value = error.message
    return
  }
  adminMessage.value = t('user.adminUpdated')
}

const loadSubmissions = async () => {
  if (!authUser.value) return
  isLoadingSubmissions.value = true
  submissionsError.value = ''
  const { data, count, error } = await fetchUserSubmissionsPage({
    authorId: authUser.value.id,
    page: submissionsPage.value,
    pageSize: submissionsPageSize,
    orderBy: submissionsOrderBy.value,
    ascending: submissionsAscending.value,
  })

  if (error) {
    submissionsError.value = error.message
  }

  submissionRows.value = data ?? []
  submissionsCount.value = count
  isLoadingSubmissions.value = false
}

const loadReviews = async () => {
  if (!authUser.value) return
  isLoadingReviews.value = true
  reviewsError.value = ''
  const { data, count, error } = await fetchUserReviewOpinionsPage({
    reviewerId: authUser.value.id,
    page: reviewsPage.value,
    pageSize: reviewsPageSize,
    orderBy: reviewsOrderBy.value,
    ascending: reviewsAscending.value,
  })

  if (error) {
    reviewsError.value = error.message
  }

  reviewRows.value = data ?? []
  reviewsCount.value = count
  isLoadingReviews.value = false
}

const loadAnnouncements = async () => {
  if (!isAdmin.value) return
  isLoadingAnnouncements.value = true
  announcementsError.value = ''
  const { data, count, error } = await fetchAnnouncementsPage({
    page: announcementsPage.value,
    pageSize: announcementsPageSize,
    orderBy: announcementsOrderBy.value,
    ascending: announcementsAscending.value,
  })

  if (error) {
    announcementsError.value = error.message
  }

  announcements.value = data ?? []
  announcementsCount.value = count
  isLoadingAnnouncements.value = false
}

const resetAnnouncementForm = () => {
  announcementTitle.value = ''
  announcementBody.value = ''
  editingAnnouncementId.value = null
}

const saveAnnouncement = async () => {
  announcementMessage.value = ''
  if (!announcementTitle.value.trim()) {
    announcementMessage.value = t('user.adminAnnouncementMissingTitle')
    return
  }

  if (editingAnnouncementId.value) {
    const { error } = await updateAnnouncement(editingAnnouncementId.value, {
      title: announcementTitle.value.trim(),
      body_md: announcementBody.value.trim() || null,
    })
    if (error) {
      announcementMessage.value = error.message
      return
    }
  } else {
    const { error } = await createAnnouncement({
      title: announcementTitle.value.trim(),
      body_md: announcementBody.value.trim() || null,
    })
    if (error) {
      announcementMessage.value = error.message
      return
    }
  }

  announcementMessage.value = t('user.adminAnnouncementSaved')
  resetAnnouncementForm()
  await loadAnnouncements()
}

const startEditAnnouncement = (item: AnnouncementRecord) => {
  editingAnnouncementId.value = item.id
  announcementTitle.value = item.title
  announcementBody.value = item.body_md ?? ''
}

const cancelEditAnnouncement = () => {
  resetAnnouncementForm()
}

const removeAnnouncement = async (id: string) => {
  announcementMessage.value = ''
  const { error } = await deleteAnnouncement(id)
  if (error) {
    announcementMessage.value = error.message
    return
  }
  await loadAnnouncements()
}

watch([authUser, submissionsPage, submissionsOrderBy, submissionsAscending], () => {
  if (authUser.value) {
    loadSubmissions()
  }
})

watch([authUser, reviewsPage, reviewsOrderBy, reviewsAscending], () => {
  if (authUser.value) {
    loadReviews()
  }
})

watch([isAdmin, announcementsPage, announcementsOrderBy, announcementsAscending], () => {
  if (isAdmin.value) {
    loadAnnouncements()
  }
})

onMounted(() => {
  if (authUser.value) {
    loadSubmissions()
    loadReviews()
  }
  if (isAdmin.value) {
    loadAnnouncements()
  }
})
</script>

<template>
  <section class="space-y-8">
    <!-- Header -->
    <header class="fade-rise">
      <h1 class="font-serif text-3xl font-bold text-slate-900">{{ $t('user.title') }}</h1>
      <p class="mt-2 text-sm text-slate-500">{{ $t('user.subtitle') }}</p>
    </header>

    <!-- Profile Cards -->
    <div class="grid gap-6 md:grid-cols-2">
      <div class="card-elevated flex min-h-[160px] flex-col p-6 fade-rise fade-rise-delay-1">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {{ $t('user.sectionProfile') }}
          </p>
        </div>
        <p class="mt-4 font-serif text-xl font-semibold text-slate-900">
          {{ authUser?.user_metadata?.user_name || authUser?.email || $t('app.anonymous') }}
        </p>
        <p class="mt-1 text-sm text-slate-600">{{ $t('user.currentUser') }}</p>
      </div>

      <div class="card-surface flex min-h-[160px] flex-col p-6 fade-rise fade-rise-delay-1">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {{ $t('user.sectionPermissions') }}
          </p>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-slate-500">{{ $t('user.roleLabel', { role: '' }) }}</span>
            <span class="badge" :class="profile?.role === 'admin' ? 'badge-success' : 'badge-neutral'">
              {{ profile?.role || $t('user.roleUnset') }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-500">{{ $t('user.canSubmit', { value: '' }) }}</span>
            <span class="badge" :class="profile?.can_submit ? 'badge-success' : 'badge-neutral'">
              {{ profile?.can_submit ? $t('user.valueAllow') : $t('user.valueDeny') }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-500">{{ $t('user.canReview', { value: '' }) }}</span>
            <span class="badge" :class="profile?.can_review ? 'badge-success' : 'badge-neutral'">
              {{ profile?.can_review ? $t('user.valueAllow') : $t('user.valueDeny') }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-500">{{ $t('user.canComment', { value: '' }) }}</span>
            <span class="badge" :class="profile?.can_comment ? 'badge-success' : 'badge-neutral'">
              {{ profile?.can_comment ? $t('user.valueAllow') : $t('user.valueDeny') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="fade-rise fade-rise-delay-2">
      <div class="flex items-center gap-1 border-b border-slate-200">
        <button
          class="relative px-4 py-3 text-sm font-medium transition-colors"
          :class="activeTab === 'submissions' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'"
          @click="activeTab = 'submissions'"
        >
          <span class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            {{ $t('user.mySubmissions') }}
          </span>
          <span
            v-if="activeTab === 'submissions'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
          />
        </button>
        <button
          class="relative px-4 py-3 text-sm font-medium transition-colors"
          :class="activeTab === 'reviews' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'"
          @click="activeTab = 'reviews'"
        >
          <span class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><path d="m4 8 16-4"/><path d="m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8"/></svg>
            {{ $t('user.myReviews') }}
          </span>
          <span
            v-if="activeTab === 'reviews'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
          />
        </button>
      </div>
    </div>

    <!-- Submissions Tab -->
    <section v-if="activeTab === 'submissions'" class="card-surface flex min-h-[420px] flex-col p-6 fade-rise fade-rise-delay-2">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h2 class="font-serif text-lg font-semibold text-slate-900">{{ $t('user.mySubmissions') }}</h2>
        <div class="flex items-center gap-3 text-sm">
          <span class="text-slate-500">{{ $t('user.sortLabel') }}</span>
          <select
            v-model="submissionsOrderBy"
            class="select-field w-auto min-w-[120px]"
          >
            <option value="updated_at">{{ $t('user.sortUpdated') }}</option>
            <option value="title">{{ $t('user.sortTitle') }}</option>
            <option value="status">{{ $t('user.sortStatus') }}</option>
          </select>
          <button
            class="btn-ghost px-3 py-2"
            @click="submissionsAscending = !submissionsAscending"
          >
            <svg v-if="submissionsAscending" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
          </button>
        </div>
      </div>
      <p v-if="submissionsError" class="mt-3 text-sm text-amber-600">{{ submissionsError }}</p>
      <div class="mt-4 flex-1 overflow-hidden rounded-xl border border-slate-200/70 bg-white">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-4 py-3">{{ $t('user.tableTitle') }}</th>
              <th class="px-4 py-3">{{ $t('user.tableStatus') }}</th>
              <th class="px-4 py-3">{{ $t('user.tableUpdated') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isLoadingSubmissions">
              <tr v-for="index in 3" :key="index" class="border-t border-slate-100">
                <td class="px-4 py-3"><div class="skeleton-text h-4 w-32" /></td>
                <td class="px-4 py-3"><div class="skeleton-text h-4 w-16" /></td>
                <td class="px-4 py-3"><div class="skeleton-text h-4 w-20" /></td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="item in submissionRows" :key="item.id" class="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                <td class="px-4 py-3">
                  <router-link
                    class="font-medium text-slate-900 transition-colors hover:text-amber-700"
                    :to="`/submissions/${item.id}`"
                  >
                    {{ item.title }}
                  </router-link>
                </td>
                <td class="px-4 py-3">
                  <span class="badge capitalize" :class="getStatusBadgeClass(item.status)">
                    {{ item.status }}
                  </span>
                </td>
                <td class="px-4 py-3 text-slate-500">
                  {{ formatDate(item.updated_at) }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <div
          v-if="!isLoadingSubmissions && !submissionRows.length"
          class="empty-state"
        >
          <div class="empty-state-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <p class="text-sm text-slate-500">{{ $t('user.emptySubmissions') }}</p>
        </div>
      </div>
      <div class="mt-auto flex items-center justify-between pt-4 text-sm">
        <span class="text-slate-500">{{
          $t('user.pageInfo', { page: submissionsPage, total: submissionsTotalPages })
        }}</span>
        <div class="flex items-center gap-2">
          <button
            class="btn-ghost px-3 py-2 disabled:opacity-50"
            :disabled="submissionsPage <= 1"
            @click="submissionsPage -= 1"
          >
            {{ $t('user.pagePrev') }}
          </button>
          <button
            class="btn-ghost px-3 py-2 disabled:opacity-50"
            :disabled="submissionsPage >= submissionsTotalPages"
            @click="submissionsPage += 1"
          >
            {{ $t('user.pageNext') }}
          </button>
        </div>
      </div>
    </section>

    <!-- Reviews Tab -->
    <section v-if="activeTab === 'reviews'" class="card-surface flex min-h-[420px] flex-col p-6 fade-rise fade-rise-delay-2">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h2 class="font-serif text-lg font-semibold text-slate-900">{{ $t('user.myReviews') }}</h2>
        <div class="flex items-center gap-3 text-sm">
          <span class="text-slate-500">{{ $t('user.sortLabel') }}</span>
          <select
            v-model="reviewsOrderBy"
            class="select-field w-auto min-w-[120px]"
          >
            <option value="created_at">{{ $t('user.sortCreated') }}</option>
            <option value="status">{{ $t('user.sortStatus') }}</option>
          </select>
          <button
            class="btn-ghost px-3 py-2"
            @click="reviewsAscending = !reviewsAscending"
          >
            <svg v-if="reviewsAscending" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
          </button>
        </div>
      </div>
      <p v-if="reviewsError" class="mt-3 text-sm text-amber-600">{{ reviewsError }}</p>
      <div class="mt-4 flex-1 overflow-hidden rounded-xl border border-slate-200/70 bg-white">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-4 py-3">{{ $t('user.tableTitle') }}</th>
              <th class="px-4 py-3">{{ $t('user.tableDecision') }}</th>
              <th class="px-4 py-3">{{ $t('user.tableCreated') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isLoadingReviews">
              <tr v-for="index in 3" :key="index" class="border-t border-slate-100">
                <td class="px-4 py-3"><div class="skeleton-text h-4 w-32" /></td>
                <td class="px-4 py-3"><div class="skeleton-text h-4 w-16" /></td>
                <td class="px-4 py-3"><div class="skeleton-text h-4 w-20" /></td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="item in reviewRows" :key="item.id" class="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                <td class="px-4 py-3">
                  <router-link
                    class="font-medium text-slate-900 transition-colors hover:text-amber-700"
                    :to="`/submissions/${item.submission_id}/review-opinions`"
                  >
                    {{ $t('review.defaultTitle') }} {{ item.id.slice(0, 6) }}
                  </router-link>
                </td>
                <td class="px-4 py-3">
                  <span v-if="item.decision" class="badge capitalize" :class="getStatusBadgeClass(item.decision)">
                    {{ item.decision }}
                  </span>
                  <span v-else class="badge badge-neutral">-</span>
                </td>
                <td class="px-4 py-3 text-slate-500">
                  {{ formatDate(item.created_at) }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <div
          v-if="!isLoadingReviews && !reviewRows.length"
          class="empty-state"
        >
          <div class="empty-state-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><path d="m4 8 16-4"/><path d="m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8"/></svg>
          </div>
          <p class="text-sm text-slate-500">{{ $t('user.emptyReviews') }}</p>
        </div>
      </div>
      <div class="mt-auto flex items-center justify-between pt-4 text-sm">
        <span class="text-slate-500">{{
          $t('user.pageInfo', { page: reviewsPage, total: reviewsTotalPages })
        }}</span>
        <div class="flex items-center gap-2">
          <button
            class="btn-ghost px-3 py-2 disabled:opacity-50"
            :disabled="reviewsPage <= 1"
            @click="reviewsPage -= 1"
          >
            {{ $t('user.pagePrev') }}
          </button>
          <button
            class="btn-ghost px-3 py-2 disabled:opacity-50"
            :disabled="reviewsPage >= reviewsTotalPages"
            @click="reviewsPage += 1"
          >
            {{ $t('user.pageNext') }}
          </button>
        </div>
      </div>
    </section>

    <!-- Admin Section -->
    <section v-if="isAdmin" class="card-elevated space-y-6 p-6 fade-rise fade-rise-delay-3">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
        </div>
        <div>
          <h2 class="font-serif text-lg font-semibold text-slate-900">{{ $t('user.adminTitle') }}</h2>
          <p class="text-xs text-slate-500">管理系统权限和公告</p>
        </div>
      </div>

      <!-- Admin Tabs -->
      <div class="flex items-center gap-1 border-b border-slate-200">
        <button
          class="relative px-4 py-2 text-sm font-medium transition-colors"
          :class="adminActiveTab === 'permissions' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'"
          @click="adminActiveTab = 'permissions'"
        >
          <span class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m22 21-3-3"/><path d="m16 15 3 3"/></svg>
            权限管理
          </span>
          <span
            v-if="adminActiveTab === 'permissions'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
          />
        </button>
        <button
          class="relative px-4 py-2 text-sm font-medium transition-colors"
          :class="adminActiveTab === 'announcements' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'"
          @click="adminActiveTab = 'announcements'"
        >
          <span class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            {{ $t('user.adminAnnouncements') }}
          </span>
          <span
            v-if="adminActiveTab === 'announcements'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
          />
        </button>
      </div>

      <!-- Permissions Tab -->
      <div v-if="adminActiveTab === 'permissions'" class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <input
            v-model="adminTargetId"
            class="input-field"
            :placeholder="$t('user.adminUserId')"
          />
          <select
            v-model="adminRole"
            class="select-field"
          >
            <option value="author">作者</option>
            <option value="reviewer">审稿人</option>
            <option value="deputy_editor">副主编</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        <div class="flex flex-wrap items-center gap-6 rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm">
          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="adminCanSubmit" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <span class="text-slate-700">允许投稿</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="adminCanReview" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <span class="text-slate-700">允许审稿</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="adminCanComment" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <span class="text-slate-700">允许评论</span>
          </label>
        </div>
        <div class="flex items-center justify-between">
          <span v-if="adminMessage" class="text-sm" :class="adminMessage.includes('error') || adminMessage.includes('失败') ? 'text-rose-600' : 'text-emerald-600'">{{ adminMessage }}</span>
          <span v-else class="text-sm text-slate-400">更新用户权限设置</span>
          <button
            class="btn-primary"
            @click="updatePermissions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {{ $t('user.adminUpdate') }}
          </button>
        </div>
      </div>

      <!-- Announcements Tab -->
      <div v-if="adminActiveTab === 'announcements'" class="space-y-4">
        <div class="space-y-3">
          <input
            v-model="announcementTitle"
            class="input-field"
            :placeholder="$t('user.adminAnnouncementTitle')"
          />
          <textarea
            v-model="announcementBody"
            class="textarea-field min-h-[120px]"
            :placeholder="$t('user.adminAnnouncementBody')"
          />
          <div class="flex items-center gap-3">
            <button
              class="btn-primary"
              @click="saveAnnouncement"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {{
                editingAnnouncementId
                  ? $t('user.adminAnnouncementUpdate')
                  : $t('user.adminAnnouncementCreate')
              }}
            </button>
            <button
              v-if="editingAnnouncementId"
              class="btn-secondary"
              @click="cancelEditAnnouncement"
            >
              {{ $t('user.adminAnnouncementCancel') }}
            </button>
            <span v-if="announcementMessage" class="ml-auto text-sm" :class="announcementMessage.includes('error') || announcementMessage.includes('失败') ? 'text-rose-600' : 'text-emerald-600'">{{ announcementMessage }}</span>
          </div>
        </div>

        <div class="section-divider my-4" />

        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="font-serif text-base font-semibold text-slate-900">公告列表</h3>
          <div class="flex items-center gap-2 text-sm">
            <select
              v-model="announcementsOrderBy"
              class="select-field w-auto min-w-[100px]"
            >
              <option value="created_at">{{ $t('user.sortCreated') }}</option>
              <option value="updated_at">{{ $t('user.sortUpdated') }}</option>
              <option value="title">{{ $t('user.sortTitle') }}</option>
            </select>
            <button
              class="btn-ghost px-2 py-2"
              @click="announcementsAscending = !announcementsAscending"
            >
              <svg v-if="announcementsAscending" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
            </button>
          </div>
        </div>

        <p v-if="announcementsError" class="text-sm text-amber-600">{{ announcementsError }}</p>

        <div class="overflow-hidden rounded-xl border border-slate-200/70 bg-white">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-4 py-3">{{ $t('user.tableTitle') }}</th>
                <th class="px-4 py-3">{{ $t('user.tableUpdated') }}</th>
                <th class="px-4 py-3 text-right">{{ $t('user.tableStatus') }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="isLoadingAnnouncements">
                <tr v-for="index in 3" :key="index" class="border-t border-slate-100">
                  <td class="px-4 py-3"><div class="skeleton-text h-4 w-32" /></td>
                  <td class="px-4 py-3"><div class="skeleton-text h-4 w-20" /></td>
                  <td class="px-4 py-3"><div class="skeleton-text h-4 w-16" /></td>
                </tr>
              </template>
              <template v-else>
                <tr v-for="item in announcements" :key="item.id" class="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                  <td class="px-4 py-3">
                    <p class="font-medium text-slate-900">{{ item.title }}</p>
                    <p v-if="item.body_md" class="mt-1 line-clamp-1 text-xs text-slate-500">{{ item.body_md }}</p>
                  </td>
                  <td class="px-4 py-3 text-xs text-slate-500">{{ formatDate(item.updated_at) }}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        class="btn-ghost px-2 py-1 text-xs"
                        @click="startEditAnnouncement(item)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        {{ $t('user.adminAnnouncementEdit') }}
                      </button>
                      <button
                        class="btn-ghost px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        @click="removeAnnouncement(item.id)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        {{ $t('user.adminAnnouncementDelete') }}
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
          <div
            v-if="!isLoadingAnnouncements && !announcements.length"
            class="empty-state"
          >
            <div class="empty-state-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </div>
            <p class="text-sm text-slate-500">{{ $t('user.adminAnnouncementEmpty') }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span class="text-slate-500">{{
            $t('user.pageInfo', { page: announcementsPage, total: announcementsTotalPages })
          }}</span>
          <div class="flex items-center gap-2">
            <button
              class="btn-ghost px-3 py-2 disabled:opacity-50"
              :disabled="announcementsPage <= 1"
              @click="announcementsPage -= 1"
            >
              {{ $t('user.pagePrev') }}
            </button>
            <button
              class="btn-ghost px-3 py-2 disabled:opacity-50"
              :disabled="announcementsPage >= announcementsTotalPages"
              @click="announcementsPage += 1"
            >
              {{ $t('user.pageNext') }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Sign Out -->
    <div class="flex justify-end fade-rise fade-rise-delay-3">
      <button
        class="btn-secondary"
        @click="handleSignOut"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
        {{ $t('user.signOut') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
