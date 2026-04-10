# AI-Powered Uptime Monitor - Project Structure Guide

## Overview
This is an **AI-powered website uptime monitoring system** built with Next.js, Prisma, tRPC, and OpenAI. The system monitors websites and sends AI-generated alerts when they go down.

---

## Folder Structure

```
fyp/
├── src/                    # Main source code folder
│   ├── app/               # Next.js App Router pages
│   ├── components/        # Reusable React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Core business logic libraries
│   ├── schemas/          # Zod validation schemas
│   ├── services/         # Backend services (AI, alerts, monitoring)
│   ├── trpc/             # tRPC API routes and server setup
│   └── types/            # TypeScript type definitions
├── prisma/               # Database schema and migrations
├── public/               # Static assets (images, fonts, etc.)
├── .next/                # Next.js build output (auto-generated)
└── node_modules/         # Dependencies (auto-generated)
```

---

## 📁 Detailed Folder Breakdown

### 1. **src/app/** - Next.js App Router Pages

This folder follows the Next.js App Router structure. Each subfolder represents a route in the application.

#### Files and Folders:

- **`globals.css`**: Global CSS styles
- **`layout.tsx`**: Root layout for entire app
- **`api/`**: Backend API routes
  - **`auth/[...all]/route.ts`**: Better Auth authentication endpoints (Google/GitHub OAuth)
  - **`trpc/[trpc]/route.ts`**: tRPC main API endpoint (all procedures are called through this)
  - **`cron/`**: Cron job endpoints (for future use)

- **`auth/signin/`**: Sign-in page
  - **`page.tsx`**: Sign-in page UI
  - **`_components/signIn-form.tsx`**: Sign-in form component

- **`dashboard/`**: Main dashboard area (protected routes)
  - **`page.tsx`**: Dashboard home page
  - **`layout.tsx`**: Dashboard layout with sidebar
  - **`_components/`**: Dashboard-specific components
    - `add-urls-form.tsx`: Form for adding new endpoints
    - `app-sidebar.tsx`: Sidebar navigation
    - `cards.tsx`: Dashboard cards (statistics)
    - `header.tsx`: Top header bar
    - `recent-activity.tsx`: Recent logs/activity display
    - `terminal.tsx`: Terminal-style log viewer

  - **`monitoring/`**: Monitoring section
    - **`create-project/`**: Project creation page
      - `page.tsx`: Project creation UI
      - `_components/create-project.tsx`: Create project form
      - `_components/all-projects.tsx`: Projects list display
      - `_components/pagination.tsx`: Pagination component

    - **`addEndpoints/[id]/`**: Add endpoints to specific project
      - `page.tsx`: Add endpoints page
      - `_components/addEndpoints.tsx`: Add endpoint form

    - **`allEndPoints/`**: View all endpoints
      - `page.tsx`: All endpoints page
      - `_components/allEndPointsTable.tsx`: Endpoints table

    - **`logs/`**: View monitoring logs
      - `page.tsx`: Logs page
      - `_components/`: Log display components

  - **`incidents/`**: Incident management (NEW)
    - **`page.tsx`**: Server component - Incidents main page (fetches initial data)
    - **`_components/incident-table.tsx`**: Client component - Interactive table with filters, search, pagination
    - **`[id]/page.tsx`**: Dynamic incident detail page
      - Shows 4 cards: Root Cause, Status, Duration, Request
      - Activity log and Response sections side-by-side
      - Real-time incident tracking

---

### 2. **src/components/** - Reusable UI Components

Shadcn UI components and custom reusable components are stored here. Examples:
- Buttons, Cards, Dialogs, Forms, Tables, etc.
- `ui/` subfolder contains Shadcn components

---

### 3. **src/hooks/** - Custom React Hooks

Custom React hooks that make application logic reusable:
- Data fetching hooks
- Form handling hooks
- Authentication state hooks

---

### 4. **src/lib/** - Core Business Logic

This is the most important folder - contains core services and utilities:

#### Files:

- **`auth.ts`**: Better Auth configuration (Google/GitHub OAuth setup)
- **`auth-client.ts`**: Client-side authentication utilities
- **`auth-sever.ts`**: Server-side authentication utilities
- **`enc-dec.ts`**: Encryption/Decryption functions (for Slack webhook encryption)
- **`log-script.ts`**: Website monitoring script (performs DNS, SSL, and HTTP checks)
- **`monitoring-service.ts`**: Main monitoring service class
  - Fetches endpoints to monitor
  - Creates monitoring logs
  - Creates notifications
  - Handles all database operations
- **`prisma.ts`**: Prisma client initialization
- **`utils.ts`**: General utility functions

---

### 5. **src/services/** - Backend Services

AI and cron-related services:

#### Files:

- **`openAI.ts`**: **IMPORTANT - AI Agent Code**
  - OpenAI API integration
  - `generateAlert()` function - Generates AI alert messages when a website goes down
  - Input: Website status (DOWN/UP, error, DNS, SSL, userName, projectName, endpointName, endpointUrl)
  - Output: Detailed professional alert message with user/project context and actionable suggestions
  - Uses GPT-4o-mini model
  - Temperature: 0.3 (for consistent responses)
  - Max tokens: 600 (for detailed responses)

- **`alert-services.ts`**: Alert sending services
  - Email alerts (via Nodemailer with HTML support)
  - Dynamic email subjects
  - Slack webhook alerts (encrypted)
  - SMTP Configuration: Port 587 (TLS) for better reliability

- **`run-monitoring.ts`**: Main monitoring execution script
  - Checks all endpoints
  - Saves results to database
  - Integrates AI-generated alerts with full context
  - Triggers alerts when needed

- **`cron.ts`**: Cron job setup (for scheduled monitoring)
  - Runs every 5 minutes (*/5 * * * *)
  - Prevents excessive notifications

---

### 6. **src/schemas/** - Zod Validation Schemas

Form validation and data validation schemas:

- **`endpoint.schema.ts`**: Endpoint creation/update validation
- **`project.schema.ts`**: Project creation/update validation

---

### 7. **src/trpc/** - tRPC API Layer

Type-safe API layer that connects frontend and backend:

#### Structure:

- **`index.ts`**: tRPC router exports
- **`trpc.ts`**: tRPC context and middleware setup
- **`trpc-server/`**: Server-side tRPC configuration
- **`api/`**: API routes
  - **`router/`**: Individual routers
    - **`project/`**: Project CRUD operations
    - **`endpoint/`**: Endpoint management
    - **`log/`**: Log queries and incident management
      - `getAllIncidentsTable`: Paginated incidents with filters/search
      - `getEndpointsWithIncidents`: All endpoints with incident counts
      - `getEndpointIncidentDetail`: Detailed incident info for specific endpoint
    - **`settings/`**: User settings management
  - **`routes.ts`**: Main router that combines all routes

---

### 8. **src/types/** - TypeScript Types

Global TypeScript type definitions and interfaces

---

### 9. **prisma/** - Database Schema

#### Files:

- **`schema.prisma`**: **IMPORTANT - Database Schema**

  **Models:**

  1. **User**: Users (Google/GitHub login)
  2. **Session**: User sessions
  3. **Account**: OAuth accounts
  4. **Verification**: Email verification
  5. **Project**: Monitoring projects
  6. **Endpoint**: URLs to monitor
     - `checkInterval`: How often to check (in hours)
     - `nextCheckAt`: When the next check should occur
     - `lastStatus`: Status from the last check
  7. **Setting**: User notification settings
     - Email
     - Slack webhook (encrypted)
     - WhatsApp (future feature)
  8. **Log**: Monitoring logs
     - Status, HTTP code, response time
     - DNS status, IP address
     - SSL validity and expiry
     - Content hash and length
  9. **Notification**: Record of sent alerts
  10. **Incident**: Incident tracking (NEW)
     - Groups consecutive DOWN logs
     - Tracks startedAt, recoveredAt, duration
     - Status: ongoing/resolved
     - Links to endpoint and trigger log

  **Enums:**
  - `HTTPStatus`: UP, DOWN, REDIRECT, CLIENT_ERROR, UNKNOWN
  - `DNSStatus`: RESOLVED, FAILED
  - `AlertStatus`: SEND, FAIL

- **`generated/prisma/`**: Auto-generated Prisma client

---

## 🤖 AI Agent Integration

### OpenAI Service (`src/services/openAI.ts`)

This file contains the main AI agent logic:

**Purpose**: Generate human-friendly alert messages when a website goes down

**Function**: `generateAlert(input: WebsiteStatus)`

**Input Schema**:
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
  userName: string // User context
  projectName: string // Project context
  endpointName: string // Endpoint context
  endpointUrl: string // URL being monitored
}
```

**AI Prompt Strategy**:
- Professional and detailed alert message with context
- Includes user name, project name, endpoint name
- Key information: status, error, DNS, SSL, timestamp
- User-friendly language with technical details
- Actionable suggestions based on error type
- Formatted for both email (HTML) and Slack

**Output Example**:
```
🚨 **Website Down Alert for John Doe**

**Project:** Production Monitoring
**Endpoint:** Main Website
**URL:** https://example.com

**Issue Details:**
- Status: DOWN
- Error: Connection timed out
- DNS: RESOLVED
- IP Address: 203.0.113.10
- SSL: Invalid / Expiry unknown
- Checked At: 25 Feb 2026, 10:15 AM UTC

**Suggestion:** The server appears to be online (DNS resolved) but not responding to requests. Check if the web server is running and firewall rules are correctly configured.
```

---

## 🔄 Monitoring Flow

1. **Cron job** (`src/services/cron.ts`) triggers monitoring
2. **MonitoringService** (`src/lib/monitoring-service.ts`) fetches endpoints to check
3. **Log Script** (`src/lib/log-script.ts`) checks the website:
   - DNS resolution
   - SSL certificate validation
   - HTTP status check
   - Content hash/length
4. Results are saved to the database (**Log model**)
5. If status is DOWN:
   - **AI Agent** (`generateAlert()`) generates a professional message
   - **Alert Services** send email/Slack alerts
   - Record is saved to **Notification model**

---

## 🔐 Environment Variables

The `.env` file contains these variables:

- `DATABASE_URL`: PostgreSQL connection string (Neon database)
- `BETTER_AUTH_SECRET`: Authentication secret key
- `BETTER_AUTH_URL`: Authentication callback URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `SMTP_USER` / `SMTP_PASS`: Email sending credentials
- `ENCRYPTION_KEY`: Slack webhook encryption key
- `OPENAI_API_KEY`: OpenAI API key for AI alerts

**⚠️ Security Note**: Never commit these credentials to git!

---

## 🚀 Scripts

- `pnpm dev`: Start development server
- `pnpm build`: Create production build
- `pnpm start`: Start production server
- `pnpm db:push`: Push Prisma schema to database
- `pnpm db:generate`: Generate Prisma client
- `pnpm add:ui`: Add Shadcn UI components
- `pnpm cron`: Manually run cron job

---

## 📦 Key Dependencies

- **Next.js 16**: React framework
- **Prisma**: ORM for PostgreSQL
- **tRPC**: Type-safe API
- **Better Auth**: Authentication (Google/GitHub)
- **OpenAI**: AI alert generation
- **Shadcn UI**: UI components
- **Zod**: Schema validation
- **Nodemailer**: Email sending
- **Axios**: HTTP requests

---

## 🎯 Main Features

1. ✅ Multi-project monitoring
2. ✅ URL/endpoint tracking
3. ✅ Scheduled checks (cron-based every 5 minutes)
4. ✅ DNS, SSL, HTTP monitoring
5. ✅ AI-generated detailed alerts (OpenAI GPT-4o-mini)
6. ✅ Email (HTML) & Slack notifications
7. ✅ Real-time logs
8. ✅ Google/GitHub OAuth
9. ✅ Encrypted webhook storage
10. ✅ Incident tracking and management (NEW)
11. ✅ Incident table with filters, search, pagination
12. ✅ Detailed incident pages with activity logs

---

## 📝 Quick Reference for AI Agents

### What's Where:

| Feature | Location |
|---------|----------|
| AI Alert Generation | `src/services/openAI.ts` |
| Database Schema | `prisma/schema.prisma` |
| Monitoring Logic | `src/lib/monitoring-service.ts` |
| Website Check Script | `src/lib/log-script.ts` |
| Alert Sending | `src/services/alert-services.ts` |
| Cron Job Setup | `src/services/cron.ts` |
| API Routes (tRPC) | `src/trpc/api/router/` |
| Incidents API | `src/trpc/api/router/log/index.ts` |
| Incidents Page | `src/app/dashboard/incidents/` |
| Authentication | `src/lib/auth.ts` |
| Frontend Pages | `src/app/` |
| UI Components | `src/components/` |
| Validation Schemas | `src/schemas/` |

### Common Development Tasks:

- **Add new feature**: Create page in `src/app/dashboard/`, add route in `src/trpc/api/router/`
- **Change database**: Edit `prisma/schema.prisma`, then run `pnpm db:push`
- **Improve AI prompts**: Edit prompt in `src/services/openAI.ts`
- **Add new alert channel**: Add function in `src/services/alert-services.ts`
- **Create UI component**: Add to `src/components/`

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Pages    │  │  Components  │  │  tRPC Client     │   │
│  │ (src/app)  │  │             │  │                  │   │
│  └────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────┬───────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   tRPC API Layer   │
                    │  (Type-safe RPC)   │
                    └─────────┬──────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    Backend Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  Monitoring  │  │  AI Service  │  │ Alert Services   │ │
│  │   Service    │  │   (OpenAI)   │  │ (Email/Slack)    │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Database (Prisma) │
                    │    PostgreSQL      │
                    └────────────────────┘
```

---

## 🔍 Data Flow Example: Website Down Alert

```
1. Cron Job triggers → run-monitoring.ts
                         │
2. MonitoringService fetches due endpoints from DB
                         │
3. log-script.ts performs checks:
   ├─ DNS Resolution
   ├─ SSL Certificate Check
   ├─ HTTP Request
   └─ Content Hash
                         │
4. Results saved to Log table
                         │
5. If DOWN → openAI.ts generateAlert()
                         │
6. AI generates professional message
                         │
7. alert-services.ts sends:
   ├─ Email (Nodemailer)
   └─ Slack (Webhook)
                         │
8. Notification record saved to DB
```

---

This comprehensive guide will help you and AI agents understand the project structure and implement new features efficiently!
