import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettier from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx,vue}'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        document: 'readonly',
        window: 'readonly',
        HTMLElement: 'readonly',
        HTMLLinkElement: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['src/test/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
      },
    },
  },
  prettier,
]
