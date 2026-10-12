import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { BookOpen } from '../components/BookOpen';
import { Cover } from '../components/Cover';
import { Btn, Card, Row, Txt } from '../components/ui';
import { fmtMinutes } from '../lib/dates';
import { queueOf, useStore } from '../lib/store';
import { useColors } from '../lib/theme';

/** Festa de livro terminado. */
export default function Terminado() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveBook, setSettings } = useStore();
  const b = data.books.find((x) => x.id === id);
  const pop = useRef(new Animated.Value(0)).current;
  // primeiro o livro se abre com "Leitura concluída!", depois vem o cartão com os números
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    if (!intro) Animated.spring(pop, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
  }, [intro, pop]);

  if (!b) return null;
  if (intro) return <BookOpen title={b.title} author={b.author} cover={b.cover} headline="Leitura concluída!" onDone={() => setIntro(false)} />;
  const ss = data.sessions.filter((s) => s.bookId === b.id);
  const mins = ss.reduce((a, s) => a + (s.minutes || 0), 0);
  const days = new Set(ss.map((s) => s.day)).size;
  const quotes = ss.filter((s) => s.note || s.photo).length;
  const next = queueOf(data)[0];

  return (
    <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', padding: 16 }}>
      <Card style={{ alignItems: 'center', paddingVertical: 26, gap: 14 }}>
        <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }, { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '-4deg'] }) }] }}>
          <Cover title={b.title} author={b.author} uri={b.cover} width={120} />
        </Animated.View>
        <Txt k="label">Livro terminado</Txt>
        <Txt k="h2" style={{ textAlign: 'center' }}>Você leu {b.title} inteiro</Txt>
        <Row style={{ alignSelf: 'stretch', justifyContent: 'space-around' }}>
          {[
            [String(b.pages), 'páginas'],
            [String(days), days === 1 ? 'dia' : 'dias'],
            [fmtMinutes(mins), 'de leitura'],
            [String(quotes), 'trechos'],
          ].map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <Txt k="h3" style={{ fontSize: 20, fontVariant: ['tabular-nums'] }}>{v}</Txt>
              <Txt k="small">{l}</Txt>
            </View>
          ))}
        </Row>
        {b.why ? (
          <Txt k="quote" style={{ color: c.muted, textAlign: 'center', fontSize: 15 }}>Você começou porque: {b.why}</Txt>
        ) : null}
        <Btn big icon="📸" style={{ alignSelf: 'stretch' }} title="Compartilhar nos stories" onPress={() => router.push({ pathname: '/compartilhar', params: { id: b.id } })} />
        <Btn
          kind="ghost"
          style={{ alignSelf: 'stretch' }}
          title={next ? `Começar ${next.title}` : 'Escolher o próximo'}
          onPress={() => {
            if (next) {
              saveBook({ ...next, status: 'lendo', startedAt: Date.now(), updatedAt: Date.now() });
              setSettings({ currentId: next.id });
              router.replace('/');
            } else router.replace('/scan');
          }}
        />
        <Btn title="Ver a estante" kind="link" onPress={() => router.replace('/estante')} />
      </Card>
    </View>
  );
}
