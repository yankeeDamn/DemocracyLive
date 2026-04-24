'use client'

import { createClient } from '@/lib/supabase/client'
import { APP_URL } from '@/lib/config'
import { DashboardPoll } from '@/types'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CopyPollLinkButton } from './CopyPollLinkButton'

type Filter = 'active' | 'ending' | 'ended'

const POLL_REFRESH_INTERVAL_MS = 20_000

interface DashboardClientProps {
  initialPolls: DashboardPoll[]
}

export function DashboardClient({ initialPolls }: DashboardClientProps) {
  const [polls, setPolls] = useState<DashboardPoll[]>(initialPolls)
  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadPolls = useCallback(async () => {
    setRefreshing(true)
    try {
      const params = new URLSearchParams({ status: filter })
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())

      const res = await fetch(`/api/polls?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setPolls(data.polls ?? [])
    } finally {
      setRefreshing(false)
    }
  }, [filter, debouncedSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPolls()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadPolls])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('public:polls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => {
        void loadPolls()
      })
      .subscribe()

    const interval = setInterval(() => {
      void loadPolls()
    }, POLL_REFRESH_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [loadPolls])

  const stats = useMemo(() => {
    const totalVotes = polls.reduce((sum, poll) => sum + poll.total_count, 0)
    const activeCount = polls.filter((poll) => poll.status === 'ACTIVE' || poll.status === 'ENDING_SOON').length
    return {
      pollCount: polls.length,
      totalVotes,
      activeCount,
    }
  }, [polls])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Showing polls" value={stats.pollCount} />
        <StatCard label="Total votes" value={stats.totalVotes} />
        <StatCard label="Active now" value={stats.activeCount} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <FilterButton active={filter === 'active'} onClick={() => setFilter('active')}>
              Active
            </FilterButton>
            <FilterButton active={filter === 'ending'} onClick={() => setFilter('ending')}>
              Ending soon
            </FilterButton>
            <FilterButton active={filter === 'ended'} onClick={() => setFilter('ended')}>
              Ended
            </FilterButton>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search poll question"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-72"
          />
        </div>
        <p className="mt-3 text-xs text-gray-500">{refreshing ? 'Refreshing…' : 'Live updates enabled'}</p>
      </div>

      <div className="space-y-4">
        {polls.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
            No polls found for the current filter.
          </div>
        ) : (
          polls.map((poll) => (
            <article key={poll.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{poll.question}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {poll.total_count.toLocaleString()} total votes
                    {poll.ends_at
                      ? ` · Ends ${new Date(poll.ends_at).toLocaleString()}`
                      : ' · No end date'}
                  </p>
                </div>
                <StatusBadge status={poll.status} />
              </div>

              <div className="mt-4 space-y-2">
                <ProgressRow label="YES" percent={poll.yes_percent} color="green" count={poll.yes_count} />
                <ProgressRow label="NO" percent={poll.no_percent} color="red" count={poll.no_count} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/p/${poll.short_id}`}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Open poll
                </Link>
                <CopyPollLinkButton pollId={poll.short_id} appUrl={APP_URL} label="Copy share link" />
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium ${
        active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: DashboardPoll['status'] }) {
  const tone =
    status === 'ENDED'
      ? 'bg-gray-100 text-gray-700'
      : status === 'ENDING_SOON'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-emerald-100 text-emerald-700'

  const label = status === 'ENDING_SOON' ? 'Ending soon' : status === 'ACTIVE' ? 'Active' : 'Ended'

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{label}</span>
}

function ProgressRow({
  label,
  percent,
  color,
  count,
}: {
  label: 'YES' | 'NO'
  percent: number
  color: 'green' | 'red'
  count: number
}) {
  const bar = color === 'green' ? 'bg-green-500' : 'bg-red-500'
  const text = color === 'green' ? 'text-green-700' : 'text-red-700'

  return (
    <div>
      <div className={`mb-1 flex items-center justify-between text-sm font-semibold ${text}`}>
        <span>
          {label} · {count.toLocaleString()}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full ${bar}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
