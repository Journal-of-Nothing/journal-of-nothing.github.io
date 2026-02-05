<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import { fetchUserReviewOpinions, fetchUserSubmissions, updateUserPermissions } from '../services/supabaseApi'

const router = useRouter()
const { user, profile, signOut } = useAuth()
const authUser = computed(() => user.value)
const adminTargetId = ref('')
const adminRole = ref<'author' | 'reviewer' | 'deputy_editor' | 'admin'>('author')
const adminCanSubmit = ref(true)
const adminCanReview = ref(true)
const adminCanComment = ref(true)
const adminMessage = ref('')
const mySubmissions = ref<{ id: string; title: string; status: string; updated_at: string }[]>([])
const myReviews = ref<{ id: string; submission_id: string; status: string; decision: string | null; created_at: string }[]>([])

const isAdmin = computed(() => profile.value?.role === 'admin')

onMounted(async () => {
  if (!authUser.value) return
  const [submissionsRes, reviewsRes] = await Promise.all([
    fetchUserSubmissions(authUser.value.id),
    fetchUserReviewOpinions(authUser.value.id),
  ])

  mySubmissions.value = (submissionsRes.data as typeof mySubmissions.value) ?? []
  myReviews.value = (reviewsRes.data as typeof myReviews.value) ?? []
})

const handleSignOut = async () => {
  await signOut()
  router.replace('/login')
}

const updatePermissions = async () => {
  adminMessage.value = ''
  if (!adminTargetId.value.trim()) {
    adminMessage.value = '请输入用户 ID'
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
  adminMessage.value = '权限已更新'
}
</script>

<template>
  <section class="mx-auto max-w-2xl space-y-6 rounded-lg border border-slate-200 bg-white p-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">个人中心</h1>
      <p class="text-sm text-slate-500">管理你的资料与登录状态</p>
    </div>

    <div class="rounded-md border border-slate-100 bg-slate-50 p-4">
      <p class="text-sm text-slate-500">当前用户</p>
      <p class="mt-1 text-slate-900">
        {{ authUser?.user_metadata?.user_name || authUser?.email || '未登录' }}
      </p>
    </div>

    <div class="rounded-md border border-slate-100 bg-slate-50 p-4 text-sm">
      <p class="text-slate-500">角色与权限</p>
      <div class="mt-2 space-y-1 text-slate-700">
        <p>角色：{{ profile?.role || '未设置' }}</p>
        <p>投稿权限：{{ profile?.can_submit ? '允许' : '禁止' }}</p>
        <p>审稿权限：{{ profile?.can_review ? '允许' : '禁止' }}</p>
        <p>评论权限：{{ profile?.can_comment ? '允许' : '禁止' }}</p>
      </div>
    </div>

    <div class="rounded-md border border-slate-100 bg-white p-4 text-sm">
      <p class="text-slate-700">我的投稿</p>
      <ul class="mt-3 space-y-2">
        <li v-for="item in mySubmissions" :key="item.id" class="flex items-center justify-between">
          <router-link class="text-slate-700 hover:text-slate-900" :to="`/submissions/${item.id}`">
            {{ item.title }}
          </router-link>
          <span class="text-xs text-slate-500">{{ item.status }}</span>
        </li>
        <li v-if="!mySubmissions.length" class="text-xs text-slate-400">暂无投稿</li>
      </ul>
    </div>

    <div class="rounded-md border border-slate-100 bg-white p-4 text-sm">
      <p class="text-slate-700">我参与的审稿</p>
      <ul class="mt-3 space-y-2">
        <li v-for="item in myReviews" :key="item.id" class="flex items-center justify-between">
          <router-link class="text-slate-700 hover:text-slate-900" :to="`/submissions/${item.submission_id}/review-opinions`">
            审稿意见 {{ item.id.slice(0, 6) }}
          </router-link>
          <span class="text-xs text-slate-500">{{ item.status }}</span>
        </li>
        <li v-if="!myReviews.length" class="text-xs text-slate-400">暂无审稿参与</li>
      </ul>
    </div>

    <div v-if="isAdmin" class="rounded-md border border-slate-100 bg-white p-4 text-sm">
      <p class="text-slate-700">管理员 · 账号权限管理</p>
      <div class="mt-3 space-y-3">
        <input
          v-model="adminTargetId"
          class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="用户 ID"
        />
        <select v-model="adminRole" class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
          <option value="author">作者</option>
          <option value="reviewer">审稿人</option>
          <option value="deputy_editor">副主编</option>
          <option value="admin">管理员</option>
        </select>
        <div class="flex items-center gap-4">
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
            class="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            @click="updatePermissions"
          >
            更新权限
          </button>
        </div>
      </div>
    </div>

    <button
      class="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
      @click="handleSignOut"
    >
      退出登录
    </button>
  </section>
</template>
