export interface BookInfo {
  title: string;
  author?: string;
  pages?: number;
  cover?: string;
  isbn: string;
}

const clean = (isbn: string) => isbn.replace(/[^0-9Xx]/g, '');

async function fromGoogle(isbn: string): Promise<BookInfo | null> {
  const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
  if (!r.ok) return null;
  const j = await r.json();
  const v = j.items?.[0]?.volumeInfo;
  if (!v) return null;
  const img: string | undefined = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail;
  return {
    isbn,
    title: [v.title, v.subtitle].filter(Boolean).join(': '),
    author: (v.authors || []).join(', ') || undefined,
    pages: v.pageCount || undefined,
    cover: img ? img.replace('http://', 'https://').replace('&edge=curl', '').replace('zoom=1', 'zoom=2') : undefined,
  };
}

async function fromOpenLibrary(isbn: string): Promise<BookInfo | null> {
  const r = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
  if (!r.ok) return null;
  const v = (await r.json())[`ISBN:${isbn}`];
  if (!v) return null;
  return {
    isbn,
    title: v.title,
    author: (v.authors || []).map((a: { name: string }) => a.name).join(', ') || undefined,
    pages: v.number_of_pages || undefined,
    cover: v.cover?.large || v.cover?.medium || undefined,
  };
}

/** Busca título, autor, páginas e capa pelo ISBN. Junta o que cada fonte souber. */
export async function lookupIsbn(raw: string): Promise<BookInfo | null> {
  const isbn = clean(raw);
  const [g, o] = await Promise.all([fromGoogle(isbn).catch(() => null), fromOpenLibrary(isbn).catch(() => null)]);
  if (!g && !o) return null;
  return {
    isbn,
    title: g?.title || o!.title,
    author: g?.author || o?.author,
    pages: g?.pages || o?.pages,
    cover: o?.cover || g?.cover || `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,
  };
}

export const looksLikeIsbn = (data: string) => /^(97[89])?\d{9}[\dXx]$/.test(clean(data));
