import { useState } from 'react';
import { t } from '../i18n';
import { Pressable, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Stack } from '../ui/kit';
import { PlanTab } from './PlanTab';
import { Progress } from './Progress';
import { Week } from './Week';

type Part = 'progress' | 'week' | 'plan';

// Everything about you in one tab: progress, the week report and your plan and settings.
export function Me({ onOpen }: { onOpen: (sheet: string) => void }) {
  const [part, setPart] = useState<Part>('progress');
  return (
    <Stack gap={4}>
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: colors.line, marginBottom: 6 }}>
        {(['progress', 'week', 'plan'] as Part[]).map(k => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: part === k }} onPress={() => setPart(k)} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999, backgroundColor: part === k ? colors.accent : 'transparent' }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: part === k ? colors.ink : colors.muted }}>{t(`tab.${k}`)}</Text>
          </Pressable>
        ))}
      </View>
      {part === 'progress' ? <Progress /> : part === 'week' ? <Week onOpen={onOpen} /> : <PlanTab onOpen={onOpen} />}
    </Stack>
  );
}
