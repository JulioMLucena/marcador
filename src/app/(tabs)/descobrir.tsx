import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Cover } from '../../components/Cover';
import { Btn, Card, Row, Screen, Txt } from '../../components/ui';
import { recommend, type Rec } from '../../lib/recommend';
import { openObra } from '../../lib/nav';
import { sized, TOPICS, topicBooks } from '../../lib/search';
import { useStore } from '../../lib/store';
import { F, useColors } from '../../lib/theme';

const CARD = 128;

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
  const { data } = useStore();
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const mine = useMemo(() => shelfTopics(data.books), [data.books]);
  const topics = [...TOPICS.filter((t) => mine.has(t.id)), ...TOPICS.filter((t) => !mine.has(t.id))];
  const hasShelf = data.books.length > 0;

  const load = (force = false) => {
    setRecs(null);
    recommend(data, force, 'estante').then(setRecs).catch(() => setRecs([]));
  };
  useEffect(() => {
    load();
    // deixa os seus gêneros prontos em segundo plano: abrir um deles fica instantâneo
    TOPICS.filter((t) => mine.has(t.id)).forEach((t) => topicBooks(t).catch(() => {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShelf]);

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <Txt k="h1">Descobrir</Txt>
        <Txt k="small">Livros com edição em português para ler (e comprar) depois.</Txt>
      </View>

      <Row style={{ justifyContent: 'space-between' }}>
        <Txt k="h2">✨ Para você</Txt>
        {recs?.length ? <Btn title="Atualizar" kind="link" onPress={() => load(true)} /> : null}
      </Row>
      {!hasShelf ? (
        <Card style={{ backgroundColor: c.soft, borderColor: 'transparent' }}>
          <Txt>Adicione livros na estante e as sugestões aparecem aqui.</Txt>
        </Card>
      ) : !recs ? (
        <Row style={{ gap: 8, justifyContent: 'center', paddingVertical: 24 }}>
          <ActivityIndicator color={c.accent} />
          <Txt k="small">Procurando pela sua estante…</Txt>
        </Row>
      ) : !recs.length ? (
        <Card style={{ backgroundColor: c.soft, borderColor: 'transparent' }}>
          <Txt>Não achei nada agora. Confira a internet e toque em Atualizar.</Txt>
          <Btn title="Atualizar" kind="link" onPress={() => load(true)} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : (
        <>
          <Txt k="small" style={{ marginTop: -10 }}>Mesmos autores e mesmos temas dos livros da sua estante.</Txt>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD + 14}
            decelerationRate="fast"
            style={{ marginHorizontal: -16 }}
            contentContainerStyle={{ gap: 14, paddingHorizontal: 16 }}
          >
            {recs.map((r) => (
              <Pressable key={r.title} onPress={() => openObra(r)} style={{ width: CARD, gap: 5 }} accessibilityRole="button" accessibilityLabel={r.title}>
                <Cover title={r.title} author={r.author} uri={sized(r.cover, 300)} width={CARD} />
                <Txt k="small" lines={2} style={{ color: c.ink, fontFamily: F.semi, fontSize: 13, lineHeight: 17 }}>{r.title}</Txt>
                <Txt k="small" lines={2} style={{ fontSize: 11.5, lineHeight: 15, color: c.amber }}>{r.reason}</Txt>
              </Pressable>
            ))}
          </ScrollView>
          <Txt k="small" style={{ textAlign: 'center', marginTop: -6 }}>{recs.length} sugestões · arraste para o lado</Txt>
        </>
      )}

      <Txt k="h2" style={{ marginTop: 6 }}>Gêneros</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {topics.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => router.push({ pathname: '/genero/[id]', params: { id: t.id } })}
            accessibilityRole="button"
            style={({ pressed }) => ({
              width: '48.4%', height: 68, borderRadius: 14, padding: 12, justifyContent: 'space-between', overflow: 'hidden',
              backgroundColor: t.color, opacity: pressed ? 0.85 : 1,
            })}
          >
            <Txt style={{ color: '#fff', fontFamily: F.semi, fontSize: 15 }} lines={1}>{t.label}</Txt>
            {mine.has(t.id) ? <Txt style={{ color: '#ffffffcc', fontSize: 11.5, fontFamily: F.medium }}>na sua estante</Txt> : null}
            <Txt style={{ position: 'absolute', right: -4, bottom: -8, fontSize: 40, transform: [{ rotate: '18deg' }] }}>{t.emoji}</Txt>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
