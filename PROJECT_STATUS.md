# Yellow Sand — Project Status

> Cross-border vehicle marketplace connecting UAE dealers with buyers in Nigeria and Ghana.
> Milestone-based escrow engine protects both parties through the full export transaction lifecycle.

**Last updated:** March 2026
**Stack:** Next.js 14 · TypeScript · Supabase · Stripe · TrustIn Escrow · Resend
**Dev server:** `npm run dev` → `http://localhost:3000`

---

## Table of Contents

1. [Completed Systems](#1-completed-systems)
2. [Infrastructure](#2-infrastructure)
3. [Transaction Lifecycle](#3-transaction-lifecycle)
4. [Partially Completed Systems](#4-partially-completed-systems)
5. [Development Phases](#5-development-phases)
6. [Immediate Next Milestones](#6-immediate-next-milestones)
7. [Architecture Overview](#7-architecture-overview)
8. [File Map](#8-file-map)
9. [Demo Accounts](#9-demo-accounts)

---

## 1. Completed Systems

### ✅ Authentication
- Email/password sign-up and login via Supabase Auth
- Role-based registration: **buyer** (Nigeria/Ghana) or **dealer** (UAE)
- Middleware route guards — all protected routes check role + `is_active` flag
- Auto-profile creation trigger on `auth.users` INSERT
- Forgot password flow (`/auth/forgot-password`)
- Redirect-after-login to role-appropriate dashboard
- Session management via `@supabase/ssr` (cookie-based, SSR-safe)

**Files:** `app/auth/login/page.tsx`, `app/auth/register/page.tsx`, `middleware.ts`, `lib/supabase/`

---

### ✅ Vehicle Listing System
- Public vehicle browse page with filter tabs (make, export-ready)
- URL-driven filters via `searchParams` — fully bookmarkable
- Full-text search via PostgreSQL `tsvector` generated column + GIN index
- Vehicle detail page with image gallery, spec grid, inspection report display
- Dealer listing management (create, view, status badges)
- New listing form for approved dealers (`/dealer/listings/new`)
- `VehicleCard` and `VehicleFilters` shared components
- Landed cost calculator: CIF-based breakdown with import duty + VAT per country
  - Nigeria: 35% duty + 7.5% VAT + 2% NHIS levy
  - Ghana: 30% duty + 15% VAT

**Files:** `app/vehicles/`, `components/marketplace/`, `components/transaction/landed-cost-calculator.tsx`

---

### ✅ Enquiry System
- Buyer can express interest from a vehicle listing page
- `enquiry_received` email fires to the dealer via Resend
- Email includes buyer name, country, message, and direct dashboard link
- Dealer notified in real time with vehicle context

**Files:** `emails/enquiry-received.tsx`, `lib/email.tsx`, `app/api/email/send/route.ts`

---

### ✅ Reservation System
- Buyer initiates a transaction from the vehicle detail page (`/transactions/new?vehicle=`)
- Transaction record created via `POST /api/transactions`
- Auto-generated reference number: `YS-YYYYMMDD-XXXXXX`
- Status starts at `pending_payment`
- `reservation_created` email fires to both buyer and dealer
- Vehicle is locked (status → `pending_payment`) until payment or cancellation

**Files:** `app/api/transactions/route.ts`, `emails/reservation-created.tsx`

---

### ✅ Escrow Payment Integration
- Stripe PaymentIntent created server-side (`POST /api/payments/create-intent`)
- AED currency, platform fee (2.5%) calculated and included
- Stripe webhook handler verifies signature and processes `payment_intent.succeeded`
- On payment success:
  - TrustIn escrow created with 4 milestone hooks
  - Transaction advances to `inspection_pending`
  - `payment_received` milestone marked complete
  - Vehicle status set to `sold`
  - Immutable audit event logged to `transaction_events`
  - In-app notification sent to buyer
  - `escrow_funded` email fires to both buyer and dealer

**Files:** `app/api/payments/create-intent/route.ts`, `app/api/payments/webhook/route.ts`, `lib/stripe/index.ts`

---

### ✅ Inspection Workflow
- Inspection report stored in `inspection_reports` table (linked 1:1 to vehicle)
- Report includes: overall rating (pass/conditional/fail), engine/body/interior condition, notes, inspector name, date
- Displayed on vehicle detail page and transaction detail pages
- `inspection_booked` email fires to both parties when inspection is scheduled
- `inspection_passed` email fires with full condition report when vehicle clears
- Admin can view inspection status across all vehicles
- Inspection milestone tracked in `transaction_milestones`

**Files:** `emails/inspection-booked.tsx`, `emails/inspection-passed.tsx`, `app/api/transactions/[id]/milestones/route.ts`

---

### ✅ Shipping Milestone Events
- Shipping milestone advances transaction from `documentation_verified` → `shipping_pending` → `in_transit`
- `vehicle_shipped` email fires to both parties with tracking number, shipping company, ports, ETA
- `vehicle_delivered` email fires when delivery is confirmed — includes 48-hour action window warning
- Buyer confirms delivery via `POST /api/transactions/[id]/confirm-delivery`
- On confirm: transaction → `completed`, escrow release triggered
- Auto-release Edge Function (`supabase/functions/release-escrow`) scans for `delivered` transactions older than 48h

**Files:** `emails/vehicle-shipped.tsx`, `emails/vehicle-delivered.tsx`, `app/api/transactions/[id]/confirm-delivery/route.ts`, `supabase/functions/release-escrow/index.ts`

---

### ✅ Email Automation System (Resend)
- **8 transactional email templates** built with React Email
- All templates share a branded dark-navy layout with gold accents
- Each template is fully typed with a `Props` interface
- Internal send endpoint: `POST /api/email/send` (accepts any event by name)
- `sendToBothParties()` helper fires buyer + dealer emails concurrently
- Dynamic imports keep templates out of the main bundle

| Event | Template | Recipient |
|---|---|---|
| `enquiry_received` | `emails/enquiry-received.tsx` | Dealer |
| `reservation_created` | `emails/reservation-created.tsx` | Buyer + Dealer |
| `inspection_booked` | `emails/inspection-booked.tsx` | Buyer + Dealer |
| `inspection_passed` | `emails/inspection-passed.tsx` | Buyer + Dealer |
| `escrow_funded` | `emails/escrow-funded.tsx` | Buyer + Dealer |
| `vehicle_shipped` | `emails/vehicle-shipped.tsx` | Buyer + Dealer |
| `vehicle_delivered` | `emails/vehicle-delivered.tsx` | Buyer + Dealer |
| `funds_released` | `emails/funds-released.tsx` | Buyer + Dealer |

**Files:** `emails/`, `lib/email.tsx`, `app/api/email/send/route.ts`

---

## 2. Infrastructure

| Service | Purpose | Status |
|---|---|---|
| **Supabase** | PostgreSQL DB, Auth, RLS, Edge Functions | ✅ Connected |
| **Stripe** | AED payments, PaymentIntent, webhooks | ✅ Integrated |
| **TrustIn Escrow** | Funds holding, milestone-based release | ⚠️ Typed stub (real credentials needed) |
| **Resend** | Transactional email delivery | ✅ Live (`re_fyDzHzMd_...`) |
| **Next.js 14** | App Router, SSR, API routes | ✅ Running |
| **Vercel** | Deployment target | 🔲 Not yet deployed |

### Database Tables (12 tables)
`profiles` · `dealer_profiles` · `vehicles` · `vehicle_images` · `inspection_reports` · `transactions` · `transaction_milestones` · `transaction_events` · `documents` · `disputes` · `saved_vehicles` · `notifications`

### Row Level Security
- Vehicles: public read for `status = 'active'`
- Transactions: buyer + dealer participant only
- Profiles: own record only
- Admin client (service role) bypasses RLS for webhooks and admin API routes

### Supabase Edge Functions
- `send-notification` — push in-app notifications
- `release-escrow` — cron job auto-releases escrow after 48h delivery timeout

---

## 3. Transaction Lifecycle

The full marketplace lifecycle from first contact to funds release:

```
BUYER BROWSES → ENQUIRY → RESERVATION → PAYMENT → INSPECTION
     → DOCUMENTATION → SHIPPING → DELIVERY → ESCROW RELEASE
```

### Step-by-step

```
1. enquiry_received
   └─ Buyer contacts dealer about a vehicle
   └─ Email → dealer
   └─ No DB state change yet

2. reservation_created          [status: pending_payment]
   └─ Buyer creates transaction via /transactions/new
   └─ Vehicle locked, reference number generated
   └─ Email → buyer + dealer
   └─ Stripe PaymentIntent created

3. escrow_funded                [status: inspection_pending]
   └─ Stripe payment_intent.succeeded webhook fires
   └─ TrustIn escrow created (funds locked)
   └─ payment_received milestone marked complete
   └─ Email → buyer + dealer
   └─ In-app notification → buyer

4. inspection_booked            [status: inspection_pending]
   └─ Admin or dealer schedules third-party inspector
   └─ Email → buyer + dealer

5. inspection_passed            [status: inspection_complete]
   └─ Inspector submits report (pass/conditional/fail)
   └─ inspection_verified milestone marked complete
   └─ Email → buyer + dealer with full condition report

6. documentation_verified       [status: documentation_verified]
   └─ Dealer uploads: title deed, export cert, customs docs
   └─ Admin or system verifies documents
   └─ documentation_verified milestone marked complete

7. vehicle_shipped              [status: in_transit]
   └─ Dealer confirms shipping with tracking number
   └─ shipping_confirmed milestone marked complete
   └─ Email → buyer + dealer with tracking details

8. vehicle_delivered            [status: delivered]
   └─ Shipping company confirms arrival at destination port
   └─ delivery_confirmed milestone marked complete
   └─ Email → buyer + dealer (buyer has 48h action window)

9. funds_released               [status: completed]
   └─ Buyer confirms delivery OR 48h timeout elapses
   └─ TrustIn releases escrow to dealer
   └─ funds_released milestone marked complete
   └─ Email → buyer + dealer
   └─ Dealer rating updated
```

### State Machine
All status transitions are validated by `assertTransition(from, to, actorRole)` in `lib/transaction-state-machine.ts`. Invalid transitions and wrong-role actors throw `TransactionStateMachineError`.

**13 states:** `pending_payment` → `funded` → `inspection_pending` → `inspection_complete` → `documentation_pending` → `documentation_verified` → `shipping_pending` → `in_transit` → `delivered` → `completed` · `disputed` · `cancelled` · `refunded`

---

## 4. Partially Completed Systems

### ⚠️ Dealer Dashboard
**Built:** Overview stats, recent transaction list, recent listings list, verification status banner, "New Listing" CTA.
**Missing:** Revenue chart/graph over time, conversion rate, average sale price trend, top-performing listing stats, enquiry-to-sale funnel.

### ⚠️ Admin Moderation Panel
**Built:** Dealer list with verification status, dealer detail + approval UI placeholder, dispute list + detail view, account list (buyers/dealers), vehicle list, transaction list + detail.
**Missing:** Actual approve/reject action buttons wired to `POST /api/admin/dealers/[id]/approve` (route exists but no UI button), dispute resolution form, bulk account suspension, content flagging queue.

### ⚠️ Dispute System
**Built:** `disputes` table, dispute detail page, `POST /api/transactions/[id]/dispute` API route, admin dispute queue.
**Missing:** Buyer-facing "raise dispute" UI on transaction page, dispute resolution workflow UI for admin, escrow partial-refund logic, TrustIn dispute API integration.

### ⚠️ Vehicle Enquiry Analytics
**Built:** Email fires on enquiry. No tracking beyond that.
**Missing:** Enquiry count per vehicle stored in DB, enquiry-to-reservation conversion rate, heat map of which vehicles get most enquiries, dealer analytics dashboard showing enquiry trends.

### 🔲 Liquidity Tracker
**Not started.** Planned feature to show dealers their capital tied up in active escrow vs. available funds, with projected release dates based on milestone progress.

### 🔲 Inspection Partner Integration
**Built:** Inspection report schema, email templates, milestone tracking.
**Missing:** Real integration with a UAE inspection company API (e.g., Emirates Inspection Bureau). Currently inspections are logged manually. No booking portal or API webhook from inspector.

### 🔲 Shipping Company Integration
**Built:** Shipping milestone, tracking number field, `vehicle_shipped` email.
**Missing:** Integration with a freight forwarder API for real tracking status updates. Currently tracking is entered manually by the dealer.

### 🔲 Saved Vehicles (Save/Unsave action)
**Built:** Saved vehicles page reads from DB and displays grid.
**Missing:** "Save" button on vehicle card/detail page has no client-side action wired. `POST /saved_vehicles` not called from frontend.

### 🔲 Payment UI (Stripe Elements)
**Built:** `POST /api/payments/create-intent` exists, Stripe SDK installed.
**Missing:** The actual Stripe Elements checkout form on the transaction page. Buyer currently can't complete payment from the UI.

---

## 5. Development Phases

### Phase 1 — Marketplace Core *(current)*
Foundation: auth, listings, transactions, escrow, email.

- [x] Supabase schema + RLS
- [x] Authentication (buyer + dealer + admin)
- [x] Vehicle listing and browse
- [x] Full-text search
- [x] Transaction state machine
- [x] Stripe payment integration
- [x] TrustIn escrow integration (typed stub)
- [x] Milestone tracker UI
- [x] 8 transactional email templates
- [x] Resend email delivery
- [x] Admin panel (read-only)
- [ ] Stripe Elements checkout form
- [ ] Save vehicle button
- [ ] Dispute UI for buyers
- [ ] Admin approve/reject dealer buttons

---

### Phase 2 — Dealer Analytics
Give dealers insight into their business performance.

- [ ] Revenue chart (monthly/quarterly)
- [ ] Enquiry-to-reservation conversion funnel
- [ ] Average days-to-sale per vehicle type
- [ ] Listing performance score (views, saves, enquiries)
- [ ] Liquidity tracker (escrow held vs. available)
- [ ] Export performance by destination country

---

### Phase 3 — Escrow Automation
Remove manual steps from the transaction pipeline.

- [ ] Connect to real TrustIn API (replace typed stub)
- [ ] Webhook-driven automatic milestone advancement
- [ ] Dispute resolution with partial refund support
- [ ] Auto-release after 48h delivery timeout (Edge Function ready, needs deployment)
- [ ] Escrow dashboard for admin with full audit trail

---

### Phase 4 — Logistics Integrations
Remove manual data entry for inspections and shipping.

- [ ] Inspection company API integration (booking + report webhook)
- [ ] Freight forwarder API for real-time tracking status
- [ ] Port arrival notifications
- [ ] Customs clearance status updates
- [ ] Automated shipping milestone advancement from tracking events

---

### Phase 5 — Market Intelligence Platform
Data layer for pricing, demand, and market health.

- [ ] Vehicle demand heatmap (which makes/models get most enquiries per country)
- [ ] Price benchmarking (how a listing compares to market)
- [ ] Search ranking algorithm (export readiness, dealer rating, recency)
- [ ] Buyer demand signals (search trends, saved vehicles)
- [ ] Market health dashboard for admin

---

## 6. Immediate Next Milestones

Priority order for the next sprint:

| # | Milestone | Impact | Effort |
|---|---|---|---|
| 1 | **Stripe Elements checkout UI** | Buyers can actually pay | Medium |
| 2 | **Save vehicle button** | Buyer engagement | Low |
| 3 | **Admin approve/reject dealer** | Unblocks dealer onboarding | Low |
| 4 | **Dispute UI for buyers** | Buyer trust + protection | Medium |
| 5 | **Dealer revenue chart** | Dealer retention | Medium |
| 6 | **Liquidity tracker** | Dealer financial clarity | Medium |
| 7 | **Enquiry analytics** | Dealer insight + platform data | High |
| 8 | **Search ranking algorithm** | Listing quality + conversion | High |
| 9 | **Vehicle demand heatmap** | Market intelligence | High |
| 10 | **Deploy to Vercel** | Production readiness | Low |

---

## 7. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER / CLIENT                          │
│  Next.js App Router (React Server Components + Client Islands)  │
│                                                                  │
│  / (landing)     /vehicles      /vehicles/[id]                  │
│  /dashboard      /transactions  /transactions/[id]              │
│  /dealer/*       /admin/*       /auth/*                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────────┐
│                      NEXT.JS API ROUTES                          │
│                                                                  │
│  POST /api/transactions              — create transaction        │
│  POST /api/payments/create-intent    — Stripe PaymentIntent      │
│  POST /api/payments/webhook          — Stripe events             │
│  POST /api/escrow/webhook            — TrustIn events            │
│  POST /api/transactions/[id]/milestones   — advance milestone    │
│  POST /api/transactions/[id]/confirm-delivery                    │
│  POST /api/transactions/[id]/dispute      — raise dispute        │
│  POST /api/admin/dealers/[id]/approve     — verify dealer        │
│  POST /api/admin/disputes/[id]/resolve    — resolve dispute      │
│  POST /api/email/send                — internal email trigger    │
│  GET  /api/logistics/landed-cost     — cost calculator           │
└──────┬──────────────┬────────────────┬───────────────┬──────────┘
       │              │                │               │
┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐ ┌─────▼──────────┐
│  SUPABASE   │ │   STRIPE   │ │   TRUSTIN   │ │    RESEND      │
│             │ │            │ │             │ │                │
│ PostgreSQL  │ │ Payment    │ │ Escrow      │ │ Email delivery │
│ Auth        │ │ Intents    │ │ creation    │ │                │
│ RLS         │ │ Webhooks   │ │ Milestone   │ │ 8 templates    │
│ Edge Fns    │ │ (AED)      │ │ hooks       │ │ React Email    │
│             │ │            │ │ Fund release│ │                │
└──────┬──────┘ └────────────┘ └─────────────┘ └────────────────┘
       │
┌──────▼─────────────────────────────────────────────────────────┐
│                   SUPABASE EDGE FUNCTIONS                       │
│                                                                 │
│  send-notification   — push in-app alerts to users             │
│  release-escrow      — cron: auto-release after 48h timeout    │
└─────────────────────────────────────────────────────────────────┘
```

### Data flow: Payment → Escrow

```
Buyer clicks "Purchase"
    │
    ▼
POST /api/payments/create-intent
    │  creates Stripe PaymentIntent (AED)
    ▼
Stripe Elements (TODO: UI) collects card
    │
    ▼
Stripe → POST /api/payments/webhook (payment_intent.succeeded)
    │
    ├─▶ TrustIn: createEscrow() — funds locked
    ├─▶ Supabase: transaction.status = 'inspection_pending'
    ├─▶ Supabase: milestone payment_received = 'completed'
    ├─▶ Supabase: vehicle.status = 'sold'
    ├─▶ Supabase: transaction_events (immutable audit log)
    └─▶ Resend: escrow_funded email → buyer + dealer
```

### Data flow: Delivery → Funds Release

```
Buyer confirms delivery
    │
    ▼
POST /api/transactions/[id]/confirm-delivery
    │
    ├─▶ assertTransition('delivered', 'completed', 'buyer')
    ├─▶ TrustIn: releaseFunds(escrowId)
    ├─▶ Supabase: transaction.status = 'completed'
    ├─▶ Supabase: milestone funds_released = 'completed'
    └─▶ Resend: funds_released email → buyer + dealer

         ── OR ──

48h timeout (no buyer action)
    │
    ▼
Supabase Edge Function: release-escrow (cron)
    │
    └─▶ Same flow as above, actor_role = 'system'
```

### Security model

- **Anon key** — used client-side. Only reads public data (active vehicles, dealer profiles). Cannot write transactions or view other users' data.
- **Service role key** — server-side only (API routes, webhooks). Bypasses RLS. Never exposed to client.
- **RLS policies** — enforce data isolation at DB level regardless of application code.
- **State machine** — `assertTransition()` enforces valid status transitions and correct actor role before any DB write.
- **Webhook signatures** — Stripe and TrustIn webhooks verified by HMAC before processing.

---

## 8. File Map

```
yellow-sand/
├── app/
│   ├── (buyer)/
│   │   ├── dashboard/page.tsx        — buyer overview + stats
│   │   ├── transactions/page.tsx     — transaction list
│   │   ├── transactions/[id]/page.tsx — transaction detail + milestones
│   │   └── saved/page.tsx            — saved vehicles grid
│   ├── (dealer)/dealer/
│   │   ├── dashboard/page.tsx        — dealer overview + stats
│   │   ├── listings/page.tsx         — listing management table
│   │   ├── listings/new/page.tsx     — create listing form
│   │   └── transactions/[id]/page.tsx — dealer transaction detail
│   ├── (admin)/admin/
│   │   ├── dashboard/page.tsx        — platform overview
│   │   ├── dealers/page.tsx          — dealer verification queue
│   │   ├── dealers/[id]/page.tsx     — dealer review + approve
│   │   ├── vehicles/page.tsx         — all listings
│   │   ├── transactions/page.tsx     — all transactions
│   │   ├── transactions/[id]/page.tsx — transaction detail
│   │   ├── disputes/page.tsx         — dispute queue
│   │   ├── disputes/[id]/page.tsx    — dispute resolution
│   │   └── accounts/page.tsx         — buyer + dealer accounts
│   ├── api/
│   │   ├── transactions/route.ts     — create transaction
│   │   ├── transactions/[id]/milestones/route.ts
│   │   ├── transactions/[id]/confirm-delivery/route.ts
│   │   ├── transactions/[id]/dispute/route.ts
│   │   ├── payments/create-intent/route.ts
│   │   ├── payments/webhook/route.ts  — Stripe webhook
│   │   ├── escrow/webhook/route.ts    — TrustIn webhook
│   │   ├── email/send/route.ts        — internal email trigger
│   │   ├── admin/dealers/[id]/approve/route.ts
│   │   ├── admin/disputes/[id]/resolve/route.ts
│   │   └── logistics/landed-cost/route.ts
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── callback/route.ts
│   ├── vehicles/
│   │   ├── page.tsx                  — public browse + filters
│   │   └── [id]/page.tsx             — vehicle detail
│   └── page.tsx                      — landing page
│
├── emails/
│   ├── components/base-layout.tsx    — shared branded layout
│   ├── enquiry-received.tsx
│   ├── reservation-created.tsx
│   ├── inspection-booked.tsx
│   ├── inspection-passed.tsx
│   ├── escrow-funded.tsx
│   ├── vehicle-shipped.tsx
│   ├── vehicle-delivered.tsx
│   └── funds-released.tsx
│
├── lib/
│   ├── email.tsx                     — Resend service + typed send functions
│   ├── transaction-state-machine.ts  — typed state machine + assertTransition
│   ├── constants.ts                  — countries, fees, status configs
│   ├── utils.ts                      — formatAed, calculateLandedCost, etc.
│   ├── stripe/index.ts               — Stripe client
│   ├── trustin/index.ts              — TrustIn API client (typed stub)
│   └── supabase/
│       ├── client.ts                 — browser client
│       ├── server.ts                 — server client + admin client
│       └── middleware.ts             — session refresh
│
├── components/
│   ├── ui/                           — Radix UI component library (built-in)
│   ├── shared/
│   │   ├── navbar.tsx
│   │   ├── footer.tsx
│   │   └── dashboard-shell.tsx       — sidebar layout with animated nav
│   ├── marketplace/
│   │   ├── vehicle-card.tsx
│   │   └── vehicle-filters.tsx
│   └── transaction/
│       ├── milestone-tracker.tsx     — animated 6-step progress tracker
│       └── landed-cost-calculator.tsx
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql    — all 12 tables + triggers
│   │   └── 002_rls_policies.sql      — RLS policies
│   └── functions/
│       ├── send-notification/        — Deno Edge Function
│       └── release-escrow/           — Deno cron Edge Function
│
├── scripts/
│   ├── schema-and-seed.sql           — combined schema + 12 demo vehicles
│   └── setup-db.mjs                  — Node.js DB runner script
│
├── types/
│   ├── database.ts                   — full Supabase DB type definitions
│   └── index.ts                      — domain types (TransactionWithDetails, etc.)
│
├── middleware.ts                      — route guards + role enforcement
├── next.config.js
├── tailwind.config.ts                 — sand/navy brand tokens
├── .env.local                         — secrets (never commit)
└── README.md                          — setup guide
```

---

## 9. Demo Accounts

Created by `scripts/schema-and-seed.sql`. Run it in the Supabase SQL Editor.

| Role | Email | Password |
|---|---|---|
| Dealer | `dealer@yellowsand.dev` | `Demo1234!` |
| Buyer | `buyer@yellowsand.dev` | `Demo1234!` |

**Demo dealer:** Emirates Premium Motors · Dubai, UAE · 148 completed sales · Rating 4.90
**12 seeded vehicles:** Land Cruiser, Hilux, Patrol, Sunny, LX570, RX350, Pajero, Prado, Defender, Range Rover, Corolla, X-Trail

---

*This document should be updated at the end of each development sprint.*
