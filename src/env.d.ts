/// <reference types="vite/client" />

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $t: (key: string, params?: Record<string, unknown>) => string
  }
}

export {}
