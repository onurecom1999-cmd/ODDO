import { Platform, Pressable, Share, Text, View } from 'react-native';
import { fmt, t, type Key } from '../i18n';
import { levelInfo, RANKS, STATS, statLevel } from '../logic/level';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Bar, Button, Card, Eyebrow, H1, LinkButton, Muted, Row, Sheet, Small } from '../ui/kit';

const rankName = (r: string) => t(`lvl.r.${r}` as Key);

// Level, rank, the bar to the next level and the five values. Shown under "Ich" and in the level sheet.
export function LevelCard({ onPress, compact }: { onPress?: () => void; compact?: boolean }) {
  const { S } = useApp();
  const L = levelInfo(S);
  const max = Math.max(...STATS.map(s => statLevel(L.stats[s])));
  const body = (
    <Card style={{ gap: 12, borderColor: colors.accent }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Eyebrow>{rankName(L.rank)}</Eyebrow>
          <Text style={{ fontFamily: fonts.display, fontSize: 40, color: colors.text, marginTop: 2 }}>{t('lvl.level', { n: L.n })}</Text>
        </View>
        <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.muted, marginBottom: 8 }}>{t('lvl.xp', { n: fmt(L.xp) })}</Text>
      </Row>
      <Bar pct={L.pct * 100} thin />
      <Small>{L.n >= 100 ? t('lvl.max') : t('lvl.next', { n: fmt(L.need - L.into), next: L.n + 1 })}</Small>
      {compact ? null : (
        <View style={{ gap: 8, marginTop: 4 }}>
          {STATS.map(s => {
            const v = statLevel(L.stats[s]);
            return (
              <Row key={s} style={{ gap: 10, alignItems: 'center' }}>
                <Text style={{ width: 92, fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>{t(`lvl.s.${s}` as Key)}</Text>
                <View style={{ flex: 1 }}><Bar pct={(v / Math.max(5, max)) * 100} thin /></View>
                <Text style={{ width: 28, textAlign: 'right', fontFamily: fonts.heavy, fontSize: 14, color: colors.accent }}>{v}</Text>
              </Row>
            );
          })}
        </View>
      )}
    </Card>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{body}</Pressable> : body;
}

// Small line under the day number on Today.
export function LevelChip({ onPress }: { onPress: () => void }) {
  const { S } = useApp();
  const L = levelInfo(S);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <Text style={{ fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 1, color: colors.accent, textTransform: 'uppercase' }}>{t('lvl.level', { n: L.n })} · {rankName(L.rank)}</Text>
      <View style={{ width: 60 }}><Bar pct={L.pct * 100} thin /></View>
    </Pressable>
  );
}

export function LevelSheet({ onClose, onRoutines }: { onClose: () => void; onRoutines: () => void }) {
  return (
    <Sheet visible title={t('lvl.howT')} onClose={onClose}>
      <LevelCard />
      <Card><Small style={{ color: colors.text, lineHeight: 20 }}>{t('lvl.how')}</Small></Card>
      <LinkButton label={t('lvl.addMind')} onPress={onRoutines} />
    </Sheet>
  );
}

const APP_URL = 'https://oddo-app.netlify.app';
export function LevelUpSheet({ onClose }: { onClose: () => void }) {
  const { S } = useApp();
  const L = levelInfo(S);
  // A new rank is the big moment; otherwise point at the next one.
  const newRank = RANKS.some(([min]) => min === L.n);
  const next = [...RANKS].reverse().find(([min]) => min > L.n);
  const share = async () => {
    const message = t('lvl.shareText', { n: L.n, rank: rankName(L.rank), url: APP_URL });
    try {
      if (Platform.OS === 'web') {
        const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
        if (nav.share) await nav.share({ text: message }); else window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      } else await Share.share({ message });
    } catch { /* cancelled */ }
  };
  return (
    <Sheet visible title={t('lvl.upEyebrow')} onClose={onClose}>
      <View style={{ alignItems: 'center', gap: 6, paddingVertical: 24 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 96, lineHeight: 104, color: colors.accent }}>{L.n}</Text>
        <H1 style={{ textAlign: 'center' }}>{t('lvl.level', { n: L.n })}</H1>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 14, letterSpacing: 2, color: colors.text, textTransform: 'uppercase' }}>{rankName(L.rank)}</Text>
        <Muted style={{ textAlign: 'center', marginTop: 8 }}>{newRank ? t('lvl.upSub', { rank: rankName(L.rank) }) : next ? t('lvl.upNext', { at: next[0], rank: rankName(next[1]) }) : t('lvl.upSub', { rank: rankName(L.rank) })}</Muted>
      </View>
      <LevelCard />
      <Button label={t('lvl.share')} onPress={share} />
      <Button variant="ghost" label={t('lvl.go')} onPress={onClose} />
    </Sheet>
  );
}
