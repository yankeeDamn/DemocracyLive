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
