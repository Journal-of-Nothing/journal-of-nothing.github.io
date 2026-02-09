import { describe, expect, it, vi } from 'vitest'
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
  closeReviewOpinion: vi.fn(),
  createReviewOpinion: vi.fn(),
  createReviewOpinionReply: vi.fn(),
  fetchReviewOpinionReplies: vi.fn(),
  fetchReviewOpinions: vi.fn(),
  fetchSubmissionDetail: vi.fn(),
}))

describe('review opinion reply permissions', () => {
  it('allows reviewer to reply and uses reviewer role', async () => {
    const auth = (await import('../stores/auth')) as unknown as {
      __setAuth: (_nextUser: unknown, _nextProfile: unknown) => void
    }
    auth.__setAuth({ id: 'reviewer-1' }, { role: null })

    const api = await import('../services/supabaseApi')
    ;(api.fetchSubmissionDetail as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: 'submission-1',
        title: 'Test',
        updated_at: '2026-02-08T00:00:00Z',
        status: 'in_review',
        author_id: 'author-1',
        author: { username: 'author' },
      },
      error: null,
    })
    ;(api.fetchReviewOpinions as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'op-1',
          body_md: 'Review body',
          created_at: '2026-02-08T00:00:00Z',
          status: 'open',
          decision: 'minor',
          reviewer_id: 'reviewer-1',
          reviewer: { username: 'reviewer' },
          author_reply_md: null,
        },
      ],
      error: null,
    })
    ;(api.fetchReviewOpinionReplies as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      error: null,
    })
    ;(api.createReviewOpinionReply as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null })

    const { default: SubmissionReviewOpinionsPage } =
      await import('../pages/SubmissionReviewOpinionsPage.vue')
    const wrapper = mount(SubmissionReviewOpinionsPage, {
      global: {
        stubs: { RouterLink: true },
      },
    })

    await flushPromises()

    const replyBox = wrapper.find('textarea[placeholder="回复审稿意见"]')
    expect(replyBox.exists()).toBe(true)

    await replyBox.setValue('Thanks for the feedback')
    const submitButton = wrapper.findAll('button').find((button) => button.text() === '提交回复')
    if (!submitButton) {
      throw new Error('Reply submit button not found')
    }
    await submitButton.trigger('click')
    await flushPromises()

    expect(api.createReviewOpinionReply).toHaveBeenCalledWith({
      submission_id: 'submission-1',
      review_opinion_id: 'op-1',
      author_id: 'reviewer-1',
      role: 'reviewer',
      body_md: 'Thanks for the feedback',
    })
  })

  it('hides reply form from unrelated users', async () => {
    const auth = (await import('../stores/auth')) as unknown as {
      __setAuth: (_nextUser: unknown, _nextProfile: unknown) => void
    }
    auth.__setAuth({ id: 'someone-else' }, { role: null })

    const api = await import('../services/supabaseApi')
    ;(api.fetchSubmissionDetail as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: 'submission-1',
        title: 'Test',
        updated_at: '2026-02-08T00:00:00Z',
        status: 'in_review',
        author_id: 'author-1',
        author: { username: 'author' },
      },
      error: null,
    })
    ;(api.fetchReviewOpinions as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'op-1',
          body_md: 'Review body',
          created_at: '2026-02-08T00:00:00Z',
          status: 'open',
          decision: 'minor',
          reviewer_id: 'reviewer-1',
          reviewer: { username: 'reviewer' },
          author_reply_md: null,
        },
      ],
      error: null,
    })
    ;(api.fetchReviewOpinionReplies as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      error: null,
    })

    const { default: SubmissionReviewOpinionsPage } =
      await import('../pages/SubmissionReviewOpinionsPage.vue')
    const wrapper = mount(SubmissionReviewOpinionsPage, {
      global: {
        stubs: { RouterLink: true },
      },
    })

    await flushPromises()

    expect(wrapper.find('textarea[placeholder="回复审稿意见"]').exists()).toBe(false)
  })
})
