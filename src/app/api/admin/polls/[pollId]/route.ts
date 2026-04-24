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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pollId } = await params
  const admin = createAdminClient()
  const { data, error } = await admin.from('polls').select('*').eq('short_id', pollId).single()

  if (error || !data) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pollId } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('polls').delete().eq('short_id', pollId)

  if (error) return NextResponse.json({ error: 'Failed to delete poll' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
