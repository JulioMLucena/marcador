import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Format } from './types';

export interface Found {
  title: string;
  author?: string;
  pages?: number;
  cover?: string;
  isbn?: string;
  categories: string[];
}

const https = (u?: string) => u?.replace('http://', 'https://').replace('&edge=curl', '');
const norm = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Busca no Google Books. `q` segue a sintaxe deles (intitle:, inauthor:, subject:). */
export async function googleBooks(q: string, { pt = false, max = 20 } = {}): Promise<Found[]> {
  const r = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${max}&printType=books${pt ? '&langRestrict=pt' : ''}`,
  );
  if (!r.ok) return [];
  const j = await r.json();
  return (j.items || []).map((it: any) => {
    const v = it.volumeInfo || {};
    const ids = v.industryIdentifiers || [];
    const img: string | undefined = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail;
    return {
      title: [v.title, v.subtitle].filter(Boolean).join(': '),
      author: (v.authors || []).join(', ') || undefined,
      pages: v.pageCount || undefined,
      // fife pede uma versão maior da mesma imagem
      cover: img ? `${https(img)}&fife=w400-h600` : undefined,
      isbn: ids.find((x: any) => x.type === 'ISBN_13')?.identifier || ids.find((x: any) => x.type === 'ISBN_10')?.identifier,
      categories: v.categories || [],
    };
  });
}

export async function openLibrary(params: string, limit = 20): Promise<(Found & { key?: string })[]> {
  const r = await fetch(`https://openlibrary.org/search.json?${params}&limit=${limit}&fields=key,title,author_name,number_of_pages_median,cover_i,isbn,subject`);
  if (!r.ok) return [];
  const j = await r.json();
  return (j.docs || []).map((v: any) => ({
    key: v.key,
    title: v.title,
    author: (v.author_name || []).slice(0, 2).join(', ') || undefined,
    pages: v.number_of_pages_median || undefined,
    cover: v.cover_i ? `https://covers.openlibrary.org/b/id/${v.cover_i}-L.jpg` : undefined,
    isbn: (v.isbn || []).find((x: string) => x.length === 13),
    categories: (v.subject || []).slice(0, 5),
  }));
}

/** Sugestões enquanto o título é digitado: junta Google Books e Open Library, sem repetir. */
export async function findBooks(title: string): Promise<Found[]> {
  const t = title.trim();
  if (t.length < 3) return [];
  const [g, o] = await Promise.all([
    googleBooks(`intitle:${t}`, { max: 8 }).catch(() => []),
    openLibrary(`title=${encodeURIComponent(t)}`, 5).catch(() => []),
  ]);
  const seen = new Set<string>();
  return [...g, ...o]
    .filter((b) => {
      const k = norm(`${b.title} ${b.author ?? ''}`);
      if (!b.title || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    // quem tem capa e páginas vem primeiro: é a sugestão mais útil
    .sort((a, b) => Number(!!b.cover) + Number(!!b.pages) - (Number(!!a.cover) + Number(!!a.pages)))
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
      const r = await fetch(`https://openlibrary.org${k}/editions.json?limit=60`);
      if (!r.ok) return [];
      const j = await r.json();
      return (j.entries || [])
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
  /** Assunto no Open Library, se o Google não responder. */
  ol: string;
  /** Categorias do Google Books que contam como este tópico na sua estante. */
  match: RegExp;
}

export const TOPICS: Topic[] = [
  { id: 'ficcao', label: 'Ficção', emoji: '📖', q: 'subject:fiction', ol: 'fiction', match: /^fiction$|literary/i },
  { id: 'brasil', label: 'Literatura brasileira', emoji: '🇧🇷', q: 'subject:"Brazilian fiction"', ol: 'brazilian_fiction', match: /brazil/i },
  { id: 'fantasia', label: 'Fantasia', emoji: '🐉', q: 'subject:"fantasy fiction"', ol: 'fantasy', match: /fantasy/i },
  { id: 'scifi', label: 'Ficção científica', emoji: '🚀', q: 'subject:"science fiction"', ol: 'science_fiction', match: /science fiction/i },
  { id: 'terror', label: 'Terror', emoji: '🩸', q: 'subject:horror', ol: 'horror', match: /horror/i },
  { id: 'suspense', label: 'Suspense e mistério', emoji: '🔎', q: 'subject:thriller', ol: 'thriller', match: /thriller|mystery|suspense|detective/i },
  { id: 'romance', label: 'Romance', emoji: '💌', q: 'subject:romance', ol: 'romance', match: /romance|love stor/i },
  { id: 'classicos', label: 'Clássicos', emoji: '🏛️', q: 'subject:classics', ol: 'classic_literature', match: /classic/i },
  { id: 'manga', label: 'Mangá', emoji: '🗾', q: 'subject:manga', ol: 'manga', match: /manga/i },
  { id: 'hq', label: 'Quadrinhos', emoji: '💥', q: 'subject:"comics & graphic novels"', ol: 'comics', match: /comic|graphic novel/i },
  { id: 'historia', label: 'História', emoji: '🏺', q: 'subject:history', ol: 'history', match: /^history|world history/i },
  { id: 'biografia', label: 'Biografias', emoji: '👤', q: 'subject:biography', ol: 'biography', match: /biograph|memoir/i },
  { id: 'ciencia', label: 'Ciência', emoji: '🔬', q: 'subject:science', ol: 'science', match: /^science|psychology|nature/i },
  { id: 'autoajuda', label: 'Desenvolvimento pessoal', emoji: '🌱', q: 'subject:"self-help"', ol: 'self-help', match: /self-help|personal growth/i },
  { id: 'negocios', label: 'Negócios', emoji: '💼', q: 'subject:business', ol: 'business', match: /business|economics/i },
  { id: 'poesia', label: 'Poesia', emoji: '🪶', q: 'subject:poetry', ol: 'poetry', match: /poetry/i },
];

const DAY = 864e5;
const topicKey = (id: string) => `marcador.topic.v1.${id}`;

/** Livros de um tópico, em português quando houver. Guarda por um dia. */
export async function topicBooks(t: Topic, force = false): Promise<Found[]> {
  if (!force) {
    try {
      const raw = await AsyncStorage.getItem(topicKey(t.id));
      const c = raw ? JSON.parse(raw) : null;
      if (c && Date.now() - c.at < DAY && c.items?.length) return c.items;
    } catch {}
  }
  let items = (await googleBooks(t.q, { pt: true, max: 30 }).catch(() => [])).filter((b) => b.cover);
  if (items.length < 6) items = [...items, ...(await openLibrary(`subject=${t.ol}&language=por`, 30).catch(() => []))];
  if (items.length < 6) items = [...items, ...(await openLibrary(`subject=${t.ol}&sort=rating`, 30).catch(() => []))];
  const seen = new Set<string>();
  items = items.filter((b) => b.title && !seen.has(norm(b.title)) && seen.add(norm(b.title))).slice(0, 24);
  if (items.length) AsyncStorage.setItem(topicKey(t.id), JSON.stringify({ at: Date.now(), items })).catch(() => {});
  return items;
}

/** Link de busca para comprar o livro. */
export const buyUrl = (title: string, author?: string) =>
  `https://www.amazon.com.br/s?k=${encodeURIComponent([title.split(':')[0], author?.split(',')[0]].filter(Boolean).join(' '))}&i=stripbooks`;
