import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardClient } from '@/components/DashboardClient'
import { DashboardPoll } from '@/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Live Dashboard',
  description: 'Track active DemocracyLive polls in near real-time.',
}

function getStatus(endsAt: string | null): DashboardPoll['status'] {
  if (!endsAt) return 'ACTIVE'

  const ends = new Date(endsAt).getTime()
  const now = Date.now()

  if (ends <= now) return 'ENDED'
  if (ends <= now + 24 * 60 * 60 * 1000) return 'ENDING_SOON'
  return 'ACTIVE'
}

async function getActivePolls(): Promise<DashboardPoll[]> {
  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data } = await admin
    .from('polls')
    .select('id, short_id, question, yes_count, no_count, total_count, ends_at, created_at')
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(20)

  return (data ?? []).map((poll) => {
    const total = poll.total_count || 0
    const yesPercent = total > 0 ? Math.round((poll.yes_count / total) * 100) : 0

    return {
      ...poll,
      yes_percent: yesPercent,
      no_percent: total > 0 ? 100 - yesPercent : 0,
      status: getStatus(poll.ends_at),
    }
  })
}

export default async function DashboardPage() {
  const initialPolls = await getActivePolls()

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">📊 Live Voting Dashboard</h1>
          <p className="mt-2 text-gray-600">
            See active polls, watch results update, and jump into the discussion.
          </p>
        </header>

        <DashboardClient initialPolls={initialPolls} />
      </div>
    </main>
  )
}
