import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Image, Platform, Text, View, ViewInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { getLang, LOCALE, t } from '../i18n';
import { dayCard, DayCard } from '../logic/reward';
import { pickPhoto, shrink } from '../media';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Bold, Button, Card as Box, Chip, Chips, Emblem, Field, Muted, Row, Sheet, Stack, useToast } from '../ui/kit';
import { cardImage } from './cardImage';
import { CommunityError, post } from '../community';

const upper = (s: string) => s.toLocaleUpperCase(LOCALE[getLang()]);

// The card as a view, laid out on a 1080-wide grid and scaled to the screen.
function Card({ c, photo, width }: { c: DayCard; photo: string; width: number }) {
  const k = width / 1080, px = (n: number) => n * k;
  return (
    <View style={{ width, height: px(1350), backgroundColor: colors.bg, overflow: 'hidden', borderRadius: 18 }}>
      {photo ? <Image source={{ uri: photo }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" /> : null}
      <Svg style={{ position: 'absolute' }} width={width} height={px(1350)}>
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0.25" x2="0" y2="0.72"><Stop offset="0" stopColor={colors.bg} stopOpacity={0} /><Stop offset="1" stopColor={colors.bg} stopOpacity={0.94} /></LinearGradient>
          <RadialGradient id="glow" cx="85%" cy="12%" r="80%"><Stop offset="0" stopColor={colors.accent} stopOpacity={0.28} /><Stop offset="1" stopColor={colors.accent} stopOpacity={0} /></RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={photo ? 'url(#fade)' : 'url(#glow)'} />
      </Svg>
      <Row style={{ position: 'absolute', top: px(80), left: px(80), right: px(80), justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: px(64), color: colors.text }}>ODD<Text style={{ color: colors.accent }}>O</Text></Text>
        <Text style={{ fontFamily: fonts.display, fontSize: px(64), color: colors.text }}>{c.day}</Text>
      </Row>
      <View style={{ position: 'absolute', left: px(80), right: px(80), top: px(photo ? 665 : 525) }}>
        <Text style={{ fontFamily: fonts.heavy, fontSize: px(34), letterSpacing: px(3), color: colors.accent }}>{upper(c.kicker)}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.display, fontSize: px(140), lineHeight: px(170), color: colors.text, marginTop: px(10) }}>{upper(c.title)}</Text>
        <View style={{ marginTop: px(20), gap: px(18) }}>
          {c.lines.map((l, i) => (
            <Text key={i} style={{ fontFamily: fonts.semibold, fontSize: px(40), color: colors.text }}><Text style={{ color: colors.accent }}>✓  </Text>{l}</Text>
          ))}
          {c.rank ? <Text style={{ fontFamily: fonts.heavy, fontSize: px(40), color: colors.accent }}>{c.rank}</Text> : null}
        </View>
      </View>
      <Row style={{ position: 'absolute', left: px(80), right: px(80), bottom: px(70), justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: px(32), color: colors.muted }}>{c.footer}</Text>
        <Text style={{ fontFamily: fonts.semibold, fontSize: px(32), color: colors.muted }}>oddo-app.netlify.app</Text>
      </Row>
    </View>
  );
}

export function RewardSheet({ onClose }: { onClose: () => void }) {
  const { S } = useApp();
  const toast = useToast();
  const c = dayCard(S);
  const [photo, setPhoto] = useState('');
  const [width, setWidth] = useState(0);
  const [busy, setBusy] = useState(false);
  const ref = useRef<ViewInstance>(null);
  const [text, setText] = useState('');
  const [vis, setVis] = useState<'friends' | 'public'>('friends');
  const [posted, setPosted] = useState(false);

  const publish = async () => {
    setBusy(true);
    try { await post(c, text, vis); setPosted(true); toast(t('com.posted')); }
    catch (e) { toast(e instanceof CommunityError && e.code === 'offline' ? t('com.offline') : t('com.err.failed')); }
    setBusy(false);
  };

  const addPhoto = async () => {
    const p = await pickPhoto('library');
    if (p) setPhoto(await shrink(p, 1350, 0.85));
  };

  const share = async () => {
    setBusy(true);
    try {
      if (Platform.OS === 'web') {
        const blob = await cardImage(c, photo, upper);
        if (!blob) throw new Error('draw');
        const name = `oddo-${c.day.toLowerCase().replace(/\W+/g, '-')}.png`;
        const file = new File([blob], name, { type: 'image/png' });
        const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
        if (nav.canShare?.({ files: [file] })) {
          try { await nav.share({ files: [file], text: `${t('reward.shareText')} #ODDO` }); } catch (e) { if ((e as Error)?.name !== 'AbortError') throw e; }
        } else {
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          toast(t('reward.saved'));
        }
      } else {
        const uri = await captureRef(ref, { format: 'png', width: 1080, height: 1350 });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('reward.title') });
      }
    } catch {
      toast(t('reward.failed'));
    }
    setBusy(false);
  };

  return (
    <Sheet visible title={t('reward.title')} onClose={onClose}>
      <Stack gap={16}>
        <Row style={{ gap: 14 }}>
          <Emblem n={c.perfect ? c.streak : 0} size={64} />
          <Muted style={{ flex: 1 }}>{c.perfect ? c.footer : t('reward.hint')}</Muted>
        </Row>
        <View onLayout={e => setWidth(Math.min(e.nativeEvent.layout.width, 440))} style={{ alignItems: 'center' }}>
          {width ? <View ref={ref} collapsable={false}><Card c={c} photo={photo} width={width} /></View> : null}
        </View>
        <Row style={{ gap: 10 }}>
          <Button variant="ghost" small style={{ flex: 1 }} label={photo ? t('reward.changePhoto') : t('reward.addPhoto')} onPress={addPhoto} />
          {photo ? <Button variant="ghost" small style={{ flex: 1 }} label={t('reward.removePhoto')} onPress={() => setPhoto('')} /> : null}
        </Row>
        <Button label={busy ? '…' : t('reward.share')} onPress={share} disabled={busy} />
        {S.example || posted ? null : (
          <Box>
            <Stack gap={12}>
              <Bold>{t('com.post')}</Bold>
              <Field value={text} onChangeText={setText} placeholder={t('com.postPh')} maxLength={500} multiline />
              <Chips>
                <Chip label={t('com.visFriends')} on={vis === 'friends'} onPress={() => setVis('friends')} />
                <Chip label={t('com.visPublic')} on={vis === 'public'} onPress={() => setVis('public')} />
              </Chips>
              <Button variant="ghost" label={t('com.post')} onPress={publish} disabled={busy} />
            </Stack>
          </Box>
        )}
      </Stack>
    </Sheet>
  );
}
