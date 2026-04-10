# AI Agent Context - Uptime Monitoring Project

**Last Updated:** April 8, 2026
**Project:** AI-Powered Uptime Monitor (FYP)
**Tech Stack:** Next.js 16, Prisma, tRPC, OpenAI, PostgreSQL

---

## 📋 Project Overview

This is an **AI-powered website uptime monitoring system** that:
- Monitors websites/endpoints for availability
- Performs DNS, SSL, and HTTP health checks
- Generates intelligent alerts using OpenAI GPT-4o-mini
- Sends notifications via Email (HTML) and Slack
- Tracks incidents and provides detailed incident reports

---

## 🎨 UI/UX Design Pattern

### Design Philosophy
- **Professional & Clean**: Gradient headers, color-coded status indicators
- **Space Utilization**: No empty screen space, balanced layouts
- **Consistent Components**: Matching design across create-project, incidents, endpoints
- **Server/Client Separation**: Proper SSR with client-side interactivity

### Color Scheme
- **Red**: Errors, DOWN status, alerts (`bg-red-500`, `text-red-600`)
- **Green**: Success, UP status, resolved (`bg-green-500`, `text-green-600`)
- **Blue**: Information, activity logs (`bg-blue-500`, `text-blue-600`)
- **Purple**: Request/server info (`bg-purple-500`, `text-purple-600`)
- **Gradient Headers**: `bg-gradient-to-br from-slate-50 to-white` or similar

### Component Patterns
1. **Tables**: Gradient headers, pagination, filters, search
2. **Cards**: Icon + Title + Content with colored accents
3. **Status Badges**: Colored with animation for ongoing issues
4. **Detail Pages**: Card grids + side-by-side content sections

---

## 🏗️ Architecture Patterns

### Server-Side Rendering (SSR)
```typescript
// page.tsx (Server Component)
import { api } from '@/trpc/trpc-server/server'

export default async function Page() {
  const initialData = await api.resource.getData()
  return <ClientComponent initialData={initialData} />
}
```

### Client Components with Initial Data
```typescript
// client-component.tsx
"use client"

interface Props {
  initialData: DataType
}

export default function ClientComponent({ initialData }: Props) {
  const { data } = api.resource.getData.useQuery(
    params,
    { initialData: shouldUseInitial ? initialData : undefined }
  )
}
```

### tRPC Procedures Pattern
```typescript
procedureName: protectedProcedure
  .input(z.object({ /* validation */ }))
  .query(async ({ ctx, input }) => {
    // Logic
    return data
  })
```

---

## 🗄️ Database Schema (Prisma)

### Key Models

**User** → Has many Projects, Settings
**Project** → Has many Endpoints
**Endpoint** → Has many Logs, Incidents
**Log** → Records each check (status, DNS, SSL, HTTP, etc.)
**Incident** → Groups consecutive DOWN logs
**Setting** → User notification preferences (email, Slack webhook)
**Notification** → Records sent alerts

### Important Fields

**Endpoint:**
- `checkInterval`: How often to check (hours)
- `nextCheckAt`: DateTime for next scheduled check
- `lastStatus`: HTTPStatus enum

**Log:**
- `status`: HTTPStatus (UP, DOWN, REDIRECT, CLIENT_ERROR, UNKNOWN)
- `httpCode`: HTTP status code (nullable)
- `responseTime`: Response time in ms (nullable)
- `errorMessage`: Error description (nullable)
- `dnsStatus`: DNSStatus enum (RESOLVED, FAILED)
- `ip`: IP address (nullable - can be null when DNS fails)
- `sslValid`: Boolean
- `contentHash`: Content hash (nullable - can be null when request fails)

**Incident:**
- `status`: "ongoing" | "resolved"
- `startedAt`: DateTime
- `recoveredAt`: DateTime (nullable)
- `downtimeMs`: Duration in milliseconds
- `triggerStatus`: HTTPStatus
- `endpointId`: Foreign key to Endpoint

---

## 🤖 AI Alert System

### OpenAI Integration (`src/services/openAI.ts`)

**Function:** `generateAlert(input: WebsiteStatus)`

**Input Schema:**
```typescript
{
  status: "UP" | "DOWN"
  httpCode: number | null
  responseTime: number | null
  errorMessage: string | null
  dnsStatus: string
  ip: string | null // Can be null when DNS fails
  sslValid: boolean
  sslExpiry: string | null
  checkedAt: string
  contentHash: string | null // Can be null when request fails
  contentLength: number | null
  userName: string // User context (NEW)
  projectName: string // Project context (NEW)
  endpointName: string // Endpoint context (NEW)
  endpointUrl: string // URL being monitored (NEW)
}
```

**Configuration:**
- Model: `gpt-4o-mini`
- Temperature: `0.3` (consistent responses)
- Max Tokens: `600` (detailed responses)

**Output Format:**
- Professional alert with user/project/endpoint context
- Detailed issue information
- Actionable suggestions based on error type
- Formatted with markdown for HTML emails and Slack

### Alert Sending (`src/services/alert-services.ts`)

**Email:**
- SMTP: Gmail port 587 (TLS)
- HTML formatting with markdown conversion
- Dynamic subjects based on endpoint/project
- Environment variables: `SMTP_USER`, `SMTP_PASS`

**Slack:**
- Webhook URL (encrypted in database)
- Formatted messages with emoji
- Encryption key: `ENCRYPTION_KEY`

---

## 🔄 Monitoring Flow

### Cron Job Schedule
- **Frequency:** Every 5 minutes (`*/5 * * * *`)
- **Location:** `src/services/cron.ts`
- **Trigger:** Runs `runEndpointMonitoring()`

### Monitoring Execution (`src/services/run-monitoring.ts`)

1. **Fetch Due Endpoints:** Get endpoints where `nextCheckAt <= now`
2. **Perform Checks:** DNS, SSL, HTTP via `log-script.ts`
3. **Save Log:** Store results in Log table
4. **Detect Status Change:** Compare with `lastStatus`
5. **Generate Alert:** If DOWN, call `generateAlert()` with full context
6. **Send Notifications:** Email and Slack via `alert-services.ts`
7. **Update Endpoint:** Set `nextCheckAt`, `lastStatus`
8. **Create/Update Incident:** Group consecutive DOWN logs

### Incident Tracking Algorithm

**Create New Incident:**
- First DOWN log for an endpoint
- Or previous incident was resolved

**Update Ongoing Incident:**
- Consecutive DOWN logs increment `downtimeMs`

**Resolve Incident:**
- UP log after DOWN logs
- Set `recoveredAt`, final `downtimeMs`, status = "resolved"

---

## 📄 Key Pages & Components

### Dashboard (`/dashboard`)
- Cards: Total endpoints, UP, DOWN, response time
- Recent activity terminal
- Add URLs form

### Projects (`/dashboard/monitoring/create-project`)
- Create project form
- All projects table with pagination
- Gradient table header design

### Endpoints (`/dashboard/monitoring/allEndPoints`)
- All endpoints table
- Status indicators, response time, last check

### Incidents (`/dashboard/incidents`)

**Main Page (`page.tsx`):**
- Server component
- Fetches initial data with `api.logs.getAllIncidentsTable`
- Passes to `<IncidentTable initialData={...} />`

**Client Component (`_components/incident-table.tsx`):**
- Status filter: All, Ongoing, Resolved
- Search by endpoint/project name
- Pagination (10, 25, 50 per page)
- Summary cards: Total, Ongoing, Resolved, Avg Downtime
- Table columns: Endpoint, Project, Status, Started, Duration, Trigger
- Gradient table header matching create-project style

**Detail Page (`/dashboard/incidents/[id]/page.tsx`):**
- Dynamic route for specific endpoint incidents
- **Layout:** 2-row grid
  - **Top Row:** 4 cards (Root Cause, Status, Duration, Request)
  - **Bottom Row:** Activity Log + Response (side-by-side)
- Real-time incident status with pulse animation
- Activity log with all status changes
- Response details (JSON formatted)

### tRPC Procedures for Incidents

**`getAllIncidentsTable`:**
```typescript
Input: { page, limit, status?, search? }
Output: { incidents[], total, page, totalPages, summary }
```

**`getEndpointsWithIncidents`:**
```typescript
Output: All endpoints with incident counts
```

**`getEndpointIncidentDetail`:**
```typescript
Input: { endpointId }
Output: { endpoint, currentIncident, activityLog[] }
```

---

## 🔧 Common Development Patterns

### Adding New Dashboard Page

1. Create folder in `src/app/dashboard/your-feature/`
2. Create `page.tsx` (server component) for initial data fetch
3. Create `_components/your-feature-client.tsx` for interactivity
4. Add tRPC procedure in `src/trpc/api/router/`
5. Import procedure in `src/trpc/api/routes.ts`

### Creating tRPC Procedure

```typescript
// src/trpc/api/router/resource/index.ts
import { protectedProcedure, createTRPCRouter } from "@/trpc/trpc"
import { z } from "zod"

export const resourceRouter = createTRPCRouter({
  getData: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await ctx.db.model.findUnique({
        where: { id: input.id }
      })
      return data
    })
})
```

### Database Updates

```bash
# After editing prisma/schema.prisma
pnpm db:push         # Push schema to database
pnpm db:generate     # Regenerate Prisma client
```

### Styling Components

- Use Tailwind utility classes
- Gradient backgrounds: `bg-gradient-to-br from-X to-Y`
- Status colors: `bg-red-500`, `bg-green-500`, etc.
- Responsive grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Max heights with scroll: `max-h-[600px] overflow-y-auto`

---

## ⚠️ Important Notes & Known Issues

### Email Delivery
- **Issue:** Gmail SMTP may timeout or block
- **Solution:** Use Gmail App Password or switch to Brevo/SendinBlue
- **Config:** Port 587 (TLS), not 465 (SSL)

### Zod Schema Validation
- **Important:** `ip` and `contentHash` can be `null`
- Always use `.nullable()` for fields that can fail
- DNS failure → `ip: null`
- Request failure → `contentHash: null`

### Cron Frequency
- Set to 5 minutes to avoid spam
- Can be adjusted in `src/services/cron.ts`
- Format: `*/5 * * * *` (every 5 minutes)

### Incident Algorithm
- Groups consecutive DOWN logs automatically
- Resolves when UP log detected
- Calculates downtime in milliseconds

---

## 📦 Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Email
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Encryption
ENCRYPTION_KEY="32-character-key"

# OpenAI
OPENAI_API_KEY="sk-..."
```

---

## 🎯 User Preferences & Feedback

### Design Preferences
- **Clean & Professional:** No clutter, balanced layouts
- **Full Screen Usage:** No empty space complaints
- **Consistent Theming:** Match existing components
- **Color Coding:** Red (error), Green (success), Blue (info), Purple (request)

### Development Approach
- Read files before editing/writing
- Always use proper component separation (server/client)
- Implement filters, search, and pagination for tables
- Match design of existing components (create-project style)

### Communication Style
- User uses Urdu/Roman Urdu in messages
- Prefers direct implementation over lengthy explanations
- Values professional, production-ready code

---

## 📚 Quick Commands

```bash
# Development
pnpm dev              # Start dev server (localhost:3000)

# Database
pnpm db:push          # Push schema to database
pnpm db:generate      # Generate Prisma client
pnpm db:studio        # Open Prisma Studio

# Production
pnpm build            # Build for production
pnpm start            # Start production server

# Monitoring
pnpm cron             # Manually run cron job

# UI Components
pnpm add:ui <name>    # Add Shadcn component
```

---

## 🔍 File Locations Reference

| What | Where |
|------|-------|
| **AI Alert Generation** | `src/services/openAI.ts` |
| **Alert Sending (Email/Slack)** | `src/services/alert-services.ts` |
| **Monitoring Execution** | `src/services/run-monitoring.ts` |
| **Cron Job Setup** | `src/services/cron.ts` |
| **Website Check Logic** | `src/lib/log-script.ts` |
| **Monitoring Service Class** | `src/lib/monitoring-service.ts` |
| **Database Schema** | `prisma/schema.prisma` |
| **Authentication** | `src/lib/auth.ts` |
| **tRPC Configuration** | `src/trpc/trpc.ts` |
| **tRPC Routes** | `src/trpc/api/routes.ts` |
| **Incidents API** | `src/trpc/api/router/log/index.ts` |
| **Incidents Page** | `src/app/dashboard/incidents/` |
| **Incidents Table** | `src/app/dashboard/incidents/_components/incident-table.tsx` |
| **Incident Detail** | `src/app/dashboard/incidents/[id]/page.tsx` |
| **Dashboard** | `src/app/dashboard/page.tsx` |
| **Projects** | `src/app/dashboard/monitoring/create-project/` |
| **Endpoints** | `src/app/dashboard/monitoring/allEndPoints/` |
| **Shadcn Components** | `src/components/ui/` |
| **Schemas** | `src/schemas/` |

---

## 🚀 Recent Implementations

### Latest Features (April 2026)

1. **Enhanced AI Alerts**
   - Added user/project/endpoint context to alerts
   - Increased token limit to 600 for detailed responses
   - HTML email formatting with markdown

2. **Incident Management System**
   - Main incidents table with filters (ongoing/resolved)
   - Search functionality across endpoints/projects
   - Pagination (10, 25, 50 per page)
   - Summary cards (total, ongoing, resolved, avg downtime)
   - Dynamic detail pages for each endpoint

3. **Incident Detail Page Redesign**
   - 2-row layout: 4 cards on top, activity + response side-by-side
   - No empty space, full screen utilization
   - Real-time status indicators with animations

4. **Cron Optimization**
   - Changed from every minute to every 5 minutes
   - Prevents notification spam

5. **Email Configuration**
   - Switched from port 465 (SSL) to 587 (TLS)
   - Added retry logic and better error handling

---

## 💡 Development Tips

### When Adding Features
1. Check existing patterns in similar components
2. Match design of create-project/incidents tables
3. Use server components for initial data fetch
4. Use client components for filters/search/pagination
5. Always add proper TypeScript types
6. Use Zod for input validation

### When Debugging
1. Check browser console for client errors
2. Check terminal for server/tRPC errors
3. Use Prisma Studio to inspect database
4. Check `.env` file for missing variables
5. Verify Prisma schema is up to date

### Best Practices
- Always read files before editing
- Use TodoWrite for complex multi-step tasks
- Match existing component structure
- Keep server/client separation clear
- Add proper error handling
- Use nullable types where data can fail

---

## 🎓 Learning Resources

### Project Structure
- Read `project_structure.md` for full architecture
- Check `prisma/schema.prisma` for database models
- Review existing pages for component patterns

### Tech Stack Docs
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- tRPC: https://trpc.io/docs
- Shadcn UI: https://ui.shadcn.com
- OpenAI: https://platform.openai.com/docs

---

**This file should be provided to future AI agents to maintain context across conversations.**
