export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl">🗳</div>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Poll not found</h1>
      <p className="mt-2 text-gray-500">
        This poll does not exist or may have been removed.
      </p>
      <a
        href="/"
        className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Go home
      </a>
    </main>
  )
}
