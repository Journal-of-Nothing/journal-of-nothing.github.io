<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from './stores/auth'
import siteConfig from '../site.json'

const { t } = useI18n()
const { user } = useAuth()

const displayName = computed(() => user.value?.user_metadata?.user_name || user.value?.email || '')
const siteName = computed(() => siteConfig?.name || t('app.title'))
const siteSubtitle = computed(() => siteConfig?.subtitle || t('app.subtitle'))
const footerPrimary = computed(() => siteConfig?.footer?.primary || siteName.value)
const footerSecondary = computed(() => siteConfig?.footer?.secondary || '')
</script>

<template>
  <div class="app-shell flex min-h-screen flex-col text-slate-950">
    <header class="border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <nav class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div class="flex items-center gap-3">
          <span
            class="rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white"
          >
            {{ siteName }}
          </span>
          <span class="text-sm text-slate-600">{{ siteSubtitle }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-sm font-medium">
          <router-link class="nav-link" to="/">
            {{ $t('app.nav.home') }}
          </router-link>
          <router-link class="nav-link" to="/accepted">
            {{ $t('app.nav.accepted') }}
          </router-link>
          <router-link class="nav-link" to="/in-review">
            {{ $t('app.nav.inReview') }}
          </router-link>
          <router-link class="nav-link" to="/submit">
            {{ $t('app.nav.submit') }}
          </router-link>
          <router-link class="nav-link" to="/guidelines">
            {{ $t('app.nav.guidelines') }}
          </router-link>
          <router-link class="nav-link" to="/about">
            {{ $t('app.nav.about') }}
          </router-link>
          <router-link class="nav-link" to="/me">
            {{ displayName || $t('app.anonymous') }}
          </router-link>
        </div>
      </nav>
    </header>

    <main class="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <router-view />
    </main>

    <footer class="border-t border-slate-200/70 bg-white/80">
      <div
        class="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between"
      >
        <span class="font-medium text-slate-800">{{ footerPrimary }}</span>
        <span v-if="footerSecondary">{{ footerSecondary }}</span>
      </div>
    </footer>
  </div>
</template>
