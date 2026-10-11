import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { BookGrid } from '../../components/BookGrid';
import { Btn, Card, Row, Screen, Txt } from '../../components/ui';
import { norm, TOPICS, topicBooks, topicMore, uniqueByTitle, type Found } from '../../lib/search';
import { useStore } from '../../lib/store';
import { useColors } from '../../lib/theme';

export default function Genero() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const t = TOPICS.find((x) => x.id === id);
  const [items, setItems] = useState<Found[] | null>(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState<'idle' | 'loading' | 'end'>('idle');
  const owned = new Set(data.books.map((b) => norm(b.title.split(':')[0])));

  const load = (force = false) => {
    if (!t) return;
    setItems(null);
    setPage(1);
    setMore('idle');
    topicBooks(t, force).then(setItems).catch(() => setItems([]));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(), [id]);

  const shown = (items ?? []).filter((b) => !owned.has(norm(b.title.split(':')[0])));
  const loadMore = async () => {
    if (!t || !items) return;
    setMore('loading');
    const next = await topicMore(t, page).catch(() => []);
    const merged = uniqueByTitle([...items, ...next]);
    // nada novo nesta página nem na seguinte: acabou o que as fontes têm
    if (merged.length === items.length) {
      const again = page < 4 ? await topicMore(t, page + 1).catch(() => []) : [];
      const m2 = uniqueByTitle([...items, ...again]);
      setItems(m2);
      setPage(page + 2);
      setMore(m2.length === items.length ? 'end' : 'idle');
      return;
    }
    setItems(merged);
    setPage(page + 1);
    setMore('idle');
  };
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={26} color={c.ink} />
        </Pressable>
        {items?.length ? <Btn title="Atualizar" kind="link" onPress={() => load(true)} /> : null}
      </Row>
      <View style={{ gap: 2 }}>
        <Txt k="h1">{t ? `${t.emoji} ${t.label}` : 'Gênero'}</Txt>
        <Txt k="small">Só edições em português. Toque num livro para ver sinopse, série e preços.</Txt>
      </View>
      {!items ? (
        <Row style={{ gap: 8, justifyContent: 'center', paddingVertical: 30 }}>
          <ActivityIndicator color={c.accent} />
          <Txt k="small">Procurando livros…</Txt>
        </Row>
      ) : !shown.length ? (
        <Card style={{ backgroundColor: c.soft, borderColor: 'transparent' }}>
          <Txt>Não achei nada agora. Confira a internet e toque em Atualizar.</Txt>
        </Card>
      ) : (
        <>
          <BookGrid items={shown} />
          {more === 'end' ? (
            <Txt k="small" style={{ textAlign: 'center' }}>Por enquanto é tudo que achei deste tema.</Txt>
          ) : (
            <Btn title={more === 'loading' ? 'Procurando mais…' : 'Ver mais'} kind="ghost" onPress={loadMore} disabled={more === 'loading'} />
          )}
        </>
      )}
    </Screen>
  );
}
