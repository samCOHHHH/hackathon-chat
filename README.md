# HackChat

A real-time messaging platform for AI hackathon participants — general chat, DMs, groups, presence, notifications, and an organizer admin dashboard. Built with Next.js App Router, TypeScript, Prisma, and Socket.io.

**Visual identity:** Spotify-inspired — near-black surfaces (`#121212` background, `#000000` sidebar), Spotify green (`#1DB954`) as the single accent color, bold rounded Manrope typography, and pill-shaped buttons/nav items. Applied consistently across light and dark themes.

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript | |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI primitives) + Framer Motion | |
| Auth | Auth.js (NextAuth v5) — Credentials provider, JWT sessions | bcrypt password hashing |
| Database | Prisma ORM + **SQLite** for local dev | Swap `DATABASE_URL` for Postgres in production — schema is Postgres-compatible |
| Realtime | Socket.io, attached to a custom Node server (`server.ts`) | Shared with Next's request handler on one port |
| Storage | Local disk (`public/uploads`) | Swap for S3 / Supabase Storage by changing `src/app/api/upload/route.ts` |

**Why SQLite instead of Postgres/Docker Compose:** this environment had no Docker or Homebrew available, so local Postgres wasn't an option. SQLite via Prisma requires zero setup and the schema/queries are written to be Postgres-compatible — switching later is a `DATABASE_URL` change plus re-running `prisma migrate dev` against a Postgres instance.

## Getting started

```bash
npm install
npx prisma migrate dev   # creates dev.db and applies schema
npm run db:seed          # creates #General + a demo organizer account
npm run dev              # starts Next.js + Socket.io on http://localhost:3000
```

Seeded organizer login: `organizer@hackathon.dev` / `organizer123`

Sign up as a normal participant from `/signup`. Anyone can be promoted to `ORGANIZER` from the admin dashboard (`/admin`) once logged in as the seeded organizer.

## Environment variables (`.env`)

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="..."              # change for any real deployment
NEXTAUTH_URL="http://localhost:3000"
UPLOAD_DIR="./public/uploads"
MAX_UPLOAD_SIZE_MB=25
```

## Architecture

```
server.ts                 # custom Node server: wraps Next.js request handling + Socket.io
src/
  app/
    (auth)/login, /signup           # public auth pages
    (main)/layout.tsx               # sidebar + chat shell for authenticated users
    (main)/chat/[id]/page.tsx       # conversation view
    admin/                         # organizer-only dashboard (separate layout)
    api/                           # REST endpoints (auth, messages, conversations, users, admin…)
  components/chat/                 # sidebar, composer, message list/item, dialogs
  hooks/                          # use-conversations, use-messages, use-socket, use-typing…
  lib/                            # prisma client, auth config, validation (zod), rate-limit, sanitize
  types/chat.ts                   # shared client-side DTO types
prisma/schema.prisma       # full data model
```

**Realtime design:** messages/reactions/typing/presence are emitted from API route handlers via a Socket.io instance stored on `globalThis` (`src/lib/socket-emitter.ts`), reachable because API routes and the socket server run in the same Node process. Clients join a room per conversation (`conversation:<id>`) and a personal room (`user:<id>`) for direct notifications.

**Important deployment note:** this custom server pattern (Next + Socket.io in one process) does **not** deploy as-is to Vercel's serverless functions, since serverless functions can't hold a persistent WebSocket connection. For production you'd either:
- deploy the whole app to a long-running Node host (Render, Railway, Fly.io, a VM), or
- keep the Next app on Vercel and run a separate small Socket.io service elsewhere, or
- swap Socket.io for a managed realtime service (Supabase Realtime, Pusher, Ably).

## Deploying for real hackathon use (Render, Starter plan + persistent disk)

Render runs a persistent Node process, which is what this app needs for Socket.io. A `render.yaml` blueprint is included, configured for Render's **Starter** plan (~$7/month) with a 1GB persistent disk — this is the plan to use for an actual event with real participants, not just a demo:

- **No cold-start sleep** (free-tier services sleep after 15 min idle; Starter doesn't).
- **The SQLite database survives redeploys** — the disk is mounted at `/data` and `DATABASE_URL` points there, so pushing a fix mid-hackathon won't wipe every account and message.

1. Push the repo to GitHub (already done if you're reading this from there).
2. On [render.com](https://render.com), sign up/log in, then **New → Blueprint** and pick this repo. Render reads `render.yaml` and provisions the Starter-plan service + disk automatically (`AUTH_SECRET` auto-generated). You'll need a card on file for the paid plan.
3. Click **Apply** — first deploy takes a few minutes (installs deps, builds, then on start: migrates, seeds, launches).
4. Once live, open the assigned `https://hackathon-chat-xxxx.onrender.com` URL and share it with participants. Seeded organizer login: `organizer@hackathon.dev` / `organizer123` — change that password immediately, or better, promote a real account to `ORGANIZER` and demote/remove the seeded one from the admin dashboard.

**No blueprint support / prefer manual setup:** create a new **Web Service** on Render (Starter plan) pointing at this repo, with a 1GB disk mounted at `/data`, and:
- Build command: `npm install && npx prisma generate && npm run build`
- Start command: `npx prisma migrate deploy && npx tsx prisma/seed.ts && npm start`
- Env vars: `NODE_ENV=production`, `AUTH_TRUST_HOST=true`, `AUTH_SECRET=<generate a random string>`, `DATABASE_URL=file:/data/dev.db`

**Remaining honest caveat:** the persistent disk covers the database only. Uploaded files (`public/uploads`) still live on ephemeral storage and reset on redeploy — broken image links after a redeploy, not data loss, but worth knowing. Fixing that means serving uploads from the mounted disk through a small API route instead of Next's static file serving, or moving to S3/Supabase Storage — ask if you want that wired up before the event.

**Just testing/demoing, not running the actual event yet?** Swap `plan: starter` back to `plan: free` and drop the `disk:` block — free tier works fine for that, with the tradeoffs described above.

## Features implemented

- **Auth:** signup/login, avatar upload, team name, role (Participant/Mentor/Judge/Organizer), protected routes via middleware
- **General chat:** send/edit/delete, reactions, replies, @mentions with autocomplete, image/file/GIF upload with drag & drop, markdown + syntax-highlighted code blocks, typing indicators, read receipts, infinite scroll
- **DMs:** search participants, start conversation, block/mute/archive
- **Groups:** create, rename, group photo, invite/remove members, assign admins, leave
- **Notifications:** in-app bell for mentions, replies, reactions, invites, announcements
- **Presence:** online/away/offline + last seen, driven by Socket.io connection + tab visibility
- **Global search:** people, groups, messages, files (command-palette style)
- **Admin dashboard:** ban/unban, change role, post announcements, pin messages, view online participants, resolve moderation reports
- **Security:** zod validation on every mutation, in-memory rate limiting (messages/uploads/login), DOMPurify + `rehype-sanitize` double-layer XSS protection, file type/size validation, role-gated API routes
- **Bonus:** polls (with live vote %), starred messages, message scheduling, voice messages (MediaRecorder), emoji picker, dark/light theme

## Known limitations / honest gaps

- **Rate limiting is in-memory**, scoped to a single Node process — fine for a hackathon, replace with a Redis-backed limiter (Upstash) before running multiple instances.
- **File type validation trusts the browser-reported MIME type** (no magic-byte sniffing) — acceptable for a hackathon tool, add a library like `file-type` before treating uploads as fully trusted in a hostile environment.
- **GIF picker is upload-based**, not a live Giphy/Tenor search — no API key was configured. Wiring in real GIF search is a small addition (an API key + a picker tab) once you have one.
- **Voice/video calls and screen sharing are not implemented** — everything else in the spec is; WebRTC calling is a substantial separate feature and was out of scope for this pass.
- A harmless Base UI dev-mode console warning about nested button composition may appear in some menus — it doesn't affect functionality or accessibility (verified via the accessibility tree).
- `next-themes`' FOUC-prevention snippet logs a benign "script tag encountered while rendering" console error in dev mode — a known upstream pattern, not app code; theme switching works correctly.

## Useful scripts

```bash
npm run db:studio   # Prisma Studio — browse/edit the database
npm run db:seed     # re-run seed (idempotent)
npm run lint
```
