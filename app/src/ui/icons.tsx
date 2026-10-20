import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

export type IconName = 'today' | 'move' | 'community' | 'me' | 'food' | 'train' | 'run' | 'video' | 'settings';

// Simple line icons drawn in the app's own style, so no icon font is needed.
export function Icon({ name, size = 24, color = colors.text, width = 2 }: { name: IconName; size?: number; color?: string; width?: number }) {
  const p = { stroke: color, strokeWidth: width, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'today' ? <><Circle cx={12} cy={12} r={4} {...p} /><Path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...p} /></> : null}
      {name === 'move' ? <Path d="M2 12h4l3-8 4 16 3-8h6" {...p} /> : null}
      {name === 'community' ? <><Circle cx={9} cy={8} r={3.2} {...p} /><Path d="M2.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6" {...p} /><Circle cx={17} cy={9} r={2.6} {...p} /><Path d="M17.5 14.4c2.3.3 3.7 2 4 4.6" {...p} /></> : null}
      {name === 'me' ? <><Circle cx={12} cy={8} r={4} {...p} /><Path d="M4 21c.8-4.2 4-6.6 8-6.6s7.2 2.4 8 6.6" {...p} /></> : null}
      {name === 'food' ? <><Rect x={3} y={7} width={18} height={13} rx={3} {...p} /><Path d="M8.5 7l1.5-3h4l1.5 3" {...p} /><Circle cx={12} cy={13.5} r={3.5} {...p} /></> : null}
      {name === 'train' ? <Path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11" {...p} /> : null}
      {name === 'run' ? <><Circle cx={14.5} cy={4.5} r={2} {...p} /><Path d="M7 21l3.5-6 3 2.5V22M10.5 15l1.5-6.5 4 2.5 3 .5M12 8.5L8 9.5l-2 3" {...p} /></> : null}
      {name === 'video' ? <><Rect x={3} y={6} width={13} height={12} rx={2.5} {...p} /><Path d="M16 10.5l5-3v9l-5-3" {...p} /></> : null}
      {name === 'settings' ? <><Circle cx={12} cy={12} r={3} {...p} /><Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" {...p} /></> : null}
    </Svg>
  );
}
