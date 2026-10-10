import { getJSON, google, googleBooks, norm, openLibraryQuery, toFound, type Found } from './search';

/** Ficha completa de um livro que você ainda não tem. Tudo de fontes abertas, sem IA. */
export interface Obra extends Found {
  description?: string;
  publisher?: string;
  year?: string;
  rating?: number;
  ratingsCount?: number;
  /** Preço do e-book na Google Play, quando à venda no Brasil. */
  ebook?: { price: number; url: string };
  previewUrl?: string;
}

const stripHtml = (h?: string) =>
  h?.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim();

function toObra(it: any): Obra {
  const v = it.volumeInfo || {};
  const s = it.saleInfo || {};
  const price = s.retailPrice?.currencyCode === 'BRL' ? s.retailPrice.amount : undefined;
  return {
    ...toFound(it),
    description: stripHtml(v.description),
    publisher: v.publisher,
    year: v.publishedDate?.slice(0, 4),
    rating: v.averageRating,
    ratingsCount: v.ratingsCount,
    ebook: price && s.buyLink ? { price, url: s.buyLink } : undefined,
    previewUrl: v.previewLink,
  };
}

/** Pelo id do Google Books ou, sem ele, a melhor edição em português pelo título. Sem Google, vai ao Open Library. */
export async function getObra(p: { gid?: string; title: string; author?: string; olKey?: string; olEdition?: string }): Promise<Obra | null> {
  if (p.gid) {
    const j = await google(`volumes/${p.gid}?country=BR`, 3000);
    if (j?.volumeInfo) return toObra(j);
  }
  const a = p.author?.split(',')[0].trim();
  const q = `intitle:"${p.title.split(':')[0]}"${a ? ` inauthor:"${a}"` : ''}`;
  const j = await google(`volumes?q=${encodeURIComponent(q)}&langRestrict=pt&country=BR&maxResults=5`, 3000);
  const it = (j?.items || []).find((x: any) => x.volumeInfo?.language?.startsWith('pt')) ?? j?.items?.[0];
  if (it) return toObra(it);
  return fromOpenLibrary(p, q);
}

const olText = (d: any) => (typeof d === 'string' ? d : d?.value)?.replace(/\r/g, '').replace(/\(\[source\]\[\d+\]\)|\[source\]\[\d+\]|-{3,}[\s\S]*$/g, '').trim();
// sinopse em inglês tem estas palavras curtas o tempo todo; em português, quase nunca
const looksEnglish = (t: string) => (t.match(/\b(the|and|of|his|her|with)\b/gi) || []).length > 4;

/** Ficha montada com o Open Library: obra, edição em português e a sinopse que tiver. */
async function fromOpenLibrary(p: { title: string; author?: string; olKey?: string; olEdition?: string }, q: string): Promise<Obra | null> {
  let { olKey, olEdition } = p;
  let base: Found | undefined;
  if (!olKey) {
    base = (await openLibraryQuery(q, { pt: true, max: 3 }))[0] ?? (await openLibraryQuery(q, { max: 3 }))[0];
    if (!base) return null;
    olKey = base.olKey;
    olEdition = base.olEdition;
  }
  const [work, ed] = await Promise.all([
    olKey ? getJSON(`https://openlibrary.org${olKey}.json`, 3000).catch(() => null) : null,
    olEdition ? getJSON(`https://openlibrary.org${olEdition}.json`, 3000).catch(() => null) : null,
  ]);
  const ptDesc = olText(ed?.description);
  const workDesc = olText(work?.description);
  const description = ptDesc || workDesc;
  return {
    title: ed?.title ?? base?.title ?? p.title,
    author: base?.author ?? p.author,
    pages: ed?.number_of_pages ?? base?.pages,
    cover: base?.cover,
    isbn: ed?.isbn_13?.[0] ?? base?.isbn,
    categories: base?.categories ?? (work?.subjects || []).slice(0, 5),
    olKey,
    olEdition,
    description: description && looksEnglish(description) ? `(Sinopse disponível só em inglês)\n\n${description}` : description,
    publisher: ed?.publishers?.[0],
    year: ed?.publish_date?.match(/\d{4}/)?.[0],
  };
}

export interface Extra {
  /** Resumo da Wikipédia em português. */
  wiki?: { text: string; url: string };
  /** Livros da mesma série, em ordem, com o nome em português. */
  series?: { name?: string; books: { title: string; order?: number; current: boolean }[] };
  /** Nota do Open Library (leitores do mundo todo). */
  olRating?: { avg: number; count: number };
}

const WD = 'https://www.wikidata.org/w/api.php?format=json&origin=*';
// obra literária, livro, romance, série de livros, mangá, quadrinho
const WORK = new Set(['Q7725634', 'Q47461344', 'Q571', 'Q8261', 'Q8274', 'Q1004', 'Q21198342', 'Q725377', 'Q277759']);

/** Wikidata: acha a obra, a série dela e a página na Wikipédia em português. */
async function wikidata(title: string, author?: string): Promise<Pick<Extra, 'wiki' | 'series'>> {
  const s = await getJSON(`${WD}&action=wbsearchentities&type=item&limit=7&language=pt&uselang=pt&search=${encodeURIComponent(title.split(':')[0])}`, 3000);
  const ids: string[] = (s?.search || []).map((x: any) => x.id);
  if (!ids.length) return {};
  const e = await getJSON(`${WD}&action=wbgetentities&props=claims|sitelinks|labels&languages=pt|en&ids=${ids.join('|')}`, 3000);
  const ents = ids.map((id) => e?.entities?.[id]).filter(Boolean);
  const claim = (x: any, p: string): string[] => (x.claims?.[p] || []).map((c: any) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
  const work = ents.find((x: any) => claim(x, 'P31').some((c) => WORK.has(c)) && (!author || claim(x, 'P50').length));
  if (!work) return {};
  const out: Pick<Extra, 'wiki' | 'series'> = {};

  const pt = work.sitelinks?.ptwiki?.title;
  const seriesId = claim(work, 'P179')[0];
  await Promise.all([
    pt &&
      getJSON(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pt.replace(/ /g, '_'))}`, 3000).then((w) => {
        if (w?.extract) out.wiki = { text: w.extract, url: w.content_urls?.mobile?.page ?? `https://pt.wikipedia.org/wiki/${encodeURIComponent(pt)}` };
      }).catch(() => {}),
    seriesId &&
      getJSON(
        `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(
          `SELECT ?item ?itemLabel ?ord ?serieLabel WHERE { ?item wdt:P179 wd:${seriesId}. OPTIONAL { ?item p:P179 [ps:P179 wd:${seriesId}; pq:P1545 ?ord] } wd:${seriesId} rdfs:label ?serieLabel. FILTER(LANG(?serieLabel) IN ("pt","pt-br","en")) SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt,en". } }`,
        )}`,
        3500,
      ).then((r) => {
        const rows = r?.results?.bindings || [];
        const books = new Map<string, { title: string; order?: number; current: boolean }>();
        for (const b of rows) {
          const id = b.item.value.split('/').pop();
          if (books.has(id) || /^Q\d+$/.test(b.itemLabel?.value ?? '')) continue;
          books.set(id, { title: b.itemLabel.value, order: b.ord ? parseFloat(b.ord.value) : undefined, current: id === work.id });
        }
        const list = [...books.values()].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        if (list.length > 1) out.series = { name: rows.find((b: any) => b.serieLabel?.['xml:lang'] !== 'en')?.serieLabel?.value ?? rows[0]?.serieLabel?.value, books: list };
      }).catch(() => {}),
  ]);
  return out;
}

async function openLibraryRating(isbn?: string, title?: string): Promise<Extra['olRating']> {
  const q = isbn ? `isbn=${isbn}` : `title=${encodeURIComponent(title ?? '')}`;
  const s = await getJSON(`https://openlibrary.org/search.json?${q}&limit=1&fields=ratings_average,ratings_count`, 2500);
  const d = s?.docs?.[0];
  return d?.ratings_count >= 3 ? { avg: d.ratings_average, count: d.ratings_count } : undefined;
}

/** Wikipédia, série e nota do Open Library, tudo em paralelo. */
export async function getExtra(o: Pick<Obra, 'title' | 'author' | 'isbn'>): Promise<Extra> {
  const [wd, olRating] = await Promise.all([
    wikidata(o.title, o.author).catch(() => ({})),
    openLibraryRating(o.isbn, o.title).catch(() => undefined),
  ]);
  return { ...wd, olRating };
}

/** Outros livros do mesmo autor em português, sem repetir este. */
export async function moreByAuthor(o: Pick<Obra, 'title' | 'author'>): Promise<Found[]> {
  const a = o.author?.split(',')[0].trim();
  if (!a) return [];
  const me = norm(o.title.split(':')[0]);
  const list = await googleBooks(`inauthor:"${a}"`, { pt: true, max: 20 }).catch(() => []);
  const seen = new Set([me]);
  return list.filter((b) => {
    const k = norm(b.title.split(':')[0]);
    if (!b.cover || seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 9);
}

export interface Offer {
  store: string;
  /** Preço em reais quando a loja tem uma busca aberta; sem preço, o botão abre a busca na loja. */
  price?: number;
  note?: string;
  url: string;
}

const q = (o: Pick<Obra, 'title' | 'author'>) => [o.title.split(':')[0], o.author?.split(',')[0]].filter(Boolean).join(' ');

/** Lojas grandes e conhecidas. Só elas: nada de site desconhecido. */
export function storeLinks(o: Pick<Obra, 'title' | 'author' | 'isbn'>): Offer[] {
  const k = encodeURIComponent(q(o));
  return [
    { store: 'Amazon', url: `https://www.amazon.com.br/s?k=${k}&i=stripbooks` },
    { store: 'Mercado Livre', url: `https://lista.mercadolivre.com.br/${k}` },
    { store: 'Magalu', url: `https://www.magazineluiza.com.br/busca/${k}/` },
    { store: 'Estante Virtual', note: 'usados', url: `https://www.estantevirtual.com.br/busca?q=${k}` },
  ];
}

/**
 * Preços que dá para buscar sem chave: Mercado Livre (só livros novos e lojas oficiais ou
 * vendedores bem avaliados) e o e-book na Google Play. Se a loja não responder, fica o link.
 */
export async function getOffers(o: Obra): Promise<Offer[]> {
  const links = storeLinks(o);
  const ml = await getJSON(
    `https://api.mercadolibre.com/sites/MLB/search?category=MLB1196&condition=new&limit=20&q=${encodeURIComponent(q(o))}`,
    2500,
  ).catch(() => null);
  const words = norm(o.title.split(':')[0]).split(' ').filter((w) => w.length > 2);
  const good = (ml?.results || [])
    .filter((r: any) => {
      const t = norm(r.title);
      const trusted = r.official_store_id || ['platinum', 'gold'].includes(r.seller?.seller_reputation?.power_seller_status);
      return trusted && words.every((w) => t.includes(w));
    })
    .sort((a: any, b: any) => a.price - b.price);
  const offers = links.map((l) => (l.store === 'Mercado Livre' && good[0] ? { ...l, price: good[0].price, url: good[0].permalink, note: good[0].official_store_id ? 'loja oficial' : 'vendedor bem avaliado' } : l));
  if (o.ebook) offers.push({ store: 'Google Play Livros', price: o.ebook.price, note: 'e-book', url: o.ebook.url });
  // com preço primeiro, do mais barato ao mais caro
  return offers.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
}

/** Onde ler o que a crítica e os leitores acharam (abre no navegador). */
export function reviewLinks(o: Pick<Obra, 'title' | 'author'>) {
  const k = encodeURIComponent(q(o));
  return [
    { label: 'Resenhas de leitores no Skoob', url: `https://www.skoob.com.br/livro/lista/busca:${k}` },
    { label: 'Críticas na imprensa', url: `https://news.google.com/search?q=${encodeURIComponent(`"${o.title.split(':')[0]}" resenha OR crítica`)}&hl=pt-BR&gl=BR&ceid=BR:pt-419` },
  ];
}

export const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;
