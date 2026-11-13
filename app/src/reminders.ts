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
  await Promise.all(all.filter(n => n.identifier !== TRIAL_ID && n.identifier !== CHALLENGE_ID && n.identifier !== FAST_ID && !n.identifier.startsWith('nudge-')).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})));
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
// A heads-up three days before free Pro ends, at 10:00.
export async function remindTrialEnd(freeUntil: string | null) {
  if (!remindersSupported) return;
  if (!freeUntil) { await Notifications.cancelScheduledNotificationAsync(TRIAL_ID).catch(() => {}); return; }
  const at = new Date(freeUntil);
  at.setDate(at.getDate() - 3); at.setHours(10, 0, 0, 0);
  if (at.getTime() <= Date.now()) return;
  // Only when notifications are already allowed: asking here would pop the system prompt on the first screen, without context.
  const perm = await Notifications.getPermissionsAsync().catch(() => null);
  if (!perm?.granted) return;
  await Notifications.scheduleNotificationAsync({
    identifier: TRIAL_ID,
    content: { title: 'ODDO Pro', body: t('trial.push', { date: new Date(freeUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) }) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
  }).catch(() => {});
}

const CHALLENGE_ID = 'challenge-start';
// On the challenge's first day at 8:00: "Today is Day One". Asked for right after joining, so the system prompt has its context.
export async function remindChallengeStart(start: string) {
  if (!remindersSupported) return;
  const [y, m, d] = start.split('-').map(Number);
  const at = new Date(y, m - 1, d, 8, 0, 0);
  if (at.getTime() <= Date.now()) return;
  const perm = await Notifications.requestPermissionsAsync().catch(() => null);
  if (!perm?.granted) return;
  await Notifications.scheduleNotificationAsync({
    identifier: CHALLENGE_ID,
    content: { title: 'ODDO', body: t('ch.push') },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
  }).catch(() => {});
}

// Nudges that follow what the person did, rescheduled on every change while the app is open:
// a streak saver tonight if today is still open, and two come-back messages if the app stays closed.
// Only when notifications are already allowed and the daily reminder was not turned off.
export async function syncNudges(o: { streak: number; perfect: boolean; level: number; hour: number; off: boolean }) {
  if (!remindersSupported) return;
  const ids = ['nudge-streak', 'nudge-back2', 'nudge-back5'];
  await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  if (o.off) return;
  const perm = await Notifications.getPermissionsAsync().catch(() => null);
  if (!perm?.granted) return;
  const at = (days: number, h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d; };
  const plan: [string, Date, string][] = [];
  const tonight = at(0, 20, 30);
  if (o.streak >= 2 && !o.perfect && tonight.getTime() > Date.now() + 10 * 60e3) plan.push(['nudge-streak', tonight, t('nudge.streak', { n: o.streak })]);
  plan.push(['nudge-back2', at(2, o.hour), t('nudge.back2', { n: o.level })]);
  plan.push(['nudge-back5', at(5, o.hour), t('nudge.back5')]);
  for (const [identifier, date, body] of plan) {
    await Notifications.scheduleNotificationAsync({ identifier, content: { title: 'ODDO', body }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date } }).catch(() => {});
  }
}

const FAST_ID = 'fast-end';
// "Goal reached" when the running fast hits its hours; null cancels. Asks for permission, since the person just started a fast.
export async function remindFastEnd(at: number | null) {
  if (!remindersSupported) return;
  await Notifications.cancelScheduledNotificationAsync(FAST_ID).catch(() => {});
  if (at == null || at <= Date.now()) return;
  const perm = await Notifications.requestPermissionsAsync().catch(() => null);
  if (!perm?.granted) return;
  await Notifications.scheduleNotificationAsync({ identifier: FAST_ID, content: { title: 'ODDO', body: t('fast.push') }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) } }).catch(() => {});
}
