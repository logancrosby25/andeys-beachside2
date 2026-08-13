window.ANDEY_CONFIG = {
  phase: 6,
  mode: 'supabase',
  paymentMode: 'stripe', // change to 'stripe' only after Stripe is configured
  supabaseUrl: 'https://akoslyftslqpeotircex.supabase.co',
  supabasePublishableKey: 'sb_publishable_TGkkoKyKpL9cxSbQPM849w_i_bcUGhs',
  businessTimeZone: 'America/Chicago',
  depositPercent: 50,
  travelBufferMinutes: 30,
  prices: {
    private30: 45,
    private60: 60,
    doublePrivate60: 100,
    package30: 250,
    package60: 340,
    babysittingHourly: 25
  },
  features: {"payments": true, "manage": true, "policies": true, "launch": true}
};
