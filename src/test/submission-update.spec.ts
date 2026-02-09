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
        stubs: { RouterLink: true },
      },
    })

    await flushPromises()

    await wrapper.find('input[placeholder="关键词，用逗号分隔"]').setValue('alpha, beta')
    const titleInput = wrapper.findAll('input').find((input) => !input.attributes('placeholder'))
    if (!titleInput) {
      throw new Error('Title input not found')
    }
    await titleInput.setValue('New Title')
    await wrapper.find('textarea[rows="3"]').setValue('New Abstract')
    await wrapper.find('textarea[rows="6"]').setValue('New Content')

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '保存修改')
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
