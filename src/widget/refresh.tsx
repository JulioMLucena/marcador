import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { dayKey } from '../lib/dates';
import { minutesByDay, streak } from '../lib/stats';
import type { Data } from '../lib/types';
import { ReadingWidget, type WidgetData } from './ReadingWidget';

export const WIDGET_NAME = 'Leitura';

const hash = (t: string) => {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

/** O widget só lê imagens locais com segurança: capas da internet são baixadas e reduzidas uma vez. */
async function widgetCover(uri?: string): Promise<string | undefined> {
  if (!uri || Platform.OS !== 'android') return undefined;
  try {
    if (uri.startsWith('file://')) return new File(uri).exists ? uri : undefined;
    if (!/^https?:/.test(uri)) return undefined;
    const d = new Directory(Paths.document, 'capas');
    d.create({ idempotent: true, intermediates: true });
    const dest = new File(d, `widget-${hash(uri)}.jpg`);
    if (dest.exists) return dest.uri;
    const tmp = await File.downloadFileAsync(uri, new File(Paths.cache, `capa-${hash(uri)}.jpg`), { idempotent: true });
    const ref = await ImageManipulator.manipulate(tmp.uri).resize({ width: 240 }).renderAsync();
    const out = await ref.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
    new File(out.uri).moveSync(dest);
    tmp.delete();
    return dest.uri;
  } catch {
    return undefined;
  }
}

export async function widgetData({ books, sessions, settings }: Data): Promise<WidgetData> {
  const b = books.find((x) => x.id === settings.currentId && x.status === 'lendo') || books.find((x) => x.status === 'lendo');
  return {
    title: b?.title ?? null,
    cover: await widgetCover(b?.cover),
    next: b
      ? undefined
      : await Promise.all(
          [...books.filter((x) => x.status === 'pausado'), ...books.filter((x) => x.status === 'fila')]
            .slice(0, 2)
            .map(async (x) => ({ title: x.title, cover: await widgetCover(x.cover) })),
        ),
    page: b?.page || 0,
    pages: b?.pages || 0,
    hook: b?.hook,
    streak: streak(sessions).n,
    todayMin: minutesByDay(sessions)[dayKey(new Date())] || 0,
    goal: settings.goal,
  };
}

export async function renderWidgetFor(data: Data, height?: number) {
  const d = await widgetData(data);
  return { light: <ReadingWidget d={d} dark={false} height={height} />, dark: <ReadingWidget d={d} dark height={height} /> };
}

export async function refreshWidget(data: Data) {
  if (Platform.OS !== 'android') return;
  await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: (info) => renderWidgetFor(data, info.height), widgetNotFound: () => {} });
}
