import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { loadData } from '../lib/store';
import { renderWidgetFor } from './refresh';

export async function widgetTaskHandler({ widgetAction, widgetInfo, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return;
  renderWidget(await renderWidgetFor(await loadData(), widgetInfo.height));
}
