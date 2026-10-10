import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { getObra, getOffers, type Offer } from './obra';
import { norm } from './search';
import { loadData } from './store';
import type { Book } from './types';

/** Menor preço visto por livro, fora dos dados principais para o app e a tarefa não se atropelarem. */
const KEY = 'marcador.prices.v1';
export const PRICE_TASK = 'marcador-precos';
const CHANNEL = 'precos';
/** Só avisa quando cai pelo menos isso; centavos de diferença não valem notificação. */
const MIN_DROP = 0.05;

export interface PriceSeen {
  /** Menor preço já visto, com a loja e o link. */
  low: number;
  store: string;
  url: string;
  lowAt: number;
  /** Última consulta. */
  last: number;
  lastAt: number;
}

const idOf = (b: Pick<Book, 'title' | 'author'>) => norm(`${b.title.split(':')[0]} ${b.author?.split(',')[0] ?? ''}`);

export async function loadPrices(): Promise<Record<string, PriceSeen>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) || '{}');
  } catch {
    return {};
  }
}

export async function priceOf(b: Pick<Book, 'title' | 'author'>) {
  return (await loadPrices())[idOf(b)];
}

/** Guarda a oferta mais barata e diz se ela ficou abaixo do menor preço anterior. */
export async function recordOffers(b: Pick<Book, 'title' | 'author'>, offers: Offer[]) {
  const best = offers.filter((o) => o.price).sort((x, y) => x.price! - y.price!)[0];
  if (!best) return null;
  const all = await loadPrices();
  const k = idOf(b);
  const prev = all[k];
  const now = Date.now();
  const dropped = !!prev && best.price! <= prev.low * (1 - MIN_DROP);
  all[k] =
    !prev || best.price! < prev.low
      ? { low: best.price!, store: best.store, url: best.url, lowAt: now, last: best.price!, lastAt: now }
      : { ...prev, last: best.price!, lastAt: now };
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return { best, prev, dropped };
}

/** Consulta os livros da fila e avisa quando algum baixa de preço. */
export async function checkQueuePrices() {
  const data = await loadData();
  if (!data.settings.priceAlert) return 0;
  const queue = data.books.filter((b) => b.status === 'fila').slice(0, 12);
  let n = 0;
  for (const b of queue) {
    const o = await getObra({ title: b.title, author: b.author }).catch(() => null);
    if (!o) continue;
    const r = await recordOffers(b, await getOffers(o).catch(() => [])).catch(() => null);
    if (!r?.dropped || !r.prev) continue;
    n++;
    await notifyDrop(b, r.best, r.prev.low);
  }
  return n;
}

async function notifyDrop(b: Book, best: Offer, before: number) {
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Preço baixou', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
  const qs = new URLSearchParams({ title: b.title, author: b.author ?? '', cover: b.cover ?? '' }).toString();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `📉 ${b.title} baixou de preço`,
      body: `${fmt(best.price!)} ${best.store === 'Google Play Livros' ? 'no e-book da Google Play' : `no ${best.store}`}. Antes o menor era ${fmt(before)}.`,
      data: { open: `/obra?${qs}` },
    },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
  });
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask(PRICE_TASK, async () => {
    try {
      await checkQueuePrices();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Liga ou desliga a checagem em segundo plano (umas duas vezes por dia; o Android decide a hora exata). */
export async function syncPriceTask(on: boolean) {
  if (Platform.OS === 'web') return;
  const has = await TaskManager.isTaskRegisteredAsync(PRICE_TASK);
  if (on && !has) await BackgroundTask.registerTaskAsync(PRICE_TASK, { minimumInterval: 12 * 60 });
  if (!on && has) await BackgroundTask.unregisterTaskAsync(PRICE_TASK);
}
