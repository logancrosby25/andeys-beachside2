# Phase 6 Launch Checklist

- [ ] Replace demo prices in `config.js` with final business pricing.
- [ ] Finalize cancellation, refund, weather, and service policies.
- [ ] Create Supabase project and run `supabase-schema.sql`.
- [ ] Create Andey admin user in Supabase Auth and add UUID to `public.admins`.
- [ ] Put only the Supabase publishable key in `config.js`.
- [ ] Deploy both Supabase Edge Functions.
- [ ] Add Stripe sandbox secret keys as Edge Function secrets.
- [ ] Register Stripe webhook for `checkout.session.completed`.
- [ ] Test successful, cancelled, duplicate, and rescheduled bookings.
- [ ] Replace `YOUR-DOMAIN.com` in sitemap/robots and set `SITE_URL`.
- [ ] Deploy to a static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.).
- [ ] Connect custom domain and HTTPS.
- [ ] Test on iPhone and Android.
- [ ] Only after sandbox testing, switch Stripe to live credentials.
