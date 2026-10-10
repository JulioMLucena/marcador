import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from 'react-native';
import { Cover } from '../../components/Cover';
import { Btn, Card, Row, Screen, Txt, s } from '../../components/ui';
import { uid } from '../../lib/dates';
import { recommend } from '../../lib/recommend';
import { buyUrl, guessFormat, TOPICS, topicBooks, type Topic } from '../../lib/search';
import { useStore } from '../../lib/store';
import { F, useColors } from '../../lib/theme';

interface Item {
  title: string;
  author?: string;
  pages?: number;
  cover?: string;
  isbn?: string;
  categories?: string[];
  reason?: string;
}

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(':')[0].replace(/[^a-z0-9 ]/g, '').trim();
const FOR_YOU = 'voce';

/** Tópicos que aparecem nos livros da estante, pelos gêneros e formatos. */
function shelfTopics(books: { genres?: string[]; format?: string }[]) {
  const hit = new Set<string>();
  for (const b of books) {
    if (b.format === 'manga') hit.add('manga');
    if (b.format === 'quadrinho') hit.add('hq');
    for (const g of b.genres || []) for (const t of TOPICS) if (t.match.test(g)) hit.add(t.id);
  }
  return hit;
}

export default function Descobrir() {
  const c = useColors();
  const { data, saveBook } = useStore();
  const [topic, setTopic] = useState<string>(FOR_YOU);
  const [items, setItems] = useState<Item[] | null>(null);
  const [added, setAdded] = useState<Record<string, true>>({});
  const mine = useMemo(() => shelfTopics(data.books), [data.books]);
  const topics = [...TOPICS.filter((t) => mine.has(t.id)), ...TOPICS.filter((t) => !mine.has(t.id))];
  const owned = useMemo(() => new Set(data.books.map((b) => norm(b.title))), [data.books]);
  const hasShelf = data.books.length > 0;

  const load = (force = false) => {
    setItems(null);
    const t = TOPICS.find((x) => x.id === topic);
    const p: Promise<Item[]> = t ? topicBooks(t, force) : recommend(data, force, 'estante');
    p.then((r) => setItems(r.filter((x) => !owned.has(norm(x.title))))).catch(() => setItems([]));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(), [topic, hasShelf]);

  const queue = (r: Item) => {
    const now = Date.now();
    saveBook({
      id: uid(), title: r.title, author: r.author, pages: r.pages || 1, page: 0, cover: r.cover, isbn: r.isbn, status: 'fila',
      format: guessFormat({ title: r.title, categories: r.categories || [] }), genres: r.categories, createdAt: now, updatedAt: now,
    });
    setAdded((a) => ({ ...a, [r.title]: true }));
  };
  const open = (r: Item) =>
    router.push({
      pathname: '/editar',
      params: {
        title: r.title, author: r.author ?? '', pages: String(r.pages ?? ''), cover: r.cover ?? '', isbn: r.isbn ?? '', status: 'fila',
        format: guessFormat({ title: r.title, categories: r.categories || [] }), genres: (r.categories || []).join('|'),
      },
    });

  const chip = (id: string, label: string, mark?: boolean) => {
    const on = topic === id;
    return (
      <Pressable
        key={id}
        onPress={() => setTopic(id)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : c.surface }}
      >
        <Txt style={{ color: on ? c.accentInk : c.ink, fontFamily: F.medium, fontSize: 14 }}>{label}</Txt>
        {mark ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: on ? c.accentInk : c.amber }} /> : null}
      </Pressable>
    );
  };
  const current: Topic | undefined = TOPICS.find((x) => x.id === topic);

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <Txt k="h1">Descobrir</Txt>
        <Txt k="small">O que ler (e comprar) depois, por tópico ou pela sua estante.</Txt>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {chip(FOR_YOU, '✨ Para você')}
        {topics.map((t) => chip(t.id, `${t.emoji} ${t.label}`, mine.has(t.id)))}
      </ScrollView>
      {mine.size ? (
        <Row style={{ gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.amber }} />
          <Txt k="small">tópicos que já aparecem na sua estante</Txt>
        </Row>
      ) : null}

      <Row style={{ justifyContent: 'space-between' }}>
        <Txt k="h2">{current ? `${current.emoji} ${current.label}` : 'Para você'}</Txt>
        {items ? <Btn title="Atualizar" kind="link" onPress={() => load(true)} /> : null}
      </Row>
      {!current ? (
        <Txt k="small" style={{ marginTop: -10 }}>
          {hasShelf ? 'Puxado de todos os livros da sua estante: mesmos autores e mesmos temas.' : 'Adicione livros na estante e as sugestões aparecem aqui.'}
        </Txt>
      ) : null}

      {!items ? (
        <Row style={{ gap: 8, justifyContent: 'center', paddingVertical: 30 }}>
          <ActivityIndicator color={c.accent} />
          <Txt k="small">Procurando livros…</Txt>
        </Row>
      ) : !items.length ? (
        <Card style={{ backgroundColor: c.soft, borderColor: 'transparent' }}>
          <Txt>{hasShelf || current ? 'Não achei nada agora. Confira a internet e toque em Atualizar.' : 'Sua estante está vazia.'}</Txt>
        </Card>
      ) : (
        <Card style={{ gap: 0, paddingVertical: 6 }}>
          {items.map((r, i) => (
            <View key={r.title + i} style={{ flexDirection: 'row', gap: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Pressable onPress={() => open(r)}>
                <Cover title={r.title} author={r.author} uri={r.cover} width={70} />
              </Pressable>
              <View style={[s.grow, { gap: 3 }]}>
                <Pressable onPress={() => open(r)}>
                  <Txt lines={2} style={{ fontFamily: F.semi, fontSize: 15.5 }}>{r.title}</Txt>
                </Pressable>
                <Txt k="small" lines={1}>{[r.author, r.pages ? `${r.pages} pág` : null].filter(Boolean).join(' · ')}</Txt>
                {r.reason ? <Txt k="small" lines={2} style={{ fontSize: 12, color: c.amber }}>{r.reason}</Txt> : null}
                <Row style={{ gap: 8, marginTop: 6 }}>
                  {added[r.title] ? (
                    <Txt k="small" style={{ color: c.accent, fontFamily: F.semi, paddingVertical: 6 }}>Na fila ✓</Txt>
                  ) : (
                    <Btn title="+ Fila" kind="ghost" onPress={() => queue(r)} style={{ paddingVertical: 6, paddingHorizontal: 12 }} />
                  )}
                  <Btn title="Comprar" icon="🛒" kind="ghost" onPress={() => Linking.openURL(buyUrl(r.title, r.author))} style={{ paddingVertical: 6, paddingHorizontal: 12 }} />
                </Row>
              </View>
            </View>
          ))}
        </Card>
      )}
      {items?.length ? <Txt k="small" style={{ textAlign: 'center' }}>“Comprar” abre a busca do livro na Amazon.</Txt> : null}
    </Screen>
  );
}
