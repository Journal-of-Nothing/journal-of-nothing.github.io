<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import MarkdownEditor from './MarkdownEditor.vue'

export interface CommentTreeItem {
  id: string
  body: string
  author: string
  authorId: string | null
  time: string
  parentId: string | null
  replies: CommentTreeItem[]
  isCollapsed: boolean
  replyCount: number
}

interface Props {
  comment: CommentTreeItem
  depth: number
  maxDepth?: number
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  maxDepth: 5,
})

const emit = defineEmits<{
  reply: [commentId: string, body: string]
  toggleCollapse: [comment: CommentTreeItem]
}>()

const { t } = useI18n()
const showReplyForm = ref(false)
const replyText = ref('')
const isSubmitting = ref(false)

const getAvatarInitial = (author: string): string => {
  return author?.charAt(0).toUpperCase() || '?'
}

const getIndentClass = (depth: number): string => {
  if (depth === 0) return ''
  return 'ml-4 pl-4 border-l-2 border-slate-200'
}

const toggleReply = () => {
  showReplyForm.value = !showReplyForm.value
  if (!showReplyForm.value) {
    replyText.value = ''
  }
}

const submitReply = async () => {
  if (!replyText.value.trim()) return

  isSubmitting.value = true
  emit('reply', props.comment.id, replyText.value)
  replyText.value = ''
  showReplyForm.value = false
  isSubmitting.value = false
}

const handleToggleCollapse = () => {
  emit('toggleCollapse', props.comment)
}

const handleChildReply = (parentId: string, body: string) => {
  emit('reply', parentId, body)
}
</script>

<template>
  <div :class="getIndentClass(depth)">
    <div class="github-comment" :class="{ 'comment-collapsed': comment.isCollapsed }">
      <!-- Header -->
      <div class="github-comment-header">
        <div class="github-comment-avatar">
          {{ getAvatarInitial(comment.author) }}
        </div>
        <div class="github-comment-meta">
          <span class="github-comment-author">{{ comment.author }}</span>
          <span class="github-comment-time">{{ comment.time }}</span>
          <span
            v-if="comment.replyCount > 0"
            class="comment-collapse-btn"
            @click="handleToggleCollapse"
          >
            {{
              comment.isCollapsed
                ? t('comments.showReplies', { count: comment.replyCount })
                : t('comments.hideReplies')
            }}
          </span>
        </div>
      </div>

      <!-- Body -->
      <template v-if="!comment.isCollapsed">
        <div class="github-comment-body">
          <div class="prose-content" v-html="comment.body"></div>
        </div>

        <!-- Actions -->
        <div class="github-comment-actions">
          <button class="github-comment-action" @click="toggleReply">
            {{ t('comments.reply') }}
          </button>
        </div>

        <!-- Reply Form -->
        <div v-if="showReplyForm" class="border-t border-slate-100 p-4 bg-slate-50/50">
          <MarkdownEditor
            v-model="replyText"
            :height="120"
            :placeholder="t('comments.replyPlaceholder')"
          />
          <div class="mt-3 flex justify-end gap-2">
            <button
              class="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              @click="toggleReply"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              class="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              :disabled="!replyText.trim() || isSubmitting"
              @click="submitReply"
            >
              {{ isSubmitting ? t('common.submitting') : t('comments.submitReply') }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Nested Replies -->
    <div
      v-if="!comment.isCollapsed && comment.replies.length > 0 && depth < maxDepth"
      class="mt-3 space-y-3"
    >
      <CommentThread
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        :depth="depth + 1"
        :max-depth="maxDepth"
        @reply="handleChildReply"
        @toggle-collapse="(c) => emit('toggleCollapse', c)"
      />
    </div>

    <!-- Show more for deep nesting -->
    <div
      v-else-if="!comment.isCollapsed && comment.replies.length > 0 && depth >= maxDepth"
      class="mt-2"
    >
      <button class="text-xs text-blue-600 hover:text-blue-800 ml-4" @click="handleToggleCollapse">
        {{ t('comments.viewThread', { count: comment.replyCount }) }}
      </button>
    </div>
  </div>
</template>
