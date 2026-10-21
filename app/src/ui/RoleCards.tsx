import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Key, t } from '../i18n';
import { colors } from '../theme';
import { Icon, IconName } from './icons';
import { Bold, Button, Card, Field, Small } from './kit';

export type Role = 'me' | 'coach' | 'studio' | 'code';
const ROLES: { k: Role; icon: IconName }[] = [{ k: 'me', icon: 'train' }, { k: 'code', icon: 'code' }, { k: 'coach', icon: 'coach' }, { k: 'studio', icon: 'studio' }];

// The four ways to use ODDO, on the start screen and in the tour. A code opens a field right under its card.
export function RoleCards({ onPick, onCode, codeHint, meSub, busy }: { onPick: (r: Exclude<Role, 'code'>) => void; onCode: (code: string) => void; codeHint: string; meSub?: string; busy?: boolean }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  return (
    <>
      {ROLES.map(({ k, icon }) => (
        <View key={k} style={{ gap: 10 }}>
          <Pressable accessibilityRole="button" testID={`role-${k}`} onPress={() => (k === 'code' ? setOpen(o => !o) : onPick(k))}>
            {({ pressed }) => (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: k === 'me' || (k === 'code' && open) ? colors.accent : colors.line, opacity: pressed ? 0.7 : 1 }}>
                <View style={{ width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: k === 'me' ? colors.accent : colors.surface2 }}>
                  <Icon name={icon} size={26} color={k === 'me' ? colors.ink : colors.text} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Bold style={{ fontSize: 17 }}>{t(`start.${k}` as Key)}</Bold>
                  <Small>{k === 'me' && meSub ? meSub : t(`start.${k}.s` as Key)}</Small>
                </View>
                <Text style={{ color: k === 'me' ? colors.accent : colors.dim, fontSize: 24 }}>{k === 'code' && open ? '⌄' : '›'}</Text>
              </Card>
            )}
          </Pressable>
          {k === 'code' && open ? (
            <Card style={{ gap: 12, borderColor: colors.accent }}>
              <Field label={t('start.codeLabel')} value={code} onChangeText={v => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))} autoCapitalize="characters" maxLength={6} autoFocus placeholder="······" />
              <Small>{codeHint}</Small>
              <Button label={busy ? '…' : t('start.codeGo')} disabled={busy || code.length !== 6} onPress={() => onCode(code)} />
            </Card>
          ) : null}
        </View>
      ))}
    </>
  );
}
