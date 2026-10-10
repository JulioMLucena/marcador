import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Book, Data } from './types';

export interface Rec {
  title: string;
  author?: string;
  pages?: number;
  cover?: string;
  isbn?: string;
  /** Livro da estante que puxou a sugestão. */
  because: string;
  /** Por que combina: mesmo autor ou mesmo tema. */
  reason: string;
}

export const RECS_KEY = 'marcador.recs.v1';
const DAY = 864e5;

const norm = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(':')[0].replace(/[^a-z0-9 ]/g, '').trim();
const firstAuthor = (a?: string) => a?.split(',')[0].trim();
const https = (u?: string) => u?.replace('http://', 'https://').replace('&edge=curl', '');

type Found = Omit<Rec, 'because' | 'reason'>;

async function google(q: string, pt = true): Promise<(Found & { categories: string[] })[]> {
  const r = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&printType=books${pt ? '&langRestrict=pt' : ''}`,
  );
  if (!r.ok) return [];
  const j = await r.json();
  return (j.items || []).map((it: any) => {
    const v = it.volumeInfo || {};
    const isbn = (v.industryIdentifiers || []).find((x: any) => x.type === 'ISBN_13')?.identifier;
    return {
      title: [v.title, v.subtitle].filter(Boolean).join(': '),
      author: (v.authors || []).join(', ') || undefined,
      pages: v.pageCount || undefined,
      cover: https(v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail),
      isbn,
      categories: v.categories || [],
    };
  });
}

async function openLibrary(params: string): Promise<(Found & { subjects: string[] })[]> {
  const r = await fetch(`https://openlibrary.org/search.json?${params}&limit=12&fields=title,author_name,number_of_pages_median,cover_i,isbn,subject`);
  if (!r.ok) return [];
  const j = await r.json();
  return (j.docs || []).map((v: any) => ({
    title: v.title,
    author: (v.author_name || []).slice(0, 2).join(', ') || undefined,
    pages: v.number_of_pages_median || undefined,
    cover: v.cover_i ? `https://covers.openlibrary.org/b/id/${v.cover_i}-M.jpg` : undefined,
    isbn: (v.isbn || []).find((x: string) => x.length === 13),
    subjects: v.subject || [],
  }));
}

// temas genéricos demais para servirem de pista
const VAGUE = /^(fiction|ficção|fiction in english|general|literature|literatura|nonfiction|accessible book|protected daisy|in library|large type books)$/i;

/** Tema principal do livro, pelo Google Books ou Open Library. */
async function themeOf(b: Book): Promise<string | undefined> {
  const known = b.genres?.find((x) => !VAGUE.test(x));
  if (known) return known.split('/')[0].trim();
  const a = firstAuthor(b.author);
  const g = await google(`intitle:"${b.title}"${a ? ` inauthor:"${a}"` : ''}`, false).catch(() => []);
  const cat = g.flatMap((x) => x.categories).find((x) => !VAGUE.test(x));
  if (cat) return cat.split('/')[0].trim();
  const o = await openLibrary(`title=${encodeURIComponent(b.title)}${a ? `&author=${encodeURIComponent(a)}` : ''}`).catch(() => []);
  return o.flatMap((x) => x.subjects).find((x) => !VAGUE.test(x) && x.length < 40);
}

async function sameAuthor(b: Book): Promise<Found[]> {
  const a = firstAuthor(b.author);
  if (!a) return [];
  const g = await google(`inauthor:"${a}"`, false).catch(() => []);
  return g.length ? g : openLibrary(`author=${encodeURIComponent(a)}`).catch(() => []);
}

async function sameTheme(theme: string): Promise<Found[]> {
  const g = await google(`subject:"${theme}"`).catch(() => []);
  return g.length ? g : openLibrary(`subject=${encodeURIComponent(theme.toLowerCase())}`).catch(() => []);
}

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
  const owned = new Set(d.books.map((b) => norm(b.title)));
  const seen = new Set<string>();
  const out: Rec[] = [];
  const add = (list: Found[], because: string, reason: string, max: number) => {
    let n = 0;
    for (const f of list) {
      const k = norm(f.title || '');
      if (!k || owned.has(k) || seen.has(k) || n >= max) continue;
      seen.add(k);
      out.push({ ...f, because, reason });
      n++;
    }
  };
  for (const b of seeds) {
    const [auth, theme] = await Promise.all([sameAuthor(b), themeOf(b).catch(() => undefined)]);
    add(auth, b.title, `Também de ${firstAuthor(b.author)}`, wide ? 1 : 2);
    if (theme) add(await sameTheme(theme), b.title, `Mesmo tema: ${theme.toLowerCase()}`, wide ? 2 : 3);
  }
  const items = out.slice(0, wide ? 18 : 10);
  if (items.length) AsyncStorage.setItem(wide ? RECS_KEY + '.estante' : RECS_KEY, JSON.stringify({ key, at: Date.now(), items })).catch(() => {});
  return items;
}
