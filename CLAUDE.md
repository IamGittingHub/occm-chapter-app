# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OCCM Chapter Management App - A web application for Orthodox Christian Campus Ministries to manage prayer lists and member communication with automatic bucket rotation and 30-day auto-transfer for unresponsive members.

## Tech Stack

- **Framework**: Next.js 15 (App Router, standalone output mode for VPS deployment)
- **Database**: Convex (real-time backend with built-in auth)
- **Auth**: Convex Auth with Google OAuth
- **Styling**: Tailwind CSS + shadcn/ui components
- **Language**: TypeScript (strict mode)

## Common Commands

```bash
npm run dev          # Start Next.js dev server on localhost:3000
npm run build        # Create production build (standalone mode)
npm run lint         # Run ESLint

# Add shadcn/ui components
npx shadcn@latest add [component-name]
```

### Convex Commands

```bash
npx convex dev              # Start Convex dev server (syncs functions, required for development)
npx convex deploy           # Deploy to production
npx convex env set KEY val  # Set environment variable
npx convex logs             # View function logs
npx convex dashboard        # Open Convex dashboard

# Run Convex functions manually
npx convex run members:list
npx convex run prayerAssignments:getStats
```

## Architecture

### Convex Structure (`convex/`)

```
convex/
├── _generated/            # Auto-generated types and API
├── schema.ts              # Database schema (7 tables + auth)
├── auth.ts                # Google OAuth configuration
├── auth.config.ts         # Auth settings
├── crons.ts               # Scheduled jobs (daily transfer, monthly rotation)
├── lib/auth.ts            # Authorization helpers
├── members.ts             # Member CRUD functions
├── committeeMembers.ts    # Committee CRUD + invite + auto-link
├── prayerAssignments.ts   # Prayer queries + bucket rotation
├── communicationAssignments.ts  # Communication + auto-transfer
├── communicationLogs.ts   # Contact logging
├── claims.ts              # Claiming system
├── dashboard.ts           # Dashboard aggregations
├── appSettings.ts         # Key-value settings
└── migrations.ts          # Data migration helpers
```

### Authorization Pattern

All Convex functions use `requireCommitteeMember()` to verify the user is an active committee member:

```typescript
export const list = query({
  handler: async (ctx) => {
    await requireCommitteeMember(ctx); // Throws if not authorized
    return await ctx.db.query("members").collect();
  },
});
```

### Route Groups

- `app/(auth)/` - Public auth pages (login)
- `app/(dashboard)/` - Protected pages with sidebar layout
- `app/(dashboard)/claim-members/` - Member claiming interface

### Authentication Flow

1. User visits the app and is redirected to `/login` if not authenticated
2. User clicks "Continue with Google" (Convex Auth handles OAuth)
3. `AuthGuard` component checks if user has access via `hasAccess` query
4. If user's email matches a pending committee invite, auto-linking occurs
5. Dashboard loads if user is an active committee member

### Core Business Logic (in Convex functions)

**Prayer Assignment System** (`convex/prayerAssignments.ts`):
- `generateInitial`: Gender-matches members to committee, assigns bucket numbers
- `rotateBuckets`: Monthly rotation - bucket N → N+1, wraps around
- New members mid-month get assigned to committee member with fewest assignments

**Communication Tracking** (`convex/communicationAssignments.ts`):
- `generateInitial`: Creates initial outreach assignments, gender-matched
- `processAutoTransfers`: 30-day threshold auto-transfer (runs daily via cron)
- `markSuccessful`: Marks contact as successful, makes assignment permanent
- `transfer`: Manual transfer to another committee member

**Cron Jobs** (`convex/crons.ts`):
- Daily at 3 AM UTC: `processAutoTransfers` - check 30-day thresholds
- Monthly on 1st at 4 AM UTC: `rotateBuckets` - rotate prayer assignments

### Database Schema

Key tables in `convex/schema.ts`:
- `committeeMembers` - Leadership team with `userId` (linked after login)
- `members` - Chapter members with demographics
- `prayerAssignments` - Links members to committee with `bucketNumber`
- `communicationAssignments` - Has `status` (pending/successful/transferred)
- `communicationLogs` - Contact attempt history
- `transferHistory` - Tracks who has tried reaching each member
- `appSettings` - Key-value store for app configuration

### Frontend Patterns

Components use Convex React hooks:
```typescript
// Queries (real-time updates)
const members = useQuery(api.members.list);

// Mutations
const createMember = useMutation(api.members.create);
await createMember({ firstName: "John", lastName: "Doe", ... });

// Auth
const { isAuthenticated, isLoading } = useConvexAuth();
const { signIn, signOut } = useAuthActions();
```

### Environment Variables

**Local Development** (`.env.local`):
```bash
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

**Convex Dashboard** (set via `npx convex env set`):
```bash
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

**Google Cloud Console**:
- Add redirect URI: `https://YOUR-CONVEX-URL.convex.site/api/auth/callback/google`

## Design System

Orthodox-inspired palette in `tailwind.config.ts`:
- `gold` (#C9A227) - Accent
- `deep-blue` (#1E3A5F) - Primary
- `soft-blue` (#4A7BA7) - Secondary
- `warm-white` (#FAF8F5) - Background

## Deployment

### Convex Production

```bash
npx convex deploy --prod
```

### VPS Deployment

**Server**: `srv1165028.hstgr.cloud`
**App URL**: `https://occm.srv1165028.hstgr.cloud`
**Port**: 3002 (nginx proxies from 443 to 3002)
**PM2 Name**: `occm-app`
**App Directory**: `/var/www/occm-app`

**Deploy Command**:
```bash
./deploy.sh
```

**Manual PM2 Restart**:
```bash
ssh root@srv1165028.hstgr.cloud "cd /var/www/occm-app && PORT=3002 pm2 restart occm-app"
```

**Check Logs**:
```bash
ssh root@srv1165028.hstgr.cloud "pm2 logs occm-app --lines 50"
```

## Invite Flow (No Email Required)

1. Committee member uses "Add Committee Member" form with name/email/gender
2. System creates `committeeMembers` record with `userId=undefined`, `isActive=false`
3. Tell invited person to visit app URL and "Continue with Google" using their email
4. On login, `hasAccess` query detects pending invite, `linkCurrentUserByEmail` activates account
5. Dashboard shows "Access Denied" if email not in pending invites
