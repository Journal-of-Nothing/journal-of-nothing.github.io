export type SubmissionStatus = 'submitted' | 'in_review' | 'accepted' | 'rejected'

export interface UserProfile {
  id: string
  username: string | null
}

export interface SubmissionListItem {
  id: string
  title: string
  updated_at: string
  status: SubmissionStatus
  author?: UserProfile | null
}

export interface SubmissionListItemWithMeta extends SubmissionListItem {
  comments_count: number
  reviews_count: number
  slots_count?: number
}

export interface SubmissionDetail {
  id?: string
  title: string
  abstract?: string | null
  content_md?: string | null
  created_at?: string
  updated_at: string
  accepted_at?: string | null
  rejected_at?: string | null
  status: SubmissionStatus
  decision?: 'accept' | 'minor' | 'major' | 'reject' | null
  author_id?: string | null
  author?: UserProfile | null
  keywords?: string[] | null
  version_major?: number | null
  version_minor?: number | null
  version_label?: string | null
}

export interface SubmissionCreatePayload {
  title: string
  abstract: string
  content_md: string
  author_id: string
  keywords?: string[] | null
}

export interface CommentRecord {
  id: string
  created_at: string
  body_md: string | null
  author?: UserProfile | null
}

export interface ReviewOpinionRecord {
  id: string
  created_at: string
  body_md: string | null
  reviewer_id?: string | null
  status?: 'open' | 'closed'
  decision?: 'accept' | 'minor' | 'major' | 'reject' | null
  author_reply_md?: string | null
  reviewer?: UserProfile | null
}

export interface ReviewOpinionReplyRecord {
  id: string
  review_opinion_id: string
  submission_id: string
  author_id: string | null
  role: 'author' | 'reviewer'
  body_md: string
  created_at: string
  author?: UserProfile | null
}

export interface StatIndex {
  key: string
  value: unknown
}

export interface AnnouncementRecord {
  id: string
  title: string
  body_md: string | null
  created_at: string
  updated_at: string
  author_id?: string | null
}

export interface ReviewSlot {
  id: string
  submission_id: string
  reviewer_id: string | null
  status: 'open' | 'claimed' | 'expired' | 'completed'
  claimed_at: string | null
  due_at: string | null
}
