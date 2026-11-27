import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { register, type User } from "../api/client";
import { colors } from "../theme";

type Props = {
  onRegistered: (user: User) => void;
};

export function RegisterScreen({ onRegistered }: Props) {
  const [phone, setPhone] = useState("+852");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    const trimmed = phone.trim();
    if (!/^\+?[0-9]{8,15}$/.test(trimmed.replace(/\s/g, ""))) {
      setError("請輸入有效電話號碼（建議 E.164，例如 +85291234567）");
      return;
    }
    setLoading(true);
    try {
      const { user } = await register({
        phone: trimmed.replace(/\s/g, ""),
        displayName: displayName.trim() || undefined,
      });
      onRegistered(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "註冊失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.hero}>
        <Text style={styles.brand}>Call Guard</Text>
        <Text style={styles.tagline}>
          預先查好香港滋擾／騙案／推銷／借貸名單；付 $1 即攔，唔使響咗先知
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>手機號碼</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="+85291234567"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>顯示名稱（可選）</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="例如：阿明"
          placeholderTextColor={colors.muted}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.cta, loading && styles.ctaDisabled]}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.ctaText}>登記做會員</Text>
          )}
        </Pressable>

        <Text style={styles.hint}>
          只接受香港 +852 號碼。註冊後入候選名單；付 HK$1／月後開通，欄截打入香港嘅滋擾／騙案來電。
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  hero: { marginBottom: 36 },
  brand: {
    fontSize: 40,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
  form: { gap: 8 },
  label: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.ink,
    fontSize: 16,
  },
  error: { color: colors.danger, marginTop: 8 },
  cta: {
    marginTop: 20,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "700",
  },
  hint: {
    marginTop: 14,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
});
