# Changelog

## 2026-05-06 07:15:50 IST

- **Action**: Rebuilt the customer account experience into a single live account page with order history, active orders, past orders, and inline profile editing.
- **Reasoning**: The old account page was a static route-card dashboard with cart/address/member-card noise, while customer account should focus on real backend orders and editable profile basics only.
- **Logic**: Added a Convex `users.updateProfile` mutation for display-name edits, replaced the account overview with live `orders.listMine` data grouped by active/past backend status, surfaced Razorpay and Shiprocket identifiers/status directly from order documents, removed the old address/order subpage components because checkout details are collected by Razorpay, and redirected `/account/orders` plus `/account/settings` back to `/account`.
- **Git Refs**: Uncommitted.

## 2026-05-06 07:03:25 IST

- **Action**: Applied storefront annotation fixes for the footer socials, desktop header, mobile hero, login experience, and email OTP auth visibility.
- **Reasoning**: The homepage needed Instagram-only social links, stronger accessible header typography without search, tighter mobile hero composition, a customer-facing login page with no admin/internal copy, and email OTP to be fully hidden unless the developer flag enables it.
- **Logic**: Removed non-Instagram footer links, increased desktop navigation/account/cart typography with focus-visible states, repositioned the mobile hero image with left-side white gradient protection, shortened hero viewport height to remove the scroll gap, rebuilt the login surface with a premium editorial layout, and made `AuthChoicePanel` render no OTP UI when `auth.emailOtpEnabled` is false.
- **Git Refs**: Uncommitted.

## 2026-05-05 10:24:08 IST

- **Action**: Fixed the `/dev` route shell and added a runtime-safe Developer Console failure surface.
- **Reasoning**: The page rendered without the app layout, so global CSS was missing, and signed-in runtime failures could collapse the React island into a blank screen.
- **Logic**: Wrapped `/dev` in `AdminLayout`, aligned the console styling with the admin UI, guarded Convex env checks against missing runtime globals, and added a React error boundary that shows the real dashboard error instead of white-screening.
- **Git Refs**: Uncommitted.

## 2026-05-05 01:32:17 IST

- **Action**: Added the super-admin-only `/dev` Developer Console with an Auth feature-flag panel for `auth.emailOtpEnabled`.
- **Reasoning**: Email OTP should be controllable separately from commerce admin, with production defaulting to Google-only unless a Convex-backed developer flag enables OTP UI.
- **Logic**: Added Convex-backed developer feature flags, protected developer settings queries/mutations, a DeveloperAccessGate restricted to `super_admin`, and updated the shared auth panel to show email OTP only when the flag resolves enabled.
- **Git Refs**: Uncommitted.

## 2026-05-04 04:14:47 IST

- **Action**: Fixed Google auth configuration fallback, rebuilt the admin sign-in UI with a branded Google/email auth panel, replaced the public login/signup screen with the same ShadCN-style auth card, preserved email verification return targets, and documented Google OAuth branding/domain behavior.
- **Reasoning**: Admin auth was too opaque and Google sign-in could fail when environments used `GOOGLE_CLIENT_ID` while the backend only read `PUBLIC_GOOGLE_CLIENT_ID`.
- **Logic**: Convex Auth now accepts both Google client ID env names, admin and public auth share `AuthChoicePanel`, Google sign-in keeps the current return URL, email code sign-in routes through `/auth/verify?returnTo=...`, and docs explain why Google may show the Convex callback URL.
- **Git Refs**: Uncommitted.

## 2026-05-04 04:03:19 IST

- **Action**: Added the live admin commerce wiring spec/plan, server-driven checkout previews, cart coupon entry for Razorpay Magic Checkout, admin coupon preview, Razorpay order sync, Shiprocket dispatch/tracking actions, shipment idempotency, and product delete protection for ordered products.
- **Reasoning**: Admin, checkout, coupons, payment, and fulfillment needed to use live Convex/Razorpay/Shiprocket state instead of local display totals or incomplete admin panels.
- **Logic**: Convex now prices checkout previews from live products and coupon rules, repeats validation during Magic order creation, reconciles Razorpay payment state through a protected admin action, and lets admin users create/sync Shiprocket fulfillment from the order detail panel.
- **Git Refs**: Uncommitted.

## 2026-05-04 03:23:36 IST

- **Action**: Fixed Razorpay Magic Checkout order creation in Convex by replacing the Node-only `Buffer` auth encoder with a runtime-safe Base64 encoder and adding Razorpay API response details to order creation/fetch failures.
- **Reasoning**: Convex actions run without Node globals in this project, so `Buffer.from(...)` crashed before Razorpay could create the Magic Checkout order.
- **Logic**: Preserve Razorpay Basic Auth format as `Basic base64(key_id:key_secret)`, keep Magic order payloads unchanged, and surface sanitized Razorpay status/body details for the next debugging boundary.
- **Git Refs**: Uncommitted.
