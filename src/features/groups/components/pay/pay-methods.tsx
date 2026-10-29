import { CircleCheck, CreditCard, FlaskConical } from "lucide-react";

/**
 * How the pass is paid. Only the demo works for now; UPI and cards are shown, plainly
 * marked as coming, so nobody wonders where they went once Razorpay arrives.
 */
export function PayMethods() {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-small font-medium">Pay with</legend>
      <div className="flex items-center gap-3 rounded-control border border-accent bg-accent-soft p-3">
        <FlaskConical className="size-5 shrink-0 text-accent-ink" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body font-medium text-accent-ink">
            Demo payment
          </span>
          <span className="text-small text-ink-muted">
            Nothing is charged. Your pass works like a paid one.
          </span>
        </span>
        <CircleCheck className="size-5 shrink-0 text-accent" aria-hidden />
        <span className="sr-only">, selected</span>
      </div>
      <div
        aria-disabled
        className="flex items-center gap-3 rounded-control border border-dashed border-border p-3 text-ink-muted"
      >
        <CreditCard className="size-5 shrink-0" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body">UPI, cards and netbanking</span>
          <span className="text-small">Coming soon with Razorpay</span>
        </span>
      </div>
    </fieldset>
  );
}
