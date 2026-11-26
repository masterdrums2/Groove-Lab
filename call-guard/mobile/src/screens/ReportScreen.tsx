import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  reportSpamNumber,
  type ReportCategory,
  type User,
} from "../api/client";
import { colors } from "../theme";

type Props = {
  user: User;
  onDone: () => void;
  onBack: () => void;
};

const OPTIONS: { id: ReportCategory; label: string }[] = [
  { id: "scam", label: "疑似騙案" },
  { id: "telemarketing", label: "推銷" },
  { id: "loan", label: "財務借貸" },
  { id: "harassment", label: "騷擾" },
];

export function ReportScreen({ user, onDone, onBack }: Props) {
  const [phone, setPhone] = useState("+852");
  const [category, setCategory] = useState<ReportCategory>("scam");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await reportSpamNumber({
        userId: user.id,
        e164: phone.trim(),
        category,
      });
      setMessage(
        `${res.message}（目前 ${res.sharedWithActiveMembers} 位已開通會員會同步）`
      );
      setTimeout(onDone, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "舉報失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Pressable onPress={onBack}>
        <Text style={styles.back}>← 返回</Text>
      </Pressable>

      <Text style={styles.title}>舉報號碼</Text>
      <Text style={styles.caption}>
        舉報後會即時加入香港共享攔截庫，其他已付費會員同步後唔會再接到呢個號碼。
      </Text>

      <Text style={styles.label}>電話號碼</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+85291234567"
        placeholderTextColor={colors.muted}
      />

      <Text style={styles.label}>類別</Text>
      <View style={styles.chips}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            style={[styles.chip, category === opt.id && styles.chipOn]}
            onPress={() => setCategory(opt.id)}
          >
            <Text
              style={[styles.chipText, category === opt.id && styles.chipTextOn]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable
        style={[styles.cta, loading && styles.ctaDisabled]}
        onPress={onSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.ctaText}>提交並加入全員攔截</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  back: { color: colors.muted, marginBottom: 20 },
  title: { color: colors.ink, fontSize: 28, fontWeight: "700" },
  caption: { marginTop: 10, color: colors.muted, lineHeight: 22 },
  label: { marginTop: 22, color: colors.muted, fontSize: 13, fontWeight: "600" },
  input: {
    marginTop: 8,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.ink,
    fontSize: 16,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.bgElevated,
  },
  chipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  chipText: { color: colors.muted, fontWeight: "600" },
  chipTextOn: { color: colors.accent },
  error: { marginTop: 14, color: colors.danger },
  message: { marginTop: 14, color: colors.accent, lineHeight: 20 },
  cta: {
    marginTop: 28,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { color: colors.bg, fontWeight: "700", fontSize: 16 },
});
