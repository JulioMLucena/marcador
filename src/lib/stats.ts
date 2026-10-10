import { addDays, dayKey, daysBetween, parseDay, weekKey } from './dates';
import type { Book, Data, Session } from './types';

export const minutesByDay = (sessions: Session[]) => {
  const m: Record<string, number> = {};
  for (const s of sessions) m[s.day] = (m[s.day] || 0) + (s.minutes || 0);
  return m;
};

/** Sequência de dias com uma folga permitida por semana (segunda a domingo). */
export function streak(sessions: Session[], today = new Date()) {
  const days = new Set(sessions.map((s) => s.day));
  if (!days.size) return { n: 0, graceUsed: false };
  const first = [...days].sort()[0];
  let d = new Date(today);
  if (!days.has(dayKey(d))) d = addDays(d, -1);
  const grace = new Set<string>();
  let n = 0;
  while (dayKey(d) >= first) {
    if (days.has(dayKey(d))) n++;
    else {
      const w = weekKey(d);
      if (grace.has(w)) break;
      grace.add(w);
    }
    d = addDays(d, -1);
  }
  return { n, graceUsed: grace.has(weekKey(today)) };
}

export function bestStreak(sessions: Session[]) {
  const days = [...new Set(sessions.map((s) => s.day))].sort();
  if (!days.length) return 0;
  let best = 0;
  // recalcula a sequência terminando em cada dia lido
  for (const k of days) best = Math.max(best, streak(sessions.filter((s) => s.day <= k), parseDay(k)).n);
  return best;
}

export function daysAway(sessions: Session[], today = new Date()) {
  if (!sessions.length) return 0;
  const last = sessions.map((s) => s.day).sort().pop()!;
  return daysBetween(parseDay(last), today);
}

export function moodAlert(b: Book | null | undefined, sessions: Session[]) {
  if (!b) return false;
  const ss = sessions.filter((s) => s.bookId === b.id).sort((a, c) => a.start - c.start);
  const last3 = ss.slice(-3);
  return last3.length === 3 && last3.every((s) => s.mood === 'ruim') && (b.moodAck || 0) < ss.length;
}

/** Ritmo do livro nos últimos 14 dias e previsão de término. */
export function forecast(b: Book, sessions: Session[], today = new Date()) {
  const from = dayKey(addDays(today, -13));
  const ss = sessions.filter((s) => s.bookId === b.id && s.day >= from);
  const pages = ss.reduce((a, s) => a + Math.max(0, (s.toPage || 0) - (s.fromPage || 0)), 0);
  const mins = ss.reduce((a, s) => a + (s.minutes || 0), 0);
  const left = Math.max(0, (b.pages || 0) - (b.page || 0));
  if (pages <= 0) return { perDay: 0, perMinute: 0, daysLeft: null as number | null, date: null as Date | null, left };
  const perDay = pages / 14;
  const daysLeft = Math.ceil(left / perDay);
  return { perDay, perMinute: mins ? pages / mins : 0, daysLeft, date: addDays(today, daysLeft), left };
}

/** Minutos por dia nas últimas `weeks` semanas, em colunas de segunda a domingo. */
export function heatmap(sessions: Session[], weeks = 26, today = new Date()) {
  const m = minutesByDay(sessions);
  const start = addDays(today, -((today.getDay() + 6) % 7) - (weeks - 1) * 7);
  const cols: { key: string; min: number; future: boolean }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, w * 7 + i);
      const k = dayKey(d);
      col.push({ key: k, min: m[k] || 0, future: d > today });
    }
    cols.push(col);
  }
  return cols;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  done: boolean;
  progress?: [number, number];
}

export function achievements({ books, sessions }: Data): Achievement[] {
  const finished = books.filter((b) => b.status === 'lido');
  const pagesRead = sessions.reduce((a, s) => a + Math.max(0, (s.toPage || 0) - (s.fromPage || 0)), 0);
  const quotes = sessions.filter((s) => s.note || s.photo).length;
  const best = bestStreak(sessions);
  const longest = Math.max(0, ...sessions.map((s) => s.minutes || 0));
  const early = sessions.some((s) => new Date(s.start).getHours() < 8);
  const late = sessions.some((s) => new Date(s.start).getHours() >= 23);
  const days = [...new Set(sessions.map((s) => s.day))].sort();
  let comeback = false;
  for (let i = 1; i < days.length; i++) if (daysBetween(parseDay(days[i - 1]), parseDay(days[i])) >= 7) comeback = true;
  const swapped = books.some((b) => b.status === 'pausado') && finished.length > 0;
  const t = (id: string, title: string, desc: string, icon: string, cur: number, goal: number): Achievement => ({
    id, title, desc, icon, done: cur >= goal, progress: [Math.min(cur, goal), goal],
  });
  return [
    t('primeira', 'Primeira página', 'Registre sua primeira leitura', '📖', sessions.length, 1),
    t('seq3', 'Pegando o ritmo', '3 dias seguidos', '🔥', best, 3),
    t('seq7', 'Uma semana inteira', '7 dias seguidos', '🔥', best, 7),
    t('seq30', 'Hábito formado', '30 dias seguidos', '🏆', best, 30),
    t('seq100', 'Leitor de ferro', '100 dias seguidos', '💎', best, 100),
    t('livro1', 'Fim!', 'Termine seu primeiro livro', '📕', finished.length, 1),
    t('livro5', 'Estante crescendo', 'Termine 5 livros', '📚', finished.length, 5),
    t('livro12', 'Um por mês', 'Termine 12 livros', '🗓️', finished.length, 12),
    t('pag1000', 'Mil páginas', 'Leia 1.000 páginas', '📄', pagesRead, 1000),
    t('pag5000', 'Cinco mil páginas', 'Leia 5.000 páginas', '🗂️', pagesRead, 5000),
    t('trechos10', 'Colecionador', 'Guarde 10 trechos', '✍️', quotes, 10),
    t('maratona', 'Maratona', 'Leia 60 minutos de uma vez', '⏱️', longest, 60),
    { id: 'cedo', title: 'Madrugador', desc: 'Leia antes das 8h', icon: '🌅', done: early },
    { id: 'coruja', title: 'Coruja', desc: 'Leia depois das 23h', icon: '🦉', done: late },
    { id: 'volta', title: 'Volta por cima', desc: 'Volte a ler depois de 7 dias parado', icon: '🌱', done: comeback },
    { id: 'troca', title: 'Sem culpa', desc: 'Pause um livro e termine outro', icon: '🔄', done: swapped },
  ];
}

export function monthRecap({ books, sessions }: Data, year: number, month: number) {
  const pre = `${year}-${String(month + 1).padStart(2, '0')}`;
  const ss = sessions.filter((s) => s.day.startsWith(pre));
  const minutes = ss.reduce((a, s) => a + (s.minutes || 0), 0);
  const pages = ss.reduce((a, s) => a + Math.max(0, (s.toPage || 0) - (s.fromPage || 0)), 0);
  const days = new Set(ss.map((s) => s.day)).size;
  const finished = books.filter((b) => b.finishedAt && dayKey(new Date(b.finishedAt)).startsWith(pre));
  const byBook: Record<string, number> = {};
  for (const s of ss) byBook[s.bookId] = (byBook[s.bookId] || 0) + (s.minutes || 0);
  const topId = Object.entries(byBook).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topBook = books.find((b) => b.id === topId) || null;
  const notes = ss.filter((s) => s.note).sort((a, b) => (b.note!.length < 160 ? 1 : 0) - (a.note!.length < 160 ? 1 : 0));
  const quote = notes.find((s) => s.mood === 'bom') || notes[0] || null;
  const dowMin = [0, 0, 0, 0, 0, 0, 0];
  for (const s of ss) dowMin[parseDay(s.day).getDay()] += s.minutes || 0;
  const bestDow = minutes ? dowMin.indexOf(Math.max(...dowMin)) : -1;
  const moods = { bom: 0, meh: 0, ruim: 0 };
  for (const s of ss) if (s.mood) moods[s.mood]++;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayMarks = [...Array(daysInMonth)].map((_, i) => ss.some((s) => s.day === `${pre}-${String(i + 1).padStart(2, '0')}`));
  return { minutes, pages, days, finished, topBook, quote, bestDow, moods, sessions: ss.length, dayMarks };
}

export function yearProgress({ books }: Data, year = new Date().getFullYear()) {
  return books.filter((b) => b.finishedAt && new Date(b.finishedAt).getFullYear() === year).length;
}
