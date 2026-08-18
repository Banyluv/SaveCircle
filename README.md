# Ajo Savings Tracker 🇳🇬

A modern, high-aesthetic web application for managing traditional rotating thrift associations (**Ajo** / ROSCA) across Nigeria.

---

## 📌 Problem Context

In Nigeria, traditional thrift groups (*Ajo*) are a vital financial lifeline for market traders, artisans, small business owners, and staff cooperatives. Members contribute a fixed amount of money (e.g. ₦25,000 to ₦200,000) into a shared pool at regular intervals (weekly, bi-weekly, or monthly). In each cycle, one member receives the full lump-sum payout (*takes the hand* or *collects the pot*).

### Manual Challenges Solved:
- **Paper Notebook Errors**: Eliminates lost ledger books and dispute-prone manual record-keeping.
- **Lack of Transparency**: Real-time visibility into who has paid, whose payment is pending verification, and who is overdue.
- **Rotation Queue Conflicts**: Clear visual turn schedules with member position swapping for urgent financial needs (e.g., bulk stock inventory, school fees).
- **Payment Verification Proof**: Digital receipt generation tailored for Nigerian payment channels (Moniepoint, OPay, Zenith, First Bank, Cash).

---

## 🏛️ Preset Community Hubs Included

This application comes pre-configured with authentic Nigerian commerce hubs and business cooperatives:

1. **Balogun Market Fashion Merchants Ajo** (*Lagos Island, Lagos*) — ₦150,000 / Weekly
2. **Watt Market Fabric & Textiles Ajo** (*Watt Market, Calabar*) — ₦100,000 / Weekly
3. **Marian Fresh Farmers Ajo** (*Marian Market, Calabar*) — ₦25,000 / Bi-weekly
4. **Marian Road Tech & Business Guild** (*State Housing Estate, Calabar*) — ₦200,000 / Monthly

---

## ✨ Core Features

### 1. Interactive Dashboard & Overview
- Total Naira (₦) thrift pool collected across active groups.
- Active cycle metrics, pending verifications, and overdue payment alerts.
- Highlight card for the **Next Scheduled Payout Recipient**.

### 2. Group Management & Custom Location Naming
- Create custom Ajo pools with tailored group titles, free-form location tags (*e.g. Watt Market Calabar, Balogun Lagos, Wuse Abuja, Ariaria Aba*), contribution amounts (₦), frequencies (Weekly, Bi-weekly, Monthly), and late penalty rules.
- Member rosters with bank details, contact info, and trust scores (0–100%).

### 3. Contributions Matrix & Verification
- Cycle-by-cycle payment matrix.
- Payment statuses: `Verified`, `Pending Verification`, `Overdue`.
- Log payments across Nigerian channels (Moniepoint, OPay, Zenith, First Bank, Access Bank, UBA, Cash at Market Stand, USSD).

### 4. Official Digital Receipt Generator
- Generates printable/downloadable digital receipts stamped by the Group Trustee (*Iya Ajo*).

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
- **Styling**: Vanilla CSS Design System with Glassmorphism (`#0b1320` dark slate, `#008751` Nigerian Emerald, `#f59e0b` Warm Gold accents)
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
   cd C:\Users\HomePC\.gemini\antigravity\scratch\ajo-savings-tracker
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

## 📄 License
Created for community financial empowerment in Nigeria.
