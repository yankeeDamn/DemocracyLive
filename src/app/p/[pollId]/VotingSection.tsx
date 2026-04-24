'use client'

import { useState, useEffect, useCallback } from 'react'
import { Poll, VoteResult } from '@/types'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { ResultsDisplay } from '@/components/ResultsDisplay'
import { ShareButtons } from '@/components/ShareButtons'
import { TURNSTILE_SITE_KEY, APP_URL } from '@/lib/config'

function getOrCreateDeviceToken(): string {
  try {
    let token = localStorage.getItem('device_token')
    if (!token) {
      token = crypto.randomUUID()
      localStorage.setItem('device_token', token)
    }
    return token
  } catch {
    return crypto.randomUUID()
  }
}

interface VotingSectionProps {
  poll: Poll
}

export function VotingSection({ poll }: VotingSectionProps) {
  const [result, setResult] = useState<VoteResult | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if already voted (localStorage)
    try {
      const stored = localStorage.getItem(`voted_${poll.short_id}`)
      if (stored) {
        const parsed = JSON.parse(stored) as VoteResult
        setResult(parsed)
      }
    } catch {
      // ignore
    }
  }, [poll.short_id])

  const handleVote = useCallback(
    async (choice: 'YES' | 'NO') => {
      if (!turnstileToken && TURNSTILE_SITE_KEY) {
        setError('Please complete the bot verification first.')
        return
      }
      setLoading(true)
      setError(null)

      const deviceToken = getOrCreateDeviceToken()

      try {
        const res = await fetch(`/api/polls/${poll.short_id}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ choice, deviceToken, turnstileToken }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to submit vote')
        }

        const voteResult: VoteResult = { ...data, user_vote: data.user_vote ?? choice }
        setResult(voteResult)

        try {
          localStorage.setItem(`voted_${poll.short_id}`, JSON.stringify(voteResult))
        } catch {
          // ignore
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    },
    [poll.short_id, turnstileToken]
  )

  const isPollEnded = poll.ends_at ? new Date(poll.ends_at) < new Date() : false

  if (!mounted) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (result) {
    return (
      <div className="space-y-8">
        <ResultsDisplay result={result} question={poll.question} />
        <ShareButtons pollId={poll.short_id} question={poll.question} appUrl={APP_URL} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{poll.question}</h1>

      {isPollEnded ? (
        <div className="rounded-xl bg-gray-100 px-5 py-4 text-center text-gray-600">
          This poll has ended.
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">Your vote is anonymous. Cast it below.</p>

          <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken} />

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleVote('YES')}
              disabled={loading}
              className="rounded-2xl bg-green-500 px-6 py-6 text-2xl font-bold text-white shadow-lg transition hover:bg-green-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Vote YES"
            >
              👍 YES
            </button>
            <button
              onClick={() => handleVote('NO')}
              disabled={loading}
              className="rounded-2xl bg-red-500 px-6 py-6 text-2xl font-bold text-white shadow-lg transition hover:bg-red-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Vote NO"
            >
              👎 NO
            </button>
          </div>

          {loading && (
            <div className="flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
