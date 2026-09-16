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
| `APK_URL` | *(optional)* public URL of the Android APK, if you host it outside this service |
| `APP_VERSION_CODE` | *(optional)* overrides the version published to installed apps |
| `APP_VERSION_NAME` | *(optional)* the version string users see |
| `APP_APK_SHA256` | *(optional)* expected APK hash, verified on the device before installing |
| `APP_RELEASE_NOTES` | *(optional)* short "what's new" text shown in the update prompt |
| `APP_FORCE_UPDATE` | *(optional)* `true` forces every installed app to update |

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

### 5. The Android APK and Render

`apk/` is gitignored (it holds a multi-megabyte binary that must not go into git),
so a fresh Render deploy has **no APK file**. Everything still works — the server
simply reports `apkAvailable: false` from `/api/app/version`, and the web UI hides
the download button instead of offering one that 404s.

To serve the app for download from the deployed site, pick one:

1. **Host the APK elsewhere** (GitHub Releases is the easiest) and set `APK_URL` to
   its public URL. The server then redirects `/downloads/savecircle.apk` there, and
   installed apps download from that URL directly.
2. **Set the version fields** (`APP_VERSION_CODE`, `APP_VERSION_NAME`, `APP_APK_SHA256`,
   `APP_RELEASE_NOTES`) so installed apps are told a newer build exists without
   committing `apk/version.json`.

Normally you do both at once by running `npm run release`, committing `apk/version.json`,
and uploading `apk/savecircle.apk` to your release host.

---

## � Central Account

A single platform-wide bank account that all groups pay contributions into. It is
managed by a superadmin under **Central Account** in the sidebar and is shown to
members on their dashboard once activated.

- **Superadmin** can edit and activate it. Activation is refused unless bank name,
  account number and account name are all filled in — a half-configured account
  would send members' money somewhere nobody can reconcile.
- **Group admins and members** see it read-only, so they always know where to pay.
- It starts inactive and blank. Until it is activated, no member is shown an
  account number.

Group accounts still exist alongside it: a group keeps its own bank account for
payouts and local records. When the central account is active it is presented as
the primary destination for contributions.

---

## 📱 Mobile (Android APK)

The web UI is fully responsive (off-canvas drawer nav, stacked form grids,
scrollable tables, bottom-sheet modals, safe-area padding). On a phone browser
the app also offers an install prompt with an APK download.

### How the APK gets data

**A phone cannot run the Node/Postgres backend**, so the APK has no server of its
own. It calls your deployed API, which means the server URL must be compiled into
the bundle at build time — Capacitor serves the app from a local origin, so a
relative `/api/...` would hit the phone itself.

That URL comes from the `VITE_API_URL` environment variable (read in
`src/utils/api.js`). Build with it:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -ApiUrl https://your-app.onrender.com
```

This runs `npm run build` with the URL baked in, syncs the assets into the native
project, compiles the APK, and copies it to `apk\savecircle.apk`, which the
backend then serves at `/downloads/savecircle.apk`. (It is kept in `apk\` and not
`public\` because Vite copies `public\` into `dist\`, and Capacitor embeds `dist\`
in the APK — an APK stored there would end up inside the next APK.)

If you build **without** `-ApiUrl`, the app installs and opens but cannot load
data; it detects this and shows an explicit "server not configured" message
instead of a vague network error, along with a field for the server address. The
address typed there is saved on the device and overrides the compiled-in URL, so
an installed APK can be re-pointed (LAN address during testing, hosted URL later)
without a rebuild.

### Install flow on a phone

1. Open the deployed URL in Chrome on Android.
2. A prompt appears: **Install the SaveCircle app → Download APK**.
3. Open the downloaded `SaveCircle.apk` and tap **Install**.
4. Android will ask to allow *"Install unknown apps"* for the browser the first
   time. That is the normal prompt for any app installed outside the Play Store —
   the web page cannot trigger or bypass it.

On iPhone the prompt instead explains **Share → Add to Home Screen**, because an
APK cannot be installed on iOS at all.

### Toolchain

Building the APK needs Java 21 and the Android SDK (platform 35, build-tools
35.0.0). Both were installed at `C:\Program Files\Java\jdk-21` and
`C:\Android\sdk`; `scripts\sdk-setup.ps1` reproduces the SDK install.

```powershell
npm run android:sync          # build web assets + copy into the native project
npm run android:apk           # debug APK (fastest, for testing)
npm run android:apk:release   # signed release APK
npm run android:keystore      # create the release keystore (once per machine)
npm run android:open          # open the project in Android Studio
```

The APK published at `apk\savecircle.apk` and served on
`/downloads/savecircle.apk` is a **signed release** build.

### Signed release builds

A release APK is signed with this project's own keystore, so Android treats it as
a real app rather than the throwaway debug key (which is public and shared by
every developer machine). That is what you sideload for day-to-day use or upload
to a store.

The key lives in `android\keystore\savecircle-release.jks` and its credentials in
`android\keystore.properties`. Both are gitignored. Create them once — and again
on any new machine — with:

```powershell
npm run android:keystore        # scripts\create-keystore.ps1
```

Then build:

```powershell
npm run android:apk:release     # signed release APK
# or, baking the server URL in at the same time:
powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -Release -ApiUrl https://your-app.onrender.com
```

`-Release` fails immediately if the signing material is missing, and after the
build it verifies the result with `apksigner` and refuses to publish an unsigned
APK — so `apk\savecircle.apk` is either signed or the build errored. There is no
`app-release-unsigned.apk` to sign by hand any more.

**Back the keystore and its password up.** Android only accepts an update signed
with the same key, so losing them means every existing install must be uninstalled
by hand before the next build will install, and a Play Store listing can never be
updated again. `android\keystore.properties` holds the password in plain text by
design (Gradle has to read it) — git never sees it, but a backup copy does need to
exist somewhere you can reach.

Because this APK is signed with a different key than the earlier **debug** build,
a phone that still has the debug APK installed must uninstall it first: Android
rejects the cross-key update with *"App not installed"*.

---

## �📄 License
Created for community financial empowerment in Nigeria.
