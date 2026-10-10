import { View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { MONTHS, parseDay } from '../lib/dates';
import { heatmap } from '../lib/stats';
import { F, useColors } from '../lib/theme';
import type { Session } from '../lib/types';

/** Mapa do ano: cada quadrado é um dia, mais escuro quanto mais minutos de leitura. */
export function Heatmap({ sessions, goal, weeks = 26 }: { sessions: Session[]; goal: number; weeks?: number }) {
  const c = useColors();
  const cols = heatmap(sessions, weeks);
  const cell = 11, gap = 3, top = 16, left = 22;
  const W = left + weeks * (cell + gap), H = top + 7 * (cell + gap);
  const level = (m: number) => (m <= 0 ? 0 : m < goal ? 1 : m < goal * 2 ? 2 : m < goal * 4 ? 3 : 4);
  const fills = [c.line, c.accent + '55', c.accent + '99', c.accent + 'CC', c.accent];
  let lastMonth = -1;
  return (
    <View style={{ overflow: 'hidden' }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {['seg', '', 'qua', '', 'sex', '', ''].map((d, i) =>
          d ? (
            <SvgText key={d} x={0} y={top + i * (cell + gap) + 9} fontSize={8} fill={c.muted} fontFamily={F.body}>
              {d}
            </SvgText>
          ) : null,
        )}
        {cols.map((col, w) => {
          const m = parseDay(col[0].key).getMonth();
          const label = m !== lastMonth ? MONTHS[m].slice(0, 3) : null;
          lastMonth = m;
          return [
            label && w < weeks - 1 ? (
              <SvgText key={`m${w}`} x={left + w * (cell + gap)} y={10} fontSize={8} fill={c.muted} fontFamily={F.body}>
                {label}
              </SvgText>
            ) : null,
            ...col.map((d, i) =>
              d.future ? null : (
                <Rect key={d.key} x={left + w * (cell + gap)} y={top + i * (cell + gap)} width={cell} height={cell} rx={2.5} fill={fills[level(d.min)]} />
              ),
            ),
          ];
        })}
      </Svg>
    </View>
  );
}
