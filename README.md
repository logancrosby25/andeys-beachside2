# Andey’s Beachside — Phase 6

## What this phase adds
- Everything from Phase 5
- Production Supabase schema
- Stripe Checkout Edge Function templates + webhook
- Privacy/terms launch drafts
- manifest, robots.txt, sitemap, and deployment checklist

## Test it now
1. Open `index.html` (or use VS Code Live Server).
2. Make a fake booking.
3. Open `admin.html` and click **Open Dashboard**.
4. Test `manage.html`.
5. Review `LAUNCH-CHECKLIST.md` before connecting live services.

Everything starts in **demo mode**. No real payment is taken. Demo rates live in `config.js`.

## Going live later
For Phase 6, use `supabase-schema.sql`, create an admin in Supabase Auth, set the publishable key in `config.js`, deploy the included Edge Functions, and configure Stripe sandbox/webhooks before using live payments. Never put a Stripe secret key or Supabase secret/service-role key in browser files.
