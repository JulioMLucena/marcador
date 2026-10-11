export type BookStatus = 'lendo' | 'fila' | 'pausado' | 'lido';
export type Kind = 'denso' | 'leve';
export type Mood = 'bom' | 'meh' | 'ruim';
export type Format = 'livro' | 'manga' | 'quadrinho';

export interface Book {
  id: string;
  title: string;
  author?: string;
  pages: number;
  page: number;
  why?: string;
  status: BookStatus;
  kind?: Kind;
  kindManual?: boolean;
  /** Livro, mangá ou quadrinho; sem valor é livro. */
  format?: Format;
  /** Categorias que vieram da busca (Google Books), usadas nas recomendações. */
  genres?: string[];
  cover?: string;
  isbn?: string;
  hook?: string;
  moodAck?: number;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  finishedAt?: number;
}

export interface Session {
  id: string;
  bookId: string;
  start: number;
  day: string;
  minutes: number;
  fromPage: number;
  toPage: number;
  mood?: Mood | null;
  note?: string | null;
  photo?: string | null;
}

export interface Settings {
  goal: number;
  hour: number;
  minute: number;
  notify: boolean;
  sound: SoundId;
  currentId?: string | null;
  yearGoal: number;
  /** Avisar quando um livro da fila baixa de preço. */
  priceAlert: boolean;
  /** Lembretes fixos às 8h, 15h e 20h, além da hora de ler. */
  nudges: boolean;
}

export type SoundId = 'nenhum' | 'chuva' | 'ondas' | 'marrom';

export interface BookList {
  id: string;
  name: string;
  emoji?: string;
  bookIds: string[];
  /** Livros que você ainda não tem: ficam na lista para comprar depois. */
  wants?: Want[];
  createdAt: number;
}

export interface Want {
  title: string;
  author?: string;
  cover?: string;
  pages?: number;
  isbn?: string;
  gid?: string;
  olKey?: string;
  olEdition?: string;
  categories?: string[];
  addedAt: number;
}

export interface Data {
  books: Book[];
  sessions: Session[];
  settings: Settings;
  lists: BookList[];
}

export const DEFAULT_SETTINGS: Settings = {
  goal: 5,
  hour: 21,
  minute: 0,
  notify: true,
  sound: 'chuva',
  currentId: null,
  yearGoal: 12,
  priceAlert: true,
  nudges: true,
};

export const MOODS: Record<Mood, { emoji: string; label: string }> = {
  bom: { emoji: '🙂', label: 'Animado' },
  meh: { emoji: '😐', label: 'Normal' },
  ruim: { emoji: '🙁', label: 'Arrastado' },
};

export const DENSO = 300;
export const kindOf = (b: Pick<Book, 'kind' | 'kindManual' | 'pages'>): Kind =>
  b.kindManual && b.kind ? b.kind : (b.pages || 0) >= DENSO ? 'denso' : 'leve';

export const FORMATS: Record<Format, { label: string; emoji: string }> = {
  livro: { label: 'Livro', emoji: '📖' },
  manga: { label: 'Mangá', emoji: '🗾' },
  quadrinho: { label: 'Quadrinho', emoji: '💥' },
};
export const formatOf = (b: Pick<Book, 'format'>): Format => b.format ?? 'livro';
