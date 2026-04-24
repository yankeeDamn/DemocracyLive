# 🗳 DemocracyLive

**Anonymous YES/NO polling app** — share polls on social media, collect votes, and see real-time results.

Built with **Next.js 15 App Router**, **Tailwind CSS**, **Supabase**, and **Cloudflare Turnstile**.

---

## Features

| Feature | Detail |
|---|---|
| Public poll page | `/p/[pollId]` — question, YES/NO buttons, results after voting |
| Anonymous voting | Client: localStorage device token. Server: SHA-256 hash + DB unique constraint |
| Bot protection | Cloudflare Turnstile on vote submit + poll request form |
| Rate limiting | 10 req / 60 s / IP (in-memory; swap for Upstash Redis in production) |
| Social sharing | Twitter/X, Facebook, WhatsApp, Copy link |
| Open Graph images | Dynamic 1200×630 OG image per poll |
| Poll requests | `/request` — public form → admin review queue |
| Admin area | `/admin` — Supabase Auth protected; approve/reject requests, create/delete polls, view stats |
| Supabase RLS | Polls: public read / admin write. Votes: service-role only. Requests: public insert / admin read-update |

---

## Tech stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** (Postgres + Auth + Row-Level Security)
- **Cloudflare Turnstile** (bot protection)
- **Vercel** (deployment target)

---

## Local setup

### 1. Clone & install

```bash
git clone https://github.com/yankeeDamn/DemocracyLive.git
cd DemocracyLive
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` — see [Environment variables](#environment-variables) below.

### 3. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run **`supabase/schema.sql`** (all tables, indexes, RLS, and the `increment_vote_counts` function).
3. Copy your **Project URL**, **anon key**, and **service_role key** into `.env.local`.
4. To create the first admin user:  
   - Go to **Authentication → Users → Invite user** (or use the Supabase CLI).  
   - Only users you explicitly create can log in to `/admin`.

### 4. Cloudflare Turnstile

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Turnstile**.
2. Add a site, choose **Managed** challenge.
3. Copy **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`  
   Copy **Secret Key** → `TURNSTILE_SECRET_KEY`

> **Dev mode:** If `TURNSTILE_SECRET_KEY` is not set, server-side verification is skipped. If `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is not set, the widget shows a "dev mode" placeholder.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-only) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ⚠️ | Cloudflare Turnstile site key (optional in dev) |
| `TURNSTILE_SECRET_KEY` | ⚠️ | Cloudflare Turnstile secret key (optional in dev) |
| `NEXT_PUBLIC_APP_URL` | ⚠️ | Full app URL, no trailing slash (e.g. `https://democracylive.vercel.app`) |

---

## Deployment to Vercel

1. Push to GitHub.
2. Import the repo in [vercel.com](https://vercel.com) → **Add New Project**.
3. Set all env vars in **Settings → Environment Variables**.
4. Deploy. Vercel auto-detects Next.js.

> **Important:** The in-memory rate limiter resets per serverless function instance. For high-traffic production use, replace it with [Upstash Redis](https://upstash.com/) — instructions are in `src/lib/rate-limit.ts`.

---

## Project structure

```
src/
├── app/
│   ├── layout.tsx                   # Root layout + metadata
│   ├── page.tsx                     # Home page
│   ├── p/[pollId]/
│   │   ├── page.tsx                 # Public poll page (server)
│   │   ├── VotingSection.tsx        # Client voting component
│   │   ├── opengraph-image.tsx      # Dynamic OG image
│   │   └── not-found.tsx
│   ├── request/page.tsx             # Poll request page
│   ├── admin/
│   │   ├── page.tsx                 # Admin dashboard
│   │   ├── login/page.tsx           # Admin login
│   │   └── polls/new/page.tsx       # Create poll
│   └── api/
│       ├── polls/[pollId]/route.ts          # GET poll
│       ├── polls/[pollId]/vote/route.ts     # POST vote
│       ├── poll-requests/route.ts           # POST request
│       └── admin/
│           ├── poll-requests/route.ts       # GET/POST admin requests
│           ├── polls/route.ts               # GET/POST admin polls
│           ├── polls/[pollId]/route.ts      # GET/DELETE poll
│           └── logout/route.ts              # POST logout
├── components/
│   ├── TurnstileWidget.tsx
│   ├── ResultsDisplay.tsx
│   ├── ShareButtons.tsx
│   ├── PollRequestForm.tsx
│   ├── AdminPollList.tsx
│   └── AdminRequestList.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts     # Browser Supabase client
│   │   ├── server.ts     # Server Supabase client (cookies)
│   │   └── admin.ts      # Admin client (service role)
│   ├── rate-limit.ts     # In-memory sliding window rate limiter
│   ├── turnstile.ts      # Cloudflare Turnstile verification
│   └── config.ts         # Shared constants
├── middleware.ts          # Auth guard for /admin routes
└── types/index.ts         # TypeScript types
supabase/
└── schema.sql             # Full DB schema + RLS + helper function
```

---

## Security & privacy notes

- **Votes are anonymous.** Only a SHA-256 hash of the client-generated UUID is stored; the original UUID never leaves the client.
- **No PII is collected** during voting. Poll requests optionally accept an email/name, stored only to help admins contact requesters.
- **Turnstile** prevents automated vote submission without identifying users.
- **Rate limiting** (10 req/min/IP) limits brute-force or replay attacks.
- **Supabase RLS** ensures the public can only read polls and submit requests — all write operations to polls and votes go through the service-role API routes.
- **Admin routes** are protected by Supabase Auth (JWT) both at the middleware level and at the API handler level.
- **Service role key** is server-only and never exposed to the client.

---

## How to create a poll (quick start)

1. Log in at `/admin/login`.
2. Click **+ Create poll**, enter your question, optionally set an end date.
3. Share the generated URL `/p/<shortId>` on social media.

Or let users submit requests at `/request` and approve them from the admin dashboard.
