import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Key, t } from '../i18n';
import { useApp } from '../state';
import { AccountSheet } from '../sheets/Account';
import { CoachSheet } from '../sheets/Coach';
import { StudioAdminSheet } from '../sheets/Studio';
import { colors, fonts } from '../theme';
import { Icon } from '../ui/icons';
import { Body, Bold, Button, Card, Eyebrow, H1, LinkButton, Muted, Row, Screen, Small, Stack } from '../ui/kit';
import { Logo } from './Onboarding';

// The start for studios and trainers who do not train with ODDO themselves (yet): straight to their dashboard.
export function BizHome({ onOwnPlan }: { onOwnPlan: () => void }) {
  const { S, update } = useApp();
  const kind = S.biz ?? 'studio';
  const other = kind === 'studio' ? 'coach' : 'studio';
  const [open, setOpen] = useState<'studio' | 'coach' | 'account' | null>(kind);
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}>
          <Logo />
          <LinkButton label={t('biz.home.switch')} onPress={() => update(d => { delete d.biz; })} />
        </Row>
        <Stack gap={18} style={{ paddingTop: 16 }}>
          <Eyebrow>{t(`biz.home.${kind}.eyebrow` as Key)}</Eyebrow>
          <H1>{t(`biz.home.${kind}.title` as Key)}</H1>
          <Card style={{ gap: 14 }}>
            {[1, 2, 3].map(n => (
              <Row key={n} style={{ alignItems: 'flex-start', gap: 14 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.accent, lineHeight: 28 }}>{n}</Text>
                <Body style={{ flex: 1 }}>{t(`biz.home.${kind}.${n}` as Key)}</Body>
              </Row>
            ))}
          </Card>
          <Button label={t(`biz.home.${kind}.open` as Key)} onPress={() => setOpen(kind)} />
          <Pressable accessibilityRole="button" onPress={() => setOpen(other)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Icon name={other} size={22} />
              <View style={{ flex: 1 }}><Bold>{t(`biz.home.also.${other}` as Key)}</Bold></View>
              <Text style={{ color: colors.dim, fontSize: 22 }}>›</Text>
            </Card>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onOwnPlan}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Icon name="train" size={22} />
              <View style={{ flex: 1, gap: 2 }}><Bold>{t('biz.home.ownPlan')}</Bold><Small>{t('biz.home.ownPlanSub')}</Small></View>
              <Text style={{ color: colors.dim, fontSize: 22 }}>›</Text>
            </Card>
          </Pressable>
          <Muted style={{ fontSize: 13 }}>{t('biz.home.save')}</Muted>
          <Button small variant="ghost" label={t('biz.home.saveBtn')} onPress={() => setOpen('account')} />
        </Stack>
      </Screen>
      {open === 'studio' ? <StudioAdminSheet onClose={() => setOpen(null)} /> : null}
      {open === 'coach' ? <CoachSheet onClose={() => setOpen(null)} /> : null}
      {open === 'account' ? <AccountSheet mode="save" onClose={() => setOpen(null)} /> : null}
    </View>
  );
}
