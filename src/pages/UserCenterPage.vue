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
  <section class="space-y-6">
    <header class="space-y-2">
      <h1 class="text-2xl font-semibold text-slate-900">{{ $t('user.title') }}</h1>
      <p class="text-sm text-slate-500">{{ $t('user.subtitle') }}</p>
    </header>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="card-surface flex min-h-[160px] flex-col p-5">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">
          {{ $t('user.sectionProfile') }}
        </p>
        <p class="mt-3 text-lg font-semibold text-slate-900">
          {{ authUser?.user_metadata?.user_name || authUser?.email || $t('app.anonymous') }}
        </p>
        <p class="mt-2 text-sm text-slate-600">{{ $t('user.currentUser') }}</p>
      </div>
      <div class="card-surface flex min-h-[160px] flex-col p-5 text-sm">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">
          {{ $t('user.sectionPermissions') }}
        </p>
        <div class="mt-3 space-y-1 text-slate-700">
          <p>{{ $t('user.roleLabel', { role: profile?.role || $t('user.roleUnset') }) }}</p>
          <p>
            {{
              $t('user.canSubmit', {
                value: profile?.can_submit ? $t('user.valueAllow') : $t('user.valueDeny'),
              })
            }}
          </p>
          <p>
            {{
              $t('user.canReview', {
                value: profile?.can_review ? $t('user.valueAllow') : $t('user.valueDeny'),
              })
            }}
          </p>
          <p>
            {{
              $t('user.canComment', {
                value: profile?.can_comment ? $t('user.valueAllow') : $t('user.valueDeny'),
              })
            }}
          </p>
        </div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="card-surface flex min-h-[420px] flex-col p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-slate-900">{{ $t('user.mySubmissions') }}</h2>
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span>{{ $t('user.sortLabel') }}</span>
            <select
              v-model="submissionsOrderBy"
              class="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              <option value="updated_at">{{ $t('user.sortUpdated') }}</option>
              <option value="title">{{ $t('user.sortTitle') }}</option>
              <option value="status">{{ $t('user.sortStatus') }}</option>
            </select>
            <button
              class="rounded-full border border-slate-200 px-2 py-1 text-xs"
              @click="submissionsAscending = !submissionsAscending"
            >
              {{ submissionsAscending ? 'ASC' : 'DESC' }}
            </button>
          </div>
        </div>
        <p v-if="submissionsError" class="mt-2 text-sm text-amber-600">{{ submissionsError }}</p>
        <div class="mt-4 flex-1 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
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
                <tr v-for="item in submissionRows" :key="item.id" class="border-t border-slate-100">
                  <td class="px-4 py-3">
                    <router-link
                      class="font-medium text-slate-900 hover:text-slate-700"
                      :to="`/submissions/${item.id}`"
                    >
                      {{ item.title }}
                    </router-link>
                  </td>
                  <td class="px-4 py-3 text-xs text-slate-500">{{ item.status }}</td>
                  <td class="px-4 py-3 text-xs text-slate-500">
                    {{ formatDate(item.updated_at) }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
          <div
            v-if="!isLoadingSubmissions && !submissionRows.length"
            class="px-4 py-6 text-center text-xs text-slate-400"
          >
            {{ $t('user.emptySubmissions') }}
          </div>
        </div>
        <div class="mt-auto flex items-center justify-between pt-4 text-xs text-slate-500">
          <span>{{
            $t('user.pageInfo', { page: submissionsPage, total: submissionsTotalPages })
          }}</span>
          <div class="flex items-center gap-2">
            <button
              class="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50"
              :disabled="submissionsPage <= 1"
              @click="submissionsPage -= 1"
            >
              {{ $t('user.pagePrev') }}
            </button>
            <button
              class="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50"
              :disabled="submissionsPage >= submissionsTotalPages"
              @click="submissionsPage += 1"
            >
              {{ $t('user.pageNext') }}
            </button>
          </div>
        </div>
      </section>

      <section class="card-surface flex min-h-[420px] flex-col p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-slate-900">{{ $t('user.myReviews') }}</h2>
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span>{{ $t('user.sortLabel') }}</span>
            <select
              v-model="reviewsOrderBy"
              class="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              <option value="created_at">{{ $t('user.sortCreated') }}</option>
              <option value="status">{{ $t('user.sortStatus') }}</option>
            </select>
            <button
              class="rounded-full border border-slate-200 px-2 py-1 text-xs"
              @click="reviewsAscending = !reviewsAscending"
            >
              {{ reviewsAscending ? 'ASC' : 'DESC' }}
            </button>
          </div>
        </div>
        <p v-if="reviewsError" class="mt-2 text-sm text-amber-600">{{ reviewsError }}</p>
        <div class="mt-4 flex-1 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
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
                <tr v-for="item in reviewRows" :key="item.id" class="border-t border-slate-100">
                  <td class="px-4 py-3">
                    <router-link
                      class="font-medium text-slate-900 hover:text-slate-700"
                      :to="`/submissions/${item.submission_id}/review-opinions`"
                    >
                      {{ $t('review.defaultTitle') }} {{ item.id.slice(0, 6) }}
                    </router-link>
                  </td>
                  <td class="px-4 py-3 text-xs text-slate-500">{{ item.decision || '-' }}</td>
                  <td class="px-4 py-3 text-xs text-slate-500">
                    {{ formatDate(item.created_at) }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
          <div
            v-if="!isLoadingReviews && !reviewRows.length"
            class="px-4 py-6 text-center text-xs text-slate-400"
          >
            {{ $t('user.emptyReviews') }}
          </div>
        </div>
        <div class="mt-auto flex items-center justify-between pt-4 text-xs text-slate-500">
          <span>{{ $t('user.pageInfo', { page: reviewsPage, total: reviewsTotalPages }) }}</span>
          <div class="flex items-center gap-2">
            <button
              class="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50"
              :disabled="reviewsPage <= 1"
              @click="reviewsPage -= 1"
            >
              {{ $t('user.pagePrev') }}
            </button>
            <button
              class="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50"
              :disabled="reviewsPage >= reviewsTotalPages"
              @click="reviewsPage += 1"
            >
              {{ $t('user.pageNext') }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <section v-if="isAdmin" class="card-surface space-y-6 p-5">
      <div class="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div class="space-y-3 text-sm">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">
            {{ $t('user.adminTitle') }}
          </p>
          <input
            v-model="adminTargetId"
            class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            :placeholder="$t('user.adminUserId')"
          />
          <select
            v-model="adminRole"
            class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="author">作者</option>
            <option value="reviewer">审稿人</option>
            <option value="deputy_editor">副主编</option>
            <option value="admin">管理员</option>
          </select>
          <div class="flex flex-wrap items-center gap-4 text-xs">
            <label class="flex items-center gap-2">
              <input v-model="adminCanSubmit" type="checkbox" /> 投稿
            </label>
            <label class="flex items-center gap-2">
              <input v-model="adminCanReview" type="checkbox" /> 审稿
            </label>
            <label class="flex items-center gap-2">
              <input v-model="adminCanComment" type="checkbox" /> 评论
            </label>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-500">{{ adminMessage }}</span>
            <button
              class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
              @click="updatePermissions"
            >
              {{ $t('user.adminUpdate') }}
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">
              {{ $t('user.adminAnnouncements') }}
            </p>
            <span class="text-xs text-slate-500">{{ announcementMessage }}</span>
          </div>
          <input
            v-model="announcementTitle"
            class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            :placeholder="$t('user.adminAnnouncementTitle')"
          />
          <textarea
            v-model="announcementBody"
            class="min-h-[120px] w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            :placeholder="$t('user.adminAnnouncementBody')"
          />
          <div class="flex items-center gap-2">
            <button
              class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
              @click="saveAnnouncement"
            >
              {{
                editingAnnouncementId
                  ? $t('user.adminAnnouncementUpdate')
                  : $t('user.adminAnnouncementCreate')
              }}
            </button>
            <button
              v-if="editingAnnouncementId"
              class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              @click="cancelEditAnnouncement"
            >
              {{ $t('user.adminAnnouncementCancel') }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="announcementsError" class="text-sm text-amber-600">{{ announcementsError }}</p>
      <div class="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th class="px-4 py-3">{{ $t('user.tableTitle') }}</th>
              <th class="px-4 py-3">{{ $t('user.tableUpdated') }}</th>
              <th class="px-4 py-3">{{ $t('user.tableStatus') }}</th>
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
              <tr v-for="item in announcements" :key="item.id" class="border-t border-slate-100">
                <td class="px-4 py-3">
                  <p class="font-medium text-slate-900">{{ item.title }}</p>
                  <p v-if="item.body_md" class="text-xs text-slate-500">{{ item.body_md }}</p>
                </td>
                <td class="px-4 py-3 text-xs text-slate-500">{{ formatDate(item.updated_at) }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2 text-xs">
                    <button
                      class="rounded-full border border-slate-200 px-2 py-1"
                      @click="startEditAnnouncement(item)"
                    >
                      {{ $t('user.adminAnnouncementEdit') }}
                    </button>
                    <button
                      class="rounded-full border border-amber-200 px-2 py-1 text-amber-700"
                      @click="removeAnnouncement(item.id)"
                    >
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
          class="px-4 py-6 text-center text-xs text-slate-400"
        >
          {{ $t('user.adminAnnouncementEmpty') }}
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div class="flex items-center gap-2">
          <span>{{ $t('user.sortLabel') }}</span>
          <select
            v-model="announcementsOrderBy"
            class="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            <option value="created_at">{{ $t('user.sortCreated') }}</option>
            <option value="updated_at">{{ $t('user.sortUpdated') }}</option>
            <option value="title">{{ $t('user.sortTitle') }}</option>
          </select>
          <button
            class="rounded-full border border-slate-200 px-2 py-1 text-xs"
            @click="announcementsAscending = !announcementsAscending"
          >
            {{ announcementsAscending ? 'ASC' : 'DESC' }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <span>{{
            $t('user.pageInfo', { page: announcementsPage, total: announcementsTotalPages })
          }}</span>
          <button
            class="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50"
            :disabled="announcementsPage <= 1"
            @click="announcementsPage -= 1"
          >
            {{ $t('user.pagePrev') }}
          </button>
          <button
            class="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50"
            :disabled="announcementsPage >= announcementsTotalPages"
            @click="announcementsPage += 1"
          >
            {{ $t('user.pageNext') }}
          </button>
        </div>
      </div>
    </section>

    <button
      class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
      @click="handleSignOut"
    >
      {{ $t('user.signOut') }}
    </button>
  </section>
</template>
