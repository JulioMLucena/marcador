import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import { hue } from '../lib/theme';

export interface WidgetData {
  title: string | null;
  /** Capa local (file://) do livro atual. */
  cover?: string;
  page: number;
  pages: number;
  streak: number;
  todayMin: number;
  goal: number;
  hook?: string;
}

type Hex = `#${string}`;

function hslHex(h: number, s: number, l: number): Hex {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return `#${[f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/** Altura do widget em dp; a capa ocupa quase toda a altura. */
export function ReadingWidget({ d, dark, height = 150 }: { d: WidgetData; dark: boolean; height?: number }) {
  const coverH = Math.max(96, Math.round(height - 20));
  const coverW = Math.round(coverH * (2 / 3));
  const bg: Hex = dark ? '#16201B' : '#FFFFFF';
  const ink: Hex = dark ? '#E4EAE5' : '#18231E';
  const muted: Hex = dark ? '#93A39A' : '#5B6A62';
  const track: Hex = dark ? '#26332C' : '#E3E9E4';
  const amber: Hex = dark ? '#E2A84A' : '#B9781A';
  const accent: Hex = dark ? '#73C3A3' : '#1F5C4A';
  if (!d.title) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ height: 'match_parent', width: 'match_parent', backgroundColor: bg, borderRadius: 20, padding: 16, justifyContent: 'center' }}
      >
        <TextWidget text="Marcador" style={{ fontSize: 16, color: ink, fontWeight: '700' }} />
        <TextWidget text="Toque para escolher o livro que você está lendo" style={{ fontSize: 13, color: muted }} />
      </FlexWidget>
    );
  }
  const h = hue(d.title);
  const pct = d.pages ? Math.max(1, Math.min(99, Math.round((d.page / d.pages) * 100))) : 1;
  const done = d.todayMin >= d.goal;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'marcador://ler' }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: bg, borderRadius: 20, flexDirection: 'row' }}
    >
      {d.cover ? (
        <FlexWidget style={{ height: 'match_parent', paddingLeft: 10, paddingVertical: 10, justifyContent: 'center' }}>
          <ImageWidget
            // o pacote aceita file:// no Android, só o tipo não declara
            image={d.cover as `https:${string}`}
            imageWidth={coverW}
            imageHeight={coverH}
            radius={8}
            resizeMode="cover"
          />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ width: 10, height: 'match_parent', backgroundColor: hslHex(h, 45 + (h % 4) * 7, 34 + (h % 3) * 6), borderTopLeftRadius: 20, borderBottomLeftRadius: 20 }} />
      )}
      <FlexWidget style={{ flex: 1, height: 'match_parent', padding: 14, justifyContent: 'space-between' }}>
        <FlexWidget style={{ width: 'match_parent' }}>
          <TextWidget text={d.title} maxLines={1} truncate="END" style={{ fontSize: 16, color: ink, fontWeight: '700' }} />
          <TextWidget
            text={d.hook ? d.hook : `Página ${d.page} de ${d.pages}`}
            maxLines={2}
            truncate="END"
            style={{ fontSize: 12, color: muted, marginTop: 2 }}
          />
        </FlexWidget>
        <FlexWidget style={{ width: 'match_parent', height: 8, flexDirection: 'row', borderRadius: 4, backgroundColor: track }}>
          <FlexWidget style={{ flex: pct, height: 8, backgroundColor: amber, borderRadius: 4 }} />
          <FlexWidget style={{ flex: 100 - pct, height: 8 }} />
        </FlexWidget>
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
          <TextWidget text={`🔥 ${d.streak} ${d.streak === 1 ? 'dia' : 'dias'}`} style={{ fontSize: 13, color: ink, fontWeight: '600' }} />
          <TextWidget
            text={done ? 'Meta de hoje ✓' : `Hoje ${Math.round(d.todayMin)}/${d.goal} min`}
            style={{ fontSize: 13, color: done ? accent : muted, fontWeight: '600' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
