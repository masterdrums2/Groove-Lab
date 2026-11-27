"""Hong Kong phone helpers (same rules as the Node server)."""

from __future__ import annotations

import re


def digits_only(value: str | None) -> str:
    return re.sub(r"\D", "", str(value or ""))


def normalize_hk_e164(raw: str | None) -> str | None:
    d = digits_only(raw)
    if not d:
        return None
    if d.startswith("852") and len(d) == 11:
        return f"+{d}"
    if len(d) == 8:
        return f"+852{d}"
    if 10 <= len(d) <= 15:
        return f"+{d}"
    return None


def is_hong_kong_member_phone(raw: str | None) -> bool:
    e164 = normalize_hk_e164(raw)
    if not e164:
        return False
    d = digits_only(e164)
    return d.startswith("852") and len(d) == 11
