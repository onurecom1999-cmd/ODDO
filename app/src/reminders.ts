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
  // Everything scheduled except the free-month reminder; older versions scheduled the daily one without a name.
  const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(all.filter(n => n.identifier !== TRIAL_ID).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})));
  if (hour == null) return true;
  const perm = await Notifications.requestPermissionsAsync().catch(() => null);
  if (!perm?.granted) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily', { name: t('remind.channel'), importance: Notifications.AndroidImportance.DEFAULT }).catch(() => {});
  }
  await Notifications.scheduleNotificationAsync({
    identifier: 'daily',
    content: { title: 'ODDO', body: t(hour < 11 ? 'remind.morning' : hour < 16 ? 'remind.noon' : 'remind.evening') },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, channelId: 'daily' },
  });
  return true;
}

const TRIAL_ID = 'trial-end';
// A heads-up three days before the free Pro month ends, at 10:00. Asks for permission only when there is something to remind.
export async function remindTrialEnd(freeUntil: string | null) {
  if (!remindersSupported) return;
  if (!freeUntil) { await Notifications.cancelScheduledNotificationAsync(TRIAL_ID).catch(() => {}); return; }
  const at = new Date(freeUntil);
  at.setDate(at.getDate() - 3); at.setHours(10, 0, 0, 0);
  if (at.getTime() <= Date.now()) return;
  const perm = await Notifications.requestPermissionsAsync().catch(() => null);
  if (!perm?.granted) return;
  await Notifications.scheduleNotificationAsync({
    identifier: TRIAL_ID,
    content: { title: 'ODDO Pro', body: t('trial.push', { date: new Date(freeUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) }) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
  }).catch(() => {});
}
