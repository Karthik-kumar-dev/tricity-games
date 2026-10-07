# 🏆 Hackathon 1-to-1 Matchmaking Game

A production-grade, real-time web application built with **Next.js 14 (App Router)** and **Supabase** for pairing hackathon participants 1-to-1, complete with live WebSocket updates, duplicate phone prevention, and a password-protected admin command center.

---

## ⚡ Key Features

### 👤 Student Side (`/`)
- **Interactive Registration Form**:
  - Requires **Full Name** and **Phone Number**.
  - Client and server validation for phone formats (at least 10 digits, telecom standards).
  - Clean formatted phone display preview `(XXX) XXX-XXXX`.
  - **Duplicate Prevention**: Rejects already registered phone numbers with immediate user feedback.
- **"Waiting for match..." Screen**:
  - Animated radar pulse rings indicating active queuing.
  - Displays registered name and phone number.
  - Subscribed to **Supabase Realtime** (`postgres_changes`) + smart polling fallback (3.5s interval) so students see updates without ever manually refreshing.
- **Match Reveal Card (`status: matched`)**:
  - Confetti burst animation upon partner reveal.
  - Displays assigned partner's Name and Phone Number.
  - One-tap quick connect actions: **WhatsApp Direct Chat**, **Direct Phone Call**, **Send SMS**, and **Copy Phone**.
- **Leftover Participant Card (`status: unmatched`)**:
  - If the participant pool is odd, the leftover student is marked as "Unmatched" with reassuring instructions and real-time waiting for the next pairing round.
- **Auto-Reset on Database Clear**:
  - When the admin clears all data, all active student screens automatically reset back to the registration form!

---

### 🛡️ Admin Side (`/admin`)
- **Password-Protected Gate**:
  - Master passcode protection configured via `ADMIN_PASSWORD` in `.env.local` (default: `tricity@57`).
  - Secure session cookie and header authorization.
- **Live Metrics Dashboard**:
  - **Total Registered**: Active student pool count.
  - **Matched Pairs**: 1-to-1 team pairings formed.
  - **Waiting in Queue**: Students ready for matching.
  - **Odd Leftovers**: Displays leftover participant count (1 if odd, 0 if even).
- **Random 1-to-1 Matching Engine**:
  - Randomizes participants using the Fisher-Yates shuffle algorithm.
  - **Strict Rule**: A user is **NEVER** assigned to more than one partner.
  - Bidirectional pairings: If Person A is paired with Person B, Person B is paired with Person A.
  - Odd leftover handling: If the total count is odd, the last participant is marked `unmatched`.
- **Clear Data & Reset All**:
  - Prompts for confirmation via a modal dialog.
  - Deletes all participant records from the database.
  - Immediately broadcasts the reset to all student clients in real time.
- **Search & Filters**:
  - Filter by status (`All`, `Waiting`, `Matched`, `Unmatched`).
  - Search participants by name or phone number.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env.local`)
Create or edit `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1Ni...
ADMIN_PASSWORD=tricity@57
```

### 3. Setup Supabase Database
In your [Supabase Dashboard](https://supabase.com/dashboard) -> **SQL Editor**, run the script located at [`supabase/schema.sql`](file:///c:/Users/Karthik/OneDrive/Desktop/TRI-CITY%20GAMES/supabase/schema.sql):
- Creates the `participants` table with unique constraint on `phone`.
- Configures Row Level Security (RLS) policies.
- Enables `supabase_realtime` publication for instant updates.
- Installs the atomic `pair_participants()` stored procedure.

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the student view or [http://localhost:3000/admin](http://localhost:3000/admin) for the admin console.

---

## 🚢 Deploy to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"New Project"**.
3. Import your repository.
4. Add the following **Environment Variables** in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
5. Click **Deploy**. Your app is live!
