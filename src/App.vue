<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from './stores/auth'

const { user } = useAuth()
const displayName = computed(
  () => user.value?.user_metadata?.user_name || user.value?.email || '',
)
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white">
      <nav class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-3">
          <span class="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
            {{ $t('app.title') }}
          </span>
          <span class="text-sm text-slate-500">{{ $t('app.subtitle') }}</span>
        </div>
        <div class="flex items-center gap-4 text-sm font-medium">
          <router-link class="text-slate-600 hover:text-slate-900" to="/">
            {{ $t('app.nav.home') }}
          </router-link>
          <router-link class="text-slate-600 hover:text-slate-900" to="/accepted">
            {{ $t('app.nav.accepted') }}
          </router-link>
          <router-link class="text-slate-600 hover:text-slate-900" to="/in-review">
            {{ $t('app.nav.inReview') }}
          </router-link>
          <router-link class="text-slate-600 hover:text-slate-900" to="/submit">
            {{ $t('app.nav.submit') }}
          </router-link>
          <router-link class="text-slate-600 hover:text-slate-900" to="/me">
            {{ displayName || $t('app.anonymous') }}
          </router-link>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-6xl px-6 py-8">
      <router-view />
    </main>
  </div>
</template>
