import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { User } from "./src/api/client";
import { getUser } from "./src/api/client";
import { clearSession, loadSession, saveSession } from "./src/lib/session";
import { BlockedCallsScreen } from "./src/screens/BlockedCallsScreen";
import { PaywallScreen } from "./src/screens/PaywallScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { ReportScreen } from "./src/screens/ReportScreen";
import { colors } from "./src/theme";

type Screen = "home" | "report";

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>("home");

  useEffect(() => {
    (async () => {
      const saved = await loadSession();
      if (!saved) {
        setReady(true);
        return;
      }
      try {
        const { user: fresh } = await getUser(saved.id);
        setUser(fresh);
        await saveSession(fresh);
      } catch {
        setUser(saved);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function handleRegistered(next: User) {
    await saveSession(next);
    setUser(next);
  }

  async function handleActivated(next: User) {
    await saveSession(next);
    setUser(next);
  }

  async function handleLogout() {
    await clearSession();
    setUser(null);
    setScreen("home");
  }

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {!user ? (
        <RegisterScreen onRegistered={handleRegistered} />
      ) : user.status !== "active" ? (
        <PaywallScreen user={user} onActivated={handleActivated} />
      ) : screen === "report" ? (
        <ReportScreen
          user={user}
          onBack={() => setScreen("home")}
          onDone={() => setScreen("home")}
        />
      ) : (
        <BlockedCallsScreen
          user={user}
          onLogout={handleLogout}
          onReport={() => setScreen("report")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
