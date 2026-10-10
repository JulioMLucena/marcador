import { router } from 'expo-router';
import { View } from 'react-native';
import { Shelf } from '../../components/Shelf';
import { Btn, Card, Row, Screen, Txt } from '../../components/ui';
import { queueOf, readingOf, useStore } from '../../lib/store';
import { useColors } from '../../lib/theme';

export default function Estante() {
  const c = useColors();
  const { data } = useStore();
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
      <Shelf books={data.books} onOpen={(b) => router.push({ pathname: '/livro', params: { id: b.id } })} />
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
      <Btn title="Adicionar sem código de barras" kind="link" onPress={() => router.push('/livro')} />
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
