import { router } from 'expo-router';
import type { Found } from './search';

/** Abre a ficha de um livro que você ainda não tem. */
export const openObra = (b: Pick<Found, 'gid' | 'title' | 'author' | 'cover' | 'pages' | 'isbn'> & { reason?: string }) =>
  router.push({
    pathname: '/obra',
    params: { gid: b.gid ?? '', title: b.title, author: b.author ?? '', cover: b.cover ?? '', pages: String(b.pages ?? ''), isbn: b.isbn ?? '', reason: b.reason ?? '' },
  });
