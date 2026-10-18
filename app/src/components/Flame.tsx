import Svg, { Path } from 'react-native-svg';

// Flame grows with the crew's heat (0–1).
export function Flame({ heat, size = 96 }: { heat: number; size?: number }) {
  const scale = 0.55 + 0.45 * Math.max(0, Math.min(1, heat));

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        transform={`translate(${50 - 50 * scale} ${100 - 100 * scale}) scale(${scale})`}
        d="M50 4 C58 24 82 36 82 62 C82 84 67 98 50 98 C33 98 18 84 18 62 C18 46 28 38 32 26 C36 38 42 42 44 44 C44 30 46 16 50 4 Z"
        fill={heat < 0.4 ? '#7a3b1a' : '#ff6a1a'}
      />
      <Path
        transform={`translate(${50 - 50 * scale} ${100 - 100 * scale}) scale(${scale})`}
        d="M50 36 C55 50 70 58 70 74 C70 88 61 96 50 96 C39 96 30 88 30 74 C30 64 37 58 40 50 C43 58 47 60 48 62 C48 54 48 44 50 36 Z"
        fill={heat < 0.4 ? '#a35a22' : '#ffb21a'}
      />
      <Path
        transform={`translate(${50 - 50 * scale} ${100 - 100 * scale}) scale(${scale})`}
        d="M50 62 C53 70 60 74 60 82 C60 90 55 95 50 95 C45 95 40 90 40 82 C40 76 44 72 46 68 C47 72 49 73 49 74 C49 70 49 66 50 62 Z"
        fill={heat < 0.4 ? '#c98a3a' : '#d4ff3a'}
      />
    </Svg>
  );
}
