# EcoTrace — Setup, Configuration & Deployment Guide

## 1. Architecture Overview
EcoTrace separates identity/authentication from scientific relational persistence:
- **Firebase Authentication**: Handles user registration, email/password sign-in, Google Sign-In, email verification, password reset, and JWT ID token issuance.
- **Backend API (Express + TypeScript)**: Verifies every request's Firebase ID Token using `firebase-admin` (`verifyIdToken`), enforces user ownership and server-side administrator authorization, parses uploaded eDNA datasets (`CSV`, `TSV`, `JSON`, `TXT`, `FASTA`, `FASTQ`), and computes exact biodiversity indices.
- **PostgreSQL (Cloud SQL in AI Studio / Supabase PostgreSQL)**: Stores projects, samples, datasets, analyses, taxonomic identifications, biodiversity metrics, reports, reference database metadata, and admin audit logs.

---

## 2. Firebase Configuration
1. Client configuration is loaded from `firebase-applet-config.json`.
2. In the **Firebase Console** (`Authentication -> Sign-in method`):
   - **Google** sign-in is configured automatically via AI Studio OAuth setup.
   - To enable **Email/Password** registration, password reset, and email verification, toggle **Email/Password** to **Enabled** in the Firebase Console.
3. Deploy `firestore.rules` if using Firestore profile mirroring:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 3. Supabase PostgreSQL & Storage Setup (Optional External Deployment)
If deploying outside AI Studio with Supabase as your PostgreSQL and object storage backend:
1. Create a new Supabase project.
2. Open the **SQL Editor** and run `supabase/migrations/001_ecotrace_schema.sql`.
   - This creates all 9 scientific tables, foreign keys, indexes, Row Level Security (RLS) policies, and the private `ecotrace-datasets` storage bucket.
3. Configure server-side environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). **Never** expose `SUPABASE_SERVICE_ROLE_KEY` in client code (`VITE_*`).

---

## 4. Configuring Secure Administrator Access
Administrator access to `/secure-control` and `/api/admin/*` is strictly enforced on the backend:
- Users cannot select or elevate their own role during registration or profile updates.
- To grant administrator privileges to trusted accounts:
  1. Set `ADMIN_EMAILS` in your server environment / Secrets panel (comma-separated, e.g. `lead.researcher@university.edu`).
  2. Or assign the Firebase custom claim `{ "admin": true }` using a trusted server-side script with `firebase-admin`:
     ```ts
     await adminAuth.setCustomUserClaims(uid, { admin: true });
     ```
- Every administrative action (user status changes, dataset removal, reference database edits, announcements) is recorded in `audit_logs`.

---

## 5. Local Development & Production Deployment
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build client assets and start the server on port `3000`:
   ```bash
   npm run build
   npm start
   ```
