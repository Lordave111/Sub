# FraudGuard

FraudGuard is a scam-protection workspace for individuals and organisations. It helps people review suspicious messages, links and investment offers, submit private incident reports, and organise business security workflows.

## Implemented in this branch

- Responsive security dashboard and manual scanner for messages, URLs and investment offers.
- Rule-based content screening with clear risk indicators and practical safety steps.
- Optional Google Safe Browsing URL checks and VirusTotal lookups of existing URL reports. Provider keys remain server-side.
- Authenticated scan-history storage (summary and signals only; raw pasted message content is not stored).
- Supabase email/password and Google OAuth sign-in page, plus an authenticated personal/business portal.
- Optional AI-assisted scam review through the OpenAI Responses API.
- Moderated community intelligence feed that exposes only reports explicitly approved for publication.
- Private incident-report submission and report-history API.
- Organisation workspace creation and membership foundation with owner role.
- Private evidence upload endpoint (10 MB limit, allow-listed file types, report ownership check and quarantine state).
- Alert preference API for email/high-risk/digest settings.
- Admin moderation endpoint with an explicit allow-list of Supabase auth user IDs.
- Meta webhook challenge verification and HMAC SHA-256 signature validation.
- Telegram webhook secret-token validation.
- Supabase schema with RLS, private evidence bucket, organisation membership, audit trail and report/scans tables.

## Setup

1. Create or select a Supabase project.
2. Run `supabase/fraudguard.sql` in the Supabase SQL Editor. This creates the FraudGuard tables, row-level security policies and private evidence bucket.
3. In Vercel, configure:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) — server only; never prefix with `NEXT_PUBLIC_`.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key).
   - `NEXT_PUBLIC_SITE_URL`
4. In Supabase Auth, enable Email/Password and optionally Google OAuth. Add your production domain and `/auth` callback to the allowed redirect URLs.
5. Deploy the branch or merge the pull request after reviewing the build.
6. Optional threat intelligence:
   - `OPENAI_API_KEY` and optionally `FRAUDGUARD_AI_MODEL` (defaults to `gpt-6.2-astra`). AI review is available from the scan results after sign-in. Submitted text is sent to OpenAI when enabled.
   - `GOOGLE_SAFE_BROWSING_API_KEY`
   - `VIRUSTOTAL_API_KEY`
   Submitted URLs are sent to enabled providers for reputation lookup. Tell users this in your privacy notice. VirusTotal integration checks existing reports only; it does not upload unknown URLs.
7. Optional webhooks:
   - `META_APP_SECRET`
   - `META_WEBHOOK_VERIFY_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
8. Set `FRAUDGUARD_ADMIN_USER_IDS` to a comma-separated list of trusted Supabase auth user UUIDs to enable report moderation.

## API routes

| Route | Purpose |
|---|---|
| `POST /api/scan` | Rule-based scan plus optional URL reputation lookups; stores scan metadata for authenticated users |
| `POST /api/ai-analysis` | Authenticated AI-assisted review using the OpenAI Responses API |
| `GET /api/intelligence` | Public feed of moderator-approved scam patterns only |
| `/portal` | Personal and business account portal for reports, evidence, alerts and history |
| `/community` | Moderated public scam-pattern library |
| `GET, POST /api/reports` | List and submit private reports |
| `GET /api/history` | Authenticated scan history |
| `GET, PUT /api/alerts` | Alert preferences |
| `GET, POST /api/organizations` | List and create business workspaces |
| `POST /api/evidence` | Upload private evidence to quarantine |
| `PATCH /api/admin/reports/:id` | Allow-listed administrator moderation |
| `GET, POST /api/webhooks/meta` | Meta webhook verification and signature validation |
| `POST /api/webhooks/telegram` | Telegram webhook secret validation |

Authenticated API calls use `Authorization: Bearer <Supabase access token>`.

## Important boundaries

- The local scanner is heuristic screening, not an AI verdict, antivirus, a confirmed fraud database, or legal determination. A low score never proves safety.
- External provider results are additional signals and can be incomplete or wrong. When enabled, AI receives submitted text and URL reputation services receive extracted URLs; disclose this clearly to users.
- Do not paste OTPs, PINs, passwords, recovery codes or full payment credentials.
- Reports are private by default. A report must be reviewed before it can be published as a pattern; unverified allegations must not be exposed publicly.
- Evidence is stored in a private bucket with status `quarantined`. This repository does not yet run antivirus or content-disarm scanning, so files must not be served or trusted until a malware-scanning pipeline marks them clean.
- Meta and Telegram webhooks validate authenticity but intentionally do not process user messages yet. OAuth consent, account mapping, webhook subscription and event handling must be completed before enabling live monitoring.
- WhatsApp integrations use the official WhatsApp Business Platform. They do not provide covert access to personal WhatsApp chats.
- Alert preferences are stored, but outbound email/SMS/push delivery requires a notification provider and is not yet activated.
- Organisation membership and owner creation are implemented. Team invitations, detailed role-management UI, billing and full audit-log UI remain follow-up work.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Privacy and operations checklist

Before production launch, publish a privacy notice and terms, define evidence retention and deletion, configure Supabase backups, rotate secrets, enable provider quotas, add rate limiting and abuse protection, test webhook replay handling, and complete provider compliance/app reviews. Never store access tokens in browser storage or expose service-role keys.
