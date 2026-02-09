<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../stores/auth'
import { checkUsernameAvailable } from '../services/supabaseApi'

const router = useRouter()
const { user } = useAuth()
const { t } = useI18n()
const isLoading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')
const mode = ref<'login' | 'signup'>('login')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const username = ref('')

const signInWithGitHub = async () => {
  errorMessage.value = ''
  infoMessage.value = ''
  isLoading.value = true
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
  })

  if (error) {
    errorMessage.value = error.message
    isLoading.value = false
  }
}

const submitEmailAuth = async () => {
  errorMessage.value = ''
  infoMessage.value = ''
  isLoading.value = true

  if (!email.value || !password.value) {
    errorMessage.value = t('login.errorEmailPassword')
    isLoading.value = false
    return
  }

  if (mode.value === 'signup') {
    if (!username.value.trim()) {
      errorMessage.value = t('login.errorUsername')
      isLoading.value = false
      return
    }

    const usernameCheck = await checkUsernameAvailable(username.value)
    if (usernameCheck.error) {
      errorMessage.value = usernameCheck.error.message
      isLoading.value = false
      return
    }
    if (!usernameCheck.available) {
      errorMessage.value = t('login.errorUsernameTaken')
      isLoading.value = false
      return
    }

    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          user_name: username.value.trim(),
        },
      },
    })

    if (error) {
      errorMessage.value = error.message
    } else {
      infoMessage.value = t('login.signupSuccess')
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (error) {
      errorMessage.value = error.message
    }
  }

  isLoading.value = false
}

const sendResetEmail = async () => {
  errorMessage.value = ''
  infoMessage.value = ''

  if (!email.value) {
    errorMessage.value = t('login.errorEmailForReset')
    return
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.value)
  if (error) {
    errorMessage.value = error.message
  } else {
    infoMessage.value = t('login.resetSent')
  }
}

watchEffect(() => {
  if (user.value) {
    router.replace('/me')
  }
})
</script>

<template>
  <section class="mx-auto max-w-md space-y-6 rounded-lg border border-slate-200 bg-white p-6">
    <div class="space-y-2 text-center">
      <h1 class="text-2xl font-semibold text-slate-900">{{ $t('login.title') }}</h1>
      <p class="text-sm text-slate-500">{{ $t('login.subtitle') }}</p>
    </div>

    <div class="flex items-center gap-2 text-sm">
      <button
        class="flex-1 rounded-md border px-3 py-2"
        :class="
          mode === 'login' ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-500'
        "
        @click="mode = 'login'"
      >
        {{ $t('login.tabLogin') }}
      </button>
      <button
        class="flex-1 rounded-md border px-3 py-2"
        :class="
          mode === 'signup' ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-500'
        "
        @click="mode = 'signup'"
      >
        {{ $t('login.tabSignup') }}
      </button>
    </div>

    <div class="space-y-3">
      <input
        v-if="mode === 'signup'"
        v-model="username"
        type="text"
        :placeholder="$t('login.placeholderUsername')"
        class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
      />
      <input
        v-model="email"
        type="email"
        :placeholder="$t('login.placeholderEmail')"
        class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
      />
      <div class="relative">
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          :placeholder="$t('login.placeholderPassword')"
          class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500"
          @click="showPassword = !showPassword"
        >
          {{ showPassword ? $t('common.hide') : $t('common.show') }}
        </button>
      </div>
      <button
        class="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        :disabled="isLoading"
        @click="submitEmailAuth"
      >
        {{ mode === 'signup' ? $t('login.submitSignup') : $t('login.submitLogin') }}
      </button>
      <button
        v-if="mode === 'login'"
        class="text-left text-xs text-slate-500 hover:text-slate-700"
        type="button"
        @click="sendResetEmail"
      >
        {{ $t('login.resetPassword') }}
      </button>
    </div>

    <div class="flex items-center gap-2 text-xs text-slate-400">
      <span class="h-px flex-1 bg-slate-200" />
      {{ $t('common.or') }}
      <span class="h-px flex-1 bg-slate-200" />
    </div>

    <button
      class="w-full rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
      :disabled="isLoading"
      @click="signInWithGitHub"
    >
      {{ $t('login.github') }}
    </button>

    <p v-if="errorMessage" class="text-sm text-red-600">
      {{ errorMessage }}
    </p>
    <p v-if="infoMessage" class="text-sm text-emerald-600">
      {{ infoMessage }}
    </p>
  </section>
</template>
