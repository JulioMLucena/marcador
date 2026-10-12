import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { openObra } from '../lib/nav';
import { recommend, seedsOf, type Rec } from '../lib/recommend';
import { norm, sized } from '../lib/search';
import { useStore } from '../lib/store';
import { F, useColors } from '../lib/theme';
import { Cover } from './Cover';
import { Btn, Row, Txt } from './ui';

/** Carrossel de próximas leituras puxadas do que está na mesa. */
export function Recs() {
  const c = useColors();
  const { data, saveList } = useStore();
  const [items, setItems] = useState<Rec[] | null>(null);
  const [added, setAdded] = useState<Record<string, true>>({});
  const seedKey = seedsOf(data).map((b) => b.id).join('|');

  const load = (force = false) => {
    setItems(null);
    recommend(data, force).then(setItems).catch(() => setItems([]));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(), [seedKey]);

  if (!seedKey) return null;
  if (items && !items.length) return null;

  // sugestão é livro que você não tem: vai para "Quero comprar" (com aviso de preço), não para a estante
  const wantedIn = (r: Rec) =>
    added[r.title] ? 'comprar' : data.lists.find((l) => l.wants?.some((w) => norm(w.title.split(':')[0]) === norm(r.title.split(':')[0])))?.id;
  const want = (r: Rec) => {
    const list = data.lists.find((l) => l.id === 'comprar') ?? { id: 'comprar', name: 'Quero comprar', emoji: '🛒', bookIds: [], wants: [], createdAt: Date.now() };
    const w = { title: r.title, author: r.author, cover: r.cover, pages: r.pages, isbn: r.isbn, gid: r.gid, categories: r.categories, addedAt: Date.now() };
    saveList({ ...list, wants: [w, ...(list.wants ?? [])] });
    setAdded((a) => ({ ...a, [r.title]: true }));
  };

  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt k="label">Próximas leituras para você</Txt>
        {items ? <Btn title="Outras" kind="link" onPress={() => load(true)} /> : null}
      </Row>
      {!items ? (
        <Row style={{ gap: 8, paddingVertical: 20, justifyContent: 'center' }}>
          <ActivityIndicator color={c.accent} />
          <Txt k="small">Procurando livros parecidos…</Txt>
        </Row>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }} style={{ marginRight: -16 }}>
          {items.map((r) => (
            <View key={r.title} style={{ width: 108, gap: 6 }}>
              <Pressable
                onPress={() => openObra(r)}
              >
                <Cover title={r.title} author={r.author} uri={sized(r.cover, 300)} width={108} />
              </Pressable>
              <Txt k="small" lines={2} style={{ color: c.ink, fontFamily: F.semi }}>{r.title}</Txt>
              <Txt k="small" lines={2} style={{ fontSize: 12 }}>{r.reason}</Txt>
              {/* empurra o botão para o pé do cartão: fica na mesma linha em todos */}
              <View style={{ flex: 1 }} />
              {wantedIn(r) ? (
                <Btn title="Na lista ✓" kind="link" onPress={() => router.push({ pathname: '/lista/[id]', params: { id: wantedIn(r)! } })} style={{ paddingVertical: 6 }} />
              ) : (
                <Btn title="+ Desejo" kind="ghost" onPress={() => want(r)} style={{ paddingVertical: 6, paddingHorizontal: 10 }} />
              )}
            </View>
          ))}
        </ScrollView>
      )}
      {items?.length ? <Txt k="small">Por causa de {[...new Set(items.map((r) => r.because.split(':')[0]))].join(', ')}.</Txt> : null}
    </View>
  );
}
