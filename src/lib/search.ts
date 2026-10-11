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
  /** Obra e edição no Open Library, quando a busca veio de lá. */
  olKey?: string;
  olEdition?: string;
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
    // NFC junta letra e acento num caractere só ("a" + "~" vira "ã"); separados, a fonte desenha um buraco
    return r.ok ? JSON.parse((await r.text()).normalize('NFC')) : null;
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
    title: [v.title, v.subtitle].filter(Boolean).join(': ').normalize('NFC'),
    author: (v.authors || []).join(', ') || undefined,
    pages: v.pageCount || undefined,
    // fife pede uma versão maior da mesma imagem
    cover: img ? `${https(img)}&fife=w400-h600` : undefined,
    isbn: ids.find((x: any) => x.type === 'ISBN_13')?.identifier || ids.find((x: any) => x.type === 'ISBN_10')?.identifier,
    categories: v.categories || [],
    language: v.language,
  };
}

/** Chave grátis do Google Books, opcional (vem do build). Sem ela, o Google divide uma cota com o mundo todo. */
const KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_KEY;
let googleOffUntil = 0;

/**
 * Chama o Google Books. Quando ele recusa (cota estourada) ou demora, devolve null e
 * passa 10 minutos sem tentar, para as próximas buscas irem direto ao Open Library.
 */
export async function google(path: string, ms = 2500): Promise<any> {
  if (Date.now() < googleOffUntil) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(`https://www.googleapis.com/books/v1/${path}${KEY ? `&key=${KEY}` : ''}`, { signal: ctl.signal });
    if (r.status === 429 || r.status === 403) googleOffUntil = Date.now() + 10 * 60e3;
    return r.ok ? JSON.parse((await r.text()).normalize('NFC')) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Busca livros. `q` segue a sintaxe do Google (intitle:, inauthor:, subject:).
 * Com `pt`, só volta obra com edição em português, já com o título e a capa dessa edição.
 * Se o Google não responder, a mesma busca vai para o Open Library.
 */
export async function googleBooks(q: string, { pt = false, max = 20, order }: { pt?: boolean; max?: number; order?: 'newest' } = {}): Promise<Found[]> {
  const j = await google(
    `volumes?q=${encodeURIComponent(q)}&maxResults=${max}&printType=books&country=BR&fields=${FIELDS}` +
      (pt ? '&langRestrict=pt' : '') + (order ? `&orderBy=${order}` : ''),
  );
  if (!j) return openLibraryQuery(q, { pt, max, order });
  const all = (j.items || []).map(toFound);
  return pt ? all.filter((b: { language?: string }) => !b.language || b.language.startsWith('pt')) : all;
}

const OL_FIELDS = 'key,title,author_name,number_of_pages_median,cover_i,isbn,subject,editions,editions.title,editions.cover_i,editions.isbn,editions.language,editions.number_of_pages,editions.key';

/** Traduz a busca do Google para o Open Library e pega a edição em português de cada obra. */
export async function openLibraryQuery(q: string, { pt = false, max = 20, order }: { pt?: boolean; max?: number; order?: 'newest' } = {}): Promise<Found[]> {
  const take = (k: string) => q.match(new RegExp(`${k}:(?:"([^"]+)"|(\\S+))`))?.slice(1).find(Boolean);
  const title = take('intitle'), author = take('inauthor'), subject = take('subject');
  const params = new URLSearchParams();
  if (title) params.set('title', title);
  if (author) params.set('author', author);
  if (subject) params.set('subject', subject.toLowerCase());
  if (!title && !author && !subject) params.set('q', q);
  if (pt) {
    params.set('q', [params.get('q'), 'language:por'].filter(Boolean).join(' '));
    params.set('lang', 'pt');
  }
  if (order === 'newest') params.set('sort', 'new');
  const j = await getJSON(`https://openlibrary.org/search.json?${params}&limit=${max}&fields=${OL_FIELDS}`, 3500).catch(() => null);
  return (j?.docs || []).map((v: any) => {
    // com lang=pt o Open Library põe a edição em português primeiro
    const e = v.editions?.docs?.[0];
    const ptEdition = pt && e?.language?.includes('por') ? e : undefined;
    const cover = ptEdition?.cover_i ?? v.cover_i;
    return {
      title: String(ptEdition?.title ?? v.title).normalize('NFC'),
      author: (v.author_name || []).slice(0, 2).join(', ') || undefined,
      pages: ptEdition?.number_of_pages ?? v.number_of_pages_median ?? undefined,
      cover: cover ? `https://covers.openlibrary.org/b/id/${cover}-L.jpg` : undefined,
      isbn: (ptEdition?.isbn ?? v.isbn ?? []).find((x: string) => x.length === 13),
      categories: (v.subject || []).slice(0, 15),
      olKey: v.key,
      olEdition: ptEdition?.key,
    };
  });
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
  color: string;
  /** Busca no Google Books. */
  q: string;
  /** Categorias do Google Books que contam como este tópico na sua estante. */
  match: RegExp;
  /** Para não ficção: o livro precisa ter uma categoria assim para entrar no tópico. */
  keep?: RegExp;
  /** E não pode ter nenhuma destas (romances que só citam história, por exemplo). */
  not?: RegExp;
}

// gêneros de ficção: livro com qualquer um deles não entra nos tópicos de não ficção
const FICTION = /fiction|novel|ficção|romance|juvenile|fantasy|children|literature|drama|ficcao/i;
// história também não leva livro religioso nem de estratégia/poder que só cita guerras antigas
const NOT_HISTORY = /fiction|novel|ficção|romance|juvenile|fantasy|children|literature|drama|bible|bíblia|religio|self-help|success|power \(|strategy|military art/i;

export const TOPICS: Topic[] = [
  { id: 'ficcao', color: '#3E4C8A', label: 'Ficção', emoji: '📖', q: 'subject:fiction', match: /^fiction$|literary/i },
  { id: 'brasil', color: '#2E7D4F', label: 'Literatura brasileira', emoji: '🇧🇷', q: 'subject:"Brazilian fiction"', match: /brazil/i },
  { id: 'fantasia', color: '#6A3FA0', label: 'Fantasia', emoji: '🐉', q: 'subject:fantasy', match: /fantasy/i },
  { id: 'scifi', color: '#1F5F8B', label: 'Ficção científica', emoji: '🚀', q: 'subject:"science fiction"', match: /science fiction/i },
  { id: 'terror', color: '#8E1B1B', label: 'Terror', emoji: '🩸', q: 'subject:horror', match: /horror/i },
  { id: 'suspense', color: '#37474F', label: 'Suspense', emoji: '🔎', q: 'subject:thriller', match: /thriller|mystery|suspense|detective/i },
  { id: 'romance', color: '#C2456B', label: 'Romance', emoji: '💌', q: 'subject:romance', match: /romance|love stor/i },
  { id: 'classicos', color: '#8A6D3B', label: 'Clássicos', emoji: '🏛️', q: 'subject:classics', match: /classic/i },
  { id: 'manga', color: '#D2453A', label: 'Mangá', emoji: '🗾', q: 'subject:manga', match: /manga/i },
  { id: 'hq', color: '#E0832B', label: 'Quadrinhos', emoji: '💥', q: 'subject:comics', match: /comic|graphic novel/i },
  { id: 'historia', color: '#7A4E2D', label: 'História', emoji: '🏺', q: 'subject:history', match: /^history|world history/i, keep: /^histor|histor(y|ia)\b|história/i, not: NOT_HISTORY },
  { id: 'biografia', color: '#4E6A75', label: 'Biografias', emoji: '👤', q: 'subject:biography', match: /biograph|memoir/i, keep: /biograph|memoir|autobiog|biografia/i, not: FICTION },
  { id: 'ciencia', color: '#13817A', label: 'Ciência', emoji: '🔬', q: 'subject:science', match: /^science|psychology|nature/i, not: FICTION },
  { id: 'autoajuda', color: '#5E8C31', label: 'Desenvolvimento pessoal', emoji: '🌱', q: 'subject:"self-help"', match: /self-help|personal growth/i, not: FICTION },
  { id: 'negocios', color: '#2F4858', label: 'Negócios', emoji: '💼', q: 'subject:business', match: /business|economics/i, not: FICTION },
  { id: 'poesia', color: '#9A4F8C', label: 'Poesia', emoji: '🪶', q: 'subject:poetry', match: /poetry/i, keep: /poetry|poesia|poems/i },
];

const DAY = 864e5;
const topicKey = (id: string) => `marcador.topic.v3.${id}`;

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
  const fits = (x: Found) => (!t.keep || x.categories.some((c) => t.keep!.test(c))) && !(t.not && x.categories.some((c) => t.not!.test(c)));
  const items = uniqueByTitle([...a, ...b].filter((x) => x.cover && fits(x))).slice(0, 30);
  if (items.length) AsyncStorage.setItem(topicKey(t.id), JSON.stringify({ at: Date.now(), items })).catch(() => {});
  return items;
}
