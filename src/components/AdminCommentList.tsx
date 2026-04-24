'use client'

import { PollComment } from '@/types'
import Link from 'next/link'
import { useState } from 'react'

interface AdminCommentListProps {
  comments: PollComment[]
}

export function AdminCommentList({ comments: initial }: AdminCommentListProps) {
  const [comments, setComments] = useState(initial)
  const [working, setWorking] = useState<string | null>(null)

  const toggleHidden = async (commentId: string, nextHidden: boolean) => {
    setWorking(commentId)
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: nextHidden }),
      })

      if (!res.ok) throw new Error('Failed')

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? { ...comment, is_hidden: nextHidden } : comment
        )
      )
    } catch {
      alert('Failed to update comment visibility')
    } finally {
      setWorking(null)
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment permanently?')) return

    setWorking(commentId)
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setComments((prev) => prev.filter((comment) => comment.id !== commentId))
    } catch {
      alert('Failed to delete comment')
    } finally {
      setWorking(null)
    }
  }

  if (comments.length === 0) {
    return <p className="text-sm text-gray-500">No comments yet.</p>
  }

  return (
    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {comments.map((comment) => (
        <div key={comment.id} className="space-y-2 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${
                  comment.choice === 'YES' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {comment.choice}
              </span>
              <span>{comment.alias || 'Anonymous'}</span>
              <span>{new Date(comment.created_at).toLocaleString()}</span>
              {comment.is_hidden && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 font-semibold text-yellow-700">
                  Hidden
                </span>
              )}
            </div>
            {comment.polls?.[0]?.short_id && (
              <Link
                href={`/p/${comment.polls[0].short_id}`}
                target="_blank"
                className="text-indigo-600 hover:underline"
              >
                Open poll
              </Link>
            )}
          </div>

          <p className="text-sm text-gray-800">{comment.comment_text}</p>
          <p className="text-xs text-gray-500">{comment.polls?.[0]?.question ?? 'Unknown poll'}</p>

          <div className="flex gap-2">
            <button
              onClick={() => toggleHidden(comment.id, !comment.is_hidden)}
              disabled={working === comment.id}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {comment.is_hidden ? 'Unhide' : 'Hide'}
            </button>
            <button
              onClick={() => deleteComment(comment.id)}
              disabled={working === comment.id}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
