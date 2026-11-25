import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "../api/client";

const KEY = "call_guard_user";

export async function saveSession(user: User): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(user));
}

export async function loadSession(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
