'use client'

import { Vote, VoteResult } from '@/types'

interface ResultsDisplayProps {
  result: VoteResult
  question: string
}

export function ResultsDisplay({ result, question }: ResultsDisplayProps) {
  const { yes_count, no_count, total_count, yes_percent, no_percent, insight, user_vote } = result

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{question}</h1>

      {/* Insight banner */}
      <div className="rounded-xl bg-indigo-50 px-5 py-4 text-center">
        <p className="text-lg font-semibold text-indigo-700">{insight}</p>
        <p className="mt-1 text-sm text-indigo-500">
          {total_count.toLocaleString()} vote{total_count !== 1 ? 's' : ''} cast
          {user_vote ? ` · You voted ${user_vote}` : ''}
        </p>
      </div>

      {/* YES bar */}
      <VoteBar
        label="YES"
        count={yes_count}
        percent={yes_percent}
        chosen={user_vote === 'YES'}
        color="green"
      />

      {/* NO bar */}
      <VoteBar
        label="NO"
        count={no_count}
        percent={no_percent}
        chosen={user_vote === 'NO'}
        color="red"
      />
    </div>
  )
}

interface VoteBarProps {
  label: Vote
  count: number
  percent: number
  chosen: boolean
  color: 'green' | 'red'
}

function VoteBar({ label, count, percent, chosen, color }: VoteBarProps) {
  const bar = color === 'green' ? 'bg-green-500' : 'bg-red-500'
  const text = color === 'green' ? 'text-green-700' : 'text-red-700'
  const bg = color === 'green' ? 'bg-green-50' : 'bg-red-50'
  const border = chosen ? (color === 'green' ? 'border-green-400' : 'border-red-400') : 'border-transparent'

  return (
    <div className={`rounded-xl border-2 ${border} ${bg} px-4 py-3`}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`font-bold ${text} flex items-center gap-2`}>
          {label}
          {chosen && (
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold shadow-sm">
              Your vote
            </span>
          )}
        </span>
        <span className={`text-lg font-bold ${text}`}>{percent}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white shadow-inner">
        <div
          className={`h-full rounded-full ${bar} transition-all duration-700`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <p className="mt-1 text-right text-xs text-gray-500">
        {count.toLocaleString()} vote{count !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
