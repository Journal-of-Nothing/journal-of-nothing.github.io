import { computed, ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

const session = ref<Session | null>(null)
const profile = ref<{
  id: string
  username: string | null
  role: string | null
  can_submit: boolean
  can_review: boolean
  can_comment: boolean
} | null>(null)
const isInitialized = ref(false)
let hasListener = false

const loadSession = async () => {
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  isInitialized.value = true
}

const fetchProfile = async (userId: string) => {
  const { data } = await supabase
    .from('users')
    .select('id,username,role,can_submit,can_review,can_comment')
    .eq('id', userId)
    .maybeSingle()

  profile.value = data ?? null
}

const ensureUserProfile = async (user: User | null) => {
  if (!user) return

  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  const derived =
    user.user_metadata?.user_name || user.user_metadata?.full_name || user.email?.split('@')[0]

  const username = existing?.username || derived

  await supabase.from('users').upsert({
    id: user.id,
    username: username || null,
    avatar_url: user.user_metadata?.avatar_url || null,
  })

  await fetchProfile(user.id)
}

export const initAuth = async () => {
  if (!isInitialized.value) {
    await loadSession()
  }

  await ensureUserProfile(session.value?.user ?? null)

  if (!hasListener) {
    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      if (newSession?.user) {
        ensureUserProfile(newSession.user)
      } else {
        profile.value = null
      }
    })
    hasListener = true
  }
}

export const useAuth = () => {
  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => !!session.value?.user)

  const signOut = async () => {
    await supabase.auth.signOut()
    profile.value = null
  }

  return {
    session,
    user,
    profile,
    isInitialized,
    isAuthenticated,
    signOut,
  }
}
