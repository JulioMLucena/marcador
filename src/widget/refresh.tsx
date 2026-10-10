import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { dayKey } from '../lib/dates';
import { minutesByDay, streak } from '../lib/stats';
import type { Data } from '../lib/types';
import { ReadingWidget, type WidgetData } from './ReadingWidget';

export const WIDGET_NAME = 'Leitura';

export function widgetData({ books, sessions, settings }: Data): WidgetData {
  const b = books.find((x) => x.id === settings.currentId && x.status === 'lendo') || books.find((x) => x.status === 'lendo');
  return {
    title: b?.title ?? null,
    page: b?.page || 0,
    pages: b?.pages || 0,
    hook: b?.hook,
    streak: streak(sessions).n,
    todayMin: minutesByDay(sessions)[dayKey(new Date())] || 0,
    goal: settings.goal,
  };
}

export function renderWidgetFor(data: Data) {
  const d = widgetData(data);
  return { light: <ReadingWidget d={d} dark={false} />, dark: <ReadingWidget d={d} dark /> };
}

export async function refreshWidget(data: Data) {
  if (Platform.OS !== 'android') return;
  await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => renderWidgetFor(data), widgetNotFound: () => {} });
}
