# SaveCircle 🇳🇬

A modern, high-aesthetic web application for managing traditional rotating thrift associations (**SaveCircle** / ROSCA) across Nigeria.

---

## 📌 Problem Context

In Nigeria, traditional thrift groups (*SaveCircle*) are a vital financial lifeline for market traders, artisans, small business owners, and staff cooperatives. Members contribute a fixed amount of money (e.g. ₦25,000 to ₦200,000) into a shared pool at regular intervals (weekly, bi-weekly, or monthly). In each cycle, one member receives the full lump-sum payout (*takes the hand* or *collects the pot*).

### Manual Challenges Solved:
- **Paper Notebook Errors**: Eliminates lost ledger books and dispute-prone manual record-keeping.
- **Lack of Transparency**: Real-time visibility into who has paid, whose payment is pending verification, and who is overdue.
- **Rotation Queue Conflicts**: Clear visual turn schedules with member position swapping for urgent financial needs (e.g., bulk stock inventory, school fees).
- **Payment Verification Proof**: Digital receipt generation tailored for Nigerian payment channels (Moniepoint, OPay, Zenith, First Bank, Cash).

---

## 🏛️ Preset Community Hubs Included

This application comes pre-configured with authentic Nigerian commerce hubs and business cooperatives:

1. **Balogun Market Fashion Merchants SaveCircle** (*Lagos Island, Lagos*) — ₦150,000 / Weekly
2. **Watt Market Fabric & Textiles SaveCircle** (*Watt Market, Calabar*) — ₦100,000 / Weekly
3. **Marian Fresh Farmers SaveCircle** (*Marian Market, Calabar*) — ₦25,000 / Bi-weekly
4. **Marian Road Tech & Business Guild** (*State Housing Estate, Calabar*) — ₦200,000 / Monthly

---

## ✨ Core Features

### 1. Interactive Dashboard & Overview
- Total Naira (₦) thrift pool collected across active groups.
- Active cycle metrics, pending verifications, and overdue payment alerts.
- Highlight card for the **Next Scheduled Payout Recipient**.

### 2. Group Management & Custom Location Naming
- Create custom SaveCircle pools with tailored group titles, free-form location tags (*e.g. Watt Market Calabar, Balogun Lagos, Wuse Abuja, Ariaria Aba*), contribution amounts (₦), frequencies (Weekly, Bi-weekly, Monthly), and late penalty rules.
- Member rosters with bank details, contact info, and trust scores (0–100%).

### 3. Contributions Matrix & Verification
- Cycle-by-cycle payment matrix.
- Payment statuses: `Verified`, `Pending Verification`, `Overdue`.
- Log payments across Nigerian channels (Moniepoint, OPay, Zenith, First Bank, Access Bank, UBA, Cash at Market Stand, USSD).

### 4. Official Digital Receipt Generator
- Generates printable/downloadable digital receipts stamped by the Group Trustee (*Iya SaveCircle*).

### 5. Payout Rotation & Turn Swapping
- Visual rotation timeline showing past disbursed payouts and upcoming turns.
- Turn swap agreement simulator between members with emergency/business justification.
- Celebratory payout disbursal action.

### 6. Audit Trail & Local Persistence
- Activity log tracking all transactions and administrative verifications.
- Offline `localStorage` persistence with a **Reset to Demo Data** trigger.

---

## 🛠️ Technology Stack

- **Framework**: React 18 (ESM Component Architecture)
- **Bundler / Dev Server**: Vite 6
- **Styling**: Vanilla CSS Design System with Glassmorphism (green & white palette — `#008751` Nigerian Emerald on white, green-tinted dark mode)
- **Typography**: Google Fonts (*Plus Jakarta Sans* & *Inter*)
- **Icons**: `lucide-react`
- **Effects**: `canvas-confetti`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
   ```bash
   cd C:\SaveCircle
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite local development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## ☁️ Deploying to Render

The Express backend serves the built React app from `dist/`, so a **single web service** hosts both the API and the frontend. No separate static site is needed.

### 1. Create the service

Push this repo to GitHub, then in the Render dashboard choose **New → Web Service** and connect the repository.

| Setting | Value |
|---|---|
| Runtime | Node |
| Build Command | `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance Type | Free (or Starter) |

`--include=dev` is required: Vite and the React plugin are dev dependencies, and the frontend cannot be built without them.

`ELECTRON_SKIP_BINARY_DOWNLOAD=1` stops npm from downloading Electron's ~358 MB desktop
binary on every deploy. Electron is only the optional desktop shell, so that download
wastes time and is the most likely cause of a build timeout.

Pointing the health check at `/api/health` (not `/`) also means Render verifies the API
and database, rather than just checking that an HTML file exists.

A `render.yaml` blueprint is included, so **New → Blueprint** works too — it declares the same settings plus the environment variables below.

### 2. Set environment variables

| Key | Value |
|---|---|
| `DATABASE_URL` | Your Postgres connection string (e.g. Neon, with `sslmode=require`) |
| `JWT_SECRET` | A long random string — **do not reuse the dev default** |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `CORS_ORIGIN` | *(optional)* comma-separated origin allowlist, only if you call the API from another domain |

`HOST` matters: Render routes traffic to the container from outside, so the server must bind all interfaces rather than `127.0.0.1`. `server.js` detects this automatically via `NODE_ENV`, `HOST`, or Render's own `RENDER` variable, but setting it explicitly is safest.

`JWT_SECRET` is required in practice. Without it the server generates a random secret
per process, which invalidates every session on each restart/deploy — and the old
hardcoded fallback was a public string that would let anyone forge an admin token.

`PORT` is provided by Render — do not set it.

### 3. Database

Any hosted Postgres works. Tables and the default seed users are created automatically on first boot, so no migration step is needed.

### 4. Notes

- **`backend/.env` is gitignored and is not deployed.** All configuration comes from the environment variables above.
- **Free instances sleep** after ~15 minutes idle; the first request afterwards takes up to a minute to wake.
- **Uploads/data persist** because all state lives in Postgres, not the container filesystem — which is ephemeral on Render and resets on every deploy.
- Change the seeded account passwords before sharing the URL publicly.

---

## 📄 License
Created for community financial empowerment in Nigeria.
