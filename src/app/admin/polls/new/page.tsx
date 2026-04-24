'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewPollPage() {
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, ends_at: endsAt || undefined }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create poll')

      router.push(`/p/${data.short_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <Link href="/admin" className="text-sm font-medium text-indigo-600 hover:underline">
            ← Back to admin
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <h1 className="mb-6 text-xl font-bold text-gray-900">Create a poll</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700">
                Question <span className="text-red-500">*</span>
              </label>
              <textarea
                id="question"
                required
                minLength={5}
                maxLength={300}
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Should we…?"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="endsAt" className="block text-sm font-medium text-gray-700">
                End date <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="endsAt"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create poll'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
