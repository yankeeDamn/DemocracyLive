import { PollRequestForm } from '@/components/PollRequestForm'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Request a Poll – DemocracyLive',
  description: 'Submit a poll question for the community to vote on.',
}

export default function RequestPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-white px-4 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <Link href="/" className="text-sm font-medium text-indigo-600 hover:underline">
            ← Back to home
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Request a poll</h1>
          <p className="mb-6 text-sm text-gray-500">
            Have a burning YES/NO question? Submit it and our admin team will review and publish it.
          </p>
          <PollRequestForm />
        </div>
      </div>
    </main>
  )
}
