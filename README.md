# Yellow Sand

Cross-border vehicle marketplace connecting UAE dealers with buyers in Nigeria and Ghana. Built with a milestone-based escrow engine to protect both parties during international transactions.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** (Auth, PostgreSQL, Edge Functions)
- **Stripe** (Payments — AED currency)
- **TrustIn Escrow API** (Funds holding)
- **TailwindCSS** with custom brand tokens (sand/navy)
- **Radix UI** primitives (built-in, no CLI required)

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd yellow-sand
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a project, then run the migrations:

```bash
npx supabase db push
# or manually run:
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_rls_policies.sql
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# TrustIn Escrow (replace with real credentials)
TRUSTIN_API_KEY=your_trustin_key
TRUSTIN_WEBHOOK_SECRET=your_webhook_secret
```

### 4. Start the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
├── (buyer)/            # Buyer-only routes (role guard in layout)
│   ├── dashboard/
│   ├── transactions/
│   └── saved/
├── (dealer)/           # Dealer-only routes
│   └── dealer/
│       ├── dashboard/
│       ├── listings/
│       └── transactions/
├── (admin)/            # Admin-only routes
│   └── admin/
│       ├── dashboard/
│       ├── dealers/
│       ├── vehicles/
│       ├── transactions/
│       ├── disputes/
│       └── accounts/
├── api/
│   ├── payments/
│   │   ├── create-intent/   # Stripe PaymentIntent creation
│   │   └── webhook/         # Stripe webhook handler
│   ├── transactions/
│   │   └── [id]/
│   │       ├── milestones/  # Milestone completion (state machine)
│   │       └── dispute/     # Dispute filing
│   └── escrow/
│       └── webhook/         # TrustIn webhook handler
├── auth/
│   ├── login/
│   ├── register/
│   └── forgot-password/
└── vehicles/           # Public vehicle browsing

components/
├── ui/                 # Radix UI-based component library
├── shared/             # Navbar, Footer, DashboardShell
└── transaction/        # MilestoneTracker, LandedCostCalculator

lib/
├── supabase/           # Server/client/middleware clients
├── transaction-state-machine.ts
├── trustin/            # TrustIn API client
├── constants.ts        # Countries, status configs
└── utils.ts            # formatAed, calculateLandedCost, etc.

supabase/
├── migrations/         # SQL schema + RLS policies
└── functions/          # Deno Edge Functions
    ├── send-notification/
    └── release-escrow/   # Cron: auto-release after 48h
```

## Transaction State Machine

Escrow milestones flow:

```
pending_payment → funded → inspection_pending → docs_review
→ shipping → in_transit → customs → delivered → completed
```

Each transition is validated by `assertTransition(from, to, actorRole)` — buyers and dealers can only advance milestones appropriate to their role.

## User Roles

| Role | Access | Country |
|------|--------|---------|
| Buyer | `/dashboard`, `/transactions`, `/saved` | Nigeria, Ghana |
| Dealer | `/dealer/*` | UAE |
| Admin | `/admin/*` | — |

## Deployment (Vercel)

```bash
vercel --prod
```

Set all environment variables in the Vercel project settings. Supabase Edge Functions deploy separately via `supabase functions deploy`.

## Stripe Webhooks

Forward webhooks locally during development:

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

## Exchange Rates

The landed cost calculator uses mock exchange rates. Replace with a live rate API (e.g. Open Exchange Rates) in `components/transaction/landed-cost-calculator.tsx`.
