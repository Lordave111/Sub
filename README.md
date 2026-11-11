# Sub — Nigerian Airtime & Data VTU

A Next.js storefront for MTN, Airtel, Glo and 9mobile airtime/data. Paystack handles checkout; VTpass fulfills purchases after server-side payment verification. A percentage commission is added to each purchase.

## Stack
- Next.js 14 App Router (Vercel-ready)
- Paystack transaction initialization and verification
- VTpass service-variation lookup and purchase API
- Supabase Postgres order ledger

## Setup
1. Create a Supabase project and run [supabase/schema.sql](supabase/schema.sql), then [supabase/account-migration.sql](supabase/account-migration.sql), in its SQL Editor.
2. In Supabase Authentication → Providers, enable Email. Choose whether to require email confirmation.
3. Copy `.env.example` to `.env.local` and fill in the values, including `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the Supabase publishable/anon key).
4. Create a VTpass sandbox account, enable API access, and add its API key, public key and secret key. VTpass POST requests use `api-key` and `secret-key`; GET requests use `api-key` and `public-key`.
5. Create a Paystack test integration and add its secret key. Never put secret keys in frontend variables or commit them.
6. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
6. Run `npm install` and `npm run dev`.

## Vercel deployment
Import this repository into Vercel. Framework preset: Next.js; Root Directory: `./`. Add every variable from `.env.example` in Project Settings → Environment Variables, set `NEXT_PUBLIC_SITE_URL` to your deployed URL, and redeploy. In Supabase Authentication → URL Configuration, set the Site URL to your deployed domain and add the Vercel domain to the allowed redirect URLs if you enable email confirmation.

Start with `VTU_SANDBOX=true` and Paystack test keys. Test successful, pending, failed, and duplicate callback scenarios before switching to live credentials and `VTU_SANDBOX=false`.

## Commission
The default commission is 20% of the airtime amount or data-plan provider price. Set `COMMISSION_PERCENT` on the server and `NEXT_PUBLIC_COMMISSION_PERCENT` to the same percentage for the customer-facing price display. The server calculates the final commission independently and does not trust any fee submitted by the browser. Change both values together if you adjust the percentage. The customer dashboard uses Supabase Auth and lists orders created while the customer is signed in. Existing guest orders are not automatically assigned to accounts. Wallet balance reads the wallet transaction ledger; wallet funding is not enabled yet. Live carrier data-balance/usage is not available from the current VTpass integration and is not represented with fabricated figures.

## Important production notes
- Do not enable live VTpass or live Paystack keys until sandbox tests pass.
- A successful Paystack payment is verified server-side and amount/currency are checked before VTpass is called.
- Keep Supabase service-role and all provider secrets server-only.
- Provider responses marked pending are recorded as pending and must be reconciled using VTpass requery before any retry; never blindly resubmit a pending purchase.
- This is an integration starter, not yet a fully audited money-handling system.


## Digital subscriptions marketplace

A customer subscription area is available at `/subscriptions`. It includes account-linked subscription records, active/expired/pending status display, expiry dates, renewal-preference controls, and subscription payment history.

Before using the subscription area, run `supabase/subscriptions-migration.sql` in the Supabase SQL Editor. The migration creates:
- `subscription_catalog` for supplier-backed products and current plans;
- `user_subscriptions` for each customer's activated services;
- `subscription_orders` for payment and fulfillment history.

**Important:** Netflix, Spotify, YouTube Premium, Apple Music, Showmax and TV services currently appear as upcoming catalogue options only. They are not purchasable yet. No supplier API, live plan pricing, activation or recurring billing has been configured for these brands. Do not accept payment for these services until an authorized supplier integration and server-side payment/fulfillment verification are implemented. The auto-renew switch currently stores a customer preference; it does not initiate recurring Paystack charges or cancel a provider-side subscription.
