<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../stores/auth'
import { checkUsernameAvailable } from '../services/supabaseApi'

const router = useRouter()
const { user } = useAuth()
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
    errorMessage.value = '请输入邮箱和密码'
    isLoading.value = false
    return
  }

  if (mode.value === 'signup') {
    if (!username.value.trim()) {
      errorMessage.value = '请输入用户名'
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
      errorMessage.value = '用户名已被占用'
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
      infoMessage.value = '注册成功，请检查邮箱完成验证'
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
    errorMessage.value = '请输入邮箱以发送重置链接'
    return
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.value)
  if (error) {
    errorMessage.value = error.message
  } else {
    infoMessage.value = '已发送重置邮件，请检查邮箱'
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
      <h1 class="text-2xl font-semibold text-slate-900">登录</h1>
      <p class="text-sm text-slate-500">支持邮箱注册登录与 GitHub 登录</p>
    </div>

    <div class="flex items-center gap-2 text-sm">
      <button
        class="flex-1 rounded-md border px-3 py-2"
        :class="mode === 'login' ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-500'"
        @click="mode = 'login'"
      >
        邮箱登录
      </button>
      <button
        class="flex-1 rounded-md border px-3 py-2"
        :class="mode === 'signup' ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-500'"
        @click="mode = 'signup'"
      >
        邮箱注册
      </button>
    </div>

    <div class="space-y-3">
      <input
        v-if="mode === 'signup'"
        v-model="username"
        type="text"
        placeholder="用户名"
        class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
      />
      <input
        v-model="email"
        type="email"
        placeholder="邮箱"
        class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
      />
      <div class="relative">
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="密码"
          class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500"
          @click="showPassword = !showPassword"
        >
          {{ showPassword ? '隐藏' : '显示' }}
        </button>
      </div>
      <button
        class="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        :disabled="isLoading"
        @click="submitEmailAuth"
      >
        {{ mode === 'signup' ? '注册账号' : '邮箱登录' }}
      </button>
      <button
        v-if="mode === 'login'"
        class="text-left text-xs text-slate-500 hover:text-slate-700"
        type="button"
        @click="sendResetEmail"
      >
        忘记密码？发送重置邮件
      </button>
    </div>

    <div class="flex items-center gap-2 text-xs text-slate-400">
      <span class="h-px flex-1 bg-slate-200" />
      或
      <span class="h-px flex-1 bg-slate-200" />
    </div>

    <button
      class="w-full rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
      :disabled="isLoading"
      @click="signInWithGitHub"
    >
      使用 GitHub 登录
    </button>

    <p v-if="errorMessage" class="text-sm text-red-600">
      {{ errorMessage }}
    </p>
    <p v-if="infoMessage" class="text-sm text-emerald-600">
      {{ infoMessage }}
    </p>
  </section>
</template>
