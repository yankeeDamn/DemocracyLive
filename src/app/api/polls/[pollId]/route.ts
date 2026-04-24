import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const { pollId } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('polls')
    .select('id, short_id, question, yes_count, no_count, total_count, ends_at, created_at')
    .eq('short_id', pollId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
