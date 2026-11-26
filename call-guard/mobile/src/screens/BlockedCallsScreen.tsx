import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "../lib/useFocusEffect";
import {
  fetchBlockedCalls,
  fetchBlocklist,
  reportBlockedCall,
  type BlockedCall,
  type User,
} from "../api/client";
import {
  hasNativeCallScreening,
  isCallScreeningEnabled,
  syncBlocklistToDevice,
} from "../lib/callScreening";
import { colors } from "../theme";

type Props = {
  user: User;
  onLogout: () => void;
  onReport: () => void;
};

const categoryLabel: Record<string, string> = {
  harassment: "騷擾",
  scam: "騙案",
  telemarketing: "推銷",
  loan: "借貸",
};

export function BlockedCallsScreen({ user, onLogout, onReport }: Props) {
  const [calls, setCalls] = useState<BlockedCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screeningOn, setScreeningOn] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ calls: next }, enabled] = await Promise.all([
      fetchBlockedCalls(user.id),
      hasNativeCallScreening() ? isCallScreeningEnabled() : Promise.resolve(false),
    ]);
    setCalls(next);
    setScreeningOn(enabled);
  }, [user.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .catch((e) => setMessage(e instanceof Error ? e.message : "載入失敗"))
        .finally(() => setLoading(false));
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      if (hasNativeCallScreening()) {
        const list = await fetchBlocklist(user.id);
        await syncBlocklistToDevice(list.numbers);
      }
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "重新整理失敗");
    } finally {
      setRefreshing(false);
    }
  }

  async function simulateBlock() {
    setMessage(null);
    try {
      const list = await fetchBlocklist(user.id);
      const sample = list.numbers[0];
      if (!sample) {
        setMessage("封鎖名單係空");
        return;
      }
      await reportBlockedCall({
        userId: user.id,
        e164: sample.e164,
        category: sample.category,
        labelZh: sample.labelZh,
      });
      await load();
      setMessage(`已模擬欄截 ${sample.e164}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "模擬失敗");
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Call Guard</Text>
          <Text style={styles.sub}>
            {screeningOn ? "系統欄截：開啟" : "系統欄截：未啟用／模擬模式"}
          </Text>
        </View>
        <Pressable onPress={onLogout}>
          <Text style={styles.logout}>登出</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>已欄截來電</Text>
      <Text style={styles.caption}>
        只顯示被預建名單欄截嘅來電。舉報只係補漏（新號碼），主名單由我哋預先查好。
      </Text>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={onReport}>
          <Text style={styles.primaryText}>舉報號碼</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={onRefresh}>
          <Text style={styles.secondaryText}>同步名單</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={simulateBlock}>
          <Text style={styles.secondaryText}>模擬欄截</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          contentContainerStyle={
            calls.length === 0 ? styles.emptyWrap : styles.listContent
          }
          ListEmptyComponent={
            <Text style={styles.empty}>暫時未有被欄截來電</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      colors.category[item.category || ""] || colors.accent,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.number}>{item.e164}</Text>
                <Text style={styles.meta}>
                  {item.labelZh}
                  {item.category
                    ? ` · ${categoryLabel[item.category] || item.category}`
                    : ""}
                </Text>
              </View>
              <Text style={styles.time}>
                {new Date(item.blockedAt).toLocaleString("zh-HK", {
                  timeZone: "Asia/Hong_Kong",
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: { color: colors.ink, fontSize: 22, fontWeight: "700" },
  sub: { color: colors.muted, marginTop: 4, fontSize: 12 },
  logout: { color: colors.muted, fontSize: 14 },
  title: {
    marginTop: 28,
    color: colors.ink,
    fontSize: 28,
    fontWeight: "700",
  },
  caption: { marginTop: 8, color: colors.muted, lineHeight: 20 },
  message: { marginTop: 12, color: colors.accent },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18, marginBottom: 8 },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  primaryText: { color: colors.bg, fontSize: 13, fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  listContent: { paddingBottom: 40, paddingTop: 8 },
  emptyWrap: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: colors.muted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  number: { color: colors.ink, fontSize: 16, fontWeight: "600" },
  meta: { color: colors.muted, marginTop: 2, fontSize: 13 },
  time: { color: colors.muted, fontSize: 12 },
});
