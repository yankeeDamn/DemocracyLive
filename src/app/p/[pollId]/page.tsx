import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { VotingSection } from './VotingSection'
import { APP_URL } from '@/lib/config'
import type { Metadata } from 'next'
import Link from 'next/link'

interface Props {
  params: Promise<{ pollId: string }>
}

async function getPoll(pollId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('polls')
    .select('*')
    .eq('short_id', pollId)
    .single()
  return data
}

async function getVisibleComments(pollId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('poll_comments')
    .select('id, poll_id, choice, comment_text, alias, created_at')
    .eq('poll_id', pollId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(100)

  return data ?? []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pollId } = await params
  const poll = await getPoll(pollId)
  if (!poll) return { title: 'Poll not found' }

  const url = `${APP_URL}/p/${pollId}`
  return {
    title: poll.question,
    description: `Vote YES or NO on: ${poll.question}`,
    openGraph: {
      title: poll.question,
      description: `Vote YES or NO on: ${poll.question}`,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: poll.question,
      description: `Vote YES or NO on: ${poll.question}`,
    },
  }
}

export default async function PollPage({ params }: Props) {
  const { pollId } = await params
  const poll = await getPoll(pollId)
  if (!poll) notFound()

  const comments = await getVisibleComments(poll.id)

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-white px-4 py-12">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4 text-sm font-medium">
            <Link href="/" className="text-indigo-600 hover:underline">
              ← DemocracyLive
            </Link>
            <span className="text-gray-300">•</span>
            <Link href="/dashboard" className="text-indigo-600 hover:underline">
              Live dashboard
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <VotingSection poll={poll} initialComments={comments} />
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Anonymous · Secure · Powered by DemocracyLive
        </p>
      </div>
    </main>
  )
}
