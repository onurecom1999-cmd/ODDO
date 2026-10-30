import { useEffect, useState } from 'react';
import { account, AccountInfo, confirmLink, confirmLogin, linkEmail, sendLogin, validEmail } from '../account';
import { t } from '../i18n';
import type { AppState } from '../logic/types';
import { colors } from '../theme';
import { Bold, Button, Card, Field, Muted, Sheet, Small, Stack, useToast } from '../ui/kit';

// mode 'save': add an email to this device's account. mode 'login': bring an account to this device.
export function AccountSheet({ mode, onClose, onRestored }: { mode: 'save' | 'login'; onClose: () => void; onRestored?: (s: AppState) => void }) {
  const toast = useToast();
  const [info, setInfo] = useState<AccountInfo | null | undefined>(mode === 'login' ? null : undefined);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (mode === 'save') account().then(setInfo, () => setInfo(null)); }, [mode]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) {
      const m = String((e as Error)?.message || '');
      toast(/offline|fetch|network/i.test(m) ? t('com.offline') : /expired|invalid|token/i.test(m) ? t('acc.badCode') : /not found|signups not allowed/i.test(m) ? t('acc.noAccount') : t('com.err.failed'));
    }
    setBusy(false);
  };
  const send = () => run(async () => {
    if (!validEmail(email)) { toast(t('acc.badEmail')); return; }
    await (mode === 'save' ? linkEmail(email) : sendLogin(email));
    setSent(true);
  });
  const confirm = () => run(async () => {
    if (mode === 'save') {
      await confirmLink(email, code);
      setInfo(await account()); setSent(false); toast(t('acc.saved'));
    } else {
      const s = await confirmLogin(email, code);
      if (!s) { toast(t('acc.noData')); return; }
      onRestored?.(s); onClose(); toast(t('acc.welcomeBack'));
    }
  });

  return (
    <Sheet visible title={mode === 'save' ? t('acc.title') : t('acc.loginTitle')} onClose={onClose}>
      <Stack gap={16}>
        {mode === 'save' && info === undefined ? <Muted>…</Muted>
          : mode === 'save' && info === null ? <Muted>{t('com.offline')}</Muted>
          : mode === 'save' && info && !info.anonymous ? (
            <Card style={{ borderColor: colors.accent }}><Stack gap={6}><Bold>{t('acc.savedAs')}</Bold><Muted>{info.email}</Muted></Stack></Card>
          ) : (
            <>
              <Muted>{mode === 'save' ? t('acc.lead') : t('acc.loginLead')}</Muted>
              <Field label={t('acc.email')} value={email} onChangeText={setEmail} placeholder="name@mail.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!sent} />
              {sent ? (
                <>
                  <Field label={t('acc.code')} value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" maxLength={8} autoComplete="one-time-code" />
                  <Button label={t('acc.confirm')} onPress={confirm} disabled={busy || code.trim().length < 6} />
                  <Small>{t('acc.codeSent', { email: email.trim() })}</Small>
                  <Button small variant="ghost" label={t('acc.other')} onPress={() => { setSent(false); setCode(''); }} />
                </>
              ) : <Button label={t('acc.send')} onPress={send} disabled={busy} />}
            </>
          )}
      </Stack>
    </Sheet>
  );
}
