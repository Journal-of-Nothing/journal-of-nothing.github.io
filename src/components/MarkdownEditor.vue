<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { onMounted, onUnmounted, ref, watch } from 'vue'

interface Props {
  modelValue: string
  placeholder?: string
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请输入内容...',
  height: 300,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const localValue = ref(props.modelValue)
const theme = ref<'light' | 'dark'>('light')
let clearThemeListener: (() => void) | null = null

const resolveTheme = () => {
  theme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const onThemeChange = () => {
  resolveTheme()
}

onMounted(() => {
  const themeMedia = window.matchMedia('(prefers-color-scheme: dark)')
  resolveTheme()
  themeMedia.addEventListener('change', onThemeChange)
  clearThemeListener = () => themeMedia.removeEventListener('change', onThemeChange)
})

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== localValue.value) {
      localValue.value = newValue || ''
    }
  },
)

watch(localValue, (newValue) => {
  emit('update:modelValue', newValue)
})

onUnmounted(() => {
  clearThemeListener?.()
  clearThemeListener = null
})
</script>

<template>
  <div class="markdown-editor">
    <MdEditor
      v-model="localValue"
      :theme="theme"
      :language="'zh-CN'"
      :preview-theme="'github'"
      :code-theme="theme === 'dark' ? 'atom' : 'github'"
      :placeholder="placeholder"
      :style="{ height: `${height}px` }"
      :toolbars="[
        'bold',
        'italic',
        'strikeThrough',
        '-',
        'title',
        'quote',
        'unorderedList',
        'orderedList',
        '-',
        'codeRow',
        'code',
        'link',
        'table',
        '-',
        'revoke',
        'next',
        '=',
        'preview',
        'fullscreen',
      ]"
      :show-code-row-number="true"
      :auto-detect-code="true"
    />
  </div>
</template>

<style scoped>
.markdown-editor :deep(.md-editor) {
  border-radius: 0.5rem;
  border-color: rgb(226 232 240);
  overflow: hidden;
}

.markdown-editor :deep(.md-editor-toolbar) {
  border-bottom-color: rgb(226 232 240);
}

.markdown-editor :deep(.md-editor-preview-wrapper) {
  background-color: rgb(250 250 249);
}
</style>
