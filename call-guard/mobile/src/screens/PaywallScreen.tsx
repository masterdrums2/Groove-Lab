import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  fetchBlocklist,
  payMembership,
  type User,
} from "../api/client";
import { API_BASE } from "../api/client";
import {
  hasNativeCallScreening,
  requestCallScreeningRole,
  setNativeSession,
  syncBlocklistToDevice,
} from "../lib/callScreening";
import { colors } from "../theme";

type Props = {
  user: User;
  onActivated: (user: User) => void;
};

export function PaywallScreen({ user, onActivated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function onPay() {
    setLoading(true);
    setError(null);
    setNote(null);
    try {
      const { user: paid } = await payMembership(user.id);

      if (hasNativeCallScreening()) {
        await setNativeSession(paid.id, API_BASE);
        const granted = await requestCallScreeningRole();
        setNote(
          granted
            ? "已取得 Android 來電過濾權限，正在同步封鎖名單…"
            : "未能取得來電過濾角色；可稍後喺系統設定開啟。"
        );
        try {
          const list = await fetchBlocklist(paid.id);
          const count = await syncBlocklistToDevice(list.numbers);
          setNote(`已開通。裝置已同步 ${count} 個封鎖號碼。`);
        } catch {
          setNote("已開通會員；封鎖名單稍後會再同步。");
        }
      } else {
        setNote(
          "已開通。呢個 build 未載入原生欄截模組（例如 Expo Go）；可用「模擬欄截」驗證流程。"
        );
      }

      onActivated(paid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "付款失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.kicker}>候選會員</Text>
      <Text style={styles.title}>開通來電欄截</Text>
      <Text style={styles.body}>
        付費後你會由候選名單移入已開通名單，App 會下載騷擾／騙案／推銷／借貸號碼庫，並寫入系統欄截清單。
      </Text>

      <View style={styles.priceCard}>
        <Text style={styles.price}>HK$1</Text>
        <Text style={styles.per}>／月（MVP 模擬付款）</Text>
      </View>

      <View style={styles.bullets}>
        <Text style={styles.bullet}>• 只顯示已被欄截嘅來電紀錄</Text>
        <Text style={styles.bullet}>• Android：CallScreeningService 即時拒接</Text>
        <Text style={styles.bullet}>• iOS：Call Directory 預先封鎖名單</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}

      <Pressable
        style={[styles.cta, loading && styles.ctaDisabled]}
        onPress={onPay}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.ctaText}>確認付費並開通</Text>
        )}
      </Pressable>

      <Text style={styles.phone}>帳戶：{user.phone}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  kicker: {
    color: colors.accent,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    fontSize: 12,
  },
  title: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: "700",
    color: colors.ink,
  },
  body: {
    marginTop: 14,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 24,
  },
  priceCard: {
    marginTop: 28,
    backgroundColor: colors.accentDim,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(61, 214, 198, 0.35)",
  },
  price: { fontSize: 40, fontWeight: "800", color: colors.accent },
  per: { marginTop: 4, color: colors.muted },
  bullets: { marginTop: 24, gap: 8 },
  bullet: { color: colors.ink, fontSize: 14, lineHeight: 22 },
  error: { marginTop: 16, color: colors.danger },
  note: { marginTop: 16, color: colors.accent, lineHeight: 20 },
  cta: {
    marginTop: 28,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { color: colors.bg, fontWeight: "700", fontSize: 16 },
  phone: { marginTop: 18, color: colors.muted, fontSize: 13 },
});
