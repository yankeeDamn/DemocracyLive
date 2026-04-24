import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function GET(_req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('poll_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id?: string; action?: 'APPROVE' | 'REJECT'; notes?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { id, action, notes } = body
  if (!id || !action || !['APPROVE', 'REJECT'].includes(action)) {
    return NextResponse.json({ error: 'id and action (APPROVE|REJECT) required' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (action === 'REJECT') {
    const { error } = await admin
      .from('poll_requests')
      .update({ status: 'REJECTED', notes: notes ?? null })
      .eq('id', id)
    if (error) return NextResponse.json({ error: 'Failed to reject' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // APPROVE – fetch the request and create a poll
  const { data: pollReq, error: reqErr } = await admin
    .from('poll_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (reqErr || !pollReq) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const { customAlphabet } = await import('nanoid')
  const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8)
  const shortId = nanoid()

  const { data: poll, error: pollErr } = await admin
    .from('polls')
    .insert({
      short_id: shortId,
      question: pollReq.question,
      ends_at: pollReq.ends_at,
      created_by: user.id,
    })
    .select('id, short_id')
    .single()

  if (pollErr || !poll) {
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
  }

  await admin.from('poll_requests').update({ status: 'APPROVED' }).eq('id', id)

  return NextResponse.json({ ok: true, poll })
}
