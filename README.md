# Sub — Nigerian Airtime & Data VTU

A Next.js storefront for MTN, Airtel, Glo and 9mobile airtime/data. Paystack handles checkout; VTpass fulfills purchases after server-side payment verification. Commission is currently configured as a fixed naira fee in the checkout flow.

## Stack
- Next.js 14 App Router (Vercel-ready)
- Paystack transaction initialization and verification
- VTpass service-variation lookup and purchase API
- Supabase Postgres order ledger

## Setup
1. Create a Supabase project and run [supabase/schema.sql](supabase/schema.sql) in its SQL Editor.
2. Copy `.env.example` to `.env.local` and fill in the values.
3. Create a VTpass sandbox account, enable API access, and add its API key, public key and secret key. VTpass POST requests use `api-key` and `secret-key`; GET requests use `api-key` and `public-key`.
4. Create a Paystack test integration and add its secret key. Never put secret keys in frontend variables or commit them.
5. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
6. Run `npm install` and `npm run dev`.

## Vercel deployment
Import this repository into Vercel. Framework preset: Next.js; Root Directory: `./`. Add every variable from `.env.example` in Project Settings → Environment Variables, set `NEXT_PUBLIC_SITE_URL` to your deployed URL, and redeploy.

Start with `VTU_SANDBOX=true` and Paystack test keys. Test successful, pending, failed, and duplicate callback scenarios before switching to live credentials and `VTU_SANDBOX=false`.

## Commission
Set `COMMISSION_NAIRA` on the server and `NEXT_PUBLIC_COMMISSION_NAIRA` to the same display value (default ₦30). The server calculates the final commission and ignores any fee submitted by the browser. Change both environment values together when adjusting your fee. Also configure support contact details, order lookup, account authentication, and provider callback/requery handling.

## Important production notes
- Do not enable live VTpass or live Paystack keys until sandbox tests pass.
- A successful Paystack payment is verified server-side and amount/currency are checked before VTpass is called.
- Keep Supabase service-role and all provider secrets server-only.
- Provider responses marked pending are recorded as pending and must be reconciled using VTpass requery before any retry; never blindly resubmit a pending purchase.
- This is an integration starter, not yet a fully audited money-handling system.
