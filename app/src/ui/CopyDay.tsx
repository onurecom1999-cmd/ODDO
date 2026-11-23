import { fmt, t } from '../i18n';
import { addDays, dayKey, fromKey } from '../logic/day';
import { lastFoodDay } from '../logic/foods';
import { weekday } from '../logic/names';
import { dayLog, useApp } from '../state';
import { Button, useToast } from './kit';

// "Like yesterday": logs every meal of the last day with food again, while today is still empty.
export function CopyDay({ after }: { after?: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const today = dayKey();
  if ((S.log[today]?.meals || []).length) return null;
  const src = lastFoodDay(S.log, today);
  if (!src) return null;
  const kcal = src.meals.reduce((a, m) => a + m.kcal, 0);
  const yesterday = src.key === dayKey(addDays(new Date(), -1));
  const label = yesterday ? t('food.copyYesterday', { kcal: fmt(kcal) }) : t('food.copyDay', { day: weekday(fromKey(src.key).getDay(), 'long'), kcal: fmt(kcal) });
  const copy = () => {
    update(d => { const l = dayLog(d); for (const m of src.meals) l.meals.push({ ...m, img: undefined }); });
    after?.();
    toast(t('food.copied'));
  };
  return <Button small variant="ghost" label={label} onPress={copy} />;
}
