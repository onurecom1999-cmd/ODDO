import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from './i18n';

export const REMINDER_HOURS = [7, 12, 18, 20];
export const remindersSupported = Platform.OS !== 'web';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

// One daily nudge at the chosen hour; null turns it off. Returns false when notifications are not allowed.
export async function setReminder(hour: number | null): Promise<boolean> {
  if (!remindersSupported) return false;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  if (hour == null) return true;
  const perm = await Notifications.requestPermissionsAsync().catch(() => null);
  if (!perm?.granted) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily', { name: t('remind.channel'), importance: Notifications.AndroidImportance.DEFAULT }).catch(() => {});
  }
  await Notifications.scheduleNotificationAsync({
    content: { title: 'ODDO', body: t(hour < 11 ? 'remind.morning' : hour < 16 ? 'remind.noon' : 'remind.evening') },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, channelId: 'daily' },
  });
  return true;
}
