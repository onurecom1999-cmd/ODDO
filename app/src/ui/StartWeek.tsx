import { Text, View } from 'react-native';
import { t } from '../i18n';
import { addDays, dayKey, dayNumber, dayScore, fromKey } from '../logic/day';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Card, Eyebrow, Row, Small } from './kit';

export const START_GOAL = 3;

// The first week's one goal: 3 perfect days. Seven dots, one per day, filled when the day was perfect.
export function StartWeek({ all }: { all: number }) {
  const { S } = useApp();
  if (!S.startedAt) return null;
  const first = fromKey(dayKey(new Date(S.startedAt)));
  const today = dayKey(), nToday = dayNumber(S, today);
  const days = [...Array(7)].map((_, i) => {
    const k = dayKey(addDays(first, i));
    return { k, n: i + 1, perfect: k <= today && dayScore(S, k).perfect, today: k === today, past: k < today };
  });
  const perfect = days.filter(d => d.perfect).length;
  const left = Math.max(0, START_GOAL - perfect), daysLeft = 7 - nToday + 1;
  const reached = left === 0;
  const sub = reached ? t('start.done', { n: perfect })
    : left > daysLeft ? t('start.missed')
    : left === 1 ? t('start.left1', { d: daysLeft }) : t('start.left', { n: left, d: daysLeft });
  return (
    <Card style={{ gap: 12, borderColor: reached ? colors.accent : colors.line }}>
      <Eyebrow>{t('start.eyebrow')}</Eyebrow>
      <Text style={{ fontFamily: fonts.heavy, fontSize: 20, color: colors.text }}>{reached ? t('start.titleDone') : t('start.title', { n: START_GOAL })}</Text>
      <Row style={{ justifyContent: 'space-between' }}>
        {days.map(d => (
          <View key={d.k} style={{ alignItems: 'center', gap: 4 }}>
            <View style={{
              width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
              backgroundColor: d.perfect ? colors.accent : 'transparent',
              borderWidth: 2, borderColor: d.perfect ? colors.accent : d.today ? colors.text : colors.line,
              opacity: d.past && !d.perfect ? 0.5 : 1,
            }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: d.perfect ? colors.ink : d.today ? colors.text : colors.dim }}>{d.perfect ? '✓' : d.n}</Text>
            </View>
          </View>
        ))}
      </Row>
      <Small>{sub}</Small>
      {nToday <= 2 && !reached ? <Small style={{ color: colors.dim }}>{t('how.text', { n: all })}</Small> : null}
    </Card>
  );
}
