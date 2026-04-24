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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { commentId } = await params

  let body: { is_hidden?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (typeof body.is_hidden !== 'boolean') {
    return NextResponse.json({ error: 'is_hidden must be boolean' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('poll_comments')
    .update({ is_hidden: body.is_hidden })
    .eq('id', commentId)

  if (error) return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { commentId } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('poll_comments').delete().eq('id', commentId)

  if (error) return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
