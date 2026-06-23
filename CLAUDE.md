# Onimici — Codebase Guide for AI Assistants

## Project Overview

Onimici is a relationship-first dating platform built around the philosophy "Find True Love. Then Delete Onimici." Success is measured by users leaving the app — not staying on it.

The product is MVP-stage and consists of three parts:
1. **Landing page** — marketing copy explaining the concept and value proposition
2. **Compatibility assessment** — a 20-question form that classifies users into readiness tiers
3. **Waitlist signup** — collects user details post-assessment, stores to database, sends confirmation email

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Static HTML5, CSS3 (custom properties + Flexbox/Grid), Vanilla JavaScript |
| Backend | Node.js serverless function via Vercel (`api/submit.js`) |
| Database | Supabase (PostgreSQL) via `@supabase/supabase-js ^2.38.0` |
| Email | Nodemailer `^6.9.7` with Gmail SMTP |
| Deployment | Vercel (serverless, no containers) |
| Package manager | npm |

There is **no frontend framework** (no React, Vue, Next.js, etc.), **no build process**, and **no TypeScript**.

---

## Repository Structure

```
Onimici-app/
├── Package.json          # Note: capital P — npm scripts and dependencies
├── Vercel.json           # Note: capital V — Vercel deployment config
├── README.md             # Minimal (just the project name)
├── .gitignore            # node_modules/, .env.local, .DS_Store, *.log, .vercel
│
├── api/
│   └── submit.js         # ONLY backend file — handles all POST submissions
│
├── public/               # Served by Vercel as static files (lowercase)
│   ├── index.html        # Landing page (443 lines)
│   └── assessment.html   # Near-empty placeholder (1 line of whitespace)
│
├── Public/               # Also served — contains the REAL assessment (capital P)
│   └── assessment.html   # Primary assessment SPA (1169 lines) ← the active one
│
└── assessment-2.html     # Root-level draft/alternative assessment (1402 lines)
```

---

## Known Quirks and Gotchas

**`Public/` vs `public/` (critical):** Two directories with similar names exist. `public/assessment.html` is essentially empty. The real, working assessment is in `Public/assessment.html` (capital P). When making changes to the assessment, always edit `Public/assessment.html`.

**`Package.json` and `Vercel.json` are capitalized:** Unlike standard convention (`package.json`, `vercel.json`). npm and Vercel CLI still locate them correctly on case-insensitive filesystems, but be careful on case-sensitive Linux systems.

**`assessment-2.html` is a root-level draft:** It appears to be an alternative/staging version (1402 lines vs 1169 in `Public/`). It is not served under `public/` or `Public/`, so its deployment status via Vercel is ambiguous. Do not treat it as the canonical version.

**No build step:** Files are served directly — editing HTML/CSS/JS takes effect immediately on deploy. There is no compilation, transpilation, or bundling.

**No linting or formatting config:** ESLint, Prettier, and similar tools are not configured. Keep code style consistent with the existing file.

**No tests:** No test framework exists. Manual browser testing is the only QA process.

---

## Environment Variables

These must be set as Vercel secrets and are never stored in files. Referenced in `Vercel.json` with the `@` prefix.

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL (PostgreSQL backend) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS) |
| `GMAIL_USER` | Gmail address used as the email sender |
| `GMAIL_PASSWORD` | Gmail app password (not the account password) |

For local development, create a `.env.local` file (already in `.gitignore`) with these values. The `vercel dev` command loads them automatically.

---

## Local Development

```bash
npm install          # Install dependencies (vercel CLI, supabase-js, nodemailer)
npm run dev          # Starts local Vercel dev server (runs serverless functions + static files)
```

`vercel dev` serves static files from `public/` and `Public/` and runs `api/submit.js` as a local serverless function. You need the Vercel CLI authenticated and `.env.local` populated for the API to work.

---

## Deployment

```bash
npm run deploy       # Runs `vercel` — deploys to production
```

Vercel auto-detects the project structure. The build command is just `npm install` (defined in `Vercel.json`). No compilation needed.

---

## Database Schema (Supabase)

Two tables are used, both written to by `api/submit.js`.

### `assessments` table
Stores results immediately after a user completes the assessment (before they join the waitlist).

| Column | Type | Notes |
|--------|------|-------|
| `email` | text | User's email |
| `profile` | text | Profile tier label |
| `overall_score` | numeric | 0–100 score |
| `readiness` | text | Readiness level label |
| `q1` … `q20` | text | Selected option text for each question |

### `waitlist` table
Stores full profile after the user submits the waitlist form. Has a unique constraint on `email` to prevent duplicates.

| Column | Type | Notes |
|--------|------|-------|
| `name` | text | User's full name |
| `sex` | text | Gender selection |
| `email` | text | Unique — duplicate check enforced |
| `country` | text | Country of residence |
| `city` | text | City of residence |
| `profile` | text | Profile tier label |
| `overall_score` | numeric | 0–100 score |
| `readiness` | text | Readiness level label |
| `q1` … `q20` | text | Assessment answers |

---

## API Endpoint

**`POST /api/submit`** — handled by `api/submit.js`

The submission type is determined by the `type` field in the request body.

### Assessment submission (`type: "assessment"`)
Sent when a user completes the 20 questions and views their results.

```json
{
  "type": "assessment",
  "email": "user@example.com",
  "profile": "Fully Ready",
  "overall_score": 88,
  "readiness": "High",
  "q1": "Answer text...",
  "q2": "Answer text...",
  "...": "...",
  "q20": "Answer text..."
}
```

Inserts into `assessments` table and sends a profile result email.

### Waitlist submission (`type: "waitlist"`)
Sent when a user completes the signup form after seeing their results.

```json
{
  "type": "waitlist",
  "name": "Jane Smith",
  "sex": "Female",
  "email": "user@example.com",
  "country": "United States",
  "city": "New York",
  "profile": "Fully Ready",
  "overall_score": 88,
  "readiness": "High",
  "q1": "Answer text...",
  "...": "...",
  "q20": "Answer text..."
}
```

Checks for duplicate email in `waitlist`, inserts if new, sends welcome email.

---

## Assessment Scoring Logic

The 20 questions map to 10 relationship dimensions (2 questions each):

| Dimension | Questions |
|-----------|-----------|
| Relationship Goals | q1, q2 |
| Communication | q3, q4 |
| Emotional Readiness | q5, q6 |
| Values Alignment | q7, q8 |
| Lifestyle Compatibility | q9, q10 |
| Conflict Resolution | q11, q12 |
| Commitment Level | q13, q14 |
| Self-Awareness | q15, q16 |
| Family & Future | q17, q18 |
| Personal Growth | q19, q20 |

Each question uses a 5-point scale. Scores are normalized to a 0–100 percentage per dimension. The overall score is the mean across all 10 dimensions.

### Profile Tiers

| Score Range | Profile Label |
|-------------|--------------|
| 85–100 | Fully Ready |
| 70–84 | Intentionally Growing |
| 55–69 | Exploring Your Path |
| 0–54 | Building Your Foundation |

---

## Frontend Conventions

### CSS Design Tokens (`:root` variables)

```css
--ink: #0A0A0A        /* primary text */
--paper: #FFFFFF      /* page background */
--surface: #FAFAFA    /* secondary background */
--line: #EAEAEA       /* borders and dividers */
--navy: #1E3A5F       /* secondary accent */
--coral: #FF5A4E      /* primary brand color */
--coral-deep: #E8463A /* coral darkened */
--coral-soft: #FFEEEC /* coral tint */
--muted: #6B7280      /* secondary text */
```

Always use these variables for color — do not introduce raw hex values.

### Typography

- Font: **Inter** (loaded from Google Fonts), weights 400–800
- Responsive sizing via `clamp()`: e.g. `font-size: clamp(1rem, 2.5vw, 1.5rem)`

### Layout & Breakpoints

```
900px  — Desktop/tablet split
780px  — Tablet adjustments
680px  — Narrow tablet / large mobile
520px  — Mobile
```

### Animations

Scroll-triggered fade-in animations use the **Intersection Observer API** — no CSS animation libraries. Elements start with `opacity: 0; transform: translateY(20px)` and transition to visible on scroll.

### JavaScript Patterns

- DOM queries: `document.querySelector()` / `document.querySelectorAll()`
- Events: `.addEventListener()` (no delegation framework)
- Form data collected by looping `q1`–`q20` and reading `:checked` radio values
- Section transitions: toggling a `.visible` CSS class on `#introSection`, `#assessmentForm`, `#resultsSection`, `#waitlistSection`, `#successSection`

---

## Email System

`api/submit.js` sends two types of HTML emails via Nodemailer + Gmail SMTP:

1. **Profile result email** — sent after assessment, shows score, tier, and description
2. **Welcome email** — sent after waitlist signup, confirms registration

Emails use inline CSS with a coral/red gradient header and responsive card layout. They are personalized with the user's name, score, profile tier, and readiness level.

---

## What AI Assistants Should Avoid

- **Do not edit `public/assessment.html`** — it is a near-empty placeholder. The real file is `Public/assessment.html`.
- **Do not introduce a framework or build tool** unless explicitly asked. The project is intentionally framework-free.
- **Do not add TypeScript** without an explicit request — there is no tsconfig.
- **Do not hardcode environment variable values** — always use `process.env.VARIABLE_NAME` in `api/submit.js`.
- **Do not create additional API files** under `api/` without understanding that all submission logic intentionally lives in the single `submit.js` file.
- **Do not assume `assessment-2.html` is canonical** — its status is unclear; treat `Public/assessment.html` as the source of truth.
- **Do not add comments explaining what code does** — only add comments when documenting non-obvious constraints or workarounds.
