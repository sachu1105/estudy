import { toast } from "@/components/ui/toast";
import { site } from "@/lib/site";

// Opens Razorpay's own window. Only the public key id and the subscription id come from
// the server; the secret never leaves it, and nothing here decides what was paid for —
// the provider's webhook does (milestone 16).

type RazorpayOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  theme?: { color: string };
  handler?: () => void;
};

type RazorpayWindow = Window & {
  Razorpay?: new (options: RazorpayOptions) => { open(): void };
};

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript() {
  return new Promise<boolean>((resolve) => {
    const w = window as RazorpayWindow;
    if (w.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT}"]`,
    );
    const script = existing ?? document.createElement("script");
    script.src = SCRIPT;
    script.addEventListener("load", () => resolve(true), { once: true });
    script.addEventListener("error", () => resolve(false), { once: true });
    if (!existing) document.head.append(script);
  });
}

export async function openCheckout(input: {
  subscriptionId: string;
  keyId: string;
  plan: string;
  name?: string;
  email?: string;
}) {
  if (!(await loadScript()))
    return void toast.error(
      "The payment window couldn't load. Check your connection and try again.",
    );
  const w = window as RazorpayWindow;
  if (!w.Razorpay) return;
  new w.Razorpay({
    key: input.keyId,
    subscription_id: input.subscriptionId,
    name: site.name,
    description: `${input.plan} plan`,
    prefill: { name: input.name, email: input.email },
    theme: { color: "#5865F2" },
    handler: () =>
      toast.success(
        "Payment received. Your plan opens as soon as the bank confirms.",
      ),
  }).open();
}
