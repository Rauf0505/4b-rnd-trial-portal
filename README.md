# 4B R&D Trial Portal

Professional R&D field trial tracking portal for agricultural trials across the
Sahiwal, Multan, Lahore and Hyderabad research stations.

## Features

- **Trial categories** with category-driven observation schedules (every trial
  starts with a **0 DAA** baseline taken on the application date):
  - Herbicide / Fungicide / Granular insecticide / Fertilizer-Growth: `0, 3, 7, 14, 21, 28 DAA`
  - Phytotoxicity: `0, 1, 3, 7, 10, 12, 14, 21 DAA`
  - Foliar insecticide: `0, 1, 3, 7, 14, 21, 28 DAA`
  - Fertilizer / Growth also accepts a manually entered **harvesting stage** date.
- **Multiple products per trial** — each with brand, active ingredient, formulation, dose, unit, replications, applications and a free-text **Standard / Check** (products may share or differ).
- **Filtering** by station, status, category, sub-category, crop, pest/weed, product and staff.
- **Excel exports** with dynamic DAA columns and a consolidated **Dashboard Overview** sheet (all trials, all locations). Every export (and the print report) can be generated **with or without** the Standard / Check column from its dropdown; the on-screen table has a show/hide toggle.
- Print-friendly station status reports.
- All data stored in **Supabase** (cloud PostgreSQL).

## Setup

### 1. Create the database

Run [supabase/schema.sql](supabase/schema.sql) in your Supabase project's SQL editor.

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your Supabase values:

```
VITE_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR-ANON-KEY"
```

### 3. Run locally

**Prerequisites:** Node.js

```
npm install
npm run dev
```

The dev server runs on http://localhost:3000.

## Data migration

If you used the previous localStorage-based version, open **Database & Backup**
in the footer (or the "Migrate Local Data" link) to push your existing browser
trials into Supabase.

## Testing

End-to-end tests use [Playwright](https://playwright.dev) and run against a real
browser + the live Supabase project.

```bash
npx playwright install chromium   # one-time browser download
npm run test:e2e                  # start the dev server on :3100 and run all specs
npm run test:e2e:ui               # interactive UI runner
```

- Specs live in `e2e/`; they create records named `E2E-*`, exercise the full flow
  (create → observe → export → filter → edit → delete), and remove those records
  again. A final assertion confirms the database is back to its seeded baseline.
- The Playwright-managed dev server uses port **3100** (`npm run dev:e2e`) so it
  never collides with a normal `npm run dev` on port 3000.
- `npm run lint:e2e` type-checks the test sources.

## Notes

- Authentication currently uses a lightweight in-app role switcher
  (Field Staff / R&D Officer / Deputy Manager / Admin). The anon key therefore
  has read/write access — add Supabase Auth + stricter RLS before production.
