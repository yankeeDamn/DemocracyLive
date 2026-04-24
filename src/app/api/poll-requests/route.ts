import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTurnstile } from '@/lib/turnstile'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'

  let body: {
    question?: string
    ends_at?: string
    contact_email?: string
    contact_name?: string
    turnstileToken?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { question, ends_at, contact_email, contact_name, turnstileToken } = body

  if (!question || typeof question !== 'string' || question.trim().length < 5) {
    return NextResponse.json({ error: 'Question is required (min 5 chars)' }, { status: 400 })
  }

  // Verify Turnstile
  const turnstileOk = await verifyTurnstile(turnstileToken, ip)
  if (!turnstileOk) {
    return NextResponse.json({ error: 'Bot verification failed' }, { status: 403 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('poll_requests')
    .insert({
      question: question.trim(),
      ends_at: ends_at || null,
      contact_email: contact_email || null,
      contact_name: contact_name || null,
      status: 'PENDING',
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
