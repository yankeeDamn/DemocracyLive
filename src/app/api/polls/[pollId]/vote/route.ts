import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTurnstile } from '@/lib/turnstile'
import { rateLimiter } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function computeInsight(yesCount: number, noCount: number, total: number): string {
  if (total === 0) return 'No votes yet'
  const yesP = Math.round((yesCount / total) * 100)
  const noP = 100 - yesP
  if (yesP === noP) return "It's a tie!"
  const leader = yesP > noP ? 'YES' : 'NO'
  const margin = Math.abs(yesP - noP)
  return `${leader} leads by ${margin} point${margin === 1 ? '' : 's'}`
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const { pollId } = await params

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  if (rateLimiter(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: { choice?: string; deviceToken?: string; turnstileToken?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { choice, deviceToken, turnstileToken } = body

  if (!choice || !['YES', 'NO'].includes(choice)) {
    return NextResponse.json({ error: 'Invalid choice' }, { status: 400 })
  }
  if (!deviceToken || typeof deviceToken !== 'string') {
    return NextResponse.json({ error: 'Missing device token' }, { status: 400 })
  }
  if (!UUID_PATTERN.test(deviceToken)) {
    return NextResponse.json({ error: 'Invalid device token format' }, { status: 400 })
  }

  // Verify Turnstile
  const turnstileOk = await verifyTurnstile(turnstileToken, ip)
  if (!turnstileOk) {
    return NextResponse.json({ error: 'Bot verification failed' }, { status: 403 })
  }

  const supabase = createAdminClient()

  // Fetch poll
  const { data: poll, error: pollErr } = await supabase
    .from('polls')
    .select('id, yes_count, no_count, total_count, ends_at')
    .eq('short_id', pollId)
    .single()

  if (pollErr || !poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
    return NextResponse.json({ error: 'Poll has ended' }, { status: 410 })
  }

  // Hash device token
  const deviceHash = createHash('sha256').update(deviceToken).digest('hex')

  // Check for duplicate vote
  const { data: existingVote } = await supabase
    .from('votes')
    .select('id, choice')
    .eq('poll_id', poll.id)
    .eq('device_hash', deviceHash)
    .maybeSingle()

  if (existingVote) {
    const total = poll.total_count
    const yesP = total > 0 ? Math.round((poll.yes_count / total) * 100) : 0
    const noP = total > 0 ? 100 - yesP : 0
    return NextResponse.json({
      already_voted: true,
      user_vote: existingVote.choice,
      yes_count: poll.yes_count,
      no_count: poll.no_count,
      total_count: total,
      yes_percent: yesP,
      no_percent: noP,
      insight: computeInsight(poll.yes_count, poll.no_count, total),
    })
  }

  // Insert vote
  const { error: voteErr } = await supabase
    .from('votes')
    .insert({ poll_id: poll.id, choice, device_hash: deviceHash })

  if (voteErr) {
    if (voteErr.code === '23505') {
      return NextResponse.json({ error: 'Already voted' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
  }

  // Atomically update counts via Postgres function
  const yesInc = choice === 'YES' ? 1 : 0
  const noInc = choice === 'NO' ? 1 : 0

  let yesCount = poll.yes_count + yesInc
  let noCount = poll.no_count + noInc
  let total = poll.total_count + 1

  const { data: updated, error: updateErr } = await supabase.rpc('increment_vote_counts', {
    p_poll_id: poll.id,
    p_yes_inc: yesInc,
    p_no_inc: noInc,
  })

  if (!updateErr && Array.isArray(updated) && updated.length > 0) {
    yesCount = updated[0].yes_count
    noCount = updated[0].no_count
    total = updated[0].total_count
  }

  const yesP = total > 0 ? Math.round((yesCount / total) * 100) : 0
  const noP = total > 0 ? 100 - yesP : 0

  return NextResponse.json({
    user_vote: choice,
    yes_count: yesCount,
    no_count: noCount,
    total_count: total,
    yes_percent: yesP,
    no_percent: noP,
    insight: computeInsight(yesCount, noCount, total),
  })
}
