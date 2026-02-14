<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { createComment, fetchComments, fetchSubmissionDetail } from '../services/supabaseApi'
import { useAuth } from '../stores/auth'
import { renderMarkdown } from '../lib/markdown'
import MarkdownEditor from '../components/MarkdownEditor.vue'
import CommentThread, { type CommentTreeItem } from '../components/CommentThread.vue'

const route = useRoute()
const { user, profile } = useAuth()
const { t } = useI18n()

const submissionTitle = ref('')
const submissionMeta = ref(t('detail.meta', { author: `@${t('detail.unknownAuthor')}`, date: '—' }))
const submissionStatus = ref(t('detail.statusInReview'))
const submissionStatusCode = ref<'submitted' | 'in_review' | 'accepted' | 'rejected'>('in_review')
const comments = ref<CommentTreeItem[]>([])
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

  await loadComments()
  isLoading.value = false
})

const loadComments = async () => {
  const submissionId = route.params.id as string
  const { data, error } = await fetchComments(submissionId)
  
  if (error) {
    errorMessage.value = t('comments.errorLoad')
    return
  }

  buildCommentTree(data || [])
}

const buildCommentTree = (rawComments: any[]) => {
  const commentMap = new Map<string, CommentTreeItem>()
  const rootComments: CommentTreeItem[] = []

  rawComments.forEach((row) => {
    const item: CommentTreeItem = {
      id: row.id,
      body: renderMarkdown(row.body_md || ''),
      author: row.author?.username ? `@${row.author.username}` : t('comments.anonymous'),
      authorId: row.author_id,
      time: new Date(row.created_at).toLocaleDateString(),
      parentId: row.parent_id,
      replies: [],
      isCollapsed: false,
      replyCount: 0,
    }
    commentMap.set(row.id, item)
  })

  rawComments.forEach((row) => {
    const item = commentMap.get(row.id)!
    if (row.parent_id && commentMap.has(row.parent_id)) {
      const parent = commentMap.get(row.parent_id)!
      parent.replies.push(item)
    } else {
      rootComments.push(item)
    }
  })

  const countReplies = (item: CommentTreeItem): number => {
    let count = item.replies.length
    item.replies.forEach((reply) => {
      count += countReplies(reply)
    })
    item.replyCount = count
    return count
  }

  rootComments.forEach(countReplies)
  comments.value = rootComments
}

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
    parent_id: null,
  })

  if (error) {
    submitError.value = error.message
    return
  }

  commentText.value = ''
  submitMessage.value = t('comments.success')
  await loadComments()
}

const submitReply = async (parentId: string, body: string) => {
  if (!user.value || !body.trim()) return

  const submissionId = route.params.id as string
  const { error } = await createComment({
    submission_id: submissionId,
    author_id: user.value.id,
    body_md: body.trim(),
    parent_id: parentId,
  })

  if (!error) {
    await loadComments()
  }
}

const toggleCollapse = (comment: CommentTreeItem) => {
  comment.isCollapsed = !comment.isCollapsed
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

    <div class="space-y-4">
      <div class="github-comment">
        <div class="github-comment-header">
          <div class="github-comment-avatar">
            {{ user ? (user.user_metadata?.user_name || user.email || 'U').charAt(0).toUpperCase() : '?' }}
          </div>
          <span class="text-sm text-slate-600">{{ $t('comments.write') }}</span>
        </div>
        <div class="github-comment-body">
          <MarkdownEditor
            v-model="commentText"
            :height="150"
            :placeholder="$t('comments.placeholder')"
          />
          <div class="mt-3 flex items-center justify-between">
            <div class="text-xs">
              <p v-if="submitError" class="text-red-600">{{ submitError }}</p>
              <p v-if="submitMessage" class="text-emerald-600">{{ submitMessage }}</p>
            </div>
            <button
              class="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              :disabled="!commentText.trim()"
              @click="submitComment"
            >
              {{ $t('comments.submit') }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="space-y-4">
        <div v-for="index in 3" :key="index" class="github-comment">
          <div class="github-comment-header">
            <div class="skeleton h-8 w-8 rounded-full" />
            <div class="skeleton-text h-4 w-32" />
          </div>
          <div class="github-comment-body">
            <div class="skeleton-text h-4 w-full" />
            <div class="skeleton-text mt-2 h-4 w-2/3" />
          </div>
        </div>
      </div>

      <div v-else-if="comments.length === 0" class="rounded-lg border border-slate-200 bg-white py-12 text-center">
        <p class="text-slate-400">{{ $t('comments.empty') }}</p>
      </div>

      <template v-else>
        <CommentThread
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          :depth="0"
          @reply="submitReply"
          @toggle-collapse="toggleCollapse"
        />
      </template>
    </div>
  </section>
</template>
