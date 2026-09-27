// Force IST (Asia/Kolkata) formatting everywhere, regardless of the
// device/browser's own timezone setting — ShopCart businesses operate in
// IST, so bill/order timestamps must always read correctly in IST.
export function formatDate(isoString) {
  if (!isoString) return "";
  // Our backend stores timestamps in UTC (datetime.utcnow()) but FastAPI
  // serializes them WITHOUT a trailing "Z" or offset (e.g. "2026-09-27T02:25:43").
  // JavaScript's Date constructor treats such "naive" strings as LOCAL time,
  // not UTC — which silently corrupts the time by the local UTC offset.
  // Explicitly mark it as UTC before parsing if no timezone info is present.
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(isoString);
  const utcString = hasTimezone ? isoString : `${isoString}Z`;
  const date = new Date(utcString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }) + " IST";
}

// Normalizes an Indian 10-digit number to the international format wa.me
// needs (country code, no +, no spaces/dashes). Passes through unchanged
// if it doesn't look like a plain 10-digit local number.
export function normalizeIndianPhone(raw) {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}
