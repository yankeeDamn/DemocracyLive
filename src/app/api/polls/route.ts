import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const ENDING_SOON_HOURS = 24

function parseLimit(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 20
  return Math.min(parsed, 100)
}

function getStatus(endsAt: string | null): 'ACTIVE' | 'ENDED' | 'ENDING_SOON' {
  if (!endsAt) return 'ACTIVE'
  const ends = new Date(endsAt).getTime()
  const now = Date.now()

  if (ends <= now) return 'ENDED'
  if (ends <= now + ENDING_SOON_HOURS * 60 * 60 * 1000) return 'ENDING_SOON'
  return 'ACTIVE'
}

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const url = new URL(req.url)

  const status = (url.searchParams.get('status') ?? 'active').toLowerCase()
  const search = (url.searchParams.get('q') ?? '').trim()
  const limit = parseLimit(url.searchParams.get('limit'))
  const nowIso = new Date().toISOString()

  let query = supabase
    .from('polls')
    .select('id, short_id, question, yes_count, no_count, total_count, ends_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status === 'ended') {
    query = query.lt('ends_at', nowIso)
  } else if (status === 'ending') {
    const endingSoonIso = new Date(Date.now() + ENDING_SOON_HOURS * 60 * 60 * 1000).toISOString()
    query = query.gt('ends_at', nowIso).lte('ends_at', endingSoonIso)
  } else if (status === 'active') {
    query = query.or(`ends_at.is.null,ends_at.gt.${nowIso}`)
  }

  if (search) {
    query = query.ilike('question', `%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 })
  }

  const polls = (data ?? []).map((poll) => {
    const total = poll.total_count || 0
    const yesPercent = total > 0 ? Math.round((poll.yes_count / total) * 100) : 0

    return {
      ...poll,
      yes_percent: yesPercent,
      no_percent: total > 0 ? 100 - yesPercent : 0,
      status: getStatus(poll.ends_at),
    }
  })

  return NextResponse.json({ polls })
}
