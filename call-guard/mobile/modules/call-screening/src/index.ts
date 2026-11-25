import { NativeModulesProxy, requireNativeModule } from "expo-modules-core";

type CallScreeningModuleType = {
  requestCallScreeningRole(): Promise<boolean>;
  isCallScreeningEnabled(): Promise<boolean>;
  syncBlocklist(numbersJson: string): Promise<{ count: number }>;
  clearBlocklist(): Promise<void>;
};

let mod: CallScreeningModuleType | null = null;

try {
  mod = requireNativeModule<CallScreeningModuleType>("CallGuardScreening");
} catch {
  mod =
    (NativeModulesProxy.CallGuardScreening as CallScreeningModuleType | undefined) ||
    null;
}

export default mod;
