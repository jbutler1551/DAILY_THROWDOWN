import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { useEffect, useRef } from "react";
import "react-native-reanimated";
import "../global.css";
import { supabase } from "@/lib/supabase";
import { ensureProfile } from "@/lib/data";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#090511",
    card: "#140a2a",
    border: "rgba(255,255,255,0.1)",
    primary: "#e879f9",
  },
};

/**
 * Extract access_token & refresh_token from a deep link URL fragment
 * and set the Supabase session. Called when the app opens via magic link.
 */
async function handleDeepLink(url: string) {
  // Supabase appends tokens as a hash fragment: #access_token=...&refresh_token=...
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return;

  const fragment = url.substring(hashIndex + 1);
  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) return;

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    console.error("Deep link session error:", error.message);
    return;
  }

  // Ensure profile + streak rows exist for this user
  if (data.user) {
    await ensureProfile({
      id: data.user.id,
      email: data.user.email,
    });
  }
}

export default function RootLayout() {
  const handledUrl = useRef<string | null>(null);

  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  // Deep link listener for magic link auth callback
  useEffect(() => {
    // Handle URL that opened the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url && url !== handledUrl.current) {
        handledUrl.current = url;
        handleDeepLink(url);
      }
    });

    // Handle URL while app is already open (warm start)
    const subscription = Linking.addEventListener("url", (event) => {
      if (event.url && event.url !== handledUrl.current) {
        handledUrl.current = event.url;
        handleDeepLink(event.url);
      }
    });

    return () => subscription.remove();
  }, []);

  if (!loaded) return null;

  return (
    <ThemeProvider value={darkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="results"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen
          name="auth"
          options={{ presentation: "modal" }}
        />
      </Stack>
    </ThemeProvider>
  );
}
