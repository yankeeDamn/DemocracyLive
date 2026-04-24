'use client'

import { useState } from 'react'
import { TurnstileWidget } from './TurnstileWidget'
import { TURNSTILE_SITE_KEY } from '@/lib/config'

export function PollRequestForm() {
  const [question, setQuestion] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!turnstileToken && TURNSTILE_SITE_KEY) {
      setError('Please complete the verification challenge.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/poll-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          ends_at: endsAt || undefined,
          contact_email: email || undefined,
          contact_name: name || undefined,
          turnstileToken,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit request')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-xl bg-green-50 p-8 text-center">
        <div className="mb-4 text-5xl">🎉</div>
        <h2 className="text-xl font-bold text-green-800">Request submitted!</h2>
        <p className="mt-2 text-green-700">
          Thanks! An admin will review your poll request and publish it soon.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="question" className="block text-sm font-medium text-gray-700">
          Poll question <span className="text-red-500">*</span>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Your name <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="name"
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="email"
            type="email"
            maxLength={200}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken} />

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  )
}
