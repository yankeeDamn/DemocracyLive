export type Vote = 'YES' | 'NO'

export interface Poll {
  id: string
  question: string
  yes_count: number
  no_count: number
  total_count: number
  ends_at: string | null
  created_at: string
  short_id: string
}

export type PollStatus = 'ACTIVE' | 'ENDED' | 'ENDING_SOON'

export interface DashboardPoll extends Poll {
  yes_percent: number
  no_percent: number
  status: PollStatus
}

export interface PollRequest {
  id: string
  question: string
  ends_at: string | null
  contact_email: string | null
  contact_name: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  notes: string | null
  created_at: string
}

export interface PollComment {
  id: string
  poll_id: string
  choice: Vote
  comment_text: string
  alias: string | null
  is_hidden?: boolean
  created_at: string
  polls?: Array<{
    short_id: string
    question: string
  }> | null
}

export interface VoteResult {
  yes_count: number
  no_count: number
  total_count: number
  yes_percent: number
  no_percent: number
  insight: string
  user_vote: Vote
  already_voted?: boolean
}
