import { useState } from 'react';
import { t } from '../i18n';
import { Chip, Chips, Stack } from '../ui/kit';
import { PlanTab } from './PlanTab';
import { Progress } from './Progress';
import { Week } from './Week';

type Part = 'progress' | 'week' | 'plan';

// Everything about you in one tab: progress, the week report and your plan and settings.
export function Me({ onOpen }: { onOpen: (sheet: string) => void }) {
  const [part, setPart] = useState<Part>('progress');
  return (
    <Stack gap={4}>
      <Chips>{(['progress', 'week', 'plan'] as Part[]).map(k => <Chip key={k} label={t(`tab.${k}`)} on={part === k} onPress={() => setPart(k)} />)}</Chips>
      {part === 'progress' ? <Progress /> : part === 'week' ? <Week onOpen={onOpen} /> : <PlanTab onOpen={onOpen} />}
    </Stack>
  );
}
