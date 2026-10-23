import { useState } from 'react';
import { Text, View } from 'react-native';
import { Key, t } from '../i18n';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Icon, IconName } from '../ui/icons';
import { Body, Button, Chip, Chips, H2, LinkButton, Muted, Row, Sheet, Stack, useToast } from '../ui/kit';
import { REMINDER_HOURS, remindersSupported, setReminder } from '../reminders';
import { RoleCards } from '../ui/RoleCards';
import { anyCodeError, joinAnyCode, joinedText } from './Studio';

const STEPS: IconName[] = ['today', 'move', 'community', 'me'];

// Right after the plan: first how the person uses ODDO (with a code, as trainer or studio), then the four tabs.
export function TourSheet({ onClose, onBusiness, onJoined }: { onClose: () => void; onBusiness: (k: 'coach' | 'studio') => void; onJoined: (k: 'coach' | 'studio' | 'friend') => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const [i, setI] = useState(S.asked ? 0 : -1);
  const [busy, setBusy] = useState(false);
  const [hour, setHour] = useState(18);
  // After the tabs, on the phone: one daily reminder at the person's time. People who are reminded stay with it far more often.
  const askReminder = remindersSupported && S.reminder == null;
  const [remind, setRemind] = useState(false);
  const finish = () => (askReminder ? setRemind(true) : onClose());
  if (remind) return (
    <Sheet visible title={t('tour.title')} onClose={onClose}>
      <Stack gap={18} style={{ paddingTop: 8 }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={38} color={colors.ink} />
        </View>
        <H2>{t('tour.remind.t')}</H2>
        <Body style={{ fontSize: 17, lineHeight: 25 }}>{t('tour.remind.s')}</Body>
        <Chips>{REMINDER_HOURS.map(h => <Chip key={h} label={`${h}:00`} on={hour === h} onPress={() => setHour(h)} />)}</Chips>
        <Button label={busy ? '…' : t('tour.remind.on')} disabled={busy} onPress={async () => {
          setBusy(true);
          const ok = await setReminder(hour).catch(() => false);
          if (ok) { update(d => { d.reminder = hour; }); toast(t('tour.remind.done', { hour: `${hour}:00` })); } else toast(t('remind.denied'));
          setBusy(false); onClose();
        }} />
        <View style={{ alignItems: 'center' }}><LinkButton label={t('tour.remind.no')} onPress={onClose} /></View>
      </Stack>
    </Sheet>
  );
  if (i < 0) return (
    <Sheet visible title={t('tour.title')} onClose={onClose}>
      <Stack gap={14} style={{ paddingTop: 4 }}>
        <H2>{t('tour.ask')}</H2>
        <Muted>{t('tour.askSub')}</Muted>
        <RoleCards busy={busy} codeHint={t('tour.codeHint')} meSub={t('tour.meSub')}
          onPick={k => {
            if (k === 'me') setI(0);
            else { update(d => { d.biz = k; }); onBusiness(k); }
          }}
          onCode={async code => {
            setBusy(true);
            try { const r = await joinAnyCode(code); toast(joinedText(r)); onJoined(r.kind); setI(0); }
            catch (e) { toast(anyCodeError(e)); }
            setBusy(false);
          }} />
      </Stack>
    </Sheet>
  );
  const last = i === STEPS.length - 1;
  const k = STEPS[i];
  return (
    <Sheet visible title={t('tour.title')} onClose={onClose}>
      <Stack gap={20} style={{ paddingTop: 8 }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={k} size={38} color={colors.ink} />
        </View>
        <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.muted }}>{i + 1} / {STEPS.length}</Text>
        <H2>{t(`tour.${k}.t` as Key)}</H2>
        <Body style={{ fontSize: 17, lineHeight: 25 }}>{t(`tour.${k}.s` as Key)}</Body>
        <Row style={{ gap: 6 }}>
          {STEPS.map((_, n) => <View key={n} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: n <= i ? colors.accent : colors.surface2 }} />)}
        </Row>
        <Button label={last ? t('tour.go') : t('next')} onPress={() => (last ? finish() : setI(i + 1))} />
        <Row style={{ justifyContent: 'space-between' }}>
          {i > 0 || !S.asked ? <LinkButton label={t('back')} onPress={() => setI(i - 1)} /> : <View />}
          {!last ? <LinkButton label={t('tour.skip')} onPress={onClose} /> : null}
        </Row>
      </Stack>
    </Sheet>
  );
}
