import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { syncReminder } from './notify';
import { refreshWidget } from '../widget/refresh';
import { DEFAULT_SETTINGS, type Book, type Data, type Session, type Settings } from './types';

export const DATA_KEY = 'marcador.data.v1';
const TIMER_KEY = 'marcador.timer.v1';

export interface Timer {
  bookId: string;
  start: number;
  pausedMs: number;
  pausedAt: number | null;
  target: number;
  fromPage: number;
  cheered?: boolean;
}

/** Sessão terminada esperando os detalhes (página, trecho, vontade). */
export interface Finish {
  bookId: string;
  start: number;
  minutes: number;
  fromPage: number;
}

export async function loadData(): Promise<Data> {
  try {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return { books: d.books || [], sessions: d.sessions || [], settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) } };
    }
  } catch {}
  return { books: [], sessions: [], settings: { ...DEFAULT_SETTINGS } };
}

/** Trecho em preparo: texto (digitado ou lido da foto) e foto da página. */
export interface Draft {
  note: string;
  photo: string | null;
}

interface Store {
  ready: boolean;
  data: Data;
  current: Book | null;
  timer: Timer | null;
  finish: Finish | null;
  draft: Draft;
  saveBook: (b: Book) => void;
  deleteBook: (id: string) => void;
  saveSession: (s: Session) => void;
  setSettings: (p: Partial<Settings>) => void;
  setTimer: (t: Timer | null) => void;
  setFinish: (f: Finish | null) => void;
  setDraft: (d: Draft) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Data>({ books: [], sessions: [], settings: { ...DEFAULT_SETTINGS } });
  const [timer, setTimerState] = useState<Timer | null>(null);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [draft, setDraft] = useState<Draft>({ note: '', photo: null });
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      setData(await loadData());
      try {
        const t = await AsyncStorage.getItem(TIMER_KEY);
        if (t) setTimerState(JSON.parse(t));
      } catch {}
      loaded.current = true;
      setReady(true);
    })();
  }, []);

  // grava e propaga para lembrete e widget sempre que os dados mudam
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(DATA_KEY, JSON.stringify(data)).catch(() => {});
    syncReminder(data).catch(() => {});
    refreshWidget(data).catch(() => {});
  }, [data]);

  const update = useCallback((fn: (d: Data) => Data) => setData((d) => fn(d)), []);

  const saveBook = useCallback(
    (b: Book) =>
      update((d) => {
        const books = d.books.some((x) => x.id === b.id) ? d.books.map((x) => (x.id === b.id ? b : x)) : [...d.books, b];
        const settings = { ...d.settings };
        const reading = books.filter((x) => x.status === 'lendo');
        if (!reading.some((x) => x.id === settings.currentId)) settings.currentId = reading[0]?.id ?? null;
        return { ...d, books, settings };
      }),
    [update],
  );
  const deleteBook = useCallback(
    (id: string) => update((d) => ({ ...d, books: d.books.filter((b) => b.id !== id), sessions: d.sessions.filter((s) => s.bookId !== id) })),
    [update],
  );
  const saveSession = useCallback(
    (s: Session) =>
      update((d) => ({
        ...d,
        sessions: d.sessions.some((x) => x.id === s.id) ? d.sessions.map((x) => (x.id === s.id ? s : x)) : [...d.sessions, s],
      })),
    [update],
  );
  const setSettings = useCallback((p: Partial<Settings>) => update((d) => ({ ...d, settings: { ...d.settings, ...p } })), [update]);
  const setTimer = useCallback((t: Timer | null) => {
    setTimerState(t);
    (t ? AsyncStorage.setItem(TIMER_KEY, JSON.stringify(t)) : AsyncStorage.removeItem(TIMER_KEY)).catch(() => {});
  }, []);

  const current = useMemo(() => {
    const r = data.books.filter((b) => b.status === 'lendo');
    return r.find((b) => b.id === data.settings.currentId) || r[0] || null;
  }, [data]);

  const value = useMemo(
    () => ({ ready, data, current, timer, finish, draft, saveBook, deleteBook, saveSession, setSettings, setTimer, setFinish, setDraft }),
    [ready, data, current, timer, finish, draft, saveBook, deleteBook, saveSession, setSettings, setTimer],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fora do StoreProvider');
  return s;
}

export const queueOf = (d: Data) => d.books.filter((b) => b.status === 'fila').sort((a, b) => a.createdAt - b.createdAt);
export const readingOf = (d: Data) => d.books.filter((b) => b.status === 'lendo');
export const pctOf = (b: Book) => (b.pages ? Math.min(100, Math.round(((b.page || 0) / b.pages) * 100)) : 0);
