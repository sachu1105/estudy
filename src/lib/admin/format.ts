/** AI cost is stored in millionths of a US dollar. */
export function formatUsd(micros: number) {
  const dollars = micros / 1_000_000;
  return dollars === 0
    ? "$0"
    : dollars < 0.01
      ? `$${dollars.toFixed(4)}`
      : `$${dollars.toFixed(2)}`;
}

export function formatWhen(at: Date | null) {
  if (!at) return "Never";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(at);
}
