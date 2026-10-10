import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { dayKey } from '../lib/dates';
import { DATA_KEY, loadData } from '../lib/store';
import type { Data } from '../lib/types';
import { renderWidgetFor } from './refresh';

/** Botões +5/+10 do widget: avança a página do livro atual e conta como leitura do dia. */
export function addPages(d: Data, n: number, now = new Date()): Data {
  const b = d.books.find((x) => x.id === d.settings.currentId && x.status === 'lendo') || d.books.find((x) => x.status === 'lendo');
  if (!b) return d;
  const from = b.page || 0;
  const to = Math.min(b.pages || from + n, from + n);
  if (to === from) return d;
  const day = dayKey(now);
  const id = `w-${day}-${b.id}`;
  const prev = d.sessions.find((s) => s.id === id);
  const session = prev ? { ...prev, toPage: to } : { id, bookId: b.id, start: now.getTime(), day, minutes: 0, fromPage: from, toPage: to };
  return {
    ...d,
    books: d.books.map((x) => (x.id === b.id ? { ...x, page: to, updatedAt: now.getTime() } : x)),
    sessions: prev ? d.sessions.map((s) => (s.id === id ? session : s)) : [...d.sessions, session],
  };
}

export async function widgetTaskHandler({ widgetAction, widgetInfo, renderWidget, clickAction, clickActionData }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return;
  let data = await loadData();
  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'ADD_PAGES') {
    data = addPages(data, Number(clickActionData?.n) || 5);
    await AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));
  }
  renderWidget(await renderWidgetFor(data, widgetInfo.height));
}
