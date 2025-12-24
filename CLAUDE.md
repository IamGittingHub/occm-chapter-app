# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OCCM Chapter Management App - A web application for Orthodox Christian Campus Ministries to manage prayer lists and member communication with automatic bucket rotation and 30-day auto-transfer for unresponsive members.

## Tech Stack

- **Framework**: Next.js 15 (App Router, standalone output mode for VPS deployment)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth (email/password + magic link)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Language**: TypeScript (strict mode)

## Common Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Create production build (standalone mode)
npm run lint         # Run ESLint

# Add shadcn/ui components
npx shadcn@latest add [component-name]

# Generate Supabase types (update project ID)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts

# Seed first admin (edit ADMIN_CONFIG in script first)
npx ts-node scripts/seed-first-admin.ts
```

## Architecture

### Route Groups
- `app/(auth)/` - Public auth pages (login, invite acceptance)
- `app/(dashboard)/` - Protected pages with sidebar layout
- `app/auth/callback/` - Supabase OAuth callback handler

### Core Business Logic

**Prayer Assignment System** (`lib/prayer/`):
- `assignment.ts`: Initial generation - gender-matches members to committee, assigns bucket numbers
- `rotation.ts`: Monthly rotation - bucket N → N+1, wraps around, reassigns to committee members
- New members mid-month get assigned to committee member with fewest assignments of same gender

**Communication Tracking** (`lib/communication/`):
- `assignment.ts`: Creates initial outreach assignments, gender-matched
- `transfer.ts`: 30-day threshold auto-transfer logic
  - Unresponsive members transfer round-robin to next committee member
  - Tracks transfer history to avoid repeated assignments
  - Successful contacts mark assignment as permanent

### Supabase Patterns

Three client types in `lib/supabase/`:
- `client.ts`: Browser client for client components
- `server.ts`: Server client for Server Components/Route Handlers
- `middleware.ts`: Session management, auth redirects

**Authentication Flow**:
- Middleware checks auth state and redirects appropriately
- Protected routes redirect to `/login` if unauthenticated
- Auth pages redirect to `/dashboard` if already authenticated
- First admin created via seed script (bypasses RLS with service role key)

### Database Schema (types/database.ts)

Key tables and relationships:
- `committee_members.user_id` → Supabase auth.users (nullable until invite accepted)
- `prayer_assignments`: Links members to committee with `bucket_number` for rotation
- `communication_assignments`: Has `status` (pending/successful/transferred) and `is_current` flag
- `communication_logs`: Contact attempt history per assignment
- `transfer_history`: Tracks which committee members have tried reaching each member

**RLS**: All tables use `is_active_committee_member()` function to verify access.

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Only for seed script
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Design System

Orthodox-inspired palette in `tailwind.config.ts`:
- `gold` (#C9A227) - Accent
- `deep-blue` (#1E3A5F) - Primary
- `soft-blue` (#4A7BA7) - Secondary
- `warm-white` (#FAF8F5) - Background

## Deployment

- `next.config.js` uses `output: 'standalone'` for VPS deployment
- Requires cron jobs for:
  - Daily: `processAutoTransfers()` - check 30-day thresholds
  - Monthly: `rotatePrayerBuckets()` - rotate prayer assignments
