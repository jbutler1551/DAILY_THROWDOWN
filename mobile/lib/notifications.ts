/**
 * Push notification registration and management.
 * Uses expo-notifications to get the Expo push token,
 * then stores it in the profiles.push_token column.
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "./supabase";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and store the token in the user's profile.
 * Returns the Expo push token string, or null if registration failed.
 */
export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  // Only works on physical devices
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied");
    return null;
  }

  // Android needs a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Daily Throwdown",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#e879f9",
    });
  }

  // Get the Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  const token = tokenData.data;

  // Store in profile
  await supabase
    .from("profiles")
    .update({ push_token: token })
    .eq("id", userId);

  return token;
}

/**
 * Add a listener for when a notification is tapped (app opened from notification).
 * Returns a cleanup function.
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(callback);
  return () => subscription.remove();
}
