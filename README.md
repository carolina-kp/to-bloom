# 🌸 bloom. — university task tracker

A beautiful, cross-device synced task tracker for university students.
Built with Vite + Supabase + PWA.

---

## 🚀 Setup (5 minutes)

### Step 1 — Supabase (free database)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project**, give it a name (e.g. `bloom`)
3. Wait ~2 minutes for it to spin up
4. Go to **SQL Editor** and paste + run the contents of `supabase-schema.sql`
5. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abcxyz.supabase.co`)
   - **anon public** key

### Step 2 — Environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 3 — Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 — your app is running with live sync!

### Step 4 — Deploy to Vercel

```bash
# Push to GitHub first
git init
git add .
git commit -m "bloom. initial"
git remote add origin https://github.com/YOUR_USERNAME/bloom-tasks.git
git push -u origin main
```

Then:
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL` → your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
4. Click **Deploy** 🎉

Your app will be live at `https://bloom-tasks.vercel.app` (or similar).

---

## 📱 Install as app

**On iPhone (Safari):**
Share → "Add to Home Screen"

**On Android (Chrome):**
Menu → "Add to Home Screen" (or tap the Install banner in the app)

**On laptop (Chrome/Edge):**
Click the install icon in the address bar, or look for the Install banner

---

## ✨ Features

- **Real-time sync** — tasks appear on all devices instantly
- **Offline support** — works without internet, syncs when back online
- **Daily / Weekly / Monthly views**
- **Course tags** with custom colours
- **Priority levels** — urgent, normal, low
- **Due dates** with overdue detection
- **Share link** — share your task list with anyone
- **PWA** — installable on phone and laptop

---

## 🛠 Stack

- **Frontend**: React + Vite
- **Database + Realtime**: Supabase (Postgres + WebSockets)
- **Styling**: Tailwind CSS
- **Hosting**: Vercel
- **PWA**: vite-plugin-pwa (offline caching, installable)
