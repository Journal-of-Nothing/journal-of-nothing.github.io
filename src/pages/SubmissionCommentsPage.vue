<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { createComment, fetchComments, fetchSubmissionDetail } from '../services/supabaseApi'
import { useAuth } from '../stores/auth'

type CommentItem = { id: string; title: string; author: string; time: string }

const route = useRoute()
const { user, profile } = useAuth()
const { t } = useI18n()
const submissionTitle = ref('')
const submissionMeta = ref(t('detail.meta', { author: `@${t('detail.unknownAuthor')}`, date: '—' }))
const submissionStatus = ref(t('detail.statusInReview'))
const submissionStatusCode = ref<'submitted' | 'in_review' | 'accepted' | 'rejected'>('in_review')
const comments = ref<CommentItem[]>([])
const isLoading = ref(true)
const commentText = ref('')
const submitMessage = ref('')
const submitError = ref('')
const errorMessage = ref('')

onMounted(async () => {
  const submissionId = route.params.id as string

  const { data: submission } = await fetchSubmissionDetail(submissionId)
  if (submission) {
    submissionTitle.value = submission.title
    const authorLabel = submission.author?.username
      ? `@${submission.author.username}`
      : `@${t('detail.unknownAuthor')}`
    submissionMeta.value = t('detail.meta', {
      author: authorLabel,
      date: new Date(submission.updated_at).toLocaleDateString(),
    })
    submissionStatus.value =
      submission.status === 'accepted' ? t('detail.statusAccepted') : t('detail.statusInReview')
    submissionStatusCode.value = submission.status
  }

  const { data, error } = await fetchComments(submissionId)
  if (error) {
    errorMessage.value = t('comments.errorLoad')
    isLoading.value = false
    return
  }

  comments.value =
    data?.map((row) => ({
      id: row.id,
      title: row.body_md?.slice(0, 80) || t('comments.defaultTitle'),
      author: row.author?.username ? `@${row.author.username}` : t('comments.anonymous'),
      time: new Date(row.created_at).toLocaleDateString(),
    })) ?? []

  isLoading.value = false
})

const submitComment = async () => {
  submitMessage.value = ''
  submitError.value = ''

  if (!user.value) {
    submitError.value = t('comments.errorLogin')
    return
  }
  if (profile.value && !profile.value.can_comment) {
    submitError.value = t('comments.errorPermission')
    return
  }
  if (!commentText.value.trim()) {
    submitError.value = t('comments.errorRequired')
    return
  }

  const submissionId = route.params.id as string
  const { error } = await createComment({
    submission_id: submissionId,
    author_id: user.value.id,
    body_md: commentText.value.trim(),
  })

  if (error) {
    submitError.value = error.message
    return
  }

  commentText.value = ''
  submitMessage.value = t('comments.success')
  const { data } = await fetchComments(submissionId)
  comments.value =
    data?.map((row) => ({
      id: row.id,
      title: row.body_md?.slice(0, 80) || t('comments.defaultTitle'),
      author: row.author?.username ? `@${row.author.username}` : t('comments.anonymous'),
      time: new Date(row.created_at).toLocaleDateString(),
    })) ?? comments.value
}
</script>

<template>
  <section class="space-y-4">
    <header class="rounded-lg border border-slate-200 bg-white">
      <div class="border-b border-slate-200 px-6 py-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-slate-900">
              {{ submissionTitle || $t('detail.fallbackTitle') }}
            </h1>
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
        <router-link
          class="text-slate-500 hover:text-slate-700"
          :to="`/submissions/${route.params.id}`"
        >
          {{ $t('detail.tabContent') }}
        </router-link>
        <span class="font-medium text-slate-900">{{ $t('detail.tabComments') }}</span>
        <router-link
          class="text-slate-500 hover:text-slate-700"
          :to="`/submissions/${route.params.id}/review-opinions`"
        >
          {{ $t('detail.tabReviews') }}
        </router-link>
      </div>
    </header>

    <p v-if="errorMessage" class="text-sm text-amber-600">{{ errorMessage }}</p>

    <div class="rounded-lg border border-slate-200 bg-white">
      <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 class="text-sm font-semibold text-slate-900">{{ $t('comments.title') }}</h2>
        <span class="text-sm text-slate-500">{{ comments.length }} 条</span>
      </div>
      <div class="border-b border-slate-200 px-6 py-4">
        <label class="text-sm font-medium text-slate-700" for="comment">{{
          $t('comments.newComment')
        }}</label>
        <textarea
          id="comment"
          v-model="commentText"
          rows="4"
          :placeholder="$t('comments.placeholder')"
          class="mt-2 w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
        />
        <div class="mt-3 flex items-center justify-between">
          <div class="text-xs">
            <p v-if="submitError" class="text-red-600">{{ submitError }}</p>
            <p v-if="submitMessage" class="text-slate-500">{{ submitMessage }}</p>
          </div>
          <button
            class="ml-auto rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            @click="submitComment"
          >
            {{ $t('comments.submit') }}
          </button>
        </div>
      </div>
      <ul class="divide-y divide-slate-100">
        <template v-if="isLoading">
          <li v-for="index in 3" :key="index" class="px-6 py-4">
            <div class="flex items-start gap-3">
              <span class="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-200" />
              <div class="flex-1 space-y-2">
                <div class="skeleton-text h-4 w-48" />
                <div class="skeleton-text h-3 w-32" />
              </div>
            </div>
          </li>
        </template>
        <template v-else>
          <li v-for="comment in comments" :key="comment.id" class="px-6 py-4">
            <div class="flex items-start gap-3">
              <span class="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <p class="font-medium text-slate-900">{{ comment.title }}</p>
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {{ $t('common.discussion') }}
                  </span>
                </div>
                <p class="text-xs text-slate-500">{{ comment.author }} · {{ comment.time }}</p>
              </div>
            </div>
          </li>
        </template>
      </ul>
      <p v-if="!isLoading && !comments.length" class="px-6 py-6 text-center text-xs text-slate-400">
        {{ $t('comments.empty') }}
      </p>
    </div>
  </section>
</template>
