import { AiError, aiJson } from './ai';
import { userId } from './cloud';
import { getLang } from './i18n';
import type { VideoTemplate } from './logic/types';
import { supabase } from './supabase';
import { pickVideo, videoFrames } from './frames';

const str = (v: unknown, n: number) => String(v ?? '').slice(0, n);

// Keep only the fields we use, with sane lengths, whatever the server or database sends.
export function cleanTemplate(r: any, id: string): VideoTemplate | null {
  if (!r || typeof r !== 'object' || !r.name) return null;
  return {
    id, name: str(r.name, 60), summary: str(r.summary, 240), hook: str(r.hook, 240),
    cuts: Math.max(0, Math.min(99, Math.round(Number(r.cuts) || 0))), pace: str(r.pace, 12),
    shots: (Array.isArray(r.shots) ? r.shots : []).slice(0, 12).map((x: any) => ({ shot: str(x?.shot, 200), angle: str(x?.angle, 160), motion: str(x?.motion, 160), text: str(x?.text, 120) })),
    text: str(r.text, 200), mood: str(r.mood, 200), music: str(r.music, 120),
    why: (Array.isArray(r.why) ? r.why : []).slice(0, 5).map((x: unknown) => str(x, 160)),
  };
}

// Pick a video, read ~10 stills from it on the device and let the coach work out its recipe.
// Null when the person cancels. Throws AiError (also 'no_food' when the video shows no workout).
export async function templateFromVideo(onStep?: (step: 'frames' | 'analyse') => void): Promise<VideoTemplate | null> {
  const v = await pickVideo();
  if (!v) return null;
  onStep?.('frames');
  const frames = await videoFrames(v);
  if (frames.length < 3) throw new AiError('failed');
  onStep?.('analyse');
  const r = await aiJson<any>('template', { frames, seconds: v.seconds, lang: getLang() });
  const t = cleanTemplate(r, `own-${Date.now().toString(36)}`);
  if (!t) throw new AiError('no_food');
  return t;
}

// ODDO's shared library, filled by Onur. Empty when offline.
export async function libraryTemplates(): Promise<VideoTemplate[]> {
  if (!supabase || !(await userId())) return [];
  const { data, error } = await supabase.from('video_templates').select('id,name,template').order('created_at', { ascending: false }).limit(50);
  if (error || !data) return [];
  return data.map(row => cleanTemplate({ ...(row.template as object), name: row.name }, row.id)).filter((t): t is VideoTemplate => !!t);
}

export async function isAdmin(): Promise<boolean> {
  if (!supabase || !(await userId())) return false;
  const { data } = await supabase.rpc('is_admin');
  return data === true;
}

export async function addToLibrary(t: VideoTemplate): Promise<VideoTemplate | null> {
  if (!supabase) return null;
  const { id: _, name, ...template } = t;
  const { data, error } = await supabase.from('video_templates').insert({ name, template }).select('id').single();
  return error || !data ? null : { ...t, id: data.id };
}

export async function removeFromLibrary(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('video_templates').delete().eq('id', id);
  return !error;
}
