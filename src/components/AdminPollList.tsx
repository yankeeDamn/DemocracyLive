'use client'

import { Poll } from '@/types'
import Link from 'next/link'
import { useState } from 'react'

interface AdminPollListProps {
  polls: Poll[]
}

export function AdminPollList({ polls: initial }: AdminPollListProps) {
  const [polls, setPolls] = useState(initial)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (shortId: string) => {
    if (!confirm('Delete this poll and all its votes? This cannot be undone.')) return
    setDeleting(shortId)
    try {
      const res = await fetch(`/api/admin/polls/${shortId}`, { method: 'DELETE' })
      if (res.ok) setPolls((prev) => prev.filter((p) => p.short_id !== shortId))
      else alert('Failed to delete poll')
    } finally {
      setDeleting(null)
    }
  }

  if (polls.length === 0) {
    return <p className="text-sm text-gray-500">No polls yet. Create one above.</p>
  }

  return (
    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {polls.map((poll) => (
        <div key={poll.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{poll.question}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>ID: {poll.short_id}</span>
              <span>👍 {poll.yes_count} YES · 👎 {poll.no_count} NO · {poll.total_count} total</span>
              {poll.ends_at && (
                <span>Ends: {new Date(poll.ends_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/p/${poll.short_id}`}
              target="_blank"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              View
            </Link>
            <button
              onClick={() => handleDelete(poll.short_id)}
              disabled={deleting === poll.short_id}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting === poll.short_id ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
