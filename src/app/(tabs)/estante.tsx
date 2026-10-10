import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Cover } from '../../components/Cover';
import { Shelf } from '../../components/Shelf';
import { Btn, Card, Row, Screen, Seg, Txt, s } from '../../components/ui';
import { FORMATS, formatOf, type Book, type Format } from '../../lib/types';
import { queueOf, readingOf, useStore } from '../../lib/store';
import { useColors } from '../../lib/theme';

export default function Estante() {
  const c = useColors();
  const { data } = useStore();
  const [only, setOnly] = useState<Format | 'todos'>('todos');
  const formats = (['livro', 'manga', 'quadrinho'] as Format[]).filter((f) => data.books.some((b) => formatOf(b) === f));
  const shown = only === 'todos' ? data.books : data.books.filter((b) => formatOf(b) === only);
  const lidos = data.books.filter((b) => b.status === 'lido');
  const pages = lidos.reduce((a, b) => a + (b.pages || 0), 0);
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt k="h1">Estante</Txt>
        <Row style={{ gap: 6 }}>
          <Btn title="Escanear" icon="📷" onPress={() => router.push('/scan')} />
        </Row>
      </Row>
      <Txt k="small">
        {readingOf(data).length} lendo · {queueOf(data).length} na fila · {lidos.length} {lidos.length === 1 ? 'lido' : 'lidos'}
        {pages ? ` (${pages.toLocaleString('pt-BR')} páginas)` : ''}
      </Txt>
      {formats.length > 1 ? (
        <Seg
          value={only}
          options={[{ v: 'todos' as const, label: 'Todos' }, ...formats.map((f) => ({ v: f, label: `${FORMATS[f].emoji} ${f === 'livro' ? 'Livros' : f === 'manga' ? 'Mangás' : 'Quadrinhos'}` }))]}
          onChange={setOnly}
        />
      ) : null}
      <Shelf books={shown} onOpen={(b) => router.push({ pathname: '/livro/[id]', params: { id: b.id } })} />
      {data.books.length ? (
        <Row style={{ flexWrap: 'wrap', gap: 14 }}>
          <Legend color="#e0503a" w={7} h={14} label="de frente: lendo agora" />
          <Legend color={c.muted} w={18} h={7} label="deitado: na fila" />
          <Legend color={c.line} w={7} h={14} label="apagado: pausado" />
        </Row>
      ) : (
        <Card>
          <Txt k="muted">Sua estante está vazia. Escaneie o livro que está lendo e um ou dois para a fila, assim nunca falta o próximo.</Txt>
        </Card>
      )}
      <Btn title="Adicionar sem código de barras" kind="link" onPress={() => router.push('/editar')} />

      <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <Txt k="h2">Minhas listas</Txt>
        <Btn title="+ Nova lista" kind="link" onPress={() => router.push({ pathname: '/lista/[id]', params: { id: 'nova' } })} />
      </Row>
      {data.lists.length ? (
        <View style={{ gap: 10 }}>
          {data.lists.map((l) => {
            const books = l.bookIds.map((id) => data.books.find((b) => b.id === id)).filter(Boolean) as Book[];
            const read = books.filter((b) => b.status === 'lido').length;
            return (
              <Pressable key={l.id} onPress={() => router.push({ pathname: '/lista/[id]', params: { id: l.id } })}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flexDirection: 'row', width: 86, height: 66 }}>
                    {books.slice(0, 3).map((b, i) => (
                      <View key={b.id} style={{ position: 'absolute', left: i * 20, top: 0, zIndex: 3 - i, transform: [{ rotate: `${(i - 1) * 4}deg` }] }}>
                        <Cover title={b.title} uri={b.cover} width={44} />
                      </View>
                    ))}
                    {!books.length ? <Txt style={{ fontSize: 34, marginTop: 10, marginLeft: 18 }}>{l.emoji ?? '📚'}</Txt> : null}
                  </View>
                  <View style={[s.grow, { gap: 2 }]}>
                    <Txt k="h3">{l.emoji ?? '📚'} {l.name}</Txt>
                    <Txt k="small">
                      {books.length} {books.length === 1 ? 'livro' : 'livros'}
                      {books.length ? ` · ${read} ${read === 1 ? 'lido' : 'lidos'}` : ''}
                    </Txt>
                  </View>
                  <Txt k="h2" style={{ color: c.muted }}>›</Txt>
                </Card>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Txt k="small">Crie listas como “Para as férias”, “Clássicos que faltam” ou “Indicações da Ana”.</Txt>
      )}
      {readingOf(data).length > 2 ? (
        <Txt k="small">Dica: dois livros ao mesmo tempo (um denso, um leve) é o ponto ideal. Mais que isso costuma espalhar a vontade.</Txt>
      ) : null}
    </Screen>
  );
}

function Legend({ color, w, h, label }: { color: string; w: number; h: number; label: string }) {
  return (
    <Row style={{ gap: 6 }}>
      <View style={{ width: w, height: h, backgroundColor: color, borderRadius: 1 }} />
      <Txt k="small">{label}</Txt>
    </Row>
  );
}
