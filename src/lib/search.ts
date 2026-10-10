import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Format } from './types';

export interface Found {
  title: string;
  author?: string;
  pages?: number;
  cover?: string;
  isbn?: string;
  categories: string[];
  /** Id do volume no Google Books, para abrir a ficha completa. */
  gid?: string;
}

const https = (u?: string) => u?.replace('http://', 'https://').replace('&edge=curl', '');
export const norm = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** fetch com tempo máximo: uma fonte lenta não pode travar a tela. */
export async function getJSON(url: string, ms = 2500): Promise<any> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    return r.ok ? await r.json() : null;
  } finally {
    clearTimeout(t);
  }
}

/** Troca o tamanho pedido de uma capa do Google Books (as outras fontes ficam como estão). */
export const sized = (u: string | undefined, w: number) =>
  u && u.includes('fife=') ? u.replace(/fife=w\d+-h\d+/, `fife=w${w}-h${Math.round(w * 1.5)}`) : u;

const FIELDS = 'items(id,volumeInfo(title,subtitle,authors,pageCount,categories,imageLinks/thumbnail,language,industryIdentifiers))';

export function toFound(it: any): Found & { language?: string } {
  const v = it.volumeInfo || {};
  const ids = v.industryIdentifiers || [];
  const img: string | undefined = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail;
  return {
    gid: it.id,
    title: [v.title, v.subtitle].filter(Boolean).join(': '),
    author: (v.authors || []).join(', ') || undefined,
    pages: v.pageCount || undefined,
    // fife pede uma versão maior da mesma imagem
    cover: img ? `${https(img)}&fife=w400-h600` : undefined,
    isbn: ids.find((x: any) => x.type === 'ISBN_13')?.identifier || ids.find((x: any) => x.type === 'ISBN_10')?.identifier,
    categories: v.categories || [],
    language: v.language,
  };
}

/**
 * Busca no Google Books. `q` segue a sintaxe deles (intitle:, inauthor:, subject:).
 * Com `pt`, só volta edição em português: título, capa e sinopse já em pt.
 */
export async function googleBooks(q: string, { pt = false, max = 20, order }: { pt?: boolean; max?: number; order?: 'newest' } = {}): Promise<Found[]> {
  const j = await getJSON(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${max}&printType=books&country=BR&fields=${FIELDS}` +
      (pt ? '&langRestrict=pt' : '') + (order ? `&orderBy=${order}` : ''),
  );
  const all = (j?.items || []).map(toFound);
  return pt ? all.filter((b: { language?: string }) => !b.language || b.language.startsWith('pt')) : all;
}

export async function openLibrary(params: string, limit = 20): Promise<(Found & { key?: string })[]> {
  const j = await getJSON(`https://openlibrary.org/search.json?${params}&limit=${limit}&fields=key,title,author_name,number_of_pages_median,cover_i,isbn,subject`);
  return (j?.docs || []).map((v: any) => ({
    key: v.key,
    title: v.title,
    author: (v.author_name || []).slice(0, 2).join(', ') || undefined,
    pages: v.number_of_pages_median || undefined,
    cover: v.cover_i ? `https://covers.openlibrary.org/b/id/${v.cover_i}-L.jpg` : undefined,
    isbn: (v.isbn || []).find((x: string) => x.length === 13),
    categories: (v.subject || []).slice(0, 5),
  }));
}

/** Tira repetidos pelo título (edições diferentes do mesmo livro). */
export function uniqueByTitle<T extends { title: string }>(list: T[], skip = new Set<string>()) {
  const seen = new Set(skip);
  return list.filter((b) => {
    const k = norm(b.title.split(':')[0]);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Sugestões enquanto o título é digitado: português primeiro, depois qualquer edição. */
export async function findBooks(title: string): Promise<Found[]> {
  const t = title.trim();
  if (t.length < 3) return [];
  const [pt, any] = await Promise.all([
    googleBooks(`intitle:${t}`, { pt: true, max: 8 }).catch(() => []),
    googleBooks(`intitle:${t}`, { max: 8 }).catch(() => []),
  ]);
  let list = [...pt, ...any];
  if (!list.length) list = await openLibrary(`title=${encodeURIComponent(t)}`, 5).catch(() => []);
  const seen = new Set<string>();
  return list
    .filter((b) => {
      const k = norm(`${b.title} ${b.author ?? ''}`);
      if (!b.title || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 6);
}

/** Todas as capas que acharmos para o livro: edições do Google Books e do Open Library. */
export async function findCovers(title: string, author?: string, isbn?: string): Promise<string[]> {
  const a = author?.split(',')[0].trim();
  const key = norm(title).split(' ').slice(0, 4).join(' ');
  const [g, o] = await Promise.all([
    googleBooks(`intitle:"${title}"${a ? ` inauthor:"${a}"` : ''}`, { max: 30 }).catch(() => []),
    (async () => {
      const works = await openLibrary(`title=${encodeURIComponent(title)}${a ? `&author=${encodeURIComponent(a)}` : ''}`, 3);
      const k = works[0]?.key;
      if (!k) return [] as string[];
      const j = await getJSON(`https://openlibrary.org${k}/editions.json?limit=60`, 3000);
      return (j?.entries || [])
        .flatMap((e: any) => (e.covers || []).filter((c: number) => c > 0).slice(0, 1))
        .map((c: number) => `https://covers.openlibrary.org/b/id/${c}-L.jpg`);
    })().catch(() => [] as string[]),
  ]);
  const fromGoogle = g.filter((b) => b.cover && norm(b.title).startsWith(key)).map((b) => b.cover!);
  const fromIsbn = isbn ? [`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`] : [];
  return [...new Set([...fromGoogle, ...o, ...fromIsbn])].slice(0, 40);
}

/** Palpite de formato pelas categorias e pelo título. */
export function guessFormat(b: Pick<Found, 'title' | 'categories'>): Format {
  const t = `${b.title} ${b.categories.join(' ')}`.toLowerCase();
  if (/mang[aá]/.test(t)) return 'manga';
  if (/comic|graphic novel|quadrinho|hq\b/.test(t)) return 'quadrinho';
  return 'livro';
}

export interface Topic {
  id: string;
  label: string;
  emoji: string;
  /** Busca no Google Books. */
  q: string;
  /** Categorias do Google Books que contam como este tópico na sua estante. */
  match: RegExp;
}

export const TOPICS: Topic[] = [
  { id: 'ficcao', label: 'Ficção', emoji: '📖', q: 'subject:fiction', match: /^fiction$|literary/i },
  { id: 'brasil', label: 'Literatura brasileira', emoji: '🇧🇷', q: 'subject:"Brazilian fiction"', match: /brazil/i },
  { id: 'fantasia', label: 'Fantasia', emoji: '🐉', q: 'subject:fantasy', match: /fantasy/i },
  { id: 'scifi', label: 'Ficção científica', emoji: '🚀', q: 'subject:"science fiction"', match: /science fiction/i },
  { id: 'terror', label: 'Terror', emoji: '🩸', q: 'subject:horror', match: /horror/i },
  { id: 'suspense', label: 'Suspense', emoji: '🔎', q: 'subject:thriller', match: /thriller|mystery|suspense|detective/i },
  { id: 'romance', label: 'Romance', emoji: '💌', q: 'subject:romance', match: /romance|love stor/i },
  { id: 'classicos', label: 'Clássicos', emoji: '🏛️', q: 'subject:classics', match: /classic/i },
  { id: 'manga', label: 'Mangá', emoji: '🗾', q: 'subject:manga', match: /manga/i },
  { id: 'hq', label: 'Quadrinhos', emoji: '💥', q: 'subject:comics', match: /comic|graphic novel/i },
  { id: 'historia', label: 'História', emoji: '🏺', q: 'subject:history', match: /^history|world history/i },
  { id: 'biografia', label: 'Biografias', emoji: '👤', q: 'subject:biography', match: /biograph|memoir/i },
  { id: 'ciencia', label: 'Ciência', emoji: '🔬', q: 'subject:science', match: /^science|psychology|nature/i },
  { id: 'autoajuda', label: 'Desenvolvimento pessoal', emoji: '🌱', q: 'subject:"self-help"', match: /self-help|personal growth/i },
  { id: 'negocios', label: 'Negócios', emoji: '💼', q: 'subject:business', match: /business|economics/i },
  { id: 'poesia', label: 'Poesia', emoji: '🪶', q: 'subject:poetry', match: /poetry/i },
];

const DAY = 864e5;
const topicKey = (id: string) => `marcador.topic.v2.${id}`;

/** Livros de um tópico, só edições em português. Guarda por um dia. */
export async function topicBooks(t: Topic, force = false): Promise<Found[]> {
  if (!force) {
    try {
      const raw = await AsyncStorage.getItem(topicKey(t.id));
      const c = raw ? JSON.parse(raw) : null;
      if (c && Date.now() - c.at < DAY && c.items?.length) return c.items;
    } catch {}
  }
  // duas buscas ao mesmo tempo: as mais relevantes e as mais novas
  const [a, b] = await Promise.all([
    googleBooks(t.q, { pt: true, max: 40 }).catch(() => []),
    googleBooks(t.q, { pt: true, max: 40, order: 'newest' }).catch(() => []),
  ]);
  const items = uniqueByTitle([...a, ...b].filter((x) => x.cover)).slice(0, 30);
  if (items.length) AsyncStorage.setItem(topicKey(t.id), JSON.stringify({ at: Date.now(), items })).catch(() => {});
  return items;
}
