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
- Private Telegram AI assistant chat with local scam screening and optional OpenAI conversational analysis.
- WhatsApp Business Cloud API private assistant webhook with Meta signature verification and inbound-message replies.
- Meta webhook challenge verification and HMAC SHA-256 signature validation.
- Supabase schema with RLS, private evidence bucket, organisation membership, audit trail and report/scans tables.

## Setup

1. Create or select a Supabase project.
2. Run `supabase/fraudguard.sql` in the Supabase SQL Editor. This creates the FraudGuard tables, row-level security policies and private evidence bucket.
3. Import the repository into Vercel with the project root set to the repository root. It is configured for the Next.js framework, `npm install`, and `npm run build`; use Node.js 20 or newer.
4. In Vercel, configure:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) — server only; never prefix with `NEXT_PUBLIC_`.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key).
   - `NEXT_PUBLIC_SITE_URL`
5. In Supabase Auth, enable Email/Password and optionally Google OAuth. Add your production domain and `/auth` callback to the allowed redirect URLs.
6. Deploy the branch for a Preview deployment first. Promote it to Production only after the Preview deployment and environment configuration are verified.
7. Optional threat intelligence:
   - `OPENAI_API_KEY` and optionally `FRAUDGUARD_AI_MODEL` (defaults to `gpt-6.2-astra`). AI review is available from the scan results after sign-in. Submitted text is sent to OpenAI when enabled.
   - `GOOGLE_SAFE_BROWSING_API_KEY`
   - `VIRUSTOTAL_API_KEY`
   Submitted URLs are sent to enabled providers for reputation lookup. Tell users this in your privacy notice. VirusTotal integration checks existing reports only; it does not upload unknown URLs.
8. Optional webhooks:
   - `META_APP_SECRET`
   - `META_WEBHOOK_VERIFY_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET` and `TELEGRAM_BOT_TOKEN` for a Telegram bot. Set its webhook to `https://fgsafe.vercel.app/api/webhooks/telegram` and configure the same secret token in Telegram.
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, and `META_APP_SECRET` for WhatsApp Business Cloud API. Subscribe the Meta app to the WhatsApp `messages` webhook field and use `https://fgsafe.vercel.app/api/webhooks/whatsapp` as the callback URL. The WhatsApp user must message the business number first; replies are sent only to that user within the platform's customer-service window.
10. Social account OAuth (optional):
   - Run `supabase/social-connections.sql` in Supabase SQL Editor.
   - Set `SOCIAL_OAUTH_STATE_SECRET` to a long random secret (32+ characters).
   - Set `SOCIAL_TOKEN_ENCRYPTION_KEY` to a base64-encoded 32-byte key. Generate one with `openssl rand -base64 32`.
   - For Facebook Pages and Instagram Professional, configure a Meta app and set `META_APP_ID` and `META_APP_SECRET`.
   - For YouTube, configure a Google OAuth web client and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
   - Add `https://fgsafe.vercel.app/api/social/callback` (or your own domain callback) to each provider's allowed OAuth redirect URLs. `NEXT_PUBLIC_SITE_URL` must match the deployed origin.
   - Provider app review, business verification, approved permissions and platform-specific eligibility may be required before real accounts can connect.
9. Set `FRAUDGUARD_ADMIN_USER_IDS` to a comma-separated list of trusted Supabase auth user UUIDs to enable report moderation.

## API routes

| Route | Purpose |
|---|---|
| `POST /api/social/connect` | Start a signed, short-lived Meta or Google OAuth flow for the signed-in user |
| `GET /api/social/callback` | Exchange the OAuth code and store encrypted provider tokens server-side |
| `GET, DELETE /api/social/connections` | List the signed-in user's connected accounts or remove stored credentials |
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
| `POST /api/webhooks/telegram` | Private Telegram bot chat; replies to direct messages only |
| `GET, POST /api/webhooks/whatsapp` | WhatsApp Business webhook verification and private inbound-message replies |

Authenticated API calls use `Authorization: Bearer <Supabase access token>`.

## Important boundaries

- The local scanner is heuristic screening, not an AI verdict, antivirus, a confirmed fraud database, or legal determination. A low score never proves safety.
- External provider results are additional signals and can be incomplete or wrong. When enabled, AI receives submitted text and URL reputation services receive extracted URLs; disclose this clearly to users.
- Do not paste OTPs, PINs, passwords, recovery codes or full payment credentials.
- Reports are private by default. A report must be reviewed before it can be published as a pattern; unverified allegations must not be exposed publicly.
- Evidence is stored in a private bucket with status `quarantined`. This repository does not yet run antivirus or content-disarm scanning, so files must not be served or trusted until a malware-scanning pipeline marks them clean.
- Social OAuth supports the initial Meta and Google authorization foundation. It stores access/refresh tokens encrypted server-side; it does not yet run continuous threat monitoring, fetch private DMs, or guarantee account-takeover detection. Users should also revoke app access in the provider's own settings. TikTok and X OAuth are not implemented yet.
- The Telegram and WhatsApp chat assistants only process messages users deliberately send to the FraudSafe bot/business number. They do not read other chats, access hidden inboxes, or contact a user's friends or contacts. Telegram group/channel messages are ignored.
- WhatsApp chat requires the official WhatsApp Business Platform, a configured business phone number, approved app setup and webhook subscription. It cannot operate as an unofficial bot on an ordinary personal WhatsApp account. Replies are limited by Meta's messaging rules and customer-service window.
- The chat handler does not save the text it receives. If `OPENAI_API_KEY` is enabled, message content is sent to the configured AI provider for analysis; disclose this clearly and tell users not to send passwords, OTPs, PINs or recovery phrases.
- Platform OAuth connections are separate from chat-bot access. Connecting a social account does not grant private-DM access or automatic monitoring.
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
