import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen } from '../components/BookOpen';
import { streak } from '../lib/stats';
import { useStore } from '../lib/store';

/** Meta do dia cumprida: o livro se fecha com a fitinha marcando a página e volta pro Hoje. */
export default function Meta() {
  const { id, min } = useLocalSearchParams<{ id: string; min?: string }>();
  const { data } = useStore();
  const b = data.books.find((x) => x.id === id);

  if (!b) return null;
  const n = streak(data.sessions).n;
  const sub = [min ? `${min} min hoje` : null, n > 1 ? `${n} dias seguidos` : null].filter(Boolean).join(' · ');
  return (
    <BookOpen
      close
      title={b.title}
      author={b.author}
      cover={b.cover}
      headline="Meta do dia cumprida!"
      sub={sub || b.title}
      onDone={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
