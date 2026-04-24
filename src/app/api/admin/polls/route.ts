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
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { question?: string; ends_at?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { question, ends_at } = body
  if (!question || typeof question !== 'string' || question.trim().length < 5) {
    return NextResponse.json({ error: 'Question required (min 5 chars)' }, { status: 400 })
  }

  const { customAlphabet } = await import('nanoid')
  const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8)
  const shortId = nanoid()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('polls')
    .insert({
      short_id: shortId,
      question: question.trim(),
      ends_at: ends_at || null,
      created_by: user.id,
    })
    .select('id, short_id, question')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
