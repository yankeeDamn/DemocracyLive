import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/config'
import { CopyPollLinkButton } from '@/components/CopyPollLinkButton'

export const dynamic = 'force-dynamic'
async function getLivePolls() {
  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data } = await admin
    .from('polls')
    .select('id, short_id, question, yes_count, no_count, total_count, ends_at, created_at')
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(6)

  return data ?? []
}

export default async function HomePage() {
  const livePolls = await getLivePolls()

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-4 py-12 text-gray-900">
      <div className="mx-auto max-w-6xl space-y-14">
        <section className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">DemocracyLive</p>
          <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Anonymous YES/NO polls with live results</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Launch poll questions, share with anyone, and follow live voting momentum and comments in one place.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-indigo-700"
            >
              Open live dashboard
            </Link>
            <Link
              href="/request"
              className="rounded-xl border border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              Request a poll
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              Admin area
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <TrustCard title="Anonymous" description="No account required to vote." />
          <TrustCard title="Secure" description="Supabase-backed poll integrity." />
          <TrustCard title="Bot protected" description="Cloudflare Turnstile verification." />
        </section>

        <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">How it works</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StepCard index="1" title="Create" text="Request or create a YES/NO poll in seconds." />
            <StepCard index="2" title="Share" text="Share poll links on social and messaging apps." />
            <StepCard index="3" title="Track" text="Monitor live votes, status, and comments." />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Live polls preview</h2>
            <Link href="/dashboard" className="text-sm font-semibold text-indigo-600 hover:underline">
              View all live polls →
            </Link>
          </div>

          {livePolls.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
              No active polls yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {livePolls.map((poll) => {
                const total = poll.total_count || 0
                const yesPercent = total > 0 ? Math.round((poll.yes_count / total) * 100) : 0
                const noPercent = total > 0 ? 100 - yesPercent : 0

                return (
                  <article key={poll.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-900">{poll.question}</h3>
                    <p className="mt-1 text-sm text-gray-500">{total.toLocaleString()} total votes</p>

                    <div className="mt-3 space-y-2">
                      <MiniBar label="YES" percent={yesPercent} tone="green" />
                      <MiniBar label="NO" percent={noPercent} tone="red" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/p/${poll.short_id}`}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        Vote now
                      </Link>
                      <CopyPollLinkButton pollId={poll.short_id} appUrl={APP_URL} label="Copy link" />
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function TrustCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </div>
  )
}

function StepCard({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="rounded-xl bg-indigo-50 p-4">
      <p className="text-sm font-semibold text-indigo-700">Step {index}</p>
      <h3 className="mt-1 font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{text}</p>
    </div>
  )
}

function MiniBar({
  label,
  percent,
  tone,
}: {
  label: 'YES' | 'NO'
  percent: number
  tone: 'green' | 'red'
}) {
  const text = tone === 'green' ? 'text-green-700' : 'text-red-700'
  const bar = tone === 'green' ? 'bg-green-500' : 'bg-red-500'

  return (
    <div>
      <div className={`mb-1 flex items-center justify-between text-xs font-semibold ${text}`}>
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full ${bar}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
