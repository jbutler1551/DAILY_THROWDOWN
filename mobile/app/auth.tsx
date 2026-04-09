import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ScreenShell, Card, Button, Pill } from "@/components/ui";
import { supabase, hasSupabaseEnv } from "@/lib/supabase";
import { ensureProfile } from "@/lib/data";
import * as Linking from "expo-linking";

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const enabled = hasSupabaseEnv();

  async function handleMagicLink() {
    if (!email) return;
    setSending(true);
    setStatus("Sending magic link...");

    try {
      const redirectUrl = Linking.createURL("/");

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        setStatus(error.message);
        return;
      }

      setStatus("Magic link sent! Check your email.");
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : "Could not send magic link."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <ScreenShell>
      <View className="items-center gap-2 pt-4">
        <Text className="text-2xl font-black text-white">Sign In</Text>
        <Text className="text-sm text-white/50">
          Enter your email for a magic link
        </Text>
      </View>

      <Card>
        <View className="gap-4">
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white"
          />

          <Button
            onPress={handleMagicLink}
            disabled={!email || sending || !enabled}
          >
            {sending ? "Sending..." : "Send Magic Link"}
          </Button>

          <View className="flex-row items-center gap-2">
            <Pill color={enabled ? "green" : "amber"}>
              {enabled ? "Supabase connected" : "Missing env"}
            </Pill>
          </View>

          {status && (
            <Text className="text-sm text-white/70">{status}</Text>
          )}
        </View>
      </Card>

      <View className="items-center">
        <Button variant="secondary" onPress={() => router.back()}>
          Cancel
        </Button>
      </View>
    </ScreenShell>
  );
}
