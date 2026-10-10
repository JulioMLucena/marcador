import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Btn, Card, Row, Screen, Txt } from '../../components/ui';
import { dropPhoto } from '../../lib/photos';
import { useStore } from '../../lib/store';
import { F, useColors } from '../../lib/theme';
import { MOODS } from '../../lib/types';

export default function Trechos() {
  const c = useColors();
  const { data, saveSession } = useStore();
  const [filter, setFilter] = useState('all');
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(null), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  const withQ = data.sessions.filter((s) => s.note || s.photo).sort((a, b) => b.start - a.start);
  const ids = [...new Set(withQ.map((s) => s.bookId))];
  const list = withQ.filter((s) => filter === 'all' || s.bookId === filter);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt k="h1">Trechos</Txt>
        <Txt k="muted">{withQ.length}</Txt>
      </Row>
      {ids.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {['all', ...ids].map((id) => {
            const on = filter === id;
            const label = id === 'all' ? 'Todos' : data.books.find((b) => b.id === id)?.title ?? 'Livro';
            return (
              <Pressable key={id} onPress={() => setFilter(id)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : c.surface }}>
                <Txt k="small" style={{ color: on ? c.accentInk : c.ink, fontFamily: F.medium }}>{label}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      {!list.length ? (
        <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
          <Txt k="muted" style={{ textAlign: 'center' }}>
            Cada leitura termina com um trecho: uma frase que marcou ou a foto da página. Eles se juntam aqui, e reler isso é o que dá vontade de voltar ao livro.
          </Txt>
        </Card>
      ) : null}
      {list.map((s) => {
        const b = data.books.find((x) => x.id === s.bookId);
        const d = new Date(s.start);
        return (
          <Card key={s.id}>
            {s.photo ? <Image source={{ uri: s.photo }} style={{ width: '100%', height: 220, borderRadius: 10 }} contentFit="cover" /> : null}
            {s.note ? <Txt k="quote" style={{ fontSize: 18, lineHeight: 27 }}>“{s.note}”</Txt> : null}
            <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <View style={{ flexShrink: 1 }}>
                <Txt k="small">
                  {b ? `${b.title} · ` : ''}p. {s.toPage} · {d.getDate()}/{d.getMonth() + 1} {s.mood ? MOODS[s.mood].emoji : ''}
                </Txt>
              </View>
              <Btn
                title={armed === s.id ? 'Toque de novo para apagar' : 'Apagar'}
                kind={armed === s.id ? 'danger' : 'ghost'}
                fg={armed === s.id ? undefined : c.muted}
                style={{ paddingVertical: 6, paddingHorizontal: 12 }}
                onPress={() => {
                  if (armed !== s.id) return setArmed(s.id);
                  setArmed(null);
                  dropPhoto(s.photo);
                  saveSession({ ...s, note: null, photo: null });
                }}
              />
            </Row>
          </Card>
        );
      })}
      {list.length ? <Txt k="small" style={{ textAlign: 'center' }}>Apagar um trecho mantém a leitura registrada, então sua sequência não muda.</Txt> : null}
    </Screen>
  );
}
