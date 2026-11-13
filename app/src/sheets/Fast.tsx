import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { getLang, LOCALE, t } from '../i18n';
import { DEFAULT_FAST, FAST_PLANS, fastNow, fastReached, fastStreak, hm } from '../logic/fast';
import { XP } from '../logic/level';
import { remindFastEnd } from '../reminders';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Bar, Button, Card, Chip, Chips, Eyebrow, LinkButton, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';

const H = 3600_000;
const clock = (ms: number) => new Date(ms).toLocaleTimeString(LOCALE[getLang()], { hour: '2-digit', minute: '2-digit' });
const dur = (ms: number) => { const x = hm(ms); return `${x.h}:${String(x.m).padStart(2, '0')}`; };
const planLabel = (h: number) => `${h}:${24 - h}`;

// Re-renders every 30 s while something counts.
export function useTick(on: boolean) {
  const [, set] = useState(0);
  useEffect(() => { if (!on) return; const id = setInterval(() => set(x => x + 1), 30_000); return () => clearInterval(id); }, [on]);
}

// Intermittent fasting: pick the hours once, then one button to start and one to end.
export function FastSheet({ onClose }: { onClose: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const f = fastNow(S);
  useTick(f.active);
  const plan = S.fast?.plan ?? DEFAULT_FAST;
  const done = S.fast?.done ?? [];
  const streak = fastStreak(S);

  const setPlan = (h: number) => update(d => { d.fast = { ...(d.fast ?? { plan: h }), plan: h }; });
  const start = (ago = 0) => {
    const at = Date.now() - ago;
    update(d => { d.fast = { ...(d.fast ?? { plan }), plan, start: at }; });
    remindFastEnd(at + plan * H).catch(() => {});
    toast(t('fast.started', { time: clock(at + plan * H) }));
  };
  const earlier = () => {
    if (!f.active) return;
    const at = f.start - 30 * 60_000;
    update(d => { if (d.fast) d.fast.start = at; });
    remindFastEnd(at + plan * H).catch(() => {});
  };
  const end = () => {
    if (!f.active) return;
    const item = { start: f.start, end: Date.now(), goal: plan };
    update(d => { if (!d.fast) return; d.fast.start = undefined; d.fast.done = [item, ...(d.fast.done ?? [])].slice(0, 60); });
    remindFastEnd(null).catch(() => {});
    const x = hm(item.end - item.start);
    toast(fastReached(item) ? t('fast.doneOk', { h: x.h, xp: XP.fast }) : t('fast.doneShort', { h: x.h, m: x.m, goal: plan }));
  };

  return (
    <Sheet visible title={t('fast.title')} onClose={onClose}>
      <Stack gap={18}>
        <View style={{ alignItems: 'center', paddingTop: 6 }}>
          <FastRing pct={f.active ? f.pct : 0} size={230}>
            {f.active ? (
              <>
                <Eyebrow>{f.reached ? t('fast.reached') : t('fast.left')}</Eyebrow>
                <Text style={{ fontFamily: fonts.display, fontSize: 52, lineHeight: 58, color: f.reached ? colors.accent : colors.text }}>{dur(f.reached ? f.elapsed : f.left)}</Text>
                <Small>{f.reached ? t('fast.fastedFor') : t('fast.of', { h: plan })}</Small>
              </>
            ) : (
              <>
                <Eyebrow>{t('fast.ready')}</Eyebrow>
                <Text style={{ fontFamily: fonts.display, fontSize: 52, lineHeight: 58, color: colors.text }}>{planLabel(plan)}</Text>
                <Small>{t('fast.planSub', { h: plan, e: 24 - plan })}</Small>
              </>
            )}
          </FastRing>
        </View>

        {f.active ? (
          <Stack gap={10}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Small>{t('fast.since', { time: clock(f.start) })}</Small>
              <Small style={{ color: colors.text }}>{t('fast.goalAt', { time: clock(f.endsAt) })}</Small>
            </Row>
            <Button label={f.reached ? t('fast.endOk') : t('fast.end')} variant={f.reached ? 'accent' : 'ghost'} onPress={end} />
            {!f.reached ? <LinkButton label={t('fast.earlier')} onPress={earlier} /> : null}
          </Stack>
        ) : (
          <Stack gap={12}>
            <Chips>
              {FAST_PLANS.map(h => <Chip key={h} label={planLabel(h)} sub={t(`fast.p${h}` as never)} on={plan === h} onPress={() => setPlan(h)} />)}
            </Chips>
            <Button label={t('fast.start')} onPress={() => start()} />
            <LinkButton label={t('fast.startAgo')} onPress={() => start(H)} />
            <Small>{t('fast.rule')}</Small>
          </Stack>
        )}

        {done.length ? (
          <Card style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Eyebrow>{t('fast.history')}</Eyebrow>
              {streak > 1 ? <Small style={{ color: colors.accent }}>{t('fast.streak', { n: streak })}</Small> : null}
            </Row>
            {done.slice(0, 7).map(d => {
              const ok = fastReached(d);
              return (
                <View key={d.start} style={{ gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Small style={{ color: colors.text }}>{new Date(d.end).toLocaleDateString(LOCALE[getLang()], { weekday: 'short', day: 'numeric', month: 'short' })}</Small>
                    <Small style={{ color: ok ? colors.accent : colors.muted }}>{dur(d.end - d.start)} h {ok ? '✓' : `/ ${d.goal} h`}</Small>
                  </Row>
                  <Bar thin pct={Math.min(100, (d.end - d.start) / (d.goal * H) * 100)} />
                </View>
              );
            })}
          </Card>
        ) : null}

        <Muted style={{ fontSize: 13 }}>{t('fast.safety')}</Muted>
      </Stack>
    </Sheet>
  );
}

export function FastRing({ pct, size, children }: { pct: number; size: number; children?: React.ReactNode }) {
  const w = size > 100 ? 14 : 6, r = size / 2 - w, c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.line} strokeWidth={w} fill="none" />
        {pct > 0 ? <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.accent} strokeWidth={w} fill="none" strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}  /> : null}
      </Svg>
      {children}
    </View>
  );
}

// On Today while a fast runs, or during the eating window after one: time left, one tap opens the timer.
export function FastCard({ onOpen }: { onOpen: () => void }) {
  const { S } = useApp();
  const f = fastNow(S);
  useTick(f.active || f.eatLeft > 0);
  if (!S.fast || (!f.active && f.eatLeft <= 0)) return null;
  return (
    <Pressable accessibilityRole="button" onPress={onOpen}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: f.active && f.reached ? colors.accent : colors.line }}>
        <FastRing pct={f.active ? f.pct : 1} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Eyebrow>{f.active ? t('fast.cardOn', { plan: planLabel(f.plan) }) : t('fast.cardEat')}</Eyebrow>
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.text }}>
            {f.active ? (f.reached ? t('fast.cardReached') : t('fast.cardLeft', { t: dur(f.left) })) : t('fast.cardEatLeft', { t: dur(f.eatLeft) })}
          </Text>
        </View>
        <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 18 }}>›</Text>
      </Card>
    </Pressable>
  );
}
