"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Whether the person looking at a squad may put a price on it: its owner, with paid
 * squads on and a plan that sells. Set once by the squad's layout, read by the channel
 * dialog wherever it opens from.
 */
const Pricing = createContext({ owner: false, canPrice: false });

export function PricingProvider({
  owner,
  canPrice,
  children,
}: {
  owner: boolean;
  canPrice: boolean;
  children: ReactNode;
}) {
  return <Pricing value={{ owner, canPrice }}>{children}</Pricing>;
}

export const usePricing = () => useContext(Pricing);
