import { NextResponse } from "next/server";

import { billingService } from "@/server/services/billing";

// The payment provider's webhook. No session: the signature is the proof, checked in the
// service before anything is read from the body. The same event is applied once only.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const result = await billingService.applyWebhook(body, signature);
  if (!result.ok)
    return NextResponse.json(
      { error: result.message },
      { status: result.code === "BAD_SIGNATURE" ? 401 : 503 },
    );
  // 200 either way once it is ours: a retry of an event we have seen is not an error.
  return NextResponse.json({ applied: result.applied });
}
