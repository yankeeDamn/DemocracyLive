import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardClient } from '@/components/DashboardClient'
import { DashboardPoll } from '@/types'
import Link from 'next/link'
import Image from 'next/image'

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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Image
          src="/globe.svg"
          alt=""
          width={112}
          height={112}
          className="absolute -left-8 top-12 animate-[spin_40s_linear_infinite] opacity-20 motion-reduce:animate-none"
        />
        <Image
          src="/window.svg"
          alt=""
          width={96}
          height={96}
          className="absolute right-6 top-24 animate-bounce opacity-15 [animation-duration:4s] motion-reduce:animate-none"
        />
        <Image
          src="/file.svg"
          alt=""
          width={80}
          height={80}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-pulse opacity-20 motion-reduce:animate-none"
        />
      </div>

      <div className="relative mx-auto max-w-5xl space-y-8">
        <header className="space-y-4 text-center">
          <div className="text-left">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-indigo-200 bg-white/80 px-3 py-2 text-sm font-medium text-indigo-700 backdrop-blur hover:bg-white"
            >
              ← Back to home
            </Link>
          </div>
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
