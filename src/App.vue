<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from './stores/auth'
import siteConfig from '../site.json'

const { t } = useI18n()
const { user, isAuthenticated } = useAuth()

const displayName = computed(() => {
  const name = user.value?.user_metadata?.user_name || user.value?.email || ''
  return name.length > 20 ? name.slice(0, 17) + '...' : name
})
const siteName = computed(() => siteConfig?.name || t('app.title'))
const siteSubtitle = computed(() => siteConfig?.subtitle || t('app.subtitle'))
const footerPrimary = computed(() => siteConfig?.footer?.primary || siteName.value)
const footerSecondary = computed(() => siteConfig?.footer?.secondary || '')
</script>

<template>
  <div class="app-shell flex min-h-screen flex-col text-slate-950">
    <!-- Modern Header -->
    <header class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <nav class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <!-- Logo Area -->
        <div class="flex items-center gap-4">
          <router-link to="/" class="group flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-lg transition-transform duration-300 group-hover:scale-105"
            >
              <span class="font-serif text-lg font-bold">J</span>
            </div>
            <div class="hidden flex-col sm:flex">
              <span class="font-serif text-lg font-semibold leading-tight text-slate-900">{{
                siteName
              }}</span>
              <span class="text-xs text-slate-500">{{ siteSubtitle }}</span>
            </div>
          </router-link>
        </div>

        <!-- Navigation -->
        <div class="flex flex-wrap items-center gap-1 text-sm">
          <router-link class="nav-link" to="/">
            {{ $t('app.nav.home') }}
          </router-link>
          <router-link class="nav-link" to="/accepted">
            {{ $t('app.nav.accepted') }}
          </router-link>
          <router-link class="nav-link" to="/in-review">
            {{ $t('app.nav.inReview') }}
          </router-link>
          <router-link class="nav-link" to="/search"> 搜索 </router-link>
          <router-link class="nav-link" to="/guidelines">
            {{ $t('app.nav.guidelines') }}
          </router-link>
          <router-link class="nav-link" to="/about">
            {{ $t('app.nav.about') }}
          </router-link>
        </div>

        <!-- User Actions -->
        <div class="flex items-center gap-3">
          <router-link
            v-if="isAuthenticated"
            to="/submit"
            class="btn-primary hidden sm:inline-flex"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            {{ $t('app.nav.submit') }}
          </router-link>
          <router-link
            :to="isAuthenticated ? '/me' : '/login'"
            class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            :class="
              isAuthenticated
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            "
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span class="max-w-[120px] truncate">{{
              isAuthenticated ? displayName : $t('app.login')
            }}</span>
          </router-link>
        </div>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <router-view />
    </main>

    <!-- Modern Footer -->
    <footer class="border-t border-slate-200/80 bg-white/80">
      <div class="mx-auto max-w-7xl px-6 py-8">
        <div class="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div class="flex items-center gap-3">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white"
            >
              <span class="font-serif text-sm font-bold">J</span>
            </div>
            <span class="font-medium text-slate-800">{{ footerPrimary }}</span>
          </div>
          <div class="flex items-center gap-6 text-sm text-slate-500">
            <router-link to="/search" class="hover:text-slate-900">搜索</router-link>
            <router-link to="/open-review" class="hover:text-slate-900">开放评审</router-link>
            <router-link to="/guidelines" class="hover:text-slate-900">{{
              $t('app.footer.guidelines')
            }}</router-link>
            <router-link to="/about" class="hover:text-slate-900">{{
              $t('app.footer.about')
            }}</router-link>
            <router-link to="/privacy" class="hover:text-slate-900">隐私政策</router-link>
            <router-link to="/terms" class="hover:text-slate-900">使用条款</router-link>
          </div>
          <span v-if="footerSecondary" class="text-sm text-slate-400">{{ footerSecondary }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>
