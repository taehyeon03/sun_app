// src/lib/notifications.ts
// 선크림 재도포 알림 서비스

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("sungard-reapply", {
      name: "선크림 재도포 알림",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFD060",
      sound: "notification.wav",
    });
  }

  return finalStatus === "granted";
}

export async function scheduleReapplyNotification(
  reapplyMinutes: number,
  productLabel: string,
  amountDesc: string
): Promise<string> {
  // 기존 알림 취소
  await Notifications.cancelAllScheduledNotificationsAsync();

  const triggerSeconds = reapplyMinutes * 60;
  const warningSeconds = Math.max(triggerSeconds - 20 * 60, 60); // 20분 전 경고

  // 20분 전 예고 알림
  if (warningSeconds > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ 선크림 재도포 20분 전",
        body: `${productLabel} — 20분 후 재도포 시간입니다. 미리 준비하세요!`,
        sound: true,
        color: "#f59e0b",
        data: { type: "warning" },
      },
      trigger: {
        seconds: warningSeconds,
        channelId: "sungard-reapply",
      },
    });
  }

  // 재도포 시간 알림
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "☀️ 선크림 재도포 시간!",
      body: `${amountDesc}\n지금 바로 선크림을 발라주세요!`,
      sound: true,
      color: "#FFD060",
      data: { type: "reapply" },
      badge: 1,
    },
    trigger: {
      seconds: triggerSeconds,
      channelId: "sungard-reapply",
    },
  });

  return id;
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}
