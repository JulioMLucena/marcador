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
  if (!settings.notify && !settings.nudges) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Hora de ler',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
    });
  }
  const book = books.find((b) => b.id === settings.currentId) || books.find((b) => b.status === 'lendo');
  const today = new Date();
  const doneToday = (minutesByDay(sessions)[dayKey(today)] || 0) >= settings.goal;
  if (settings.nudges) await scheduleNudges(data, book, doneToday);
  if (!settings.notify || !book) return;
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

const SLOTS = [
  { hour: 8, title: 'Bom dia ☀️' },
  { hour: 15, title: 'Pausa da tarde ☕' },
  { hour: 20, title: 'Fim de dia 🌙' },
];

/**
 * Lembretes fixos às 8h, 15h e 20h dos próximos 7 dias, com frase diferente a cada vez.
 * Pula o horário que cai a menos de uma hora da hora de ler (para não avisar duas vezes)
 * e o das 20h de hoje se a meta já foi cumprida.
 */
async function scheduleNudges(data: Data, book: Data['books'][number] | undefined, doneToday: boolean) {
  const { settings, books, sessions } = data;
  const queue = books.filter((b) => b.status === 'fila').length;
  const quotes = sessions.filter((s) => s.note && (!book || s.bookId === book.id)).map((s) => s.note!);
  const now = new Date();
  const mine = settings.hour * 60 + settings.minute;
  for (let i = 0; i < 7; i++) {
    for (const [k, slot] of SLOTS.entries()) {
      if (settings.notify && Math.abs(slot.hour * 60 - mine) < 60) continue;
      const d = addDays(now, i);
      d.setHours(slot.hour, 0, 0, 0);
      if (d <= now || (i === 0 && k === 2 && doneToday)) continue;
      const body = nudgeText(k, i, book, queue, quotes);
      if (!body) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: slot.title, body, data: { open: book ? '/ler' : '/estante' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d, channelId: CHANNEL },
      });
    }
  }
}

/** Frase do lembrete: muda com o horário (k) e o dia (i) para não repetir. */
export function nudgeText(k: number, i: number, book: Data['books'][number] | undefined, queue: number, quotes: string[]) {
  if (!book) {
    if (!queue) return null;
    return [
      `Você tem ${queue} ${queue === 1 ? 'livro' : 'livros'} na fila. Que tal começar um hoje?`,
      'Hoje é um bom dia para abrir um livro novo da sua fila.',
      'Escolha o próximo livro e leia só a primeira página.',
    ][(k + i) % 3];
  }
  const left = Math.max(0, book.pages - (book.page || 0));
  const p = book.page || 1;
  const quote = quotes.length ? quotes[(i * 3 + k) % quotes.length] : null;
  const morning = [
    `Um capítulo com o café? ${book.title} está na página ${p}.`,
    quote ? `Lembra disso? “${quote.slice(0, 120)}” Continue ${book.title} hoje.` : `Comece o dia com 10 páginas de ${book.title}.`,
    `Faltam ${left} páginas para terminar ${book.title}.`,
  ];
  const afternoon = [
    `Cinco páginas cabem no intervalo. ${book.title} te espera na página ${p}.`,
    `Dá uma pausa na tela e lê um pouco de ${book.title}.`,
    left <= 60 ? `Só ${left} páginas para o fim de ${book.title}!` : `Que tal adiantar umas páginas de ${book.title} agora?`,
  ];
  const night = [
    `Troca 10 minutos de celular por ${book.title}.`,
    `Antes de dormir: página ${p} de ${book.title}.`,
    quote ? `“${quote.slice(0, 120)}” Bora continuar?` : `Fecha o dia com um capítulo de ${book.title}.`,
  ];
  return [morning, afternoon, night][k][i % 3];
}
