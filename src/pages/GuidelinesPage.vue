<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import guidelinesRaw from '../content/guidelines.md?raw'

const html = computed(() => marked.parse(guidelinesRaw))
</script>

<template>
  <section class="card-surface prose-content p-6 md:p-8">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-html="html" />
  </section>
</template>
