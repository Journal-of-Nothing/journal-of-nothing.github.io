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
  if (decisionState.value === 'accepted') return 'bg-emerald-600 hover:bg-emerald-700'
  if (decisionState.value === 'rejected') return 'bg-rose-600 hover:bg-rose-700'
  if (decisionState.value === 'revise') return 'bg-amber-600 hover:bg-amber-700'
  return 'bg-slate-600 hover:bg-slate-700'
})

const resolveDecisionState = (
  status: 'submitted' | 'in_review' | 'accepted' | 'rejected',
  decision: 'accept' | 'minor' | 'major' | 'reject' | null | undefined,
) => {
  if (status === 'accepted') return 'accepted'
  if (status === 'rejected') return 'rejected'
  if (decision === 'major' || decision === 'minor') return 'revise'
  return 'pending'
}

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
  const payload =
    decisionState.value === 'accepted'
      ? { status: 'accepted' as const, decision: 'accept' as const }
      : decisionState.value === 'rejected'
        ? { status: 'rejected' as const, decision: 'reject' as const }
        : decisionState.value === 'revise'
          ? { status: 'in_review' as const, decision: 'major' as const }
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
  <section class="space-y-6">
    <header class="rounded-lg border border-slate-200 bg-white">
      <div class="border-b border-slate-200 px-6 py-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-slate-900">{{ submissionTitle }}</h1>
            <p class="mt-1 text-sm text-slate-500">{{ submissionMeta }}</p>
          </div>
          <span
            class="rounded-full px-3 py-1 text-xs font-medium"
            :class="
              submissionStatusCode === 'accepted'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            "
          >
            {{ submissionStatus }}
          </span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-6 px-6 py-3 text-sm text-slate-500">
        <span class="font-medium text-slate-700">{{ $t('detail.tabContent') }}</span>
        <router-link
          class="text-slate-500 hover:text-slate-700"
          :to="`/submissions/${route.params.id}/comments`"
        >
          {{ $t('detail.tabComments') }}
        </router-link>
        <router-link
          class="text-slate-500 hover:text-slate-700"
          :to="`/submissions/${route.params.id}/review-opinions`"
        >
          {{ $t('detail.tabReviews') }}
        </router-link>
      </div>
    </header>

    <p v-if="errorMessage" class="text-sm text-amber-600">{{ errorMessage }}</p>
    <p v-if="noticeMessage" class="text-sm text-slate-500">{{ noticeMessage }}</p>

    <div class="grid gap-6 lg:grid-cols-[3fr_1fr]">
      <div class="space-y-6">
        <article v-if="isLoading" class="rounded-lg border border-slate-200 bg-white">
          <div class="space-y-6 px-6 py-5">
            <div class="skeleton-text h-4 w-20" />
            <div class="skeleton-text h-3 w-full" />
            <div class="skeleton-text h-4 w-24" />
            <div class="skeleton-text h-3 w-2/3" />
            <div class="skeleton-text h-4 w-20" />
            <div class="skeleton h-32" />
          </div>
        </article>
        <article v-else class="rounded-lg border border-slate-200 bg-white">
          <div class="space-y-6 px-6 py-5">
            <section>
              <h3 class="text-base font-semibold text-slate-900">{{ $t('detail.summary') }}</h3>
              <p class="mt-2 text-sm text-slate-600">
                {{ submissionAbstract }}
              </p>
            </section>
            <section>
              <h3 class="text-base font-semibold text-slate-900">{{ $t('detail.keywords') }}</h3>
              <div class="mt-2 flex flex-wrap gap-2">
                <span
                  v-for="tag in keywords"
                  :key="tag"
                  class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                >
                  {{ tag }}
                </span>
                <span v-if="!keywords.length" class="text-sm text-slate-400">{{
                  $t('detail.emptyKeywords')
                }}</span>
              </div>
            </section>
            <section>
              <h3 class="text-base font-semibold text-slate-900">{{ $t('detail.content') }}</h3>
              <div
                class="mt-2 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
              >
                {{ submissionContent }}
              </div>
            </section>
          </div>
        </article>

        <article
          v-if="isAuthor && submissionStatus !== '已发表' && submissionStatus !== '拒稿'"
          class="rounded-lg border border-slate-200 bg-white"
        >
          <div class="border-b border-slate-200 px-6 py-4">
            <h3 class="text-base font-semibold text-slate-900">{{ $t('detail.editTitle') }}</h3>
          </div>
          <div class="space-y-4 px-6 py-5 text-sm">
            <div>
              <label class="text-slate-500">{{ $t('detail.editLabelTitle') }}</label>
              <input
                v-model="editTitle"
                class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label class="text-slate-500">{{ $t('detail.editLabelAbstract') }}</label>
              <textarea
                v-model="editAbstract"
                rows="3"
                class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label class="text-slate-500">{{ $t('detail.editLabelContent') }}</label>
              <textarea
                v-model="editContent"
                rows="6"
                class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label class="text-slate-500">{{ $t('detail.editLabelKeywords') }}</label>
              <input
                v-model="editKeywordsInput"
                class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2"
                :placeholder="$t('submit.placeholderKeywords')"
              />
            </div>
            <div>
              <label class="text-slate-500">{{ $t('detail.editLabelVersion') }}</label>
              <select
                v-model="versionChangeType"
                class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2"
              >
                <option value="minor">{{ $t('detail.editOptionMinor') }}</option>
                <option value="major">{{ $t('detail.editOptionMajor') }}</option>
              </select>
              <p class="mt-1 text-xs text-slate-400">
                {{ $t('detail.editCurrentVersion', { version: versionLabel }) }}
              </p>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-500">{{ editMessage }}</span>
              <button
                class="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                @click="saveEdits"
              >
                {{ $t('detail.editSave') }}
              </button>
            </div>
          </div>
        </article>
      </div>

      <aside class="space-y-4">
        <div class="rounded-lg border border-slate-200 bg-white p-5 text-sm">
          <h3 class="text-base font-semibold text-slate-900">{{ $t('detail.slotsTitle') }}</h3>
          <div class="mt-3 space-y-2 text-slate-600">
            <p>
              {{
                $t('detail.slotsOpen', {
                  count: reviewSlots.filter((slot) => slot.status === 'open').length,
                })
              }}
            </p>
            <p>
              {{
                $t('detail.slotsClaimed', {
                  count: reviewSlots.filter((slot) => slot.status === 'claimed').length,
                })
              }}
            </p>
          </div>
          <div class="mt-3 space-y-2">
            <button
              v-for="slot in reviewSlots"
              :key="slot.id"
              class="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700"
              :class="
                slot.status === 'open' ? 'hover:border-slate-300' : 'bg-slate-50 text-slate-400'
              "
              :disabled="slot.status !== 'open'"
              @click="claimSlot(slot.id)"
            >
              {{ slot.status === 'open' ? $t('detail.slotClaim') : $t('detail.slotClaimed') }}
              <span v-if="slot.dueAt" class="ml-2 text-slate-400">{{
                $t('detail.slotDue', { date: new Date(slot.dueAt).toLocaleDateString() })
              }}</span>
            </button>
            <p v-if="slotMessage" class="text-xs text-amber-600">{{ slotMessage }}</p>
          </div>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-5">
          <h3 class="text-base font-semibold text-slate-900">{{ $t('detail.authorTitle') }}</h3>
          <div class="mt-3 text-sm text-slate-600">
            <p class="font-medium text-slate-900">{{ authorName }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ $t('detail.authorMeta') }}</p>
          </div>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-5">
          <h3 class="text-base font-semibold text-slate-900">{{ $t('detail.keywords') }}</h3>
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="keyword in keywords"
              :key="keyword"
              class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {{ keyword }}
            </span>
          </div>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <h3 class="text-base font-semibold text-slate-900">{{ $t('detail.timeTitle') }}</h3>
          <div class="mt-3 space-y-2">
            <div class="flex items-center justify-between">
              <span>{{ $t('detail.timeSubmitted') }}</span>
              <span class="text-slate-900">{{ submittedAt }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>{{ $t('detail.timeAccepted') }}</span>
              <span class="text-slate-900">{{ acceptedAt }}</span>
            </div>
          </div>
        </div>

        <div v-if="isStaff" class="rounded-lg border border-slate-200 bg-white p-5 text-sm">
          <h3 class="text-base font-semibold text-slate-900">{{ $t('detail.decisionTitle') }}</h3>
          <div class="mt-3 space-y-3">
            <div>
              <label class="text-xs text-slate-500">{{ $t('detail.decisionLabel') }}</label>
              <select
                v-model="decisionState"
                class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="pending">{{ $t('detail.decisionPending') }}</option>
                <option value="revise">{{ $t('detail.decisionRevise') }}</option>
                <option value="rejected">{{ $t('detail.decisionReject') }}</option>
                <option value="accepted">{{ $t('detail.decisionAccept') }}</option>
              </select>
              <p class="mt-1 text-[11px] text-slate-400">{{ $t('detail.decisionDefaultHint') }}</p>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-500">{{ decisionMessage }}</span>
              <button
                class="rounded-md px-3 py-2 text-xs font-semibold text-white"
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
