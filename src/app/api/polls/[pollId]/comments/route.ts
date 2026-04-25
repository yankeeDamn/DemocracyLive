import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimiter } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import {
  COMMENT_BLOCKLIST_PATTERNS,
  COMMENT_MAX_LENGTH,
  COMMENT_MIN_LENGTH,
  normalizeCommentText,
} from '@/lib/comments'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function getClientIp(req: NextRequest): string {
  const cfIp = req.headers.get('cf-connecting-ip')?.trim()
  if (cfIp) return cfIp

  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first && /^[0-9a-fA-F:.]+$/.test(first)) return first
  }

  return '127.0.0.1'
}

function isCommentClean(text: string): boolean {
  const normalized = normalizeCommentText(text)
  if (COMMENT_BLOCKLIST_PATTERNS.some((pattern) => pattern.test(normalized))) return false

  // Basic spam checks
  // Reject spam with 9+ consecutive identical characters (e.g., 'aaaaaaaaa').
  if (/(.)\1{8,}/.test(text)) return false
  if ((text.match(/https?:\/\//g) ?? []).length > 1) return false

  return true
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const { pollId } = await params
  const supabase = createAdminClient()

  const { data: poll } = await supabase
    .from('polls')
    .select('id')
    .eq('short_id', pollId)
    .single()

  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('poll_comments')
    .select('id, poll_id, choice, comment_text, alias, created_at')
    .eq('poll_id', poll.id)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }

  const comments = data ?? []

  return NextResponse.json({
    comments,
    yes_comments: comments.filter((comment) => comment.choice === 'YES'),
    no_comments: comments.filter((comment) => comment.choice === 'NO'),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const { pollId } = await params

  const ip = getClientIp(req)
  if (rateLimiter(`comment:${ip}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: {
    choice?: string
    commentText?: string
    alias?: string
    deviceToken?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const choice = body.choice
  const commentText = body.commentText?.trim()
  const alias = body.alias?.trim() || null
  const deviceToken = body.deviceToken

  if (!choice || !['YES', 'NO'].includes(choice)) {
    return NextResponse.json({ error: 'Invalid choice' }, { status: 400 })
  }

  if (
    !commentText ||
    commentText.length < COMMENT_MIN_LENGTH ||
    commentText.length > COMMENT_MAX_LENGTH
  ) {
    return NextResponse.json(
      {
        error: `Comment must be between ${COMMENT_MIN_LENGTH} and ${COMMENT_MAX_LENGTH} characters`,
      },
      { status: 400 }
    )
  }

  if (alias && alias.length > 40) {
    return NextResponse.json({ error: 'Alias must be 40 characters or less' }, { status: 400 })
  }

  if (!deviceToken || typeof deviceToken !== 'string') {
    return NextResponse.json({ error: 'Missing device token' }, { status: 400 })
  }
  if (!UUID_PATTERN.test(deviceToken)) {
    return NextResponse.json({ error: 'Invalid device token format' }, { status: 400 })
  }

  if (!isCommentClean(commentText)) {
    return NextResponse.json(
      { error: 'Please keep comments respectful and avoid spam' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data: poll } = await supabase
    .from('polls')
    .select('id')
    .eq('short_id', pollId)
    .single()

  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  const deviceHash = createHash('sha256').update(deviceToken).digest('hex')

  const { data: vote } = await supabase
    .from('votes')
    .select('choice')
    .eq('poll_id', poll.id)
    .eq('device_hash', deviceHash)
    .maybeSingle()

  if (!vote) {
    return NextResponse.json({ error: 'You must vote before commenting' }, { status: 403 })
  }

  if (vote.choice !== choice) {
    return NextResponse.json({ error: 'Comment choice must match your vote' }, { status: 400 })
  }

  const insertBase = {
    poll_id: poll.id,
    choice,
    comment_text: commentText,
    alias,
  }

  const insertComment = (payload: Record<string, unknown>) =>
    supabase
      .from('poll_comments')
      .insert(payload)
      .select('id, poll_id, choice, comment_text, alias, created_at')
      .single()

  const withDeviceHash = await insertComment({ ...insertBase, device_hash: deviceHash })

  // PGRST204 = PostgREST "column not found"; 42703 = PostgreSQL "undefined column".
  // Fallback keeps compatibility with deployments where poll_comments has no device_hash column.
  const shouldFallbackWithoutDeviceHash =
    withDeviceHash.error &&
    (withDeviceHash.error.code === 'PGRST204' || withDeviceHash.error.code === '42703')

  const result = shouldFallbackWithoutDeviceHash ? await insertComment(insertBase) : withDeviceHash
  const { data, error } = result

  if (!data || error) {
    return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
