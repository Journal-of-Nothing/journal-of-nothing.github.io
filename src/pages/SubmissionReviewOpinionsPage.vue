<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  closeReviewOpinion,
  createReviewOpinion,
  createReviewOpinionReply,
  fetchReviewOpinionReplies,
  fetchReviewOpinions,
  fetchSubmissionDetail,
} from '../services/supabaseApi'
import { useAuth } from '../stores/auth'

type ReviewOpinionItem = {
  id: string
  title: string
  author: string
  time: string
  status: 'open' | 'closed'
  decision: 'accept' | 'minor' | 'major' | 'reject' | null
  reviewerId: string | null
  reply: string | null
}

type ReviewOpinionReplyItem = {
  id: string
  reviewOpinionId: string
  author: string
  role: 'author' | 'reviewer'
  time: string
  body: string
}

const route = useRoute()
const { user, profile } = useAuth()
const submissionTitle = ref('')
const authorId = ref<string | null>(null)
const submissionMeta = ref('作者 @未知 · 更新于 —')
const submissionStatus = ref('在审')
const reviewOpinions = ref<ReviewOpinionItem[]>([])
const reviewOpinionReplies = ref<Record<string, ReviewOpinionReplyItem[]>>({})
const errorMessage = ref('')
const formBody = ref('')
const formDecision = ref<'accept' | 'minor' | 'major' | 'reject'>('minor')
const submitMessage = ref('')
const submitError = ref('')

onMounted(async () => {
  const submissionId = route.params.id as string

  const { data: submission } = await fetchSubmissionDetail(submissionId)
  if (submission) {
    submissionTitle.value = submission.title
    submissionMeta.value = `作者 @${submission.author?.username || '未知'} · 更新于 ${new Date(
      submission.updated_at,
    ).toLocaleDateString()}`
    submissionStatus.value = submission.status === 'accepted' ? '已发表' : '在审'
    authorId.value = submission.author_id ?? null
  }

  const { data, error } = await fetchReviewOpinions(submissionId)
  if (error) {
    errorMessage.value = '无法加载审稿意见'
    return
  }

  reviewOpinions.value =
    data?.map((row) => ({
      id: row.id,
      title: row.body_md?.slice(0, 80) || '审稿意见',
      author: row.reviewer?.username ? `@${row.reviewer.username}` : '@审稿人',
      time: new Date(row.created_at).toLocaleDateString(),
      status: row.status || 'open',
      decision: row.decision ?? null,
      reviewerId: row.reviewer_id ?? null,
      reply: row.author_reply_md ?? null,
    })) ?? []

  const { data: replies } = await fetchReviewOpinionReplies(submissionId)
  const grouped: Record<string, ReviewOpinionReplyItem[]> = {}
  replies?.forEach((row) => {
    const key = row.review_opinion_id
    if (!grouped[key]) grouped[key] = []
    grouped[key].push({
      id: row.id,
      reviewOpinionId: row.review_opinion_id,
      author: row.author?.username ? `@${row.author.username}` : '未知用户',
      role: row.role,
      time: new Date(row.created_at).toLocaleDateString(),
      body: row.body_md,
    })
  })
  reviewOpinionReplies.value = grouped
})

const replyMap = ref<Record<string, string>>({})

const canReview = () => {
  if (!user.value) return false
  if (!profile.value) return true
  return profile.value.can_review
}

const isStaff = () => profile.value?.role === 'admin' || profile.value?.role === 'deputy_editor'

const canReplyToOpinion = (opinion: ReviewOpinionItem) => {
  if (!user.value || opinion.status !== 'open') return false
  return opinion.reviewerId === user.value.id || authorId.value === user.value.id
}

const submitOpinionReply = async (opinion: ReviewOpinionItem) => {
  submitError.value = ''
  submitMessage.value = ''

  if (!user.value) {
    submitError.value = '请先登录后再回复'
    return
  }

  const content = replyMap.value[opinion.id]?.trim()
  if (!content) {
    submitError.value = '请输入回复内容'
    return
  }

  const role = opinion.reviewerId === user.value.id ? 'reviewer' : 'author'
  const submissionId = route.params.id as string

  const { error } = await createReviewOpinionReply({
    submission_id: submissionId,
    review_opinion_id: opinion.id,
    author_id: user.value.id,
    role,
    body_md: content,
  })

  if (error) {
    submitError.value = error.message
    return
  }

  replyMap.value[opinion.id] = ''
  submitMessage.value = '回复已提交'

  const { data: replies } = await fetchReviewOpinionReplies(submissionId)
  const grouped: Record<string, ReviewOpinionReplyItem[]> = {}
  replies?.forEach((row) => {
    const key = row.review_opinion_id
    if (!grouped[key]) grouped[key] = []
    grouped[key].push({
      id: row.id,
      reviewOpinionId: row.review_opinion_id,
      author: row.author?.username ? `@${row.author.username}` : '未知用户',
      role: row.role,
      time: new Date(row.created_at).toLocaleDateString(),
      body: row.body_md,
    })
  })
  reviewOpinionReplies.value = grouped
}

const submitReviewOpinion = async () => {
  submitError.value = ''
  submitMessage.value = ''

  if (!user.value) {
    submitError.value = '请先登录后再提交审稿意见'
    return
  }
  if (!canReview()) {
    submitError.value = '当前账号无审稿权限'
    return
  }
  if (!formBody.value.trim()) {
    submitError.value = '请输入审稿意见内容'
    return
  }

  const submissionId = route.params.id as string
  const { error } = await createReviewOpinion({
    submission_id: submissionId,
    reviewer_id: user.value.id,
    body_md: formBody.value.trim(),
    decision: formDecision.value,
  })

  if (error) {
    submitError.value = error.message
    return
  }

  formBody.value = ''
  submitMessage.value = '审稿意见已提交'
  const { data } = await fetchReviewOpinions(submissionId)
  reviewOpinions.value =
    data?.map((row) => ({
      id: row.id,
      title: row.body_md?.slice(0, 80) || '审稿意见',
      author: row.reviewer?.username ? `@${row.reviewer.username}` : '@审稿人',
      time: new Date(row.created_at).toLocaleDateString(),
      status: row.status || 'open',
      decision: row.decision ?? null,
      reviewerId: row.reviewer_id ?? null,
      reply: row.author_reply_md ?? null,
    })) ?? reviewOpinions.value
}

const closeOpinion = async (id: string) => {
  submitError.value = ''
  const { error } = await closeReviewOpinion(id)
  if (error) {
    submitError.value = error.message
    return
  }
  const submissionId = route.params.id as string
  const { data } = await fetchReviewOpinions(submissionId)
  reviewOpinions.value =
    data?.map((row) => ({
      id: row.id,
      title: row.body_md?.slice(0, 80) || '审稿意见',
      author: row.reviewer?.username ? `@${row.reviewer.username}` : '@审稿人',
      time: new Date(row.created_at).toLocaleDateString(),
      status: row.status || 'open',
      decision: row.decision ?? null,
      reviewerId: row.reviewer_id ?? null,
      reply: row.author_reply_md ?? null,
    })) ?? reviewOpinions.value
}
</script>

<template>
  <section class="space-y-4">
    <header class="rounded-lg border border-slate-200 bg-white">
      <div class="border-b border-slate-200 px-6 py-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-slate-900">{{ submissionTitle || 'Submission' }}</h1>
            <p class="mt-1 text-sm text-slate-500">{{ submissionMeta }}</p>
          </div>
          <span
            class="rounded-full px-3 py-1 text-xs font-medium"
            :class="
              submissionStatus === '已发表'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            "
          >
            {{ submissionStatus }}
          </span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-6 px-6 py-3 text-sm text-slate-500">
        <router-link class="text-slate-500 hover:text-slate-700" :to="`/submissions/${route.params.id}`">
          正文
        </router-link>
        <router-link class="text-slate-500 hover:text-slate-700" :to="`/submissions/${route.params.id}/comments`">
          评论
        </router-link>
        <span class="font-medium text-slate-900">审稿意见</span>
      </div>
    </header>

    <p v-if="errorMessage" class="text-sm text-amber-600">{{ errorMessage }}</p>

    <div class="rounded-lg border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div class="flex items-center gap-4 text-sm text-slate-600">
          <span class="font-medium text-slate-900">Open {{ reviewOpinions.length }}</span>
          <span>Closed 0</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
            @click="submitReviewOpinion"
          >
            提交审稿意见
          </button>
        </div>
      </div>
      <div class="border-b border-slate-200 px-6 py-4 text-sm">
        <div class="grid gap-3 md:grid-cols-[1fr_1fr]">
          <div class="space-y-2">
            <label class="text-xs text-slate-500">审稿结论</label>
            <select
              v-model="formDecision"
              class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="accept">接受</option>
              <option value="minor">小修</option>
              <option value="major">大修</option>
              <option value="reject">拒稿</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-xs text-slate-500">审稿意见内容</label>
            <textarea
              v-model="formBody"
              rows="3"
              class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="填写审稿意见"
            />
          </div>
        </div>
        <div class="mt-2 text-xs">
          <p v-if="submitError" class="text-red-600">{{ submitError }}</p>
          <p v-if="submitMessage" class="text-emerald-600">{{ submitMessage }}</p>
        </div>
      </div>
      <ul class="divide-y divide-slate-100">
        <li v-for="pr in reviewOpinions" :key="pr.id" class="px-6 py-4">
          <div class="flex items-start gap-3">
            <span class="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <p class="font-medium text-slate-900">{{ pr.title }}</p>
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {{ pr.decision || 'review' }}
                </span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs"
                  :class="pr.status === 'closed' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'"
                >
                  {{ pr.status === 'closed' ? '已关闭' : '开放中' }}
                </span>
              </div>
              <div class="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>{{ pr.author }} · {{ pr.time }}</span>
                <button
                  v-if="(pr.reviewerId && pr.reviewerId === user?.id) || isStaff()"
                  class="text-xs text-slate-600 hover:text-slate-900"
                  @click="closeOpinion(pr.id)"
                >
                  关闭
                </button>
              </div>
              <div v-if="pr.reply" class="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                作者回复（历史）：{{ pr.reply }}
              </div>
              <div v-if="reviewOpinionReplies[pr.id]?.length" class="mt-3 space-y-2">
                <div
                  v-for="reply in reviewOpinionReplies[pr.id]"
                  :key="reply.id"
                  class="rounded-md border border-slate-100 bg-white px-3 py-2 text-xs text-slate-600"
                >
                  <div class="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{{ reply.role === 'author' ? '作者' : '审稿人' }} {{ reply.author }}</span>
                    <span>{{ reply.time }}</span>
                  </div>
                  <p class="mt-1 text-slate-700">{{ reply.body }}</p>
                </div>
              </div>
              <div v-if="canReplyToOpinion(pr)" class="mt-3 space-y-2 text-xs">
                <label class="text-slate-500">回复审稿意见</label>
                <textarea
                  v-model="replyMap[pr.id]"
                  rows="2"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="回复审稿意见"
                />
                <div class="flex justify-end">
                  <button
                    class="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-300"
                    @click="submitOpinionReply(pr)"
                  >
                    提交回复
                  </button>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
