'use client'

import { PollRequest } from '@/types'
import { useState } from 'react'

interface AdminRequestListProps {
  requests: PollRequest[]
}

const statusColors: Record<PollRequest['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

export function AdminRequestList({ requests: initial }: AdminRequestListProps) {
  const [requests, setRequests] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)

  const act = async (id: string, action: 'APPROVE' | 'REJECT', notes?: string) => {
    setLoading(id)
    try {
      const res = await fetch('/api/admin/poll-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, notes }),
      })
      if (!res.ok) {
        const d = await res.json()
        alert(d.error || 'Error')
        return
      }
      const data = await res.json()
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' }
            : r
        )
      )
      if (action === 'APPROVE' && data.poll) {
        alert(`Poll created! Short ID: ${data.poll.short_id}`)
      }
    } finally {
      setLoading(null)
    }
  }

  const handleReject = (id: string) => {
    const notes = prompt('Optional notes for rejection:') ?? undefined
    act(id, 'REJECT', notes)
  }

  if (requests.length === 0) {
    return <p className="text-sm text-gray-500">No poll requests yet.</p>
  }

  return (
    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {requests.map((req) => (
        <div key={req.id} className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{req.question}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {req.contact_name && <span>Name: {req.contact_name}</span>}
                {req.contact_email && <span>Email: {req.contact_email}</span>}
                {req.ends_at && <span>Ends: {new Date(req.ends_at).toLocaleDateString()}</span>}
                <span>Submitted: {new Date(req.created_at).toLocaleDateString()}</span>
              </div>
              {req.notes && (
                <p className="mt-1 text-xs text-gray-500 italic">Notes: {req.notes}</p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[req.status]}`}
            >
              {req.status}
            </span>
          </div>

          {req.status === 'PENDING' && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => act(req.id, 'APPROVE')}
                disabled={loading === req.id}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {loading === req.id ? 'Processing…' : 'Approve'}
              </button>
              <button
                onClick={() => handleReject(req.id)}
                disabled={loading === req.id}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
