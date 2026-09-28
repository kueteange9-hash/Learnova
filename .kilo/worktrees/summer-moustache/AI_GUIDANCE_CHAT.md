# Learnova AI Guidance Chat (Google Gemini)

General AI guidance chat for learners, integrated into the existing Learnova
application (learner dashboard) and backed by the existing Express + Prisma +
PostgreSQL backend and the existing Learnova authentication (JWT).

```
Learner registers (existing flow)
        ↓
Learner completes onboarding  (existing wizard, now also saved to PostgreSQL)
        ↓
Learner dashboard  →  "Learnova AI Assistant" chat box
        ↓
Learner asks a question
        ↓
Backend authenticates the learner (existing JWT)
        ↓
Gemini analyses the question + learner profile  →  identifies the domain
        ↓
Prisma searches the real Learnova database (specialists / posts / workshops)
        ↓
Gemini selects only among those real records + writes the guidance
        ↓
Chat shows the answer + recommendation cards
(View Profile / Book Appointment, View Workshop, View Post)
```

---

## 1. Files created

### Backend (`backend/`)

| File | Purpose |
| --- | --- |
| `src/services/geminiService.js` | Gemini integration (REST, `GEMINI_API_KEY` server-side only, model fallback, timeouts, JSON parsing, error mapping). This is the `src/services/geminiService.ts` requested in the spec — the backend is plain CommonJS, so it is a `.js` file. |
| `src/services/aiGuidanceService.js` | The chat "brain": analysis prompt → domain → database search → answer prompt → validation. Holds the AI behaviour rules. |
| `src/services/recommendationService.js` | Prisma queries: specialists by domain + expertise, posts by domain, workshops by domain; builds the final card payloads and **drops any id that is not in the database**. |
| `src/services/learnerProfileService.js` | Reads the learner + onboarding information from PostgreSQL (degrades gracefully if the migration is not applied yet), merges the optional browser context. |
| `src/middleware/auth.js` | `requireAuth`: verifies the existing Learnova JWT and loads the user. |
| `src/lib/domains.js` | Canonical Learnova domains + keyword routing/normalisation. |
| `src/lib/validation.js` | Input validation (length caps, control-character stripping), history/context validation, in-memory rate limiter. |
| `src/routes/ai.js` | `POST /api/ai/chat` and `GET /api/ai/health`. |
| `src/routes/onboarding.js` | `POST /api/onboarding`, `GET /api/onboarding/me` (persist onboarding for AI personalisation). |
| `src/routes/specialists.js` | `GET /api/specialists?domain=&q=`, `GET /api/specialists/:id` (public data only) — needed to recommend specialists and to display their profile/appointments. |
| `prisma/migrations/20260923120000_add_learner_onboarding/migration.sql` | Adds the non-sensitive onboarding columns to `User`. |
| `.env.example` | Documented environment variables (including `GEMINI_API_KEY`). |

### Frontend (`frontend/`)

| File | Purpose |
| --- | --- |
| `components/ai/AiChatBox.tsx` | The chat UI: header ("Learnova AI Assistant"), subtitle, bubbles, input, send button, loading indicator, suggested questions, error states, session context, disclaimer. |
| `components/ai/RecommendationCards.tsx` | Specialist / workshop / post cards with the required buttons and "why this is relevant" reasons. |
| `lib/ai.ts` | Types matching the API response, `askLearnovaAi()`, learner-context builder, suggested questions, price/date formatters. |
| `app/resource/[type]/[id]/page.tsx` | Detail page for `View Profile` / `View Workshop` / `View Post` (loads the real record from the backend). |
| `next.config.js` | Rewrites `/api/backend/*` → Express API and `/uploads/*` → backend uploads, so the app works locally **and** from a hosted/preview domain. |
| `.env.example` | Optional frontend variables. |

### Files modified

| File | Change |
| --- | --- |
| `backend/src/server.js` | Mounts the new routes + adds 404/error handlers. Existing routes untouched. |
| `backend/src/routes/post.js` | Added `GET /api/posts/:id` (used by the "View Post" page). |
| `backend/src/routes/workshops.js` | Added `GET /api/workshops/:id` (used by the "View Workshop" page). |
| `backend/prisma/schema.prisma` | `User`: added `onboardingCompleted`, `onboardingDomains`, `onboardingInterests`, `onboardingGoal`, `onboardingGuidance`, `onboardingCareer`, `onboardingEducation`, `onboardingCompletedAt`. **No existing field, model or relation was changed.** |
| `frontend/app/learner/page.tsx` | The chat box is rendered on the learner dashboard (all existing sections kept). |
| `frontend/app/onboarding/page.tsx` | Keeps the existing flow/options and localStorage save, collects a few more non-sensitive answers, and persists them via `POST /api/onboarding` when signed in. |
| `frontend/app/appointments/page.tsx` | `?specialist=<id>` now also works for specialists that live in PostgreSQL (AI recommendations) — the local flow is unchanged. |
| `frontend/app/register/page.tsx` | Learner registration also creates the matching PostgreSQL account (silently ignored if the API is offline / the account exists) so the AI chat can authenticate the learner. Specialist registration is untouched. |
| `frontend/lib/api.ts` | API base now defaults to the `/api/backend` proxy, sends the JWT when present, and exposes the new endpoints (`aiChat`, `getSpecialist`, `getPost`, `getWorkshop`, `saveOnboarding`, ...). |
| `frontend/lib/store.ts` | `currentUser()` no longer wipes a session for accounts stored in PostgreSQL; added onboarding helpers (`getOnboarding`, `saveOnboardingLocal`, `hasCompletedOnboarding`). |
| `frontend/app/api/login/route.ts` | No longer duplicates authentication with its own Prisma/plain-text check — it forwards to the Express auth (this also fixed `next build`, which failed with `Module not found: @prisma/client`). |
| `frontend/lib/prisma.ts` | Kept for compatibility, but no longer opens a Prisma connection from the Next.js app (the API does). |
| `frontend/app/settings/page.tsx` | One-line null-guard fix (`currentUser()` can be `null`) that was blocking `next build`. |
| `frontend/app/globals.css` | Added the AI chat / recommendation card / resource page / onboarding styles (same purple-violet design tokens + responsive rules). |

---

## 2. Setup

### 2.1 Backend environment

`backend/.env` (already git-ignored):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/learnova"
JWT_SECRET="your_existing_secret"
PORT=3001

# Google Gemini (backend only — never shipped to the browser)
GEMINI_API_KEY=your_actual_key_here
# Optional:
# GEMINI_MODEL=gemini-3.8-flash
# GEMINI_TIMEOUT_MS=30000
```

### 2.2 Apply the database change + regenerate the Prisma client

```bash
cd backend
npx prisma migrate deploy     # applies 20260923120000_add_learner_onboarding
npx prisma generate           # regenerates the client with the new fields
```

> Alternative: `npx prisma migrate dev --name add_learner_onboarding`
> (delete the committed migration folder first if you prefer Prisma to generate it).
>
> The AI chat still works before the migration is applied — it simply falls back
> to the browser onboarding context instead of the stored columns.

---

## 3. Run the app

```bash
# Terminal 1 — backend API (Express + Prisma + Gemini)
cd backend
npm install
npm run dev            # http://localhost:3001

# Terminal 2 — frontend (Next.js)
cd frontend
npm install
npm run dev            # http://localhost:3000
```

Then in the browser:

1. **Register** a learner → you are sent to **onboarding**
2. Complete onboarding → you land on the **learner dashboard**
3. The **Learnova AI Assistant** chat box is displayed
4. Ask e.g. *"I want to start a small business"* → answer + recommendation cards
5. Click **View Profile / Book Appointment / View Workshop / View Post**

The frontend talks to the API through Next.js rewrites (`/api/backend/*`), so no
CORS configuration is needed. If you prefer to call the API directly, set
`NEXT_PUBLIC_API_URL=http://localhost:3001/api` in `frontend/.env.local`.

---

## 4. Test the feature

### 4.1 Backend checks

```bash
# Is the Gemini key configured? (never returns the key itself)
curl http://localhost:3001/api/ai/health

# Existing Learnova health endpoints still work
curl http://localhost:3001/api/health
```

### 4.2 Full AI chat call (with a real learner token)

```bash
# 1. Get a JWT from the existing login endpoint
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"learner@example.com","password":"yourpassword","role":"LEARNER"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# 2. Ask the AI assistant
curl -s -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
        "message": "I want to learn how to start a business.",
        "history": [],
        "context": {"domains": ["Entrepreneurship"], "goal": "Start a business"}
      }' | python3 -m json.tool
```

Expected shape:

```json
{
  "success": true,
  "message": "…personalised guidance…",
  "domain": "Entrepreneurship",
  "recommendations": {
    "specialists": [{ "id": "…", "name": "…", "domain": "…", "specialization": "…",
                      "description": "…", "reason": "…",
                      "url": "/resource/specialist/…", "bookUrl": "/appointments?specialist=…" }],
    "posts": [{ "id": "…", "title": "…", "description": "…", "author": "…", "url": "/resource/post/…" }],
    "workshops": [{ "id": "…", "title": "…", "domain": "…", "type": "PAID", "price": 5000,
                    "url": "/resource/workshop/…" }]
  },
  "disclaimer": "Learnova AI provides AI-assisted guidance only…"
}
```

### 4.3 Security checks (all covered)

```bash
# No token → 401
curl -s -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" -d '{"message":"hello"}'

# Empty message → 400
curl -s -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"   "}'

# Too many messages → 429 (12 per minute and per account)
```

### 4.4 Onboarding persistence

```bash
curl -s -X POST http://localhost:3001/api/onboarding \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"domains":["Entrepreneurship"],"interests":["poultry"],"goal":"Start a business"}'

curl -s http://localhost:3001/api/onboarding/me -H "Authorization: Bearer $TOKEN"
```

### 4.5 Recommendation data (public, no auth)

```bash
curl -s "http://localhost:3001/api/specialists?domain=Entrepreneurship"
curl -s http://localhost:3001/api/specialists/<specialistUserId>
curl -s http://localhost:3001/api/posts
curl -s http://localhost:3001/api/workshops
```

> Tip: give the AI something to recommend by seeding your database with
> **verified** specialists (`Specialist.verification = VERIFIED`), posts and
> workshops. Only verified specialists are ever recommended.

---

## 5. How recommendations stay real (no invented resources)

1. Gemini first returns only an **analysis** (domain + search keywords).
2. The backend searches **PostgreSQL through Prisma** for matching candidates:
   verified specialists (by `domain`, `qualification`, `experience`, name, bio),
   posts (by `domain`, text) and workshops (by title/description and the
   specialist's domain).
3. Those candidates are given to Gemini as a numbered list of ids; Gemini may
   only **choose ids** from that list and explain why.
4. Every returned id is validated against the candidate list. Unknown/duplicated
   ids are dropped, cards are rebuilt from the database rows, and the card count
   per type is capped at 3.
5. If Gemini cannot answer, the backend still returns real database rows with an
   honest fallback message (`meta.degraded = true`). If the database has nothing
   matching, the chat says so instead of inventing a resource.

The AI is also instructed to present itself as **AI-assisted guidance**, never as
a human specialist, never to diagnose, and to encourage booking a qualified
specialist for sensitive, medical, legal, financial or mental-health matters. A
permanent disclaimer is displayed under the chat input.

## 6. Security notes

- `GEMINI_API_KEY` is read only in `backend/src/services/geminiService.js` and is
  never returned by any endpoint (only `configured: true/false` is exposed).
- `POST /api/ai/chat` and `/api/onboarding*` require a valid Learnova JWT and only
  ever read/write the authenticated learner's own profile.
- Input is trimmed, length-capped and stripped of control characters; the
  conversation history is limited to the last 10 (last 6 are sent to Gemini).
- Prompt-injection instructions inside learner messages are explicitly rejected by
  the system instruction, and the model can never write to the database.
- Gemini errors (missing key, bad key, model unavailable, quota, timeout,
  blocked/empty answer) are mapped to learner-friendly messages with HTTP codes
  and never leak internal details.
- A per-account rate limit (12 messages / minute) protects the API quota.

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `GEMINI_NOT_CONFIGURED` | Add `GEMINI_API_KEY` to `backend/.env` and restart the backend. |
| `GEMINI_AUTH_ERROR` | The key is invalid or has no access to the Generative Language API. Create a new key at <https://aistudio.google.com/apikey>. |
| `GEMINI_MODEL_NOT_FOUND` | Set `GEMINI_MODEL` in `backend/.env` to a model your key can use (e.g. `gemini-3.8-flash`, `gemini-3.5-flash`, `gemini-2.5-flash`). |
| `GEMINI_RATE_LIMITED` | Free-tier quota; wait a moment or upgrade the key. |
| `MIGRATION_REQUIRED` when saving onboarding | Run `npx prisma migrate deploy && npx prisma generate` in `backend/`. |
| Chat says "Your Learnova session could not be verified" | Click **Activate AI guidance** in the chat (it links the browser account to the backend using the existing auth endpoints) or sign in again. |
| Chat returns recommendations but no specialists | Your database has no **verified** specialists in that domain yet. |
| Nothing loads in the browser | Make sure the backend is running on port 3001 (`npm run dev` in `backend/`) — the frontend proxies `/api/backend/*` to it. |
