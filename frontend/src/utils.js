// Force IST (Asia/Kolkata) formatting everywhere, regardless of the
// device/browser's own timezone setting — ShopCart businesses operate in
// IST, so bill/order timestamps must always read correctly in IST.
export function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
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
