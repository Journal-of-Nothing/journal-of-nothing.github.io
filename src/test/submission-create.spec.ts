import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const markdownEditorStub = {
  template:
    '<div class="mock-markdown-editor"><textarea :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea></div>',
  props: ['modelValue', 'placeholder'],
}

vi.mock('../stores/auth', async () => {
  const { ref } = await import('vue')
  const user = ref<unknown | null>(null)
  const profile = ref<unknown | null>(null)
  return {
    useAuth: () => ({ user, profile, isInitialized: ref(true), signOut: vi.fn() }),
    __setAuth: (nextUser: unknown, nextProfile: unknown) => {
      user.value = nextUser
      profile.value = nextProfile
    },
  }
})

vi.mock('vue-router', () => {
  const replace = vi.fn()
  return {
    useRouter: () => ({ replace }),
    __replace: replace,
  }
})

vi.mock('../services/supabaseApi', () => ({
  createSubmission: vi.fn(),
}))

describe('submission create flow', () => {
  it('blocks anonymous submission', async () => {
    const auth = (await import('../stores/auth')) as unknown as {
      __setAuth: (_nextUser: unknown, _nextProfile: unknown) => void
    }
    auth.__setAuth(null, null)

    const { default: SubmissionCreatePage } = await import('../pages/SubmissionCreatePage.vue')
    const wrapper = mount(SubmissionCreatePage, {
      global: {
        stubs: {
          MarkdownEditor: markdownEditorStub,
        },
      },
    })

    const submitButton = wrapper.findAll('button').find((button) => button.text() === '提交投稿')
    if (!submitButton) {
      throw new Error('Submit button not found')
    }
    await submitButton.trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('请先登录')
  })

  it('blocks users without submit permission', async () => {
    const auth = (await import('../stores/auth')) as unknown as {
      __setAuth: (_nextUser: unknown, _nextProfile: unknown) => void
    }
    auth.__setAuth({ id: 'user-1' }, { can_submit: false })

    const { default: SubmissionCreatePage } = await import('../pages/SubmissionCreatePage.vue')
    const wrapper = mount(SubmissionCreatePage, {
      global: {
        stubs: {
          MarkdownEditor: markdownEditorStub,
        },
      },
    })

    const submitButton = wrapper.findAll('button').find((button) => button.text() === '提交投稿')
    if (!submitButton) {
      throw new Error('Submit button not found')
    }
    await submitButton.trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('当前账号无投稿权限')
  })

  it('submits when inputs are valid', async () => {
    const auth = (await import('../stores/auth')) as unknown as {
      __setAuth: (_nextUser: unknown, _nextProfile: unknown) => void
    }
    auth.__setAuth({ id: 'user-1' }, { can_submit: true })

    const { createSubmission } = await import('../services/supabaseApi')
    ;(createSubmission as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null })

    const { default: SubmissionCreatePage } = await import('../pages/SubmissionCreatePage.vue')
    const wrapper = mount(SubmissionCreatePage, {
      global: {
        stubs: {
          MarkdownEditor: {
            ...markdownEditorStub,
          },
        },
      },
    })

    await wrapper.find('input[placeholder="文章标题"]').setValue('Test Title')
    await wrapper.find('textarea[placeholder="文章摘要"]').setValue('Test Abstract')
    await wrapper.find('textarea[placeholder="Markdown 正文"]').setValue('Test Content')
    await wrapper.find('input[placeholder="关键词，用逗号分隔"]').setValue('alpha, beta, ,gamma')

    const submitButton = wrapper.findAll('button').find((button) => button.text() === '提交投稿')
    if (!submitButton) {
      throw new Error('Submit button not found')
    }
    await submitButton.trigger('click')
    await flushPromises()

    expect(createSubmission).toHaveBeenCalledWith({
      title: 'Test Title',
      abstract: 'Test Abstract',
      content_md: 'Test Content',
      author_id: 'user-1',
      author_name: null,
      author_email: null,
      author_affiliation: null,
      keywords: ['alpha', 'beta', 'gamma'],
    })

    const router = (await import('vue-router')) as unknown as {
      __replace: ReturnType<typeof vi.fn>
    }
    expect(router.__replace).toHaveBeenCalledWith('/in-review')
  })
})
