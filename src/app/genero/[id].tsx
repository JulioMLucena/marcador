import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { BookGrid } from '../../components/BookGrid';
import { Btn, Card, Row, Screen, Txt } from '../../components/ui';
import { norm, TOPICS, topicBooks, type Found } from '../../lib/search';
import { useStore } from '../../lib/store';
import { useColors } from '../../lib/theme';

export default function Genero() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const t = TOPICS.find((x) => x.id === id);
  const [items, setItems] = useState<Found[] | null>(null);
  const owned = new Set(data.books.map((b) => norm(b.title.split(':')[0])));

  const load = (force = false) => {
    if (!t) return;
    setItems(null);
    topicBooks(t, force).then(setItems).catch(() => setItems([]));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(), [id]);

  const shown = (items ?? []).filter((b) => !owned.has(norm(b.title.split(':')[0])));
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
        <BookGrid items={shown} />
      )}
    </Screen>
  );
}
