import "server-only";

import { systemClock } from "@/lib/clock";
import { createRazorpayProvider } from "@/server/billing/razorpay";
import type { BillingProvider } from "@/server/billing/types";
import { planPricePaise } from "@/server/entitlements/config";
import { billingEnabled } from "@/server/entitlements";
import { env } from "@/server/env";
import { auditLogRepository } from "@/server/repositories/audit-log-repository";
import { billingRepository } from "@/server/repositories/billing-repository";

import { createBillingService } from "./billing-service";

let provider: BillingProvider | null = null;

/** Built on first use, and only while billing is on and the keys are there. */
function razorpay() {
  if (!billingEnabled()) return null;
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null;
  provider ??= createRazorpayProvider({
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET ?? "",
    planIds: {
      PRO: env.RAZORPAY_PLAN_PRO ?? "",
      ELITE: env.RAZORPAY_PLAN_ELITE ?? "",
    },
    pricePaise: { PRO: planPricePaise.PRO, ELITE: planPricePaise.ELITE },
  });
  return provider;
}

export const billingService = createBillingService({
  billing: billingRepository,
  clock: systemClock,
  provider: razorpay,
  audit: (entry) => auditLogRepository.append(entry),
});
