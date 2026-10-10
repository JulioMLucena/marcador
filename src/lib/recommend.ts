import AsyncStorage from '@react-native-async-storage/async-storage';
import { googleBooks, norm, TOPICS, type Found } from './search';
import type { Book, Data } from './types';

export interface Rec {
  title: string;
  author?: string;
  pages?: number;
  cover?: string;
  isbn?: string;
  gid?: string;
  categories?: string[];
  /** Livro da estante que puxou a sugestão. */
  because: string;
  /** Por que combina: mesmo autor ou mesmo tema. */
  reason: string;
}

export const RECS_KEY = 'marcador.recs.v2';
const DAY = 864e5;

/** Nome do tema em português quando ele bate com um dos tópicos. */
const EXTRA: [RegExp, string][] = [
  [/juvenile|young adult/i, 'infantojuvenil'], [/philosoph/i, 'filosofia'], [/religio/i, 'religião'], [/psycholog/i, 'psicologia'],
  [/social science/i, 'ciências sociais'], [/political/i, 'política'], [/^art/i, 'arte'], [/cook/i, 'culinária'], [/travel/i, 'viagem'],
];
const themeLabel = (theme: string) =>
  (TOPICS.find((t) => t.match.test(theme))?.label ?? EXTRA.find(([r]) => r.test(theme))?.[1] ?? theme).toLowerCase();

const firstAuthor = (a?: string) => a?.split(',')[0].trim();

// temas genéricos demais para servirem de pista
const VAGUE = /^(fiction|ficção|fiction in english|general|literature|literatura|nonfiction|accessible book|protected daisy|in library|large type books)$/i;

/** Tema principal do livro: o gênero guardado ou, sem ele, a categoria no Google Books. */
async function themeOf(b: Book): Promise<string | undefined> {
  const known = b.genres?.map(specific).find(Boolean);
  if (known) return known;
  const a = firstAuthor(b.author);
  const g = await googleBooks(`intitle:"${b.title}"${a ? ` inauthor:"${a}"` : ''}`, { max: 5 }).catch(() => []);
  return g.flatMap((x) => x.categories).map(specific).find(Boolean);
}

/** "Fiction / Fantasy / Epic" vira "Fantasy": o segundo nível é o gênero, o terceiro já é nicho. */
function specific(cat: string) {
  const parts = cat.split('/').map((x) => x.trim()).filter((x) => x && !/^general$/i.test(x));
  const pick = parts[1] ?? parts[0];
  return pick && !VAGUE.test(pick) ? pick : undefined;
}

const sameAuthor = (b: Book) => {
  const a = firstAuthor(b.author);
  return a ? googleBooks(`inauthor:"${a}"`, { pt: true, max: 15 }).catch(() => []) : Promise.resolve([]);
};
const sameTheme = (theme: string) => googleBooks(`subject:"${theme}"`, { pt: true, max: 15 }).catch(() => []);

/** Livros que puxam as sugestões: os que estão sendo lidos e os dois últimos terminados. */
export function seedsOf(d: Data, scope: Scope = 'mesa') {
  const lendo = d.books.filter((b) => b.status === 'lendo');
  const lidos = d.books.filter((b) => b.status === 'lido').sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));
  if (scope === 'mesa') return [...lendo, ...lidos.slice(0, 2)].slice(0, 3);
  // a estante toda: o que leu, o que lê e o que está na fila, até 6 livros
  const fila = d.books.filter((b) => b.status === 'fila');
  return [...lidos.slice(0, 3), ...lendo, ...fila, ...lidos.slice(3)].slice(0, 6);
}

/** 'mesa' = o que está lendo agora; 'estante' = todos os livros. */
export type Scope = 'mesa' | 'estante';

/**
 * Próximas leituras a partir do que está na mesa: mais do mesmo autor e do mesmo tema.
 * Guarda o resultado por um dia para não refazer a busca a cada abertura.
 */
export async function recommend(d: Data, force = false, scope: Scope = 'mesa'): Promise<Rec[]> {
  const seeds = seedsOf(d, scope);
  if (!seeds.length) return [];
  const key = scope + ':' + seeds.map((b) => b.id).join('|');
  const wide = scope === 'estante';
  if (!force) {
    try {
      const raw = await AsyncStorage.getItem(wide ? RECS_KEY + '.estante' : RECS_KEY);
      const c = raw ? JSON.parse(raw) : null;
      if (c?.key === key && Date.now() - c.at < DAY && c.items?.length) return c.items;
    } catch {}
  }
  const owned = new Set(d.books.map((b) => norm(b.title.split(':')[0])));
  // tudo em paralelo: cada livro da estante busca autor e tema ao mesmo tempo
  const found = await Promise.all(
    seeds.map(async (b) => {
      const [auth, theme] = await Promise.all([sameAuthor(b), themeOf(b).catch(() => undefined)]);
      return { b, auth, theme, byTheme: theme ? await sameTheme(theme) : [] };
    }),
  );
  const seen = new Set<string>();
  const out: Rec[] = [];
  const add = (list: Found[], because: string, reason: string, max: number) => {
    let n = 0;
    for (const f of list) {
      const k = norm((f.title || '').split(':')[0]);
      if (!k || owned.has(k) || seen.has(k) || n >= max) continue;
      seen.add(k);
      out.push({ ...f, because, reason });
      n++;
    }
  };
  for (const { b, auth, theme, byTheme } of found) {
    add(auth, b.title, `Também de ${firstAuthor(b.author)}`, wide ? 1 : 2);
    if (theme) add(byTheme, b.title, `Mesmo tema: ${themeLabel(theme)}`, wide ? 2 : 3);
  }
  const items = out.slice(0, wide ? 18 : 10);
  if (items.length) AsyncStorage.setItem(wide ? RECS_KEY + '.estante' : RECS_KEY, JSON.stringify({ key, at: Date.now(), items })).catch(() => {});
  return items;
}
