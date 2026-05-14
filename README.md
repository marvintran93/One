# Local Delivery Storefront

Invite-only, login-walled storefront with delivery / local pickup, an admin dashboard, and a courier view. Built with Next.js (App Router) + Tailwind + Supabase + Stripe.

## Features

- Email + password auth (Supabase Auth). Email verification required.
- Signup collects first name, last name, email, phone, DOB, password, and an optional invite/referral code. 18+ self-attestation gate. Users below 18 are blocked.
- Manual admin approval. New users land on a "pending approval" screen until an admin approves them.
- Personal referral code generated for every approved customer.
- Storefront: product cards with size buttons (S/M/L/XL), dynamic per-size price, color accent dot, placeholder image block.
- Cart with quantity, persisted to localStorage.
- Checkout:
  - Delivery vs local pickup
  - Mile-tiered delivery fee (≤5mi $5, ≤10mi $10, ≤15mi $15, >15mi unavailable) computed via Google Distance Matrix
  - $100 minimum for delivery; no minimum for pickup
  - Delivery window picker (10am-12pm, 12pm-2pm, 2pm-4pm, 4pm-6pm)
  - Stripe Checkout session, with discreet statement descriptor suffix
- Order confirmation + status email/SMS via SendGrid + Twilio (no-op when keys are absent).
- Admin dashboard: approvals, orders list/detail, status updates, courier assignment, full product CRUD, courier promotion.
- Courier view: only assigned orders, mark delivered with a photo (stored privately in Supabase Storage, viewable via signed URL).
- Mobile-first responsive UI.
- Discreet billing-descriptor and plain-packaging copy at checkout and on receipts.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres, Auth, Storage) with row-level security
- Stripe Checkout + webhook
- Twilio (SMS), SendGrid (email)
- Google Maps Distance Matrix
- Zustand (cart) + zod (server-side validation)
- Hosting target: Vercel

## Project layout

```
src/
  app/
    layout.tsx                root layout + metadata
    page.tsx                  redirects to /login
    login/page.tsx            sign-in
    signup/page.tsx           sign-up + 18+ gate
    pending/page.tsx          "awaiting approval" screen
    auth/callback/route.ts    Supabase email confirmation exchange
    (shop)/                   customer-only group (approval required)
      layout.tsx, store/, cart/, checkout/, order/[id]/, account/
    admin/                    admin-only group
      layout.tsx, page.tsx, approvals/, orders/, products/, couriers/
    courier/                  courier-only group
      layout.tsx, page.tsx, orders/[id]/
    api/
      checkout/delivery-quote, checkout/create-session
      webhook/stripe
      admin/users/[id]/{approve,deny,role}
      admin/orders/[id]/{status,assign}
      admin/products, admin/products/[id]
      admin/new-account-alert
      courier/orders/[id]/deliver
  lib/
    auth.ts, types.ts, format.ts
    cart.ts                   zustand cart store
    delivery.ts               mile-tier fee table
    distance.ts               Google Distance Matrix wrapper
    products.ts               product + sizes loader
    stripe.ts                 Stripe SDK init
    notifications.ts          Twilio + SendGrid helpers (graceful no-op)
    supabase/{browser,server,admin}.ts
  middleware.ts               auth refresh + role-based redirects
  components/                 ProductCard, Nav, Brand, SignOutButton, ClearCartOnLoad
supabase/
  schema.sql                  schema + RLS + triggers (run in Supabase SQL editor)
```

## Setup

### 1. Install

```
npm install
```

### 2. Supabase

1. Create a new Supabase project.
2. In the SQL editor, paste and run `supabase/schema.sql`.
3. In **Storage**, create a **private** bucket named `delivery-photos`.
4. In **Authentication → URL Configuration**, set the site URL to your local dev URL (e.g. `http://localhost:3000`) and add `http://localhost:3000/auth/callback` to the redirect URLs.
5. Copy `Project URL`, `anon key`, and `service_role` key into `.env.local`.

Create your first admin: after that user signs up and confirms their email, in the Supabase SQL editor run

```sql
update public.profiles
set role = 'admin', status = 'approved', approved_at = now()
where email = 'you@example.com';
```

### 3. Stripe

1. Create a Stripe account (test mode is fine to start).
2. Put your test secret + publishable keys into `.env.local`.
3. For local development, run `stripe listen --forward-to localhost:3000/api/webhook/stripe` and copy the `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.
4. In **Settings → Public details**, set a statement descriptor and (optionally) a statement descriptor prefix matching the value in `NEXT_PUBLIC_BILLING_DESCRIPTOR`.

### 4. Google Maps Distance Matrix

1. Enable the **Distance Matrix API** in Google Cloud Console.
2. Create an API key, restrict it to that API + your server IPs.
3. Set `GOOGLE_MAPS_API_KEY` and `STORE_ORIGIN_ADDRESS` (your store / pickup address, e.g. `1234 Main St, Houston, TX 77002`).

### 5. Twilio (SMS) — optional

Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`. If unset, the app logs SMS calls and continues.

### 6. SendGrid (email) — optional

Set `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`. If unset, the app logs email calls and continues.

> Note: with Supabase Auth, **Supabase** sends the email-verification message. SendGrid here is for transactional emails the app itself triggers (signup confirmation, approval, order confirmation, status updates). You can configure Supabase to send via SendGrid in the Supabase dashboard under **Authentication → Emails**.

### 7. Admin alerts — optional

Comma-separate emails / phones in `ADMIN_ALERT_EMAILS` and `ADMIN_ALERT_PHONES` to receive new-order and new-account alerts.

### 8. Run

```
cp .env.example .env.local
# fill in values
npm run dev
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import in Vercel.
3. Add all env vars from `.env.example`.
4. In Stripe, add a production webhook endpoint pointing at `https://your-domain/api/webhook/stripe` and update `STRIPE_WEBHOOK_SECRET`.
5. In Supabase, update the auth redirect URL to `https://your-domain/auth/callback`.

## Future payment methods

The Stripe Checkout session can be extended to add Cash App Pay (already a Stripe payment method in supported regions) by including `payment_method_types: ["card", "cashapp"]` in the session create call. Raw on-chain crypto is intentionally not wired — it requires its own compliance review.

## Notes on compliance & discretion

- Discretion is provided through **packaging copy**, **billing descriptor**, **invite-only access**, and **plain branding** — not by hiding product names or quantities. Customers see real product names, descriptions, and quantities; receipts list the same.
- The app age-gates at 18+ via DOB and self-attestation. Swap in a KYC provider (Stripe Identity / Persona) at signup if you want documented verification.
- Adult clothing + accessories are allowed on Stripe. Review Stripe's restricted-businesses list against your specific catalog before launch.
- TX state and local tax handling are not built in; add a tax engine (Stripe Tax, TaxJar) before going live.
