# FraudGuard

FraudGuard is the new direction for the former Sub application: a digital-safety workspace for individuals and businesses to review suspicious messages, links and investment pitches.

## Current implementation

- Responsive FraudGuard security dashboard and navigation.
- Manual scam scanner for pasted messages, URLs and investment offers.
- Server-side rule-based checks for common red flags: guaranteed returns, recruitment-based schemes, upfront fees, credential requests, urgency tactics and suspicious URL structures.
- Clear risk explanations and practical next steps.
- Privacy-first scan endpoint: scan content is processed in memory and is not written to a database.
- Honest integration placeholders for WhatsApp Business, Facebook Pages, Instagram Professional and Telegram.
- Business security workspace preview.

## Important limitations

This is an early rule-based screening tool, not a certified security product, antivirus, fraud database or legal determination. Scores are heuristic indicators, not probabilities. A low score does not prove that a person, message, website or investment is safe. Reports, account history, live threat-intelligence feeds and social integrations are not active yet.

FraudGuard will not secretly read personal messages or collect social-media passwords. Integrations must use official OAuth/API access, explicit consent, minimal scopes and revocable permissions. WhatsApp support should begin with the official WhatsApp Business Platform; it does not grant arbitrary access to personal WhatsApp chats.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deployment

The project remains a Next.js app and can continue using the existing Vercel project. No new secrets or database credentials are required for the current manual scanner.

## Next engineering stages

1. Add Supabase authentication, organisation accounts, role-based access and secure report storage.
2. Add an audited threat-intelligence provider and reputation checks for domains and URLs.
3. Add reviewed Meta OAuth and WhatsApp Business webhooks with signature verification.
4. Add evidence uploads with malware scanning, OCR and strict retention controls.
5. Add moderated community reports, admin review, appeals and false-positive handling.
6. Add monitoring, rate limits, abuse controls, privacy policy, terms and incident-response procedures.

## Security notes

- Never store provider access tokens in browser storage.
- Verify Meta webhook signatures and deduplicate webhook deliveries.
- Keep API secrets server-side.
- Apply Supabase Row Level Security before enabling user-generated reports or organisation data.
- Avoid publicly exposing phone numbers, personal names, account identifiers or unverified accusations.
