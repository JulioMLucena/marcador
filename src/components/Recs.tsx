import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { uid } from '../lib/dates';
import { recommend, seedsOf, type Rec } from '../lib/recommend';
import { useStore } from '../lib/store';
import { F, useColors } from '../lib/theme';
import { Cover } from './Cover';
import { Btn, Row, Txt } from './ui';

/** Carrossel de próximas leituras puxadas do que está na mesa. */
export function Recs() {
  const c = useColors();
  const { data, saveBook } = useStore();
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

  const queue = (r: Rec) => {
    const now = Date.now();
    saveBook({ id: uid(), title: r.title, author: r.author, pages: r.pages || 1, page: 0, cover: r.cover, isbn: r.isbn, status: 'fila', createdAt: now, updatedAt: now });
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
                onPress={() =>
                  router.push({
                    pathname: '/editar',
                    params: { title: r.title, author: r.author ?? '', pages: String(r.pages ?? ''), cover: r.cover ?? '', isbn: r.isbn ?? '', status: 'fila' },
                  })
                }
              >
                <Cover title={r.title} author={r.author} uri={r.cover} width={108} />
              </Pressable>
              <Txt k="small" lines={2} style={{ color: c.ink, fontFamily: F.semi }}>{r.title}</Txt>
              <Txt k="small" lines={2} style={{ fontSize: 12 }}>{r.reason}</Txt>
              {added[r.title] ? (
                <Txt k="small" style={{ color: c.accent, fontFamily: F.semi }}>Na fila ✓</Txt>
              ) : (
                <Btn title="+ Fila" kind="ghost" onPress={() => queue(r)} style={{ paddingVertical: 6, paddingHorizontal: 10 }} />
              )}
            </View>
          ))}
        </ScrollView>
      )}
      {items?.length ? <Txt k="small">Por causa de {[...new Set(items.map((r) => r.because.split(':')[0]))].join(', ')}.</Txt> : null}
    </View>
  );
}
