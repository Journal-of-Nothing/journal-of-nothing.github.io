<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import {
  claimReviewSlot,
  fetchComments,
  fetchReviewOpinions,
  fetchReviewSlots,
  fetchSubmissionDetail,
  updateSubmissionContent,
  updateSubmissionDecision,
} from '../services/supabaseApi'
import { useAuth } from '../stores/auth'
import MarkdownEditor from '../components/MarkdownEditor.vue'
import { renderMarkdown } from '../lib/markdown'

const route = useRoute()
const { t } = useI18n()
const submissionTitle = ref('')
const submissionMeta = ref(t('detail.meta', { author: `@${t('detail.unknownAuthor')}`, date: '—' }))
const submissionStatus = ref(t('detail.statusInReview'))
const submissionStatusCode = ref<'submitted' | 'in_review' | 'accepted' | 'rejected'>('in_review')
const submissionAbstract = ref('')
const submissionContent = ref('')
const authorName = ref('')
const keywords = ref<string[]>([])
const submittedAt = ref('2025-01-10')
const acceptedAt = ref('—')
const versionLabel = ref('—')
const versionMajor = ref(1)
const versionMinor = ref(0)
const editKeywordsInput = ref('')
const versionChangeType = ref<'minor' | 'major'>('minor')
const submissionIdRef = ref<string | null>(null)
const authorId = ref<string | null>(null)
const editTitle = ref('')
const editAbstract = ref('')
const editContent = ref('')
const editMessage = ref('')
const decisionState = ref<'pending' | 'revise' | 'rejected' | 'accepted'>('pending')
const decisionRevisionType = ref<'minor' | 'major'>('major')
const decisionMessage = ref('')
const reviewSlots = ref<
  { id: string; status: string; reviewerId: string | null; dueAt: string | null }[]
>([])
const slotMessage = ref('')
const comments = ref<{ id: string; title: string; author: string; time: string }[]>([])
const reviewOpinions = ref<{ id: string; title: string; author: string; time: string }[]>([])

const errorMessage = ref('')
const noticeMessage = ref('')
const isLoading = ref(true)
const { user, profile } = useAuth()
const isAuthor = computed(() => user.value && authorId.value && user.value.id === authorId.value)
const isStaff = computed(
  () => profile.value?.role === 'admin' || profile.value?.role === 'deputy_editor',
)
const decisionButtonClass = computed(() => {
  if (decisionState.value === 'accepted') return 'btn-primary bg-emerald-600 hover:bg-emerald-700'
  if (decisionState.value === 'rejected') return 'btn-primary bg-rose-600 hover:bg-rose-700'
  if (decisionState.value === 'revise') return 'btn-primary bg-amber-600 hover:bg-amber-700'
  return 'btn-primary'
})
const renderedAbstract = computed(() => renderMarkdown(submissionAbstract.value))
const renderedContent = computed(() => renderMarkdown(submissionContent.value))

const resolveDecisionState = (
  status: 'submitted' | 'in_review' | 'accepted' | 'rejected',
  decision: 'accept' | 'minor' | 'major' | 'reject' | null | undefined,
) => {
  if (status === 'accepted') return 'accepted'
  if (status === 'rejected') return 'rejected'
  if (decision === 'major' || decision === 'minor') return 'revise'
  return 'pending'
}

const resolveRevisionType = (
  decision: 'accept' | 'minor' | 'major' | 'reject' | null | undefined,
) => (decision === 'minor' ? 'minor' : 'major')

const resolveStatusLabel = (
  status: 'submitted' | 'in_review' | 'accepted' | 'rejected',
  decision: 'accept' | 'minor' | 'major' | 'reject' | null | undefined,
) => {
  if (status === 'accepted') return t('detail.statusAccepted')
  if (status === 'rejected') return t('detail.statusRejected')
  if (decision === 'major' || decision === 'minor') return t('detail.statusRevise')
  return t('detail.statusInReview')
}

const resolveMeta = (author: string, updatedAt: string) =>
  t('detail.meta', { author, date: updatedAt })

onMounted(async () => {
  const submissionId = route.params.id as string
  submissionIdRef.value = submissionId

  const { data: submission, error: submissionError } = await fetchSubmissionDetail(submissionId)

  if (!submissionError && submission) {
    submissionTitle.value = submission.title
    authorName.value = submission.author?.username
      ? `@${submission.author.username}`
      : `@${t('detail.unknownAuthor')}`
    authorId.value = submission.author_id ?? null
    submissionMeta.value = resolveMeta(
      authorName.value,
      new Date(submission.updated_at).toLocaleDateString(),
    )
    submissionStatus.value = resolveStatusLabel(submission.status, submission.decision)
    submissionStatusCode.value = submission.status
    submissionAbstract.value = submission.abstract || t('detail.emptyAbstract')
    submissionContent.value = submission.content_md || t('detail.emptyContent')
    keywords.value = submission.keywords ?? []
    versionMajor.value = submission.version_major ?? 1
    versionMinor.value = submission.version_minor ?? 0
    versionLabel.value = submission.version_label || '—'
    decisionState.value = resolveDecisionState(submission.status, submission.decision)
    decisionRevisionType.value = resolveRevisionType(submission.decision)
    editTitle.value = submission.title
    editAbstract.value = submission.abstract || ''
    editContent.value = submission.content_md || ''
    editKeywordsInput.value = (submission.keywords ?? []).join(', ')
    submittedAt.value = submission.created_at
      ? new Date(submission.created_at).toLocaleDateString()
      : '—'
    acceptedAt.value = submission.accepted_at
      ? new Date(submission.accepted_at).toLocaleDateString()
      : '—'
  }
  isLoading.value = false

  const { data: issueData, error: issueError } = await fetchComments(submissionId)

  if (!issueError && issueData?.length) {
    comments.value = issueData.map((row) => ({
      id: row.id,
      title: row.body_md?.slice(0, 40) || t('comments.defaultTitle'),
      author: row.author?.username ? `@${row.author.username}` : t('comments.anonymous'),
      time: new Date(row.created_at).toLocaleDateString(),
    }))
  } else if (issueError && !noticeMessage.value) {
    noticeMessage.value = t('detail.partialDiscussion')
  }

  const { data: prData, error: prError } = await fetchReviewOpinions(submissionId)

  if (!prError && prData?.length) {
    reviewOpinions.value = prData.map((row) => ({
      id: row.id,
      title: row.body_md?.slice(0, 40) || t('review.defaultTitle'),
      author: row.reviewer?.username ? `@${row.reviewer.username}` : t('review.reviewerFallback'),
      time: new Date(row.created_at).toLocaleDateString(),
    }))
  } else if (prError && !noticeMessage.value) {
    noticeMessage.value = t('detail.partialReviews')
  }

  if (submissionError && !submission) {
    errorMessage.value = t('detail.partialFallback')
  }

  const { data: slotData } = await fetchReviewSlots(submissionId)
  reviewSlots.value =
    slotData?.map((slot) => ({
      id: slot.id,
      status: slot.status,
      reviewerId: slot.reviewer_id ?? null,
      dueAt: slot.due_at,
    })) ?? []
})

const saveEdits = async () => {
  editMessage.value = ''
  if (!submissionIdRef.value) return
  const next =
    versionChangeType.value === 'major'
      ? { major: versionMajor.value + 1, minor: 0 }
      : { major: versionMajor.value, minor: versionMinor.value + 1 }
  const dateLabel = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const nextLabel = `${dateLabel}_V${next.major}.${next.minor}`
  const keywordsList = editKeywordsInput.value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const { error } = await updateSubmissionContent(submissionIdRef.value, {
    title: editTitle.value.trim(),
    abstract: editAbstract.value.trim(),
    content_md: editContent.value.trim(),
    keywords: keywordsList,
    version_major: next.major,
    version_minor: next.minor,
    version_label: nextLabel,
  })
  if (error) {
    editMessage.value = error.message
    return
  }
  submissionTitle.value = editTitle.value
  submissionAbstract.value = editAbstract.value
  submissionContent.value = editContent.value
  keywords.value = keywordsList
  versionMajor.value = next.major
  versionMinor.value = next.minor
  versionLabel.value = nextLabel
  editMessage.value = t('detail.editSaved')
}

const submitDecision = async () => {
  decisionMessage.value = ''
  if (!submissionIdRef.value) return
  const payload: Parameters<typeof updateSubmissionDecision>[1] =
    decisionState.value === 'accepted'
      ? { status: 'accepted' as const, decision: 'accept' as const }
      : decisionState.value === 'rejected'
        ? { status: 'rejected' as const, decision: 'reject' as const }
        : decisionState.value === 'revise'
          ? { status: 'in_review' as const, decision: decisionRevisionType.value }
          : { status: 'in_review' as const, decision: null }

  const { error } = await updateSubmissionDecision(submissionIdRef.value, payload)
  if (error) {
    decisionMessage.value = error.message
    return
  }
  decisionMessage.value = t('detail.decisionUpdated')
  submissionStatus.value = resolveStatusLabel(payload.status, payload.decision)
  submissionStatusCode.value = payload.status
}

const claimSlot = async (slotId: string) => {
  slotMessage.value = ''
  if (!user.value) {
    slotMessage.value = t('detail.slotLogin')
    return
  }
  if (profile.value && !profile.value.can_review) {
    slotMessage.value = t('detail.slotNoPermission')
    return
  }
  const { error } = await claimReviewSlot(slotId, user.value.id)
  if (error) {
    slotMessage.value = error.message
    return
  }
  const { data } = await fetchReviewSlots(submissionIdRef.value || '')
  reviewSlots.value =
    data?.map((slot) => ({
      id: slot.id,
      status: slot.status,
      reviewerId: slot.reviewer_id ?? null,
      dueAt: slot.due_at,
    })) ?? reviewSlots.value
}
</script>

<template>
  <section class="space-y-8">
    <!-- Header -->
    <header class="card-surface fade-rise overflow-hidden">
      <div class="border-b border-slate-200/80 px-6 py-6 md:px-8 md:py-7">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="flex-1">
            <h1 class="font-serif text-2xl font-semibold text-slate-900 md:text-3xl">
              {{ submissionTitle }}
            </h1>
            <p class="mt-2 text-sm text-slate-500">{{ submissionMeta }}</p>
          </div>
          <span
            class="badge shrink-0"
            :class="
              submissionStatusCode === 'accepted'
                ? 'badge-success'
                : submissionStatusCode === 'rejected'
                  ? 'badge-error'
                  : 'badge-warning'
            "
          >
            {{ submissionStatus }}
          </span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-1 px-6 py-3 md:px-8">
        <router-link class="nav-link" :to="`/submissions/${route.params.id}`">
          {{ $t('detail.tabContent') }}
        </router-link>
        <router-link class="nav-link" :to="`/submissions/${route.params.id}/comments`">
          {{ $t('detail.tabComments') }}
        </router-link>
        <router-link class="nav-link" :to="`/submissions/${route.params.id}/review-opinions`">
          {{ $t('detail.tabReviews') }}
        </router-link>
      </div>
    </header>

    <!-- Messages -->
    <div class="space-y-3">
      <p
        v-if="errorMessage"
        class="fade-rise rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-600/20"
      >
        {{ errorMessage }}
      </p>
      <p
        v-if="noticeMessage"
        class="fade-rise rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-600/10"
      >
        {{ noticeMessage }}
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-[3fr_1fr]">
      <!-- Main Content -->
      <div class="space-y-6">
        <!-- Loading Skeleton -->
        <article v-if="isLoading" class="card-surface fade-rise p-6 md:p-8">
          <div class="space-y-8">
            <div class="space-y-3">
              <div class="skeleton-text h-5 w-24" />
              <div class="skeleton-text h-4 w-full" />
              <div class="skeleton-text h-4 w-5/6" />
            </div>
            <div class="space-y-3">
              <div class="skeleton-text h-5 w-32" />
              <div class="flex flex-wrap gap-2">
                <div class="skeleton h-6 w-16 rounded-full" />
                <div class="skeleton h-6 w-20 rounded-full" />
                <div class="skeleton h-6 w-14 rounded-full" />
              </div>
            </div>
            <div class="space-y-3">
              <div class="skeleton-text h-5 w-28" />
              <div class="skeleton h-40 w-full rounded-lg" />
            </div>
          </div>
        </article>

        <!-- Content Article -->
        <article v-else class="card-surface fade-rise p-6 md:p-8">
          <div class="space-y-8">
            <!-- Abstract -->
            <section class="fade-rise-delay-1">
              <h2 class="font-serif text-lg font-semibold text-slate-900">
                {{ $t('detail.summary') }}
              </h2>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="mt-3 text-sm leading-relaxed text-slate-600" v-html="renderedAbstract" />
            </section>

            <div class="section-divider" />

            <!-- Keywords -->
            <section class="fade-rise-delay-1">
              <h2 class="font-serif text-lg font-semibold text-slate-900">
                {{ $t('detail.keywords') }}
              </h2>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="tag in keywords"
                  :key="tag"
                  class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-600/10"
                >
                  {{ tag }}
                </span>
                <span v-if="!keywords.length" class="text-sm text-slate-400">
                  {{ $t('detail.emptyKeywords') }}
                </span>
              </div>
            </section>

            <div class="section-divider" />

            <!-- Content -->
            <section class="fade-rise-delay-2">
              <h2 class="font-serif text-lg font-semibold text-slate-900">
                {{ $t('detail.content') }}
              </h2>
              <div
                class="journal-content mt-4 whitespace-pre-wrap rounded-lg border border-slate-200/80 bg-slate-50/80 p-5 text-sm leading-relaxed text-slate-700"
              >
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div v-html="renderedContent" />
              </div>
            </section>
          </div>
        </article>

        <!-- Edit Form -->
        <article
          v-if="
            isAuthor && submissionStatusCode !== 'accepted' && submissionStatusCode !== 'rejected'
          "
          class="card-surface fade-rise fade-rise-delay-2 overflow-hidden"
        >
          <div class="border-b border-slate-200/80 px-6 py-4 md:px-8">
            <h2 class="font-serif text-lg font-semibold text-slate-900">
              {{ $t('detail.editTitle') }}
            </h2>
          </div>
          <div class="space-y-5 p-6 md:p-8">
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">{{
                $t('detail.editLabelTitle')
              }}</label>
              <input v-model="editTitle" class="input-field" />
            </div>
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">{{
                $t('detail.editLabelAbstract')
              }}</label>
              <MarkdownEditor v-model="editAbstract" :height="200" />
            </div>
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">{{
                $t('detail.editLabelContent')
              }}</label>
              <MarkdownEditor v-model="editContent" :height="300" />
            </div>
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">{{
                $t('detail.editLabelKeywords')
              }}</label>
              <input
                v-model="editKeywordsInput"
                class="input-field"
                :placeholder="$t('submit.placeholderKeywords')"
              />
            </div>
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">{{
                $t('detail.editLabelVersion')
              }}</label>
              <select v-model="versionChangeType" class="select-field">
                <option value="minor">{{ $t('detail.editOptionMinor') }}</option>
                <option value="major">{{ $t('detail.editOptionMajor') }}</option>
              </select>
              <p class="mt-2 text-xs text-slate-500">
                {{ $t('detail.editCurrentVersion', { version: versionLabel }) }}
              </p>
            </div>
            <div class="flex items-center justify-between pt-2">
              <span
                class="text-sm"
                :class="
                  editMessage.includes('Saved') || editMessage.includes('保存')
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                "
                >{{ editMessage }}</span
              >
              <button class="btn-primary" @click="saveEdits">
                {{ $t('detail.editSave') }}
              </button>
            </div>
          </div>
        </article>
      </div>

      <!-- Sidebar -->
      <aside class="space-y-6">
        <!-- Review Slots -->
        <div class="card-surface fade-rise fade-rise-delay-1 p-5">
          <h2 class="font-serif text-base font-semibold text-slate-900">
            {{ $t('detail.slotsTitle') }}
          </h2>
          <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg bg-emerald-50 px-3 py-2 text-center">
              <span class="block text-lg font-semibold text-emerald-700">
                {{ reviewSlots.filter((slot) => slot.status === 'open').length }}
              </span>
              <span class="text-xs text-emerald-600">{{
                $t('detail.slotsOpenLabel') || 'Open'
              }}</span>
            </div>
            <div class="rounded-lg bg-slate-100 px-3 py-2 text-center">
              <span class="block text-lg font-semibold text-slate-700">
                {{ reviewSlots.filter((slot) => slot.status === 'claimed').length }}
              </span>
              <span class="text-xs text-slate-600">{{
                $t('detail.slotsClaimedLabel') || 'Claimed'
              }}</span>
            </div>
          </div>
          <div class="mt-4 space-y-2">
            <button
              v-for="slot in reviewSlots"
              :key="slot.id"
              class="w-full rounded-lg border px-3 py-2.5 text-sm transition-all duration-200"
              :class="
                slot.status === 'open'
                  ? 'btn-secondary border-dashed'
                  : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
              "
              :disabled="slot.status !== 'open'"
              @click="claimSlot(slot.id)"
            >
              <span class="flex items-center justify-between">
                <span>{{
                  slot.status === 'open' ? $t('detail.slotClaim') : $t('detail.slotClaimed')
                }}</span>
                <span v-if="slot.dueAt" class="text-xs text-slate-400">
                  {{ $t('detail.slotDue', { date: new Date(slot.dueAt).toLocaleDateString() }) }}
                </span>
              </span>
            </button>
            <p v-if="slotMessage" class="text-xs text-rose-600">{{ slotMessage }}</p>
          </div>
        </div>

        <!-- Author Info -->
        <div class="card-surface fade-rise fade-rise-delay-2 p-5">
          <h2 class="font-serif text-base font-semibold text-slate-900">
            {{ $t('detail.authorTitle') }}
          </h2>
          <div class="mt-4">
            <p class="font-medium text-slate-900">{{ authorName }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ $t('detail.authorMeta') }}</p>
          </div>
        </div>

        <!-- Keywords Cloud -->
        <div class="card-surface fade-rise fade-rise-delay-2 p-5">
          <h2 class="font-serif text-base font-semibold text-slate-900">
            {{ $t('detail.keywords') }}
          </h2>
          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="keyword in keywords"
              :key="keyword"
              class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-600/10"
            >
              {{ keyword }}
            </span>
            <span v-if="!keywords.length" class="text-sm text-slate-400">—</span>
          </div>
        </div>

        <!-- Timeline -->
        <div class="card-surface fade-rise fade-rise-delay-3 p-5 text-sm">
          <h2 class="font-serif text-base font-semibold text-slate-900">
            {{ $t('detail.timeTitle') }}
          </h2>
          <div class="mt-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-slate-500">{{ $t('detail.timeSubmitted') }}</span>
              <span class="font-medium text-slate-900">{{ submittedAt }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">{{ $t('detail.timeAccepted') }}</span>
              <span class="font-medium text-slate-900">{{ acceptedAt }}</span>
            </div>
          </div>
        </div>

        <!-- Decision Panel (Staff Only) -->
        <div v-if="isStaff" class="card-surface fade-rise fade-rise-delay-3 overflow-hidden p-5">
          <h2 class="font-serif text-base font-semibold text-slate-900">
            {{ $t('detail.decisionTitle') }}
          </h2>
          <div class="mt-4 space-y-4">
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">{{
                $t('detail.decisionLabel')
              }}</label>
              <select v-model="decisionState" class="select-field">
                <option value="pending">{{ $t('detail.decisionPending') }}</option>
                <option value="revise">{{ $t('detail.decisionRevise') }}</option>
                <option value="rejected">{{ $t('detail.decisionReject') }}</option>
                <option value="accepted">{{ $t('detail.decisionAccept') }}</option>
              </select>
              <p class="mt-1.5 text-xs text-slate-500">{{ $t('detail.decisionDefaultHint') }}</p>
            </div>
            <div v-if="decisionState === 'revise'">
              <label class="mb-2 block text-sm font-medium text-slate-700">{{
                $t('detail.decisionRevisionType')
              }}</label>
              <select v-model="decisionRevisionType" class="select-field">
                <option value="minor">{{ $t('detail.decisionMinor') }}</option>
                <option value="major">{{ $t('detail.decisionMajor') }}</option>
              </select>
            </div>
            <div class="flex items-center justify-between pt-2">
              <span
                class="text-xs"
                :class="
                  decisionMessage.includes('Updated') || decisionMessage.includes('更新')
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                "
                >{{ decisionMessage }}</span
              >
              <button
                class="px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all duration-200"
                :class="decisionButtonClass"
                @click="submitDecision"
              >
                {{ $t('detail.decisionUpdate') }}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
