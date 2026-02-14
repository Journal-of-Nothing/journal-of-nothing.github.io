<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { createSubmission } from '../services/supabaseApi'
import { useAuth } from '../stores/auth'
import MarkdownEditor from '../components/MarkdownEditor.vue'

const router = useRouter()
const { user, profile } = useAuth()
const { t } = useI18n()

const title = ref('')
const abstract = ref('')
const content = ref('')
const keywordsInput = ref('')
const authorName = ref('')
const authorEmail = ref('')
const authorAffiliation = ref('')
const errorMessage = ref('')
const infoMessage = ref('')
const isSubmitting = ref(false)

const submit = async () => {
  errorMessage.value = ''
  infoMessage.value = ''

  if (!user.value) {
    errorMessage.value = t('submit.errorLogin')
    return
  }
  if (profile.value && !profile.value.can_submit) {
    errorMessage.value = t('submit.errorPermission')
    return
  }
  if (!title.value.trim() || !abstract.value.trim() || !content.value.trim()) {
    errorMessage.value = t('submit.errorRequired')
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
    author_name: authorName.value.trim() || null,
    author_email: authorEmail.value.trim() || null,
    author_affiliation: authorAffiliation.value.trim() || null,
    keywords,
  })

  if (error) {
    errorMessage.value = error.message
    isSubmitting.value = false
    return
  }

  infoMessage.value = t('submit.success')
  isSubmitting.value = false
  router.replace('/in-review')
}
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6 rounded-lg border border-slate-200 bg-white p-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">{{ $t('submit.title') }}</h1>
      <p class="text-sm text-slate-500">{{ $t('submit.subtitle') }}</p>
    </div>

    <div class="space-y-4">
      <div>
        <label class="text-sm font-medium text-slate-700">{{ $t('submit.labelTitle') }}</label>
        <input
          v-model="title"
          class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          :placeholder="$t('submit.placeholderTitle')"
        />
      </div>
      <div>
        <label class="text-sm font-medium text-slate-700">{{ $t('submit.labelAbstract') }}</label>
        <div class="mt-2">
          <MarkdownEditor
            v-model="abstract"
            :height="200"
            :placeholder="$t('submit.placeholderAbstract')"
          />
        </div>
      </div>
      <div>
        <label class="text-sm font-medium text-slate-700">{{ $t('submit.labelContent') }}</label>
        <div class="mt-2">
          <MarkdownEditor
            v-model="content"
            :height="400"
            :placeholder="$t('submit.placeholderContent')"
          />
        </div>
      </div>
      <div>
        <label class="text-sm font-medium text-slate-700">{{ $t('submit.labelKeywords') }}</label>
        <input
          v-model="keywordsInput"
          class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          :placeholder="$t('submit.placeholderKeywords')"
        />
      </div>
      <div class="border-t border-slate-200 pt-4">
        <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ $t('submit.authorInfo') }}</h3>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-sm font-medium text-slate-700">{{
              $t('submit.labelAuthorName')
            }}</label>
            <input
              v-model="authorName"
              class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              :placeholder="$t('submit.placeholderAuthorName')"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700">{{
              $t('submit.labelAuthorEmail')
            }}</label>
            <input
              v-model="authorEmail"
              type="email"
              class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              :placeholder="$t('submit.placeholderAuthorEmail')"
            />
          </div>
        </div>
        <div class="mt-4">
          <label class="text-sm font-medium text-slate-700">{{
            $t('submit.labelAuthorAffiliation')
          }}</label>
          <input
            v-model="authorAffiliation"
            class="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            :placeholder="$t('submit.placeholderAuthorAffiliation')"
          />
        </div>
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
        {{ $t('submit.submit') }}
      </button>
    </div>
  </section>
</template>
