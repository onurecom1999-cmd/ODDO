import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { account } from '../account';
import { t } from '../i18n';
import { dayNumber } from '../logic/day';
import { levelInfo } from '../logic/level';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Button, Card, Eyebrow, LinkButton, Small } from '../ui/kit';

// From level 2 or day 2 on: anonymous progress is one cleared browser away from gone. Saving it also gives us
// the email, the only way to reach web users without push. "Later" hides the card for three days.
const AGAIN_MS = 3 * 864e5;
export function SaveNudge({ onSave }: { onSave: () => void }) {
  const { S, update } = useApp();
  const [anon, setAnon] = useState(false);
  const L = levelInfo(S);
  const due = !S.example && (L.n >= 2 || dayNumber(S) >= 2) && (!S.saveAskedAt || Date.now() - S.saveAskedAt > AGAIN_MS);
  useEffect(() => { if (due) account().then(a => setAnon(!!a?.anonymous), () => {}); }, [due]);
  if (!due || !anon) return null;
  return (
    <Card style={{ gap: 10, borderColor: colors.accent }}>
      <Eyebrow>{t('save.eyebrow')}</Eyebrow>
      <Text style={{ fontFamily: fonts.heavy, fontSize: 20, color: colors.text }}>{t('save.title', { n: L.n })}</Text>
      <Small>{t('save.sub')}</Small>
      <View style={{ gap: 8, marginTop: 4 }}>
        <Button label={t('save.cta')} onPress={onSave} />
        <LinkButton label={t('save.later')} onPress={() => update(d => { d.saveAskedAt = Date.now(); })} />
      </View>
    </Card>
  );
}
