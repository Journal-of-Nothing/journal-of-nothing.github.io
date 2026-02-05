<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createSubmission } from '../services/supabaseApi'
import { useAuth } from '../stores/auth'

const router = useRouter()
const { user, profile } = useAuth()

const title = ref('')
const abstract = ref('')
const content = ref('')
const keywordsInput = ref('')
const errorMessage = ref('')
const infoMessage = ref('')
const isSubmitting = ref(false)

const submit = async () => {
  errorMessage.value = ''
  infoMessage.value = ''

  if (!user.value) {
    errorMessage.value = '请先登录'
    return
  }
  if (profile.value && !profile.value.can_submit) {
    errorMessage.value = '当前账号无投稿权限'
    return
  }
  if (!title.value.trim() || !abstract.value.trim() || !content.value.trim()) {
    errorMessage.value = '请填写完整信息'
    return
  }

  isSubmitting.value = true
  const keywords = keywordsInput.value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const { error } = await createSubmission({
    title: title.value.trim(),
    abstract: abstract.value.trim(),
    content_md: content.value.trim(),
    author_id: user.value.id,
    keywords,
  })

  if (error) {
    errorMessage.value = error.message
    isSubmitting.value = false
    return
  }

  infoMessage.value = '投稿成功'
  isSubmitting.value = false
  router.replace('/in-review')
}
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6 rounded-lg border border-slate-200 bg-white p-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">投稿</h1>
      <p class="text-sm text-slate-500">填写文章信息并提交审稿</p>
    </div>

    <div class="space-y-4">
      <div>
        <label class="text-sm font-medium text-slate-700">标题</label>
        <input
          v-model="title"
          class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="文章标题"
        />
      </div>
      <div>
        <label class="text-sm font-medium text-slate-700">摘要</label>
        <textarea
          v-model="abstract"
          rows="4"
          class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="文章摘要"
        />
      </div>
      <div>
        <label class="text-sm font-medium text-slate-700">正文</label>
        <textarea
          v-model="content"
          rows="10"
          class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="Markdown 正文"
        />
      </div>
      <div>
        <label class="text-sm font-medium text-slate-700">关键词</label>
        <input
          v-model="keywordsInput"
          class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="关键词，用逗号分隔"
        />
      </div>
    </div>

    <div class="flex items-center justify-between text-sm">
      <p v-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>
      <p v-if="infoMessage" class="text-emerald-600">{{ infoMessage }}</p>
      <button
        class="ml-auto rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        :disabled="isSubmitting"
        @click="submit"
      >
        提交投稿
      </button>
    </div>
  </section>
</template>