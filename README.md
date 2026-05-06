# WhÿClub e-commerce

WhÿClub is an Astro 6 storefront and admin app for Cloudflare Workers, with
Convex as the backend, Convex Auth for Google sign-in + OTP email auth, Razorpay for payments,
and Shiprocket-ready fulfilment hooks.

## Stack

- Astro `6.1.4`
- `@astrojs/cloudflare` `13.1.7`
- React islands via `@astrojs/react` `5.0.3`
- Tailwind CSS `4.2.2`
- Convex `1.34.1`
- `@convex-dev/auth` `0.0.91`
- Resend for email (OTP auth)
- Razorpay for payments
- Shiprocket for fulfillment

## Current state

The repo now includes:

- Cloudflare Workers SSR setup with Astro middleware for `admin.<domain>`
- Convex schema, auth config, queries, mutations, actions, and HTTP actions
- **Google OAuth + Email/OTP authentication** for the storefront
- **OTP email verification** with 10-minute expiry and attempt limiting
- Client-driven auth controls for the storefront header
- Local cart persistence with product-page add-to-cart interaction
- Checkout island that creates pending orders through Convex and hands off to Razorpay
- Customer order-history island backed by Convex with demo fallback
- Admin overview island backed by Convex with demo fallback
- Seedable demo catalog, reviews, coupons, users, and sample orders
- Razorpay and Shiprocket service layers with safe demo-mode fallbacks

Production deployments must not rely on demo fallbacks. Use
[docs/production-readiness-checklist.md](/Users/soumik/Desktop/Code/why-club/docs/production-readiness-checklist.md)
as the launch gate for required Convex, auth, email, payment, shipping, CI, and
smoke-test checks.

---

## Quick Start (5 minutes)

### Prerequisites
- Node.js ≥ 22.12.0
- npm or yarn

### Step 1: Clone & Install

```bash
git clone <repository>
cd why-club
npm install
```

### Step 2: Start Convex Backend

Open a new terminal and run:

```bash
npm run convex:dev
```

This will:
- Prompt you to login/create Convex account (free tier)
- Create a local dev deployment
- Generate `.env.local` with `CONVEX_URL` and `CONVEX_SITE_URL`

### Step 3: Start Frontend

In your original terminal:

```bash
npm run dev
```

The app is now running at `http://localhost:4321/`

### Step 4 (Optional): Seed Demo Data

```bash
npm run seed:demo
```

This populates the database with sample products, reviews, and orders.

---

## Authentication Setup

### Google OAuth (Optional but Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials (Web Application)
5. Add authorized redirect URIs:
   ```
   http://localhost:4321/auth/google/callback
   https://yourdomain.com/auth/google/callback
   https://<deployment>.convex.site/auth/google/callback
   ```
6. Copy **Client ID** and **Client Secret**
7. Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

   Older local env files may use `PUBLIC_GOOGLE_CLIENT_ID`; the backend accepts both, but `GOOGLE_CLIENT_ID` is the preferred name.

**Already configured?** Your `.env` has Google OAuth set up!

### OTP Email Authentication (Easy Setup)

WhÿClub includes email/OTP auth out of the box. To enable email sending:

1. Go to [resend.com](https://resend.com) and sign up (free)
2. Get your API key from the Resend dashboard
3. Add to `.env`:
   ```env
   RESEND_API_KEY=re_your_key_here
   RESEND_FROM_EMAIL=noreply@whyclub.store
   ```

**For testing without email:**
- Keep `RESEND_API_KEY` empty
- OTP verification still works in UI
- Codes won't actually email (dev mode)

**To test with real emails:**
- Use test email: `delivered@resend.dev` (Resend always delivers this)
- Any 6-digit code will work during development

---

## Admin Access

### Access Admin Dashboard

Go to: `http://localhost:4321/admin`

### Available Admin Pages
- `/admin` - Overview & metrics
- `/admin/products` - Product management
- `/admin/collections` - Collections
- `/admin/orders` - Order management
- `/admin/reviews` - Review moderation
- `/admin/coupons` - Coupon management

### Admin Subdomain (Optional)

For `admin.localhost` access:

1. Add to `/etc/hosts` (macOS/Linux):
   ```
   127.0.0.1 admin.localhost
   ```

2. Update `.env`:
   ```env
   PUBLIC_ENABLE_ADMIN_SUBDOMAIN=true
   PUBLIC_ADMIN_HOST=admin.localhost
   ```

3. Access via: `http://admin.localhost:4321`

---

## Key Environment Variables

### Public (Browser-accessible)
```env
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_APP_NAME=WhÿClub
PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud
PUBLIC_RAZORPAY_KEY_ID=
PUBLIC_ENABLE_ADMIN_SUBDOMAIN=true
PUBLIC_ADMIN_HOST=admin.localhost
```

### Secret (Backend-only)
```env
CONVEX_DEPLOYMENT=
CONVEX_URL=
CONVEX_SITE_URL=

# Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@whyclub.store
SUPER_ADMIN_EMAILS=admin@example.com

# Payments
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Shipping
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=
SHIPROCKET_CHANNEL_ID=
SHIPROCKET_PICKUP_LOCATION=

# Demo
SEED_DEMO_TOKEN=
```

---

## Common Commands

```bash
# Development
npm run dev                    # Start Astro frontend
npm run convex:dev            # Start Convex backend
npm run convex:codegen        # Regenerate Convex types

# Verification
npm run lint                   # Run ESLint
npm run test                   # Run unit tests
npm run check                  # Astro type check
npm run build                  # Build for production
npm run ci                     # Run lint, test, check, and build
npm run test:e2e               # Run Playwright smoke tests

# Production
npm run build                  # Build for production
npm run preview                # Preview production build

# Database
npm run seed:demo              # Seed demo data

# Type checking
npm run check                  # Astro type check
npm run generate-types         # Generate Wrangler types
```

## Production operations

Before launching or changing production credentials, review the operations docs:

- [Setup and operations guide](/Users/soumik/Desktop/Code/why-club/docs/setup-and-operations-guide.md)
- [OTP setup guide](/Users/soumik/Desktop/Code/why-club/docs/otp-setup-guide.md)
- [Production readiness checklist](/Users/soumik/Desktop/Code/why-club/docs/production-readiness-checklist.md)
- [Observability conventions](/Users/soumik/Desktop/Code/why-club/docs/observability.md)
- [Variant inventory migration plan](/Users/soumik/Desktop/Code/why-club/docs/variant-inventory-migration.md)

---

## Features

### Storefront
- Product catalog with collections
- Product search and filters
- Shopping cart (local storage)
- Google OAuth login
- Email/OTP authentication
- Order history for logged-in users
- Razorpay payment integration

### Admin Dashboard
- Live order management
- Product and collection management
- Review moderation queue
- Coupon management
- Team member management
- Real-time analytics

### Backend (Convex)
- Type-safe queries and mutations
- Real-time subscriptions
- OAuth integration
- OTP email verification
- Role-based access control (Customer, Admin, Super Admin)
- Automatic schema validation

---

## Project Structure

```
why-club/
├── src/                          # Frontend (Astro + React)
│   ├── components/               # Reusable components
│   │   ├── account/             # User account components
│   │   ├── admin/               # Admin dashboard components
│   │   ├── auth/                # Auth components (OTPAuth)
│   │   ├── cart/                # Shopping cart
│   │   ├── checkout/            # Checkout flow
│   │   └── storefront/          # Storefront components
│   ├── pages/                    # Routes
│   │   ├── admin/               # Admin routes
│   │   ├── account/             # Account routes
│   │   ├── products/            # Product pages
│   │   └── collections/         # Collection pages
│   ├── layouts/                  # Page layouts
│   ├── lib/                      # Utilities
│   └── styles/                   # Global styles

├── convex/                       # Backend (Convex)
│   ├── auth.ts                  # Auth configuration
│   ├── otp.ts                   # OTP verification
│   ├── schema.ts                # Database schema
│   ├── users.ts                 # User queries/mutations
│   ├── products.ts              # Product queries/mutations
│   ├── orders.ts                # Order queries/mutations
│   └── lib/                      # Backend utilities
│       ├── email.ts             # Email service
│       ├── auth.ts              # Auth helpers
│       ├── errors.ts            # Error handling
│       └── validators.ts        # Data validation

├── docs/                         # Documentation
│   ├── setup-and-operations-guide.md
│   └── otp-setup-guide.md

├── .env                          # Environment variables
├── astro.config.mjs             # Astro configuration
├── wrangler.jsonc               # Wrangler config (Cloudflare)
└── package.json
```

---

## OTP Authentication Details

The project includes a complete email OTP auth system:

- **Seamless Sign-in**: Users enter email → receive 6-digit code → verify
- **Security**: 10-minute expiry, max 5 attempts, automatic cleanup
- **Email Service**: Powered by Resend (free tier available)
- **Auto User Creation**: Accounts created automatically on first verification
- **Ready-to-Use Component**: `<OTPAuth />` React component included

For detailed setup, see [docs/otp-setup-guide.md](docs/otp-setup-guide.md)

---

## Important Notes

### Before Production Deployment

1. **Google OAuth**: Get real credentials from Google Cloud
2. **Resend API Key**: Get from resend.com dashboard
3. **Razorpay Keys**: Get from Razorpay merchant dashboard (optional)
4. **Database**: Change from local Convex to production deployment
5. **Environment**: Never commit `.env` with real secrets
6. **Admin Emails**: Update `SUPER_ADMIN_EMAILS` with your email

### Demo Mode Fallbacks

When credentials are missing:
- ✅ Cart still works locally
- ✅ Checkout renders in demo mode
- ✅ Admin views show demo data
- ✅ Product pages fully functional
- ⚠️ Auth requires credentials to be fully functional
- ⚠️ Payments require Razorpay keys

---

## Validation

Current verified commands:

```bash
npm run check      # ✓ All type checks pass
npm run build      # ✓ Successful production build
npm run seed:demo  # ✓ Demo data seeds correctly
```

---

## Troubleshooting

### Convex not starting
```bash
# Clear Convex cache and restart
rm -rf .convex
npm run convex:dev
```

### Types not updating
```bash
npm run convex:codegen
npm run generate-types
```

### Port 4321 already in use
```bash
# Change port in astro.config.mjs or kill process
lsof -i :4321
kill -9 <PID>
```

### OTP emails not received
- Check `RESEND_API_KEY` is set
- Verify email domain in Resend dashboard
- Use `delivered@resend.dev` for testing
- Check spam folder

---

## Support & Resources

- **Convex Docs**: https://docs.convex.dev
- **Astro Docs**: https://docs.astro.build
- **Resend Docs**: https://resend.com/docs
- **Razorpay Docs**: https://razorpay.com/docs
- **Shiprocket Docs**: https://shiprocket.in/api-docs

---

## License

MIT
