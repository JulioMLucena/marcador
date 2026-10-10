import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, dayKey } from './dates';
import { daysAway, minutesByDay } from './stats';
import type { Data } from './types';

const CHANNEL = 'lembrete';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function askNotificationPermission() {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Agenda os lembretes dos próximos 10 dias no horário de leitura.
 * Se a meta de hoje já foi cumprida, o de hoje não sai. O texto usa o livro atual e o gancho.
 */
export async function syncReminder(data: Data) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const { settings, books, sessions } = data;
  if (!settings.notify) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Hora de ler',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
    });
  }
  const book = books.find((b) => b.id === settings.currentId) || books.find((b) => b.status === 'lendo');
  if (!book) return;
  const today = new Date();
  const doneToday = (minutesByDay(sessions)[dayKey(today)] || 0) >= settings.goal;
  const away = daysAway(sessions, today);
  for (let i = 0; i < 10; i++) {
    const d = addDays(today, i);
    d.setHours(settings.hour, settings.minute, 0, 0);
    if (d <= today || (i === 0 && doneToday)) continue;
    const gone = away + i;
    const body =
      gone >= 3
        ? `Faz ${gone} dias. Que tal só 1 minuto? ${book.title} está na página ${book.page || 1}.`
        : book.hook
          ? `${book.title}, página ${book.page || 1}. Gancho de hoje: ${book.hook}`
          : `${book.title} te espera na página ${book.page || 1}. ${settings.goal} minutos e pronto.`;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Hora de ler 📖', body, data: { open: '/ler' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d, channelId: CHANNEL },
    });
  }
}
