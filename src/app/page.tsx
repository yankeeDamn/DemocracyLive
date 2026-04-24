import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4 py-16 text-center">
      <div className="text-5xl">🗳</div>
      <h1 className="mt-4 text-4xl font-extrabold text-gray-900 sm:text-5xl">
        DemocracyLive
      </h1>
      <p className="mt-4 max-w-md text-lg text-gray-600">
        Anonymous YES/NO polls you can share anywhere. No account needed to vote.
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/request"
          className="rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-indigo-700 transition"
        >
          Request a poll
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
        >
          Admin area
        </Link>
      </div>

      <p className="mt-16 text-xs text-gray-400">
        Votes are anonymous · Protected by Cloudflare Turnstile · Built with Next.js + Supabase
      </p>
    </main>
  )
}
