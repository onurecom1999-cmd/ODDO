import { useState } from 'react';
import { Text, View } from 'react-native';
import { Key, t } from '../i18n';
import { colors, fonts } from '../theme';
import { Icon, IconName } from '../ui/icons';
import { Body, Button, H2, LinkButton, Row, Sheet, Stack } from '../ui/kit';

const STEPS: IconName[] = ['today', 'move', 'community', 'me', 'studio'];

// A short walk through the four tabs right after the plan, so nobody has to find things on their own.
export function TourSheet({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
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
        <Button label={last ? t('tour.go') : t('next')} onPress={() => (last ? onClose() : setI(i + 1))} />
        {!last ? <View style={{ alignItems: 'center' }}><LinkButton label={t('tour.skip')} onPress={onClose} /></View> : null}
      </Stack>
    </Sheet>
  );
}
