/**
 * Hong Kong–only phone helpers.
 * Call Guard only protects calls received in Hong Kong:
 * - members must use HK numbers (+852)
 * - blocklist is numbers known to call into HK (local +852 or overseas/spoofed)
 */

export function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

/** Normalize to E.164 when possible. HK 8-digit locals become +852… */
export function normalizeHkE164(raw) {
  const d = digitsOnly(raw);
  if (!d) return null;

  if (d.startsWith("852") && d.length === 11) {
    return `+${d}`;
  }
  // Local 8-digit (mobile/landline) as seen on-device in HK
  if (d.length === 8) {
    return `+852${d}`;
  }
  // Already full international without +
  if (d.length >= 10 && d.length <= 15) {
    return `+${d}`;
  }
  return null;
}

/** Member phone must be a Hong Kong number. */
export function isHongKongMemberPhone(raw) {
  const e164 = normalizeHkE164(raw);
  if (!e164) return false;
  return digitsOnly(e164).startsWith("852") && digitsOnly(e164).length === 11;
}

/**
 * Match keys for an incoming call handled on a HK device.
 * Includes local 8-digit and +852 forms so spoofed / local display both hit.
 */
export function hkMatchKeys(raw) {
  const d = digitsOnly(raw);
  const keys = new Set();
  if (!d) return keys;

  keys.add(d);
  const e164 = normalizeHkE164(raw);
  if (e164) keys.add(digitsOnly(e164));

  if (d.startsWith("852") && d.length === 11) {
    keys.add(d.slice(3)); // 8-digit local
  }
  if (d.length === 8) {
    keys.add(`852${d}`);
  }
  return keys;
}
