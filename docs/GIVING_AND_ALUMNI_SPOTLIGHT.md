# Giving and Alumni Spotlight

Giving is at `/giving.html`, with Persistence Fund and Parents Fund designations. Each gift is one time; the Parents Fund is an annual appeal, not an automatically recurring charge. Fund descriptions are maintained in `script.js`. No tax-deductibility claim is made.

Alumni Spotlight is at `/alumni-spotlight.html`. Website Manager → Alumni Spotlight edits the small heading, name, class year, headline, full story, photo URL/upload, and photo description. Save publishes immediately. Clear the name and save to remove the current feature. The value is stored under `chapter_settings.alumni_spotlight`; existing public-read and Editor/Super Admin write policies apply. Photos use the existing public `sigma-mu-site` bucket. Private Brother Network photos and records remain private.

## Payments are deliberately test-only

The guest checkout shares the Brother Network's Stripe account credentials, `stripe_donations` ledger, `stripe_donation_events`, and signature-verified `stripe-donation-webhook`. The original approved-graduate checkout remains unchanged. Guest gifts have `member_id = null` and fund `persistence` or `parents`; original gifts default to `alumni`. Guest records are readable by authorized alumni administrators, not anonymous visitors. Stripe collects the payer's information at checkout; no new public donor directory is created.

`create-public-donation-checkout` accepts guest requests with the site's publishable API key, validates amounts/funds, uses idempotent Checkout Sessions, and bounds creation bursts. The API key is public, not an anti-abuse secret; origin checks and a shared burst limit are only basic controls. Add CAPTCHA and a per-client rate limiter before a broader live rollout. Secrets stay in Supabase's backend environment. The function uses the existing `STRIPE_DONATIONS_TEST_KEY` and `STRIPE_DONATIONS_TEST_WEBHOOK_SECRET`. It stays unavailable until both are configured. A returned checkout URL or browser redirect is never treated as proof of payment. Signed Stripe events update the ledger.

### Switching to real gifts requires a reviewed backend deployment

Changing Stripe's Dashboard mode alone does **not** enable real donations. Coordinate these changes together:

1. Configure live restricted Stripe credentials and a live webhook endpoint/signing secret in backend secrets. Never put keys in GitHub or browser code.
2. Update both checkout functions and the webhook to select the correct environment deliberately; replace the current test-only key/session/event guards.
3. Migrate the `stripe_donations` test-only `livemode = false` constraint and the `record_stripe_donation_event` test-only guard. Preserve test/live separation and existing historical records; validate webhook environment against each gift.
4. Update the public page and Brother Network's test notices, readiness checks, and confirmation copy. Verify both live and test webhook routing, duplicate events, refunds, delayed payments, authorization, and fund metadata before opening real giving.
5. Verify approved donor-facing fund language and receipt/contact information. Do not label payments tax deductible without the chapter's confirmed basis.

No automatic recurring charges, real payments, or live-mode changes were enabled by this feature.
