import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

describe('router auth guard', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('redirects unauthenticated users from /submit', async () => {
    const { supabase } = await import('../lib/supabaseClient')
    ;(supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
    })

    const { default: router } = await import('../router')
    await router.push('/submit')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/submit')
  })

  it('redirects unauthenticated users from /me', async () => {
    const { supabase } = await import('../lib/supabaseClient')
    ;(supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
    })

    const { default: router } = await import('../router')
    await router.push('/me')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/me')
  })

  it('allows authenticated users to access /submit', async () => {
    const { supabase } = await import('../lib/supabaseClient')
    ;(supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    })

    const { default: router } = await import('../router')
    await router.push('/submit')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/submit')
  })
})
