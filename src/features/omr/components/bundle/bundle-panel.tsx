import { Check } from "lucide-react";

import { Card } from "@/components/ui/card";
import { PaidMark } from "@/features/groups/components/pay/paid-mark";
import { rupees } from "@/lib/pricing/pricing";

import { BundleGet, type BundleState } from "../bundle-get";
import { BundlePerks } from "./bundle-perks";

/** Where the reader stands: they made it, it's in their plan, they own it, or its price. */
function Headline({ bundle }: { bundle: BundleState }) {
  if (bundle.owner)
    return <p className="font-heading text-h2 font-semibold">You made this</p>;
  if (bundle.included || bundle.have)
    return (
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 font-heading text-h2 font-semibold">
          <Check className="size-5 text-success" aria-hidden />
          {bundle.included ? "In your plan" : "Owned"}
        </p>
        <p className="text-small text-ink-muted">
          {bundle.included
            ? "Free with your plan while you're subscribed. Sit any paper below."
            : "Yours for good. Sit any paper below, as often as you like."}
        </p>
      </div>
    );
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <p className="font-mono text-display font-medium tabular-nums">
          {bundle.pricePaise === null ? "Free" : rupees(bundle.pricePaise)}
        </p>
        {bundle.pricePaise === null ? null : <PaidMark />}
      </div>
      <p className="text-small text-ink-muted">
        {bundle.pricePaise === null
          ? "Add it to your tests. It stays yours."
          : "Paid once, yours for good."}
      </p>
    </div>
  );
}

/**
 * The bundle's side panel, as a store's: where the reader stands with it, the one thing
 * to do (buy, add, or for its maker, manage it), and what having it gives.
 */
export function BundlePanel({
  bundle,
  questions,
  papers,
}: {
  bundle: BundleState;
  questions: number;
  papers: number;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <Headline bundle={bundle} />
      <BundleGet bundle={bundle} />
      <BundlePerks papers={papers} questions={questions} owner={bundle.owner} />
    </Card>
  );
}
