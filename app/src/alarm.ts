import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AlarmSettings, Profile, SoundKey } from './storage';

export const DAYS = [
  { day: 1, short: 'Mo' },
  { day: 2, short: 'Di' },
  { day: 3, short: 'Mi' },
  { day: 4, short: 'Do' },
  { day: 5, short: 'Fr' },
  { day: 6, short: 'Sa' },
  { day: 0, short: 'So' },
];

export const TIMES = ['06:00', '07:00', '08:00', '12:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

export const SOUNDS: { key: SoundKey; label: string; hint: string; file?: number }[] = [
  { key: 'voice', label: 'Deine Stimme', hint: 'Dein aufgenommenes Warum' },
  { key: 'drums', label: 'Stadion-Trommeln', hint: 'Boom, boom, klatsch', file: require('../assets/sounds/drums.wav') },
  { key: 'gong', label: 'Gong', hint: 'Ruhig, aber bestimmt', file: require('../assets/sounds/gong.wav') },
  { key: 'rise', label: 'Aufstieg', hint: 'Steigende Töne', file: require('../assets/sounds/rise.wav') },
];

export function dayShort(day: number) {
  return DAYS.find(d => d.day === day)?.short ?? '';
}

// The next moment the alarm rings, strictly after `from`.
export function nextAlarm(alarm: AlarmSettings, from = new Date()): Date | null {
  if (alarm.days.length === 0) return null;
  const [h, m] = alarm.time.split(':').map(Number);
  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date(from);
    d.setDate(d.getDate() + offset);
    d.setHours(h, m, 0, 0);
    if (d > from && alarm.days.includes(d.getDay())) return d;
  }
  return null;
}

export function alarmLabel(d: Date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === today.toDateString()) return `Heute, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Morgen, ${time}`;
  return `${dayShort(d.getDay())}, ${time}`;
}

// True during the minute the alarm is set for, used to ring while the app is open.
export function isAlarmMinute(alarm: AlarmSettings, now = new Date()) {
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return alarm.days.includes(now.getDay()) && alarm.time === time;
}

// On phones the system delivers the reminder even when the app is closed; tapping it opens the alarm screen.
export async function scheduleAlarms(profile: Profile) {
  if (Platform.OS === 'web') return;
  try {
    const { granted } = await Notifications.requestPermissionsAsync();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!granted) return;
    const [hour, minute] = profile.alarm.time.split(':').map(Number);
    for (const day of profile.alarm.days) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Day One. Los.',
          body: profile.why ? `Dein Warum: ${profile.why}` : 'Deine Crew wartet. Zeit fürs Training.',
          sound: true,
          data: { alarm: true },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour, minute },
      });
    }
  } catch {
    // Notifications are a bonus; the in-app alarm still works without them.
  }
}
