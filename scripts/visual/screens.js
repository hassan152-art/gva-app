/**
 * Screen registry for the visual parity harness.
 *
 * Each entry maps a route in the app to the design frame it must match.
 * `ref` is the 2x export of that frame from FigCraft.
 *
 * `auth: true` signs in through the real API before capturing, so the screens
 * render from live data rather than fixtures.
 */
export const SCREENS = [
  {
    id: '07-sign-in',
    name: '07 · Sign in',
    route: '/sign-in',
    ref: 'ref/07-sign-in.png',
    auth: false,
    scrollY: 0,
  },
  {
    id: '08-create-account',
    name: '08 · Create account',
    route: '/sign-up',
    ref: 'ref/08-create-account.png',
    auth: false,
    scrollY: 0,
  },
  {
    id: '01-home-impact',
    name: '01 · Home — impact',
    route: '/',
    ref: 'ref/01-home.png',
    auth: true,
    scrollY: 0,
  },
  {
    id: '02-home-orphans',
    name: '02 · Home — orphans',
    route: '/',
    ref: 'ref/02-home-orphans.png',
    auth: true,
    // Frame 02 is frame 01's "My active orphans" list section, which begins at
    // y=782.7 in the page and sits at y=106.7 in frame 02 -> scroll 676.
    scrollY: 675,
  },
  {
    id: '03-payments-multi-pay',
    name: '03 · Payments — multi-pay',
    route: '/payments/multi-pay',
    ref: 'ref/03-multipay.png',
    auth: true,
    scrollY: 0,
  },
  {
    id: '04-payments-history',
    name: '04 · Payments — history',
    route: '/payments/history',
    ref: 'ref/04-history.png',
    auth: true,
    scrollY: 0,
  },
  {
    id: '05-payment-proof',
    name: '05 · Payment proof',
    route: '/payments/multi-pay?sheet=proof',
    ref: 'ref/05-proof.png',
    auth: true,
    scrollY: 0,
  },
  {
    id: '06-stripe-checkout',
    name: '06 · Stripe checkout',
    route: '/checkout/stripe',
    ref: 'ref/06-stripe.png',
    auth: true,
    scrollY: 0,
  },
  {
    id: '09-profile',
    name: 'Profile (new screen, no design frame)',
    // Not on the board: composed from the board's own component language.
    // Captured for visual review only — there is no reference to diff against.
    route: '/profile',
    ref: null,
    auth: true,
    scrollY: 0,
  },
];

/** Device viewport. The design is 390x844 at 2x. */
export const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2 };
