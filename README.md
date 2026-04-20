# Ryderwear Gym — Team Knowledge Assessment

Single-page knowledge assessment for Ryderwear Gym team members, with a password-protected admin dashboard that lists every submitted assessment.

## Routes

| Route | Who | What |
|---|---|---|
| `/` | Public | The assessment form |
| `POST /api/submit` | Public | Called by the form when "Complete" or "Download PDF" is clicked |
| `/admin` | Admin | List of all submitted assessments (table) |
| `/admin/:id` | Admin | Opens a specific assessment in the results view (PDF re-downloadable) |
| `POST /admin/:id/delete` | Admin | Deletes an assessment |

## Railway setup

### 1. Deploy
Connect this repo as a Railway service. Nixpacks auto-detects Node and runs `npm install` → `npm start`.

### 2. Admin credentials (required)
In the Railway service **Variables** tab, add:

| Variable | Example | Required |
|---|---|---|
| `ADMIN_USER` | `oscar` | yes |
| `ADMIN_PASS` | *(a strong password)* | yes |

Without these, admin defaults to `admin` / `changeme` — **change them**.

### 3. Persistent storage (recommended)
Submissions are written to `submissions.json`. By default Railway re-creates the container on every redeploy, so data is lost. To keep data across deploys:

1. Service → **Settings** → **Volumes** → **New Volume**
2. Mount path: `/data`
3. Size: 1 GB is plenty

Without a volume, the app still works but data resets on each deploy. You can also set `DATA_DIR` env var to override the default location.

## Run locally

```
npm install
ADMIN_USER=oscar ADMIN_PASS=yourpassword npm start
```

- Form: http://localhost:3000
- Admin: http://localhost:3000/admin (browser will prompt for user / password)

Data is stored in `./data/submissions.json` locally.
