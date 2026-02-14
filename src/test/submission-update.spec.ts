import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'submission-1' } }),
}))

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

vi.mock('../services/supabaseApi', () => ({
  claimReviewSlot: vi.fn(),
  fetchComments: vi.fn(),
  fetchReviewOpinions: vi.fn(),
  fetchReviewSlots: vi.fn(),
  fetchSubmissionDetail: vi.fn(),
  updateSubmissionContent: vi.fn(),
  updateSubmissionDecision: vi.fn(),
}))

describe('submission update flow', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates submission content with incremented version', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-09T00:00:00Z'))

    const auth = (await import('../stores/auth')) as unknown as {
      __setAuth: (_nextUser: unknown, _nextProfile: unknown) => void
    }
    auth.__setAuth({ id: 'author-1' }, { role: null })

    const api = await import('../services/supabaseApi')
    ;(api.fetchSubmissionDetail as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: 'submission-1',
        title: 'Old Title',
        abstract: 'Old Abstract',
        content_md: 'Old Content',
        created_at: '2026-02-01T00:00:00Z',
        updated_at: '2026-02-08T00:00:00Z',
        accepted_at: null,
        rejected_at: null,
        status: 'in_review',
        author_id: 'author-1',
        keywords: ['alpha'],
        version_major: 1,
        version_minor: 2,
        version_label: '20260201_V1.2',
        author: { username: 'author' },
      },
      error: null,
    })
    ;(api.fetchComments as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null })
    ;(api.fetchReviewOpinions as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      error: null,
    })
    ;(api.fetchReviewSlots as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null })
    ;(api.updateSubmissionContent as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null })

    const { default: SubmissionDetailPage } = await import('../pages/SubmissionDetailPage.vue')
    const wrapper = mount(SubmissionDetailPage, {
      global: {
        stubs: {
          RouterLink: true,
          MarkdownEditor: {
            template:
              '<div class="mock-markdown-editor"><textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea></div>',
            props: ['modelValue'],
          },
        },
      },
    })

    await flushPromises()

    // Find inputs by their labels in the edit section
    const inputs = wrapper.findAll('input')
    const textareas = wrapper.findAll('textarea')

    // Find title input (first input without placeholder in edit section)
    const titleInput = inputs.find((input) => {
      const el = input.element as unknown as { type: string }
      return el.type === 'text' && !input.attributes('placeholder')?.includes('关键词')
    })
    if (!titleInput) {
      throw new Error('Title input not found')
    }
    await titleInput.setValue('New Title')

    // Find abstract textarea (first textarea)
    if (textareas.length > 0) {
      await textareas[0].setValue('New Abstract')
    }

    // Find content textarea (second textarea)
    if (textareas.length > 1) {
      await textareas[1].setValue('New Content')
    }

    // Find keywords input
    const keywordsInput = inputs.find((input) =>
      input.attributes('placeholder')?.includes('关键词'),
    )
    if (keywordsInput) {
      await keywordsInput.setValue('alpha, beta')
    }

    const saveButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('保存') || button.text().includes('Save'))
    if (!saveButton) {
      throw new Error('Save button not found')
    }
    await saveButton.trigger('click')
    await flushPromises()

    expect(api.updateSubmissionContent).toHaveBeenCalledWith('submission-1', {
      title: 'New Title',
      abstract: 'New Abstract',
      content_md: 'New Content',
      keywords: ['alpha', 'beta'],
      version_major: 1,
      version_minor: 3,
      version_label: '20260209_V1.3',
    })
  })
})
