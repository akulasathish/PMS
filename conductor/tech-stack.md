# Tech Stack - RE-PMS Engine 2026

## Frontend
- **Framework:** Next.js 16 (App Router)
- **Library:** React 19
- **Styling:** Tailwind CSS v4
- **Animation:** Framer Motion

## Backend & Database
- **Database:** PostgreSQL (managed by Supabase)
- **Security:** Row Level Security (RLS)
- **Auth:** Supabase GoTrue Auth (GoTrue)
- **API:** Supabase PostgREST & Realtime

## Automation & Events
- **Workflow Engine:** n8n (Dockerized)
- **Webhook Triggers:** `pg_net` (Postgres HTTP extensions)
- **Event Source:** Database `AFTER INSERT/UPDATE` triggers

## Communication
- **Transactional Emails:** Resend API

## Development Tooling
- **Language:** TypeScript
- **Linting:** ESLint
- **Runtime:** Node.js
