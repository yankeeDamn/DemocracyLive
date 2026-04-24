import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AdminPollList } from '@/components/AdminPollList'
import { AdminRequestList } from '@/components/AdminRequestList'
import { AdminCommentList } from '@/components/AdminCommentList'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin – DemocracyLive',
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  const [{ data: polls }, { data: requests }, { data: comments }] = await Promise.all([
    admin.from('polls').select('*').order('created_at', { ascending: false }),
    admin.from('poll_requests').select('*').order('created_at', { ascending: false }),
    admin
      .from('poll_comments')
      .select('id, poll_id, choice, comment_text, alias, is_hidden, created_at, polls(short_id, question)')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const totalVotes = (polls ?? []).reduce((sum, p) => sum + (p.total_count ?? 0), 0)
  const pendingCount = (requests ?? []).filter((r) => r.status === 'PENDING').length
  const commentCount = (comments ?? []).length

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🗳 DemocracyLive Admin</h1>
            <p className="text-sm text-gray-500">Signed in as {user.email}</p>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total polls" value={(polls ?? []).length} />
          <StatCard label="Total votes" value={totalVotes} />
          <StatCard label="Comments" value={commentCount} />
          <StatCard label="Pending requests" value={pendingCount} highlight={pendingCount > 0} />
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Poll requests</h2>
          </div>
          <AdminRequestList requests={requests ?? []} />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">All polls</h2>
            <Link
              href="/admin/polls/new"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Create poll
            </Link>
          </div>
          <AdminPollList polls={polls ?? []} />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Comment moderation</h2>
          </div>
          <AdminCommentList comments={comments ?? []} />
        </section>
      </div>
    </main>
  )
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${highlight ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${highlight ? 'text-yellow-700' : 'text-gray-900'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}
