# Giving and Alumni Spotlight

## Giving

`/giving.html` accepts live, one-time USD gifts to the Persistence Fund and Parents Fund. The Parents Fund is an annual appeal, not an automatically recurring charge. Fund descriptions are maintained in `script.js`. No tax-deductibility claim is made.

The public guest checkout uses the same chapter Stripe account, live API key, signed webhook, and private payment ledger as the Brother Network. Keys remain exclusively in Supabase Edge Function Secrets. Guests do not need a Brother Network account; no member account or public donor directory is created.

- Public gifts have `member_id = null`, with `fund` set to `persistence` or `parents`.
- Brother Network gifts remain designated `alumni` and linked to their approved graduate member.
- Each row records `livemode`; historical sandbox data remains separate from real gifts.
- Stripe Checkout displays the fund name and records fund metadata on the session and PaymentIntent.
- Only signed, matching Stripe events confirm a payment or refund. Returning to the website never marks a gift paid.
- Existing RLS and grants continue to block public donation reads and client writes. Authorized alumni administrators can read payment records.

### Configuration and rollback

Both apps reuse `STRIPE_DONATIONS_LIVE_KEY`, `STRIPE_DONATIONS_LIVE_WEBHOOK_SECRET`, and `STRIPE_DONATIONS_LIVE_ACCOUNT_ID`. `STRIPE_DONATIONS_MODE=live` selects live payments. An optional `STRIPE_PUBLIC_DONATIONS_MODE` overrides the public page alone, so setting it to `test` can suspend real public giving without changing the Brother Network. Missing/invalid configuration disables checkout rather than silently switching environments.

The live Stripe account is `acct_1UVhQu0LKcs9BAsZ`. The existing live webhook `we_1UXsU00LKcs9BAsZX9zXNrUO` listens for completed, delayed-success/failure, expired Checkout Sessions, and charge refunds. The endpoint remains `https://tzrmtdwsspobcbucwtrj.supabase.co/functions/v1/stripe-donation-webhook`. No new Stripe keys or webhook endpoint are needed.

The guest endpoint validates fund, amount, mode, account identity/readiness, and session metadata. A stable UUID plus Stripe idempotency prevents duplicate checkouts on retry. `reserve_public_donation` is callable only by `service_role` and serializes reservation/rate checks: at most 30 guest creations per minute overall and five per 15 minutes for each client fingerprint. Fingerprints use a server-keyed HMAC of the forwarded client address; raw IP addresses are not added to the ledger. This is a basic anti-abuse limit, not identity verification; Stripe-hosted Checkout supplies payment handling and its fraud controls.

The frontend explicitly sends its displayed payment environment, blocking stale test pages from opening live checkouts. Secret values never belong in source, browser code, or chat.

See [live Stripe setup](LIVE_STRIPE.md) for operator verification and rollback details. A protected configuration check can create and immediately expire a $1 session for each public fund; it never opens the URL or submits a payment. Real expiry webhook deliveries then verify the private ledger updates.

## Alumni Spotlight

`/alumni-spotlight.html` is edited in Website Manager → Alumni Spotlight: small heading, name, class year, headline, full story, photo URL/upload, and photo description. Save publishes immediately. Clear the name and save to remove the feature.

The value is stored in `chapter_settings.alumni_spotlight`. Existing public-read and Editor/Super Admin write policies apply. Photos use the public `sigma-mu-site` bucket. Private Brother Network photos and records remain private.
