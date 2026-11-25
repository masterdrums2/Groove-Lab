import { Platform } from "react-native";

/** Dev: Android emulator → host machine. Physical device: set EXPO_PUBLIC_API_URL. */
const DEFAULT_HOST =
  Platform.OS === "android" ? "http://10.0.2.2:8787" : "http://127.0.0.1:8787";

export const API_BASE = process.env.EXPO_PUBLIC_API_URL || DEFAULT_HOST;

export type UserStatus = "candidate" | "active" | "cancelled";

export type User = {
  id: string;
  phone: string;
  email: string | null;
  displayName: string | null;
  status: UserStatus;
  createdAt: string;
  activatedAt: string | null;
};

export type BlockedCall = {
  id: string;
  e164: string;
  category: string | null;
  labelZh: string;
  blockedAt: string;
};

export type BlocklistEntry = {
  e164: string;
  category: string;
  labelZh: string;
  confidence: number;
  updatedAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data && data.message) || (data && data.error) || res.statusText;
    throw new Error(String(message));
  }
  return data as T;
}

export function register(input: {
  phone: string;
  email?: string;
  displayName?: string;
}) {
  return request<{ user: User; created: boolean }>("/api/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getUser(id: string) {
  return request<{ user: User }>(`/api/users/${id}`);
}

export function payMembership(userId: string) {
  return request<{ user: User }>(`/api/users/${userId}/pay`, { method: "POST" });
}

export function fetchBlocklist(userId: string) {
  return request<{ version: string; count: number; numbers: BlocklistEntry[] }>(
    `/api/blocklist?userId=${encodeURIComponent(userId)}`
  );
}

export function fetchBlockedCalls(userId: string) {
  return request<{ calls: BlockedCall[] }>(`/api/users/${userId}/blocked-calls`);
}

export function reportBlockedCall(input: {
  userId: string;
  e164: string;
  category?: string;
  labelZh?: string;
  blockedAt?: string;
}) {
  return request<{ call: BlockedCall }>("/api/blocked-calls", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
