# ShiftDesk

A people management platform for warehouse shift managers. Built with Next.js 14 (App Router), Supabase, and Google Gemini AI.

## Features

- Team roster management with status tracking (Active, Probation, Absence, Performance Plan)
- Performance logging with pick rate and accuracy metrics
- AI-powered review and 1-2-1 document generation (via Google Gemini)
- HR document template storage
- Microsoft / Azure AD SSO + email/password auth

## Setup

### 1. Environment Variables

```bash
cp .env.local.example .env.local
```

Fill in your Supabase project URL and anon key.

### 2. Database Setup

Run the SQL in `supabase/migrations/001_initial.sql` in the **Supabase SQL Editor** (Dashboard → SQL Editor → New Query).

This creates:
- `profiles` — user profile + Gemini API key storage
- `team_members` — your warehouse team roster
- `performance_logs` — pick rate, accuracy and attendance records
- `reviews` — AI-generated review documents
- `templates` — uploaded HR document metadata

All tables have Row Level Security (RLS) so users only see their own data.

### 3. Microsoft / Azure AD Auth (optional)

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App Registrations → New Registration
2. Set the redirect URI to: `https://<your-project>.supabase.co/auth/v1/callback`
3. Note the **Application (client) ID** and **Directory (tenant) ID**
4. Create a **Client Secret** under Certificates & Secrets
5. In Supabase Dashboard → Authentication → Providers → Azure:
   - Enable Azure provider
   - Enter your Client ID, Client Secret, and Tenant ID
   - Save

### 4. Supabase Storage

1. In Supabase Dashboard → Storage → New Bucket
2. Create a bucket named `templates`
3. Set it to **private** (not public)
4. The app uploads files to `templates/<user_id>/<timestamp>_<filename>`

### 5. Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. After signing in to ShiftDesk, go to Settings and paste your API key
4. Your key is stored encrypted in Supabase and only used server-side

### 6. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Deploy to Vercel

1. Push to GitHub
2. Import into [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** — PostgreSQL database, Auth, Storage
- **Tailwind CSS** — utility-first styling
- **Google Gemini 1.5 Flash** — AI review generation
- **DM Sans / Syne / DM Mono** — typography from Google Fonts

## Project Structure

```
app/
  (app)/           # Protected app routes (sidebar layout)
    dashboard/     # Overview + activity feed
    team/          # Team roster management
    performance/   # Performance logging + history
    reviews/       # AI review generation + saved reviews
    templates/     # HR document uploads
    settings/      # Profile + API key management
  api/
    ai/generate/   # Server-side Gemini API route
  auth/callback/   # OAuth callback handler
  login/           # Login page
components/
  Sidebar.tsx      # Navigation sidebar
  Modal.tsx        # Reusable modal
  Toast.tsx        # Toast notifications
lib/
  supabase/
    client.ts      # Browser Supabase client
    server.ts      # Server Supabase client
  types.ts         # TypeScript interfaces
supabase/
  migrations/      # SQL schema
```
