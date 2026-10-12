# 4B R&D Trial Portal

Professional R&D field trial tracking portal for agricultural trials across the
Sahiwal, Multan, Lahore and Hyderabad research stations.

## Features

- **Trial categories** with category-driven observation schedules:
  - Herbicide / Fungicide / Granular insecticide / Fertilizer-Growth: `3, 7, 14, 21, 28 DAA`
  - Phytotoxicity: `1, 3, 7, 10, 12, 14, 21 DAA`
  - Foliar insecticide: `1, 3, 7, 14, 21, 28 DAA`
  - Fertilizer / Growth also accepts a manually entered **harvesting stage** date.
- **Multiple products per trial** — each with brand, active ingredient, formulation, dose, unit, replications and applications.
- **Filtering** by station, status, category, sub-category, crop, pest/weed, product and staff.
- **Excel exports** with dynamic DAA columns and a consolidated **Dashboard Overview** sheet (all trials, all locations).
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

## Notes

- Authentication currently uses a lightweight in-app role switcher
  (Field Staff / R&D Officer / Deputy Manager / Admin). The anon key therefore
  has read/write access — add Supabase Auth + stricter RLS before production.
