# Extra Time — Deployment Guide

## Project structure
```
extratime/
├── public/
│   ├── index.html          ← Main site
│   ├── css/style.css       ← All styles
│   └── js/
│       ├── config.js       ← Supabase config + shared utilities
│       ├── auth.js         ← Sign in / sign out
│       ├── crossword.js    ← Daily crossword game
│       ├── quiz.js         ← Daily quiz with Assist system
│       ├── predictor.js    ← Super Predictor
│       ├── decode.js       ← Decode This riddle
│       ├── heroes.js       ← WC Heroes guessing game
│       ├── leaderboard.js  ← Today + All-time leaderboard
│       └── app.js          ← App initialiser
├── vercel.json             ← Vercel config
└── supabase_schema.sql     ← Run this in Supabase SQL editor
```

---

## Step 1 — Set up Supabase

1. Go to https://supabase.com and open your project
2. Click **SQL Editor** → **New Query**
3. Paste the entire contents of `supabase_schema.sql`
4. Click **Run**
5. Go to **Project Settings** → **API**
6. Copy your **Project URL** and **anon public** key

---

## Step 2 — Add your Supabase credentials

Open `public/js/config.js` and replace:
```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```
With your actual values from Step 1.

---

## Step 3 — Deploy to Vercel

### Option A — Vercel CLI (recommended, fastest)
```bash
npm i -g vercel
cd extratime
vercel
```
Follow the prompts. Your site will be live at `https://extratime.vercel.app` (or similar).

### Option B — Vercel Dashboard (no terminal needed)
1. Go to https://vercel.com → **Add New Project**
2. Click **Upload** (bottom of the page)
3. Drag and drop the entire `extratime` folder
4. Click **Deploy**

---

## Step 4 — Configure Supabase Auth

1. Go to Supabase → **Authentication** → **URL Configuration**
2. Set **Site URL** to your Vercel URL (e.g. `https://extratime.vercel.app`)
3. Add the same URL to **Redirect URLs**
4. Go to **Authentication** → **Email** and make sure **Magic Link** is enabled

---

## Step 5 — Test it

1. Open your Vercel URL
2. All 5 games should load with sample content
3. Click **Sign in**, enter your email, check for the magic link
4. Sign in and verify your username appears in the header

---

## Adding daily content (Admin panel)

Use the admin panel (built separately) or insert directly into Supabase:

```sql
insert into daily_content (date, quiz_questions, riddle, wc_hero)
values (
  '2026-05-18',
  '[
    {"question":"Who won the 2022 World Cup?","options":["France","Brazil","Argentina","Germany"],"answer":2,"difficulty":"easy","explanation":"Argentina beat France on penalties in the 2022 final."}
  ]'::jsonb,
  '{"riddle":"I am awarded to the player with the most goals...","answer":"Golden Boot","accepted":["golden boot","the golden boot"]}'::jsonb,
  '{"name":"Messi","firstName":"Lionel Messi","display":"Lionel Messi — Argentina","confederation":"CONMEBOL","country":"Argentina","position":"Forward","debutWC":2006,"editions":5,"goals":13,"wcWinner":"Yes"}'::jsonb
);
```

---

## Custom domain (optional)

1. Buy a domain on Namecheap (e.g. playextratime.com)
2. In Vercel → your project → **Settings** → **Domains**
3. Add your domain and follow the DNS instructions
4. Update Supabase Auth URLs to your new domain

---

## Scoring summary

| Game | Scoring |
|------|---------|
| Crossword | Win/loss % + streaks. No points. |
| Quiz | 10 pts per correct answer. Assist = −5 pts, eliminates a wrong option. Correct without Assist = earn 1 Assist. |
| Super Predictor | Exact score = 5 pts, correct outcome = 3 pts, correct goal diff = 3 pts. Goalscorer: F=2pts, M=3pts, D=4pts. |
| Decode This | Win/loss % + streaks. No points. |
| WC Heroes | (1 ÷ guesses) × 100 × 4, rounded. |
