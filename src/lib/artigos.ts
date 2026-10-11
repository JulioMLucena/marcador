import AsyncStorage from '@react-native-async-storage/async-storage';
import bundled from '../../conteudo/artigos.json';
import { getJSON } from './search';

export interface Artigo {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  date: string;
  minutes: number;
  emoji: string;
  color: string;
  /** Parágrafos; "## " no começo vira subtítulo. */
  body: string[];
}

// publicar artigo novo = editar conteudo/artigos.json no GitHub; o app busca a versão de lá
const URL = 'https://raw.githubusercontent.com/JulioMLucena/marcador/main/conteudo/artigos.json';
const KEY = 'marcador.artigos.v1';
const HOUR = 36e5;

const valid = (j: any): Artigo[] | null => (Array.isArray(j?.artigos) && j.artigos.length ? j.artigos : null);

/** Artigos da equipe: o do GitHub (guardado por 6 horas) ou, sem internet, os que vieram no app. */
export async function loadArtigos(force = false): Promise<Artigo[]> {
  let cached: { at: number; items: Artigo[] } | null = null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cached = raw ? JSON.parse(raw) : null;
  } catch {}
  if (!force && cached && Date.now() - cached.at < 6 * HOUR) return cached.items;
  const fresh = valid(await getJSON(URL, 5000).catch(() => null));
  if (fresh) {
    AsyncStorage.setItem(KEY, JSON.stringify({ at: Date.now(), items: fresh })).catch(() => {});
    return fresh;
  }
  return cached?.items ?? (bundled.artigos as Artigo[]);
}

/** Mesmo sem esperar a rede, para a tela abrir já com conteúdo. */
export const bundledArtigos = bundled.artigos as Artigo[];
