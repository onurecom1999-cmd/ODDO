import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

export type IconName = 'today' | 'move' | 'community' | 'me' | 'food' | 'train' | 'run' | 'video' | 'settings' | 'studio' | 'coach' | 'code' | 'bell' | 'globe' | 'star' | 'shield' | 'calendar' | 'flame' | 'list' | 'briefcase';

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
      {name === 'studio' ? <><Path d="M3 21h18M5 21V8l7-4 7 4v13" {...p} /><Path d="M9 21v-5h6v5M8.5 11h7" {...p} /></> : null}
      {name === 'coach' ? <><Rect x={5} y={4} width={14} height={17} rx={2.5} {...p} /><Path d="M9 4V3h6v1M8.5 10l2 2 4-4M8.5 16h7" {...p} /></> : null}
      {name === 'code' ? <><Path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2z" {...p} /><Path d="M8 12h8" {...p} /></> : null}
      {name === 'bell' ? <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" {...p} /> : null}
      {name === 'globe' ? <><Circle cx={12} cy={12} r={9} {...p} /><Path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" {...p} /></> : null}
      {name === 'star' ? <Path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" {...p} /> : null}
      {name === 'shield' ? <><Path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z" {...p} /><Path d="M9 12l2 2 4-4" {...p} /></> : null}
      {name === 'calendar' ? <><Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} {...p} /><Path d="M3.5 10h17M8 3v4M16 3v4" {...p} /></> : null}
      {name === 'flame' ? <Path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.4 3.6-8.3.4 1.9 1.5 3 2.7 3.6C12 7 13 4.6 14.5 3c.6 3.2 4 5.8 4 11.3 0 3.9-2.6 6.7-6.5 6.7z" {...p} /> : null}
      {name === 'list' ? <Path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" {...p} /> : null}
      {name === 'briefcase' ? <><Rect x={3} y={7} width={18} height={13} rx={2.5} {...p} /><Path d="M9 7V5h6v2M3 12.5h18" {...p} /></> : null}
      {name === 'settings' ? <><Circle cx={12} cy={12} r={3} {...p} /><Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" {...p} /></> : null}
    </Svg>
  );
}
