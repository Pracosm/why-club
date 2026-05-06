/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as collections from "../collections.js";
import type * as coupons from "../coupons.js";
import type * as developer from "../developer.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as lib_auditEvents from "../lib/auditEvents.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_couponRules from "../lib/couponRules.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_emailValidation from "../lib/emailValidation.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_inventory from "../lib/inventory.js";
import type * as lib_logging from "../lib/logging.js";
import type * as lib_orderPricing from "../lib/orderPricing.js";
import type * as lib_otpCodes from "../lib/otpCodes.js";
import type * as lib_paymentState from "../lib/paymentState.js";
import type * as lib_productRules from "../lib/productRules.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_razorpay from "../lib/razorpay.js";
import type * as lib_shiprocket from "../lib/shiprocket.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_webhookPayloads from "../lib/webhookPayloads.js";
import type * as orders from "../orders.js";
import type * as otp from "../otp.js";
import type * as products from "../products.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as shipping from "../shipping.js";
import type * as users from "../users.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  collections: typeof collections;
  coupons: typeof coupons;
  developer: typeof developer;
  files: typeof files;
  http: typeof http;
  "lib/auditEvents": typeof lib_auditEvents;
  "lib/auth": typeof lib_auth;
  "lib/couponRules": typeof lib_couponRules;
  "lib/email": typeof lib_email;
  "lib/emailValidation": typeof lib_emailValidation;
  "lib/env": typeof lib_env;
  "lib/errors": typeof lib_errors;
  "lib/inventory": typeof lib_inventory;
  "lib/logging": typeof lib_logging;
  "lib/orderPricing": typeof lib_orderPricing;
  "lib/otpCodes": typeof lib_otpCodes;
  "lib/paymentState": typeof lib_paymentState;
  "lib/productRules": typeof lib_productRules;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/razorpay": typeof lib_razorpay;
  "lib/shiprocket": typeof lib_shiprocket;
  "lib/validators": typeof lib_validators;
  "lib/webhookPayloads": typeof lib_webhookPayloads;
  orders: typeof orders;
  otp: typeof otp;
  products: typeof products;
  reviews: typeof reviews;
  seed: typeof seed;
  shipping: typeof shipping;
  users: typeof users;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
