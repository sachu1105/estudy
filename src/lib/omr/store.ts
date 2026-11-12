// Selling in the Store: pure rules shared by the server and the pages.

/** studypods' share of a seller's sale until an admin sets another (Admin > Papers). */
export const DEFAULT_STORE_CUT_PERCENT = 20;

/** studypods' share of a sale, in whole paise, rounded half up. */
export function storeCut(pricePaise: number, percent: number) {
  return Math.round((pricePaise * percent) / 100);
}

/** What the seller is left with after studypods' share. */
export const sellerShare = (pricePaise: number, percent: number) =>
  pricePaise - storeCut(pricePaise, percent);

/** Every question has an answer in the key (cancelled counts as answered). */
export const fullyKeyed = (key: readonly number[], questions: number) =>
  key.length >= questions && key.slice(0, questions).every((e) => e !== 0);
