import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getLang, LOCALE, t } from '../i18n';
import { liveSub, mySubscription, usePerks } from '../pro';
import { remindTrialEnd } from '../reminders';
import { colors, fonts } from '../theme';
import { Small } from './kit';

// The free Pro month after joining a trainer or studio: how long it lasts, and a promise that nothing is charged.
export function TrialCard({ onPro }: { onPro: () => void }) {
  const perks = usePerks();
  const [paying, setPaying] = useState(false);
  const until = perks && !perks.partner ? perks.free_until : null;
  useEffect(() => {
    remindTrialEnd(until).catch(() => {});
    if (until) mySubscription().then(s => setPaying(liveSub(s)), () => {});
  }, [until]);
  if (!until || paying) return null;
  const days = Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 86400000));
  const date = new Date(until).toLocaleDateString(LOCALE[getLang()], { day: 'numeric', month: 'long' });
  const soon = days <= 3;
  return (
    <Pressable accessibilityRole="button" testID="trial-card" onPress={onPro}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: soon ? colors.accent : colors.line, backgroundColor: colors.surface }}>
      <View style={{ width: 52, alignItems: 'center' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.accent }}>{days}</Text>
        <Small style={{ fontSize: 11 }}>{days === 1 ? t('trial.day') : t('trial.days')}</Small>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.text }}>{t('trial.title', { via: perks?.via || 'ODDO' })}</Text>
        <Small>{t(soon ? 'trial.soon' : 'trial.sub', { date })}</Small>
      </View>
      <Text style={{ color: colors.dim, fontSize: 22 }}>›</Text>
    </Pressable>
  );
}
