import { supabase } from '../lib/supabaseClient'
import type {
  AnnouncementRecord,
  CommentRecord,
  ReviewOpinionRecord,
  ReviewOpinionReplyRecord,
  ReviewSlot,
  StatIndex,
  SubmissionDetail,
  SubmissionListItem,
  SubmissionListItemWithMeta,
  SubmissionStatus,
  UserProfile,
} from '../types/domain'

type SubmissionListItemRaw = Omit<SubmissionListItem, 'author'> & {
  author?: UserProfile | UserProfile[] | null
}

type CommentRecordRaw = Omit<CommentRecord, 'author'> & {
  author?: UserProfile | UserProfile[] | null
}

type ReviewOpinionRecordRaw = Omit<ReviewOpinionRecord, 'reviewer'> & {
  reviewer?: UserProfile | UserProfile[] | null
}

type ReviewOpinionReplyRecordRaw = Omit<ReviewOpinionReplyRecord, 'author'> & {
  author?: UserProfile | UserProfile[] | null
}

const normalizeSubmissionList = (
  rows: SubmissionListItemRaw[] | null,
): SubmissionListItem[] | null => {
  if (!rows) return null
  return rows.map((item) => ({
    ...item,
    author: Array.isArray(item.author) ? (item.author[0] ?? null) : (item.author ?? null),
  }))
}

const normalizeCommentList = (rows: CommentRecordRaw[] | null): CommentRecord[] | null => {
  if (!rows) return null
  return rows.map((item) => ({
    ...item,
    author: Array.isArray(item.author) ? (item.author[0] ?? null) : (item.author ?? null),
  }))
}

const normalizeReviewOpinionList = (
  rows: ReviewOpinionRecordRaw[] | null,
): ReviewOpinionRecord[] | null => {
  if (!rows) return null
  return rows.map((item) => ({
    ...item,
    reviewer: Array.isArray(item.reviewer) ? (item.reviewer[0] ?? null) : (item.reviewer ?? null),
  }))
}

const normalizeReviewOpinionReplyList = (
  rows: ReviewOpinionReplyRecordRaw[] | null,
): ReviewOpinionReplyRecord[] | null => {
  if (!rows) return null
  return rows.map((item) => ({
    ...item,
    author: Array.isArray(item.author) ? (item.author[0] ?? null) : (item.author ?? null),
  }))
}

export const fetchStats = async (): Promise<{
  data: StatIndex[] | null
  error: { message: string } | null
}> => {
  const { data, error } = await supabase.from('stats_indexes').select('key,value')
  if (!error) {
    return { data: (data as StatIndex[] | null) ?? null, error: null }
  }

  const fallback = await buildStatsFallback()
  return { data: fallback, error: null }
}

export const fetchAnnouncements = async (
  limit = 5,
): Promise<{
  data: AnnouncementRecord[] | null
  error: { message: string } | null
}> => {
  const { data, error } = await supabase
    .from('announcements')
    .select('id,title,body_md,created_at,updated_at,author_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  return {
    data: (data as AnnouncementRecord[] | null) ?? null,
    error: error ? { message: error.message } : null,
  }
}

export const fetchAnnouncementsPage = async (params: {
  page: number
  pageSize: number
  orderBy: 'created_at' | 'updated_at' | 'title'
  ascending: boolean
}): Promise<{
  data: AnnouncementRecord[] | null
  count: number
  error: { message: string } | null
}> => {
  const from = Math.max(params.page - 1, 0) * params.pageSize
  const to = from + params.pageSize - 1

  const { data, error, count } = await supabase
    .from('announcements')
    .select('id,title,body_md,created_at,updated_at,author_id', { count: 'exact' })
    .order(params.orderBy, { ascending: params.ascending })
    .range(from, to)

  return {
    data: (data as AnnouncementRecord[] | null) ?? null,
    count: count ?? 0,
    error: error ? { message: error.message } : null,
  }
}

const buildStatsFallback = async (): Promise<StatIndex[]> => {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [acceptedRes, inReviewRes, weeklyCommentsRes, reviewersRes] = await Promise.all([
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'accepted'),
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'in_review'),
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString()),
    supabase
      .from('review_opinions')
      .select('reviewer_id')
      .not('reviewer_id', 'is', null)
      .limit(1000),
  ])

  const reviewerIds = new Set<string>()
  if (!reviewersRes.error) {
    ;(reviewersRes.data as Array<{ reviewer_id: string | null }> | null)?.forEach((row) => {
      if (row.reviewer_id) {
        reviewerIds.add(row.reviewer_id)
      }
    })
  }

  return [
    { key: 'accepted', value: acceptedRes.count ?? 0 },
    { key: 'in_review', value: inReviewRes.count ?? 0 },
    { key: 'reviewers', value: reviewerIds.size },
    { key: 'weekly_comments', value: weeklyCommentsRes.count ?? 0 },
  ]
}

export const fetchSubmissionsByStatus = async (
  status: SubmissionStatus,
): Promise<{
  data: SubmissionListItem[] | null
  error: { message: string } | null
}> => {
  const { data, error } = await supabase
    .from('submissions')
    .select('id,title,updated_at,status,author:users(username)')
    .eq('status', status)
    .order('updated_at', { ascending: false })

  if (error) {
    const retry = await supabase
      .from('submissions')
      .select('id,title,updated_at,status')
      .eq('status', status)
      .order('updated_at', { ascending: false })
    return {
      data: normalizeSubmissionList((retry.data as SubmissionListItemRaw[] | null) ?? null),
      error: retry.error ? { message: retry.error.message } : null,
    }
  }

  return {
    data: normalizeSubmissionList((data as SubmissionListItemRaw[] | null) ?? null),
    error: null,
  }
}

export const fetchRecentActivities = async (
  limit = 6,
): Promise<{
  data: SubmissionListItem[] | null
  error: { message: string } | null
}> => {
  const { data, error } = await supabase
    .from('submissions')
    .select('id,title,updated_at,status,author:users(username)')
    .in('status', ['accepted', 'in_review'])
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    const retry = await supabase
      .from('submissions')
      .select('id,title,updated_at,status')
      .in('status', ['accepted', 'in_review'])
      .order('updated_at', { ascending: false })
      .limit(limit)
    return {
      data: normalizeSubmissionList((retry.data as SubmissionListItemRaw[] | null) ?? null),
      error: retry.error ? { message: retry.error.message } : null,
    }
  }

  return {
    data: normalizeSubmissionList((data as SubmissionListItemRaw[] | null) ?? null),
    error: null,
  }
}

const buildCountMap = (rows: Array<{ submission_id: string }>) => {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.submission_id] = (acc[row.submission_id] ?? 0) + 1
    return acc
  }, {})
}

export const fetchSubmissionListWithMeta = async (
  status: SubmissionStatus,
): Promise<{
  data: SubmissionListItemWithMeta[] | null
  error: { message: string } | null
}> => {
  const { data, error } = await supabase
    .from('submissions')
    .select('id,title,updated_at,status,author:users(username)')
    .eq('status', status)
    .order('updated_at', { ascending: false })

  let list = normalizeSubmissionList((data as SubmissionListItemRaw[] | null) ?? null) ?? []
  if (error) {
    const retry = await supabase
      .from('submissions')
      .select('id,title,updated_at,status')
      .eq('status', status)
      .order('updated_at', { ascending: false })

    if (retry.error) {
      return { data: null, error: { message: retry.error.message } }
    }

    list = normalizeSubmissionList((retry.data as SubmissionListItemRaw[] | null) ?? null) ?? []
  }
  if (!list.length) {
    return { data: [], error: null }
  }

  const ids = list.map((item) => item.id)

  const [commentsRes, reviewsRes, slotsRes] = await Promise.all([
    supabase.from('comments').select('submission_id').in('submission_id', ids),
    supabase.from('review_opinions').select('submission_id').in('submission_id', ids),
    status === 'in_review'
      ? supabase.from('review_slots').select('submission_id').in('submission_id', ids)
      : Promise.resolve({ data: [] as Array<{ submission_id: string }>, error: null }),
  ])

  const commentMap = buildCountMap(
    (commentsRes.error ? [] : (commentsRes.data as Array<{ submission_id: string }>)) ?? [],
  )
  const reviewMap = buildCountMap(
    (reviewsRes.error ? [] : (reviewsRes.data as Array<{ submission_id: string }>)) ?? [],
  )
  const slotMap = buildCountMap(
    (slotsRes.error ? [] : (slotsRes.data as Array<{ submission_id: string }>)) ?? [],
  )

  return {
    data: list.map((item) => ({
      ...item,
      comments_count: commentMap[item.id] ?? 0,
      reviews_count: reviewMap[item.id] ?? 0,
      slots_count: status === 'in_review' ? (slotMap[item.id] ?? 0) : undefined,
    })),
    error: null,
  }
}

export const fetchSubmissionDetail = async (
  id: string,
): Promise<{
  data: SubmissionDetail | null
  error: { message: string } | null
}> => {
  const { data, error } = await supabase
    .from('submissions')
    .select(
      'id,title,abstract,content_md,created_at,updated_at,accepted_at,rejected_at,status,decision,author_id,keywords,version_major,version_minor,version_label,author:users(username)',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    const retry = await supabase
      .from('submissions')
      .select(
        'id,title,abstract,content_md,created_at,updated_at,accepted_at,rejected_at,status,decision,author_id,keywords,version_major,version_minor,version_label',
      )
      .eq('id', id)
      .maybeSingle()
    return {
      data: (retry.data as SubmissionDetail | null) ?? null,
      error: retry.error ? { message: retry.error.message } : null,
    }
  }

  return { data: (data as SubmissionDetail | null) ?? null, error: null }
}

export const createSubmission = async (payload: {
  title: string
  abstract: string
  content_md: string
  author_id: string
  keywords?: string[] | null
}) => {
  return supabase.from('submissions').insert({
    ...payload,
    status: 'in_review',
    keywords: payload.keywords ?? [],
    version_major: 1,
    version_minor: 0,
    version_label: `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_V1.0`,
  })
}

export const updateSubmissionContent = async (
  id: string,
  payload: {
    title: string
    abstract: string
    content_md: string
    keywords?: string[] | null
    version_major?: number | null
    version_minor?: number | null
    version_label?: string | null
  },
) => {
  return supabase
    .from('submissions')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
}

export const fetchUserSubmissions = async (authorId: string) => {
  return supabase
    .from('submissions')
    .select('id,title,status,updated_at')
    .eq('author_id', authorId)
    .order('updated_at', { ascending: false })
}

export const fetchUserSubmissionsPage = async (params: {
  authorId: string
  page: number
  pageSize: number
  orderBy: 'updated_at' | 'status' | 'title'
  ascending: boolean
}): Promise<{
  data: Array<{ id: string; title: string; status: string; updated_at: string }> | null
  count: number
  error: { message: string } | null
}> => {
  const from = Math.max(params.page - 1, 0) * params.pageSize
  const to = from + params.pageSize - 1

  const { data, error, count } = await supabase
    .from('submissions')
    .select('id,title,status,updated_at', { count: 'exact' })
    .eq('author_id', params.authorId)
    .order(params.orderBy, { ascending: params.ascending })
    .range(from, to)

  return {
    data:
      (data as Array<{ id: string; title: string; status: string; updated_at: string }> | null) ??
      null,
    count: count ?? 0,
    error: error ? { message: error.message } : null,
  }
}

export const fetchUserReviewOpinions = async (reviewerId: string) => {
  return supabase
    .from('review_opinions')
    .select('id,submission_id,status,decision,created_at')
    .eq('reviewer_id', reviewerId)
    .order('created_at', { ascending: false })
}

export const fetchUserReviewOpinionsPage = async (params: {
  reviewerId: string
  page: number
  pageSize: number
  orderBy: 'created_at' | 'status'
  ascending: boolean
}): Promise<{
  data: Array<{
    id: string
    submission_id: string
    status: string
    decision: string | null
    created_at: string
  }> | null
  count: number
  error: { message: string } | null
}> => {
  const from = Math.max(params.page - 1, 0) * params.pageSize
  const to = from + params.pageSize - 1

  const { data, error, count } = await supabase
    .from('review_opinions')
    .select('id,submission_id,status,decision,created_at', { count: 'exact' })
    .eq('reviewer_id', params.reviewerId)
    .order(params.orderBy, { ascending: params.ascending })
    .range(from, to)

  return {
    data:
      (data as Array<{
        id: string
        submission_id: string
        status: string
        decision: string | null
        created_at: string
      }> | null) ?? null,
    count: count ?? 0,
    error: error ? { message: error.message } : null,
  }
}

export const updateSubmissionDecision = async (
  id: string,
  payload: {
    status: 'accepted' | 'rejected' | 'in_review'
    decision: 'accept' | 'major' | 'reject' | null
  },
) => {
  const timestamp = new Date().toISOString()
  return supabase
    .from('submissions')
    .update({
      status: payload.status,
      decision: payload.decision,
      updated_at: timestamp,
      accepted_at: payload.status === 'accepted' ? timestamp : null,
      rejected_at: payload.status === 'rejected' ? timestamp : null,
    })
    .eq('id', id)
}

export const fetchComments = async (
  submissionId: string,
): Promise<{
  data: CommentRecord[] | null
  error: { message: string } | null
}> => {
  const { data, error } = await supabase
    .from('comments')
    .select('id,created_at,body_md,author:users(username)')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false })

  if (error) {
    const retry = await supabase
      .from('comments')
      .select('id,created_at,body_md')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })
    return {
      data: (retry.data as CommentRecord[] | null) ?? null,
      error: retry.error ? { message: retry.error.message } : null,
    }
  }

  return { data: normalizeCommentList((data as CommentRecordRaw[] | null) ?? null), error: null }
}

export const createComment = async (payload: {
  submission_id: string
  author_id: string
  body_md: string
}) => {
  return supabase.from('comments').insert(payload)
}

export const fetchReviewOpinions = async (
  submissionId: string,
): Promise<{
  data: ReviewOpinionRecord[] | null
  error: { message: string } | null
}> => {
  const { data, error } = await supabase
    .from('review_opinions')
    .select(
      'id,created_at,body_md,reviewer_id,status,decision,author_reply_md,reviewer:users(username)',
    )
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false })

  if (error) {
    const retry = await supabase
      .from('review_opinions')
      .select('id,created_at,body_md,reviewer_id,status,decision,author_reply_md')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })
    return {
      data: (retry.data as ReviewOpinionRecord[] | null) ?? null,
      error: retry.error ? { message: retry.error.message } : null,
    }
  }

  return {
    data: normalizeReviewOpinionList((data as ReviewOpinionRecordRaw[] | null) ?? null),
    error: null,
  }
}

export const fetchReviewOpinionReplies = async (
  submissionId: string,
): Promise<{
  data: ReviewOpinionReplyRecord[] | null
  error: { message: string } | null
}> => {
  const { data, error } = await supabase
    .from('review_opinion_replies')
    .select(
      'id,review_opinion_id,submission_id,author_id,role,body_md,created_at,author:users(username)',
    )
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) {
    const retry = await supabase
      .from('review_opinion_replies')
      .select('id,review_opinion_id,submission_id,author_id,role,body_md,created_at')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true })

    return {
      data: (retry.data as ReviewOpinionReplyRecord[] | null) ?? null,
      error: retry.error ? { message: retry.error.message } : null,
    }
  }

  return {
    data: normalizeReviewOpinionReplyList((data as ReviewOpinionReplyRecordRaw[] | null) ?? null),
    error: null,
  }
}

export const createReviewOpinionReply = async (payload: {
  submission_id: string
  review_opinion_id: string
  author_id: string
  role: 'author' | 'reviewer'
  body_md: string
}) => {
  return supabase.from('review_opinion_replies').insert(payload)
}

export const createReviewOpinion = async (payload: {
  submission_id: string
  reviewer_id: string
  body_md: string
  decision: 'accept' | 'minor' | 'major' | 'reject'
}) => {
  return supabase.from('review_opinions').insert({
    ...payload,
    status: 'open',
  })
}

export const updateReviewOpinionReply = async (id: string, author_reply_md: string) => {
  return supabase
    .from('review_opinions')
    .update({
      author_reply_md,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
}

export const fetchReviewSlots = async (
  submissionId: string,
): Promise<{
  data: ReviewSlot[] | null
  error: { message: string } | null
}> => {
  const { data, error } = await supabase
    .from('review_slots')
    .select('id,submission_id,reviewer_id,status,claimed_at,due_at')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  return {
    data: (data as ReviewSlot[] | null) ?? null,
    error: error ? { message: error.message } : null,
  }
}

export const claimReviewSlot = async (slotId: string, reviewerId: string) => {
  const dueAt = new Date()
  dueAt.setDate(dueAt.getDate() + 14)

  return supabase
    .from('review_slots')
    .update({
      reviewer_id: reviewerId,
      status: 'claimed',
      claimed_at: new Date().toISOString(),
      due_at: dueAt.toISOString(),
    })
    .eq('id', slotId)
}

export const markReviewSlotExpired = async (slotId: string) => {
  return supabase.from('review_slots').update({ status: 'expired' }).eq('id', slotId)
}

export const updateUserPermissions = async (payload: {
  id: string
  role?: 'author' | 'reviewer' | 'deputy_editor' | 'admin'
  can_submit?: boolean
  can_review?: boolean
  can_comment?: boolean
}) => {
  return supabase.from('users').update(payload).eq('id', payload.id)
}

export const createAnnouncement = async (payload: { title: string; body_md: string | null }) => {
  return supabase.from('announcements').insert(payload)
}

export const updateAnnouncement = async (
  id: string,
  payload: { title?: string; body_md?: string | null },
) => {
  return supabase
    .from('announcements')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
}

export const deleteAnnouncement = async (id: string) => {
  return supabase.from('announcements').delete().eq('id', id)
}

export const checkUsernameAvailable = async (username: string) => {
  const normalized = username.trim()
  if (!normalized) {
    return { available: false, error: { message: '请输入用户名' } }
  }

  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .ilike('username', normalized)

  if (error) {
    return { available: false, error: { message: error.message } }
  }

  return { available: (count ?? 0) === 0, error: null }
}

export const closeReviewOpinion = async (id: string) => {
  return supabase
    .from('review_opinions')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', id)
}
