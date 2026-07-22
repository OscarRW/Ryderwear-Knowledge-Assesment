# Ryderwear Gym — Team Knowledge Assessment

Single-page knowledge assessment for Ryderwear Gym team members, with a password-protected admin dashboard that lists every submitted assessment.

Runs on **Vercel** (serverless functions) with **Upstash Redis** (Vercel Marketplace) for storage.

## Routes

| Route | Who | What |
|---|---|---|
| `/` | Public | The assessment form (static `index.html`) |
| `POST /api/submit` | Public | Called by the form when "Complete" or "Download PDF" is clicked |
| `/admin` | Admin | List of all submitted assessments (table) |
| `/admin/:id` | Admin | Opens a specific assessment in the results view (PDF re-downloadable) |
| `POST /admin/:id/delete` | Admin | Deletes an assessment |

The `/admin*` routes are mapped to serverless functions via rewrites in `vercel.json`.

## Vercel setup

### 1. Import
Import this repo as a Vercel project (Framework Preset: **Other** — no build step needed).

### 2. Storage (required for submissions to persist)
Vercel → project → **Storage** → **Create Database** → **Redis** (Upstash, from the Marketplace) → connect it to this project. That injects the connection env vars automatically (`KV_REST_API_URL` / `KV_REST_API_TOKEN`, or the `UPSTASH_REDIS_REST_*` equivalents — the app reads either).

Without a store connected, the app still runs but writes to an ephemeral `/tmp` file that resets on every deploy/cold start.

### 3. Admin credentials (required)
Vercel → project → **Settings → Environment Variables**, add:

| Variable | Example | Required |
|---|---|---|
| `ADMIN_USER` | `oscar` | yes |
| `ADMIN_PASS` | *(a strong password)* | yes |

Without these, admin defaults to `admin` / `changeme` — **change them**.

## Run locally

```
npm install
npm run dev          # vercel dev — serves the form + functions
```

- Form: http://localhost:3000
- Admin: http://localhost:3000/admin (browser prompts for user / password)

With no Redis env vars set, submissions are stored locally in `/tmp/rw-assess-data/submissions.json` (override with `DATA_DIR`). Set `ADMIN_USER` / `ADMIN_PASS` to test the admin login.

## Tests

```
npm test             # drives submit -> list -> view -> delete against the local-file store
```

## Storage shape

Submissions are stored as a JSON array under the Redis key `rw-assessment:submissions` (namespaced so the store can be shared with other projects), each item:

```
{ id, created_at, updated_at, team_member, assessor, gym, assessment_date, data }
```

`data` is the full form payload (`NM, AS, GY_, DT, AN[], AC, SA, SM`).
