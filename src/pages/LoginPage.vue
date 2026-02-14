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
  <div
    class="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100"
  >
    <!-- Decorative background elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- Gradient orbs -->
      <div
        class="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-200/30 to-teal-300/20 rounded-full blur-3xl"
      />
      <div
        class="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-amber-200/20 to-orange-300/15 rounded-full blur-3xl"
      />
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-slate-200/20 to-gray-200/10 rounded-full blur-3xl"
      />

      <!-- Subtle grid pattern -->
      <div
        class="absolute inset-0 opacity-[0.015]"
        style="
          background-image: radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0);
          background-size: 40px 40px;
        "
      />
    </div>

    <!-- Login card -->
    <section class="card-elevated w-full max-w-md mx-4 relative z-10">
      <!-- Header -->
      <div class="text-center space-y-3 mb-8">
        <div
          class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20 mb-4"
        >
          <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-slate-900 tracking-tight">{{ $t('login.title') }}</h1>
        <p class="text-slate-500 text-sm">{{ $t('login.subtitle') }}</p>
      </div>

      <!-- Mode tabs -->
      <div class="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl mb-6">
        <button
          class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200"
          :class="
            mode === 'login'
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60'
              : 'text-slate-500 hover:text-slate-700'
          "
          @click="mode = 'login'"
        >
          {{ $t('login.tabLogin') }}
        </button>
        <button
          class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200"
          :class="
            mode === 'signup'
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60'
              : 'text-slate-500 hover:text-slate-700'
          "
          @click="mode = 'signup'"
        >
          {{ $t('login.tabSignup') }}
        </button>
      </div>

      <!-- Form -->
      <div class="space-y-4">
        <!-- Username field (signup only) -->
        <div v-if="mode === 'signup'" class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide">{{
            $t('login.placeholderUsername')
          }}</label>
          <input
            v-model="username"
            type="text"
            :placeholder="$t('login.placeholderUsername')"
            class="input-field"
          />
        </div>

        <!-- Email field -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide">{{
            $t('login.placeholderEmail')
          }}</label>
          <input
            v-model="email"
            type="email"
            :placeholder="$t('login.placeholderEmail')"
            class="input-field"
          />
        </div>

        <!-- Password field -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide">{{
            $t('login.placeholderPassword')
          }}</label>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="$t('login.placeholderPassword')"
              class="input-field pr-20"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? $t('common.hide') : $t('common.show') }}
            </button>
          </div>
        </div>

        <!-- Reset password link -->
        <div v-if="mode === 'login'" class="flex justify-end">
          <button
            type="button"
            class="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            @click="sendResetEmail"
          >
            {{ $t('login.resetPassword') }}
          </button>
        </div>

        <!-- Submit button -->
        <button class="btn-primary w-full mt-2" :disabled="isLoading" @click="submitEmailAuth">
          <span v-if="isLoading" class="inline-flex items-center gap-2">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
                fill="none"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {{ $t('common.loading') }}
          </span>
          <span v-else>{{
            mode === 'signup' ? $t('login.submitSignup') : $t('login.submitLogin')
          }}</span>
        </button>
      </div>

      <!-- Divider -->
      <div class="flex items-center gap-4 my-6">
        <span class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <span class="text-xs font-medium text-slate-400 uppercase tracking-wider">{{
          $t('common.or')
        }}</span>
        <span class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      </div>

      <!-- Social login -->
      <button
        class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200"
        :disabled="isLoading"
        @click="signInWithGitHub"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
        {{ $t('login.github') }}
      </button>

      <!-- Messages -->
      <transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="errorMessage" class="mt-4 p-4 rounded-xl bg-red-50 border border-red-100">
          <div class="flex items-start gap-3">
            <svg
              class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p class="text-sm text-red-700 font-medium">{{ errorMessage }}</p>
          </div>
        </div>
      </transition>

      <transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="infoMessage" class="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
          <div class="flex items-start gap-3">
            <svg
              class="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p class="text-sm text-emerald-700 font-medium">{{ infoMessage }}</p>
          </div>
        </div>
      </transition>
    </section>
  </div>
</template>

<style scoped>
/* Card elevated styles */
.card-elevated {
  @apply bg-white/90 backdrop-blur-xl rounded-3xl p-8;
  @apply border border-white/50 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)];
  @apply shadow-[0_2px_8px_rgba(0,0,0,0.04),0_16px_48px_rgba(0,0,0,0.08)];
}

/* Input field styles */
.input-field {
  @apply w-full px-4 py-3 rounded-xl;
  @apply bg-white border border-slate-200;
  @apply text-slate-900 text-sm placeholder:text-slate-400;
  @apply transition-all duration-200 ease-out;
  @apply focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10;
  @apply hover:border-slate-300;
}

.input-field:disabled {
  @apply bg-slate-50 text-slate-400 cursor-not-allowed;
}

/* Button primary styles */
.btn-primary {
  @apply inline-flex items-center justify-center;
  @apply px-6 py-3.5 rounded-xl;
  @apply bg-gradient-to-r from-emerald-600 to-teal-600;
  @apply text-white font-semibold text-sm;
  @apply shadow-lg shadow-emerald-500/25;
  @apply transition-all duration-200 ease-out;
  @apply hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5;
  @apply active:translate-y-0 active:shadow-md;
  @apply focus:outline-none focus:ring-4 focus:ring-emerald-500/20;
}

.btn-primary:disabled {
  @apply opacity-60 cursor-not-allowed shadow-none hover:translate-y-0;
}
</style>
