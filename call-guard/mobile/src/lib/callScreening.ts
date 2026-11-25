import { NativeModules, Platform } from "react-native";
import type { BlocklistEntry } from "../api/client";

type CallScreeningNative = {
  requestCallScreeningRole(): Promise<boolean>;
  isCallScreeningEnabled(): Promise<boolean>;
  syncBlocklist(numbersJson: string): Promise<{ count: number }>;
  clearBlocklist(): Promise<void>;
  setSession?(userId: string, apiBase: string): Promise<void>;
};

const Native: CallScreeningNative | undefined = NativeModules.CallGuardScreening;

/**
 * Bridge to Android CallScreeningService / iOS Call Directory.
 * In Expo Go the native module is missing — we no-op and rely on "模擬欄截".
 */
export async function requestCallScreeningRole(): Promise<boolean> {
  if (Platform.OS !== "android" || !Native?.requestCallScreeningRole) {
    return false;
  }
  return Native.requestCallScreeningRole();
}

export async function isCallScreeningEnabled(): Promise<boolean> {
  if (!Native?.isCallScreeningEnabled) return false;
  return Native.isCallScreeningEnabled();
}

export async function syncBlocklistToDevice(
  numbers: BlocklistEntry[]
): Promise<number> {
  if (!Native?.syncBlocklist) {
    return 0;
  }
  const result = await Native.syncBlocklist(JSON.stringify(numbers));
  return result.count;
}

export async function clearDeviceBlocklist(): Promise<void> {
  if (!Native?.clearBlocklist) return;
  await Native.clearBlocklist();
}

export function hasNativeCallScreening(): boolean {
  return Boolean(Native);
}

/** Persist userId + API base so CallScreeningService can POST blocked-call logs. */
export async function setNativeSession(
  userId: string,
  apiBase: string
): Promise<void> {
  if (!Native?.setSession) return;
  await Native.setSession(userId, apiBase);
}
