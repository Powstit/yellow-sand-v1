# Yellow Sand — Architecture

## Overview

Yellow Sand is a Next.js 14 App Router application for cross-border vehicle transactions between UAE dealers and international buyers. It connects six external systems through a typed API layer.

```
                          ┌─────────────────────────────────────┐
                          │            User (Browser)           │
                          └──────────────┬──────────────────────┘
                                         │
                          ┌──────────────▼──────────────────────┐
                          │         Next.js Frontend            │
                          │   App Router / React Server         │
                          │   Components / Client Components     │
                          │                                      │
                          │  Route Groups:                       │
                          │   /              (public)            │
                          │   /(buyer)       (authenticated)     │
                          │   /(dealer)      (authenticated)     │
                          │   /(admin)       (authenticated)     │
                          └──────┬───────────────┬──────────────┘
                                 │               │
               ┌─────────────────▼──┐    ┌───────▼──────────────┐
               │   Supabase         │    │   Next.js API Routes  │
               │                    │    │                        │
               │  - Auth (sessions) │    │  /api/vehicles        │
               │  - PostgreSQL DB   │    │  /api/enquiries       │
               │  - Row Level Sec.  │    │  /api/reservations    │
               │  - Storage (imgs)  │    │  /api/transactions    │
               │  - Edge Functions  │    │  /api/payments/       │
               └────────────────────┘    │  /api/escrow/         │
                                         │  /api/email/send      │
                                         └──┬──────────┬─────────┘
                                            │          │
                        ┌───────────────────▼──┐  ┌────▼───────────────┐
                        │   Stripe             │  │   TrustIn Escrow   │
                        │                      │  │                    │
                        │  - PaymentIntents    │  │  - Escrow accounts │
                        │  - Webhooks          │  │  - Milestones      │
                        │  - AED currency      │  │  - Webhooks        │
                        └──────────────────────┘  └────────────────────┘
                                            │
                                    ┌───────▼──────────┐
                                    │   Resend Email   │
                                    │                  │
                                    │  - 8 templates   │
                                    │  - React Email   │
                                    └──────────────────┘
```

---

## System Interactions

### 1. Frontend — Next.js App Router

**Server Components** (default) — fetch data directly from Supabase on the server. No API round-trip. Safe to use `createServerClient()`.

**Client Components** — marked `"use client"`. Use `createBrowserClient()` for real-time subscriptions or user-triggered mutations. Post to API routes for anything requiring service-role access.

**Route groups** enforce layout and auth context without affecting the URL:

| Group | Prefix | Layout | Auth |
|---|---|---|---|
| `(buyer)` | `/transactions`, `/saved` | Buyer dashboard shell | Supabase session |
| `(dealer)` | `/dealer/*` | Dealer sidebar | Session + dealer_profile |
| `(admin)` | `/admin/*` | Admin panel | Session + admin role |
| Public | `/vehicles`, `/` | Marketing shell | None |

**Middleware** (`middleware.ts`) runs on every request. It calls `createServerClient()` with cookie storage, refreshes the session token, and redirects unauthenticated users away from protected routes.

---

### 2. Supabase

Two client modes, different privilege levels:

```
lib/supabase/
  browser.ts    createBrowserClient()   — anon key, browser only, respects RLS
  server.ts     createServerClient()    — anon key, server only, respects RLS
                createAdminClient()     — service role key, server only, bypasses RLS
```

**Row Level Security** policies enforce:
- Vehicles: publicly readable when `status = 'active'`
- Transactions: readable only by `buyer_id` or the dealer who owns the vehicle
- Profiles: readable only by the owning user
- `transaction_events`: insert-only (trigger blocks UPDATE/DELETE — immutable audit log)

**Edge Function** (`supabase/functions/release-escrow/`) — Deno cron that auto-releases escrow 48 hours after `delivered_at` is set, if the buyer has not raised a dispute.

---

### 3. Stripe

Stripe handles payment collection only. It does not hold funds long-term — that is TrustIn's role.

**Payment flow:**

```
Buyer clicks "Pay"
  → POST /api/payments/create-intent
      → stripe.paymentIntents.create({ amount, currency: "aed", metadata: { transaction_id } })
      → returns { clientSecret }
  → Stripe.js renders Payment Element in browser
  → Buyer submits card details directly to Stripe (never touches our server)
  → Stripe calls POST /api/payments/webhook

Webhook: payment_intent.succeeded
  1. Verify HMAC signature (stripe.webhooks.constructEvent)
  2. Look up transaction by metadata.transaction_id
  3. Create TrustIn escrow account
  4. Update transaction: status → inspection_pending, funded_at, stripe_charge_id, trustin_escrow_id
  5. Insert milestone rows: payment_received (completed), inspection_verified (in_progress)
  6. Mark vehicle: status → sold
  7. Insert transaction_event (immutable audit)
  8. Insert buyer notification
  9. Send escrow_funded emails to buyer + dealer via Resend
```

---

### 4. TrustIn Escrow

TrustIn holds the buyer's funds throughout the transaction lifecycle. Funds are only released when all milestones are verified.

**Client** (`lib/trustin/index.ts`) — typed stub wrapping the TrustIn REST API with HMAC-SHA256 request signing.

```
trustin.createEscrow({ transactionReference, buyerEmail, sellerEmail, amountAed, milestones })
  → Returns { id: string }  (stored as transactions.trustin_escrow_id)

trustin.releaseMilestone(escrowId, milestoneId)
  → Moves percentage of funds to dealer

trustin.refund(escrowId, reason)
  → Returns funds to buyer

trustin.verifyWebhook(body, signature)
  → HMAC-SHA256 via Web Crypto API, secret from TRUSTIN_WEBHOOK_SECRET env
```

**Webhook handler** (`/api/escrow/webhook`):

| TrustIn Event | Action |
|---|---|
| `escrow.funds_released` | Update transaction → `completed`, insert event, notify dealer |
| `escrow.refunded` | Update transaction → `refunded`, insert event, notify buyer |
| `escrow.disputed` | Update transaction → `disputed`, insert event, open dispute record |

---

### 5. Resend Email

All transactional emails are React components rendered server-side to HTML via `@react-email/render`.

**`lib/email.tsx`** — central email service:

```typescript
// Internal send helper
send(to, subject, template) → resend.emails.send({ from: EMAIL_FROM, to, subject, html })

// Named exports (one per event)
sendEnquiryReceived(to, props)
sendReservationCreated(to, props)
sendInspectionBooked(to, props)
sendInspectionPassed(to, props)
sendEscrowFunded(to, props)
sendVehicleShipped(to, props)
sendVehicleDelivered(to, props)
sendFundsReleased(to, props)

// Fires buyer + dealer emails concurrently, swallows individual failures
sendToBothParties(buyerEmail, dealerEmail, sendFn, buyerProps, dealerProps)

// URL helpers (keeps email templates decoupled from routing)
urls.vehicle(id)          → /vehicles/{id}
urls.transaction(id)      → /transactions/{id}
urls.dealerTransaction(id)→ /dealer/transactions/{id}
urls.dashboard()          → /transactions
urls.dealerDashboard()    → /dealer/transactions
```

**Internal HTTP endpoint** (`/api/email/send`) — allows server-side code outside the main request path (e.g., Edge Functions, cron jobs) to trigger emails without importing `lib/email.tsx` directly. Protected by `INTERNAL_API_SECRET`.

**Templates** (`emails/`):

| File | Event | Recipients |
|---|---|---|
| `enquiry-received.tsx` | Buyer sends enquiry | Dealer |
| `reservation-created.tsx` | Reservation confirmed | Buyer + Dealer |
| `inspection-booked.tsx` | Inspection scheduled | Buyer + Dealer |
| `inspection-passed.tsx` | Inspection report complete | Buyer + Dealer |
| `escrow-funded.tsx` | Payment secured | Buyer + Dealer |
| `vehicle-shipped.tsx` | Vehicle dispatched | Buyer + Dealer |
| `vehicle-delivered.tsx` | Delivery confirmed | Buyer + Dealer |
| `funds-released.tsx` | Transaction complete | Buyer + Dealer |

All templates extend `emails/components/base-layout.tsx` — branded dark navy layout with gold accents matching the Yellow Sand design system.

---

## Transaction State Machine

Defined in `lib/transaction-state-machine.ts`. 13 states, typed transition map, actor enforcement.

```
enquiry_sent
  → [buyer] reserved
      → [system] payment_pending
          → [system] inspection_pending
              → [dealer/admin] inspection_in_progress
                  → [dealer/admin] inspection_passed ──────────────────────→ inspection_failed
                      → [dealer/admin] documentation_pending                      ↓
                          → [dealer/admin] shipping_pending              [admin] refunded
                              → [dealer/admin] in_transit
                                  → [system/buyer] delivered
                                      → [system] completed
                                          OR
                                      → [buyer/admin] disputed
                                          → [admin] refunded
                                          → [admin] completed
```

`assertTransition(from, to, actor)` throws `TransactionStateMachineError` if:
- The transition is not in the allowed map, or
- The actor is not authorised for that transition

Every state change must go through this function. API routes pass the authenticated user's role as `actor`.

---

## API Routes

```
app/api/
  vehicles/
    [id]/route.ts          GET  — public vehicle detail
  enquiries/route.ts       POST — create enquiry, notify dealer
  reservations/route.ts    POST — create reservation, hold vehicle
  transactions/
    [id]/
      milestones/route.ts  POST — advance milestone (asserts state machine)
      dispute/route.ts     POST — open dispute
  payments/
    create-intent/route.ts POST — create Stripe PaymentIntent
    webhook/route.ts       POST — Stripe webhook (HMAC-verified)
  escrow/
    webhook/route.ts       POST — TrustIn webhook (HMAC-verified)
  email/
    send/route.ts          POST — internal email trigger (secret-protected)
```

All mutating routes (`POST`, `PATCH`) use `createAdminClient()` for writes after verifying the session with `createServerClient()`. Webhooks skip session auth and use HMAC signature verification instead.

---

## Event Lifecycle (End-to-End)

```
1. BROWSE       Buyer views /vehicles (public, Supabase RLS allows SELECT on active vehicles)

2. ENQUIRE      Buyer submits form → POST /api/enquiries
                  → Insert enquiry row
                  → sendEnquiryReceived → dealer email

3. RESERVE      Dealer accepts → POST /api/reservations
                  → Insert reservation, update vehicle status → reserved
                  → sendReservationCreated → buyer + dealer emails

4. PAY          Buyer → POST /api/payments/create-intent → Stripe PaymentIntent
                  → Stripe.js collects card (client-side, PCI-compliant)
                  → Stripe fires payment_intent.succeeded webhook
                  → POST /api/payments/webhook:
                      - Create TrustIn escrow
                      - Update transaction → inspection_pending
                      - Mark vehicle → sold
                      - sendEscrowFunded → buyer + dealer emails

5. INSPECT      Inspector appointed → POST /api/transactions/[id]/milestones
                  → assertTransition(inspection_pending → inspection_in_progress, dealer)
                  → sendInspectionBooked → buyer + dealer emails
                  → Report complete → assertTransition(→ inspection_passed, dealer)
                  → sendInspectionPassed → buyer + dealer emails

6. DOCUMENT     Dealer uploads docs → milestone: documentation_pending → shipping_pending

7. SHIP         Dealer books freight → assertTransition(→ in_transit, dealer)
                  → sendVehicleShipped → buyer + dealer emails (tracking, ETA, ports)

8. DELIVER      Freight agent confirms → assertTransition(→ delivered, system)
                  → sendVehicleDelivered → buyer + dealer emails (48h dispute window)

9. COMPLETE     48h elapses, no dispute:
                  → Supabase Edge Function (release-escrow cron) fires
                  → trustin.releaseMilestone(escrowId, "delivery") → funds to dealer
                  → TrustIn fires escrow.funds_released webhook
                  → POST /api/escrow/webhook:
                      - Update transaction → completed
                      - sendFundsReleased → buyer + dealer emails
```

---

## Environment Variables

| Variable | Used By | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend + server | Respects RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (`createAdminClient`) | Never expose to browser |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js (browser) | |
| `STRIPE_SECRET_KEY` | Stripe SDK (server) | |
| `STRIPE_WEBHOOK_SECRET` | `/api/payments/webhook` | HMAC verification |
| `STRIPE_PLATFORM_FEE_PERCENT` | Payment intent creation | e.g. `2.5` |
| `RESEND_API_KEY` | `lib/email.tsx` | |
| `EMAIL_FROM` | `lib/email.tsx` | Use `onboarding@resend.dev` until domain verified |
| `TRUSTIN_API_URL` | `lib/trustin` | |
| `TRUSTIN_API_KEY` | `lib/trustin` | HMAC request signing |
| `TRUSTIN_WEBHOOK_SECRET` | `/api/escrow/webhook` | HMAC verification |
| `INTERNAL_API_SECRET` | `/api/email/send` | Optional, guards internal endpoint |
| `NEXT_PUBLIC_APP_URL` | Email URL helpers | `https://yellowsand.dev` in prod |
| `EXCHANGE_RATE_API_KEY` | Price conversion | Open Exchange Rates or similar |
