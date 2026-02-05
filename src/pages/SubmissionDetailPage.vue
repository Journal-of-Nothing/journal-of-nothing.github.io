<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
const submissionTitle = ref('')
const submissionMeta = ref('')
const submissionStatus = ref('在审')
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
const decisionStatus = ref<'accepted' | 'rejected'>('accepted')
const decisionType = ref<'accept' | 'minor' | 'major' | 'reject'>('accept')
const decisionMessage = ref('')
const reviewSlots = ref<
  { id: string; status: string; reviewerId: string | null; dueAt: string | null }[]
>([])
const slotMessage = ref('')
const comments = ref<{ id: string; title: string; author: string; time: string }[]>([])
const reviewOpinions = ref<{ id: string; title: string; author: string; time: string }[]>([])

const errorMessage = ref('')
const isLoading = ref(true)
const { user, profile } = useAuth()
const isAuthor = computed(() => user.value && authorId.value && user.value.id === authorId.value)
const isStaff = computed(() => profile.value?.role === 'admin' || profile.value?.role === 'deputy_editor')

onMounted(async () => {
  const submissionId = route.params.id as string
  submissionIdRef.value = submissionId

  const { data: submission, error: submissionError } = await fetchSubmissionDetail(submissionId)

  if (!submissionError && submission) {
    submissionTitle.value = submission.title
    authorName.value = submission.author?.username ? `@${submission.author.username}` : '@未知'
    authorId.value = submission.author_id ?? null
    submissionMeta.value = `作者 ${authorName.value} · 更新于 ${new Date(
      submission.updated_at,
    ).toLocaleDateString()}`
    submissionStatus.value =
      submission.status === 'accepted'
        ? '已发表'
        : submission.status === 'rejected'
          ? '拒稿'
          : '在审'
    submissionAbstract.value = submission.abstract || '暂无摘要'
    submissionContent.value = submission.content_md || '暂无正文内容'
    keywords.value = submission.keywords ?? []
    versionMajor.value = submission.version_major ?? 1
    versionMinor.value = submission.version_minor ?? 0
    versionLabel.value = submission.version_label || '—'
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
      title: row.body_md?.slice(0, 40) || '评论',
      author: row.author?.username ? `@${row.author.username}` : '@匿名',
      time: new Date(row.created_at).toLocaleDateString(),
    }))
  }

  const { data: prData, error: prError } = await fetchReviewOpinions(submissionId)

  if (!prError && prData?.length) {
    reviewOpinions.value = prData.map((row) => ({
      id: row.id,
      title: row.body_md?.slice(0, 40) || '审稿意见',
      author: row.reviewer?.username ? `@${row.reviewer.username}` : '@审稿人',
      time: new Date(row.created_at).toLocaleDateString(),
    }))
  }

  if (submissionError && !submission) {
    errorMessage.value = '部分内容加载失败，显示示例数据'
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
  const next = versionChangeType.value === 'major'
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
  editMessage.value = '已保存'
}

const submitDecision = async () => {
  decisionMessage.value = ''
  if (!submissionIdRef.value) return
  const { error } = await updateSubmissionDecision(submissionIdRef.value, {
    status: decisionStatus.value,
    decision: decisionType.value,
  })
  if (error) {
    decisionMessage.value = error.message
    return
  }
  decisionMessage.value = '已更新决策'
  submissionStatus.value = decisionStatus.value === 'accepted' ? '已发表' : '拒稿'
}

const claimSlot = async (slotId: string) => {
  slotMessage.value = ''
  if (!user.value) {
    slotMessage.value = '请先登录'
    return
  }
  if (profile.value && !profile.value.can_review) {
    slotMessage.value = '当前账号无审稿权限'
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
        <span class="font-medium text-slate-700">正文</span>
        <router-link class="text-slate-500 hover:text-slate-700" :to="`/submissions/${route.params.id}/comments`">
          评论
        </router-link>
        <router-link
          class="text-slate-500 hover:text-slate-700"
          :to="`/submissions/${route.params.id}/review-opinions`"
        >
          审稿意见
        </router-link>
      </div>
    </header>

    <p v-if="errorMessage" class="text-sm text-amber-600">{{ errorMessage }}</p>

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
              <h3 class="text-base font-semibold text-slate-900">摘要</h3>
              <p class="mt-2 text-sm text-slate-600">
                {{ submissionAbstract }}
              </p>
            </section>
            <section>
              <h3 class="text-base font-semibold text-slate-900">关键词</h3>
              <div class="mt-2 flex flex-wrap gap-2">
                <span
                  v-for="tag in keywords"
                  :key="tag"
                  class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                >
                  {{ tag }}
                </span>
                <span v-if="!keywords.length" class="text-sm text-slate-400">暂无关键词</span>
              </div>
            </section>
            <section>
              <h3 class="text-base font-semibold text-slate-900">正文</h3>
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
            <h3 class="text-base font-semibold text-slate-900">编辑投稿</h3>
          </div>
          <div class="space-y-4 px-6 py-5 text-sm">
            <div>
              <label class="text-slate-500">标题</label>
              <input v-model="editTitle" class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2" />
            </div>
            <div>
              <label class="text-slate-500">摘要</label>
              <textarea v-model="editAbstract" rows="3" class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2" />
            </div>
            <div>
              <label class="text-slate-500">正文</label>
              <textarea v-model="editContent" rows="6" class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2" />
            </div>
            <div>
              <label class="text-slate-500">关键词</label>
              <input v-model="editKeywordsInput" class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2" placeholder="关键词，用逗号分隔" />
            </div>
            <div>
              <label class="text-slate-500">版本变更</label>
              <select v-model="versionChangeType" class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2">
                <option value="minor">小修</option>
                <option value="major">大修</option>
              </select>
              <p class="mt-1 text-xs text-slate-400">当前版本：{{ versionLabel }}</p>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-500">{{ editMessage }}</span>
              <button class="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white" @click="saveEdits">
                保存修改
              </button>
            </div>
          </div>
        </article>
      </div>

      <aside class="space-y-4">
        <div class="rounded-lg border border-slate-200 bg-white p-5 text-sm">
          <h3 class="text-base font-semibold text-slate-900">审稿槽位</h3>
          <div class="mt-3 space-y-2 text-slate-600">
            <p>开放槽位：{{ reviewSlots.filter((slot) => slot.status === 'open').length }}</p>
            <p>已领取：{{ reviewSlots.filter((slot) => slot.status === 'claimed').length }}</p>
          </div>
          <div class="mt-3 space-y-2">
            <button
              v-for="slot in reviewSlots"
              :key="slot.id"
              class="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700"
              :class="slot.status === 'open' ? 'hover:border-slate-300' : 'bg-slate-50 text-slate-400'"
              :disabled="slot.status !== 'open'"
              @click="claimSlot(slot.id)"
            >
              {{ slot.status === 'open' ? '领取审稿槽位' : '槽位已被领取' }}
              <span v-if="slot.dueAt" class="ml-2 text-slate-400">截止 {{ new Date(slot.dueAt).toLocaleDateString() }}</span>
            </button>
            <p v-if="slotMessage" class="text-xs text-amber-600">{{ slotMessage }}</p>
          </div>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-5">
          <h3 class="text-base font-semibold text-slate-900">作者信息</h3>
          <div class="mt-3 text-sm text-slate-600">
            <p class="font-medium text-slate-900">{{ authorName }}</p>
            <p class="mt-1 text-xs text-slate-500">贡献者 · 通讯作者</p>
          </div>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-5">
          <h3 class="text-base font-semibold text-slate-900">关键词</h3>
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
          <h3 class="text-base font-semibold text-slate-900">时间</h3>
          <div class="mt-3 space-y-2">
            <div class="flex items-center justify-between">
              <span>提交日期</span>
              <span class="text-slate-900">{{ submittedAt }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>接收日期</span>
              <span class="text-slate-900">{{ acceptedAt }}</span>
            </div>
          </div>
        </div>

        <div v-if="isStaff" class="rounded-lg border border-slate-200 bg-white p-5 text-sm">
          <h3 class="text-base font-semibold text-slate-900">编辑决策</h3>
          <div class="mt-3 space-y-3">
            <div>
              <label class="text-xs text-slate-500">状态</label>
              <select v-model="decisionStatus" class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option value="accepted">接收</option>
                <option value="rejected">拒绝</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-500">结论</label>
              <select v-model="decisionType" class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option value="accept">接受</option>
                <option value="minor">小修</option>
                <option value="major">大修</option>
                <option value="reject">拒稿</option>
              </select>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-500">{{ decisionMessage }}</span>
              <button class="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white" @click="submitDecision">
                更新决策
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
