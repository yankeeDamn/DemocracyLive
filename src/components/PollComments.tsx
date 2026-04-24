'use client'

import { PollComment, Vote } from '@/types'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface PollCommentsProps {
  pollId: string
  userVote: Vote | null
}

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

export function PollComments({ pollId, userVote }: PollCommentsProps) {
  const [comments, setComments] = useState<PollComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [alias, setAlias] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/polls/${pollId}/comments`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load comments')
      setComments(data.comments ?? [])
    } catch {
      // Keep UI functional even if comments endpoint is temporarily unavailable
    }
  }, [pollId])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadComments()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadComments])

  const yesComments = useMemo(
    () => comments.filter((comment) => comment.choice === 'YES'),
    [comments]
  )
  const noComments = useMemo(
    () => comments.filter((comment) => comment.choice === 'NO'),
    [comments]
  )

  const submitComment = async () => {
    if (!userVote) {
      setError('Vote first to share your thoughts.')
      return
    }

    const trimmed = commentText.trim()
    if (trimmed.length < 2 || trimmed.length > 500) {
      setError('Comment must be between 2 and 500 characters.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/polls/${pollId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choice: userVote,
          commentText: trimmed,
          alias: alias.trim() || null,
          deviceToken: getOrCreateDeviceToken(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to post comment')

      setComments((prev) => [data, ...prev])
      setCommentText('')
      setAlias('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Comments & thoughts</h2>

      {userVote ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm text-gray-600">You voted {userVote}. Why did you choose this?</p>
          <div className="space-y-2">
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={40}
              placeholder="Anonymous alias (optional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={500}
              placeholder="Share your reasoning..."
              className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={submitComment}
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Vote first to add your comment. You can still read what others shared.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <CommentColumn title="YES" comments={yesComments} color="green" />
        <CommentColumn title="NO" comments={noComments} color="red" />
      </div>
    </section>
  )
}

function CommentColumn({
  title,
  comments,
  color,
}: {
  title: Vote
  comments: PollComment[]
  color: 'green' | 'red'
}) {
  const tone = color === 'green' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>{title}</h3>
      <div className="mt-3 space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-800">{comment.comment_text}</p>
              <p className="mt-2 text-xs text-gray-500">
                — {comment.alias || 'Anonymous'} · {new Date(comment.created_at).toLocaleString()}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
