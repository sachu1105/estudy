import { PassPrice, Perks } from "./pass-perks";

/** What a channel pass gets you, and its price: the offer step of the checkout. */
export function PassOffer({
  channel,
}: {
  channel: { name: string; pricePaise: number; accessDays: number | null };
}) {
  return (
    <>
      <Perks
        items={[
          `Every message, file, poll and mock test in #${channel.name}`,
          "Ask doubts and talk with everyone else in the class",
          channel.accessDays === null
            ? "Yours for good: pay once, no renewals"
            : "Renew any time: unused days carry over",
        ]}
      />
      <PassPrice
        pricePaise={channel.pricePaise}
        accessDays={channel.accessDays}
      />
    </>
  );
}
