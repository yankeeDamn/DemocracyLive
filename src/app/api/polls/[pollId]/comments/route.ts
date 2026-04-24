import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimiter } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

const BAD_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'idiot']

function isCommentClean(text: string): boolean {
  const normalized = text.toLowerCase()
  if (BAD_WORDS.some((word) => normalized.includes(word))) return false

  // Basic spam checks
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

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
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

  if (!commentText || commentText.length < 2 || commentText.length > 500) {
    return NextResponse.json(
      { error: 'Comment must be between 2 and 500 characters' },
      { status: 400 }
    )
  }

  if (alias && alias.length > 40) {
    return NextResponse.json({ error: 'Alias must be 40 characters or less' }, { status: 400 })
  }

  if (!deviceToken || typeof deviceToken !== 'string') {
    return NextResponse.json({ error: 'Missing device token' }, { status: 400 })
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

  const { data, error } = await supabase
    .from('poll_comments')
    .insert({
      poll_id: poll.id,
      choice,
      comment_text: commentText,
      alias,
    })
    .select('id, poll_id, choice, comment_text, alias, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
