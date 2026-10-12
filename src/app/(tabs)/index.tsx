import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookEdge } from '../../components/BookEdge';
import { Cover } from '../../components/Cover';
import { Btn, Card, Row, Screen, Txt, s } from '../../components/ui';
import { addDays, dayKey, DOW, fmtMinutes, fmtTime, longDate } from '../../lib/dates';
import { daysAway, forecast, minutesByDay, moodAlert, streak } from '../../lib/stats';
import { pctOf, queueOf, readingOf, useStore } from '../../lib/store';
import { F, useColors } from '../../lib/theme';
import { kindOf, type Book } from '../../lib/types';
import { Recs } from '../../components/Recs';

export default function Hoje() {
  const c = useColors();
  const ins = useSafeAreaInsets();
  const { data, current: b, saveBook, setSettings, setTimer, timer, finish } = useStore();
  const { sessions, settings } = data;
  const today = new Date();
  const mbd = minutesByDay(sessions);
  const readToday = mbd[dayKey(today)] || 0;
  const goal = settings.goal;
  const st = streak(sessions);
  const away = daysAway(sessions);
  const nextUp = queueOf(data)[0];
  // toque sem querer numa capa não pode virar leitura: pede confirmação antes
  const [ask, setAsk] = useState<Book | null>(null);

  const start = (minutes: number) => {
    if (!b) return;
    if (!timer) setTimer({ bookId: b.id, start: Date.now(), pausedMs: 0, pausedAt: null, target: minutes, fromPage: b.page || 0 });
    router.push('/ler');
  };

  const header = (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <View>
        <Txt k="h1">Hoje</Txt>
        <Txt k="small">{longDate(today)}</Txt>
      </View>
      <Pressable onPress={() => router.push('/voce')} accessibilityRole="button">
        <Txt k="small" style={{ color: c.accent, fontFamily: F.semi }}>
          Hora de ler: {fmtTime(settings.hour, settings.minute)}
        </Txt>
      </Pressable>
    </Row>
  );

  if (!b) {
    const pick = data.books.filter((x) => x.status === 'fila' || x.status === 'pausado').sort((x, y) => (x.status === y.status ? x.createdAt - y.createdAt : x.status === 'pausado' ? -1 : 1));
    const begin = (x: Book) => {
      const now = Date.now();
      saveBook({ ...x, status: 'lendo', startedAt: x.startedAt ?? now, updatedAt: now });
      setSettings({ currentId: x.id });
      setAsk(null);
    };
    return (
      <Screen>
        {header}
        {pick.length ? (
          <Card style={{ gap: 14 }}>
            <View style={{ gap: 4 }}>
              <Txt k="h2">Não tem nenhuma leitura?</Txt>
              <Txt k="muted">Escolha um livro da sua estante. Toque na capa do que você vai começar.</Txt>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {pick.slice(0, 6).map((x) => (
                <Pressable key={x.id} onPress={() => setAsk(x)} style={{ width: '30%', gap: 6 }} accessibilityRole="button" accessibilityLabel={`Começar ${x.title}?`}>
                  <Cover title={x.title} author={x.author} uri={x.cover} width={96} />
                  <Txt k="small" lines={2} style={{ color: c.ink, fontFamily: F.semi }}>{x.title}</Txt>
                  <Txt k="small" style={{ fontSize: 12 }}>
                    {x.status === 'pausado' ? `Pausado na p. ${x.page || 0}` : `${x.pages} pág · ${kindOf(x)}`}
                  </Txt>
                </Pressable>
              ))}
            </View>
            <Row style={{ justifyContent: 'center', gap: 16 }}>
              <Btn title="Escanear outro" icon="📷" kind="ghost" onPress={() => router.push('/scan')} />
              <Btn title="Digitar à mão" kind="link" onPress={() => router.push('/editar')} />
            </Row>
          </Card>
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 14 }}>
            <Txt k="h2" style={{ textAlign: 'center' }}>Qual livro está na sua mesa de cabeceira?</Txt>
            <Txt k="muted" style={{ textAlign: 'center' }}>
              Aponte a câmera para o código de barras atrás do livro e o Marcador puxa capa, título e páginas.
            </Txt>
            <Btn title="Escanear livro" icon="📷" big onPress={() => router.push('/scan')} style={{ alignSelf: 'stretch' }} />
            <Btn title="Digitar à mão" kind="link" onPress={() => router.push('/editar')} />
          </Card>
        )}
        <Recs />
        <Modal visible={!!ask} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setAsk(null)}>
          <Pressable onPress={() => setAsk(null)} style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }}>
            {ask ? (
              <Pressable onPress={() => {}} style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: ins.bottom + 22, gap: 16 }}>
                <Row style={{ gap: 16, alignItems: 'flex-start' }}>
                  <Cover title={ask.title} author={ask.author} uri={ask.cover} width={78} />
                  <View style={[s.grow, { gap: 4 }]}>
                    <Txt k="label">{ask.status === 'pausado' ? 'Voltar a ler?' : 'Começar a ler?'}</Txt>
                    <Txt k="h2" lines={3}>{ask.title}</Txt>
                    <Txt k="small">
                      {ask.status === 'pausado' ? `Você parou na página ${ask.page || 0} de ${ask.pages}.` : `${ask.pages} páginas. Ele vira a sua leitura de hoje.`}
                    </Txt>
                  </View>
                </Row>
                <Btn big title={ask.status === 'pausado' ? 'Voltei a ler' : 'Comecei a ler'} icon="📖" onPress={() => begin(ask)} />
                <Row style={{ justifyContent: 'center', gap: 20 }}>
                  <Btn title="Agora não" kind="link" onPress={() => setAsk(null)} />
                  <Btn
                    title="Ver o livro"
                    kind="link"
                    onPress={() => {
                      const id = ask.id;
                      setAsk(null);
                      router.push({ pathname: '/livro/[id]', params: { id } });
                    }}
                  />
                </Row>
              </Pressable>
            ) : null}
          </Pressable>
        </Modal>
      </Screen>
    );
  }

  const pct = pctOf(b);
  const fc = forecast(b, sessions);
  const other = readingOf(data).find((x) => x.id !== b.id);
  const minutes = away >= 3 ? 1 : goal;
  const mon = addDays(today, -((today.getDay() + 6) % 7));
  const week = [...Array(7)].map((_, i) => addDays(mon, i));
  const last7 = [...Array(7)].map((_, i) => addDays(today, i - 6));
  const max = Math.max(goal * 2, ...last7.map((d) => mbd[dayKey(d)] || 0));

  return (
    <Screen>
      {header}

      {finish && !timer ? (
        <Card style={{ backgroundColor: c.amberSoft, borderColor: c.amber + '66' }}>
          <Txt k="h3">Falta guardar sua última leitura</Txt>
          <Txt>{fmtMinutes(finish.minutes)} de leitura esperando a página e o trecho.</Txt>
          <Btn title="Guardar agora" onPress={() => router.push('/terminar')} />
        </Card>
      ) : null}

      {moodAlert(b, sessions) ? (
        <Card style={{ backgroundColor: c.amberSoft, borderColor: c.amber + '66' }}>
          <Txt k="h3">Esse livro está pesando</Txt>
          <Txt>Suas três últimas leituras de {b.title} foram arrastadas. Pausar não é desistir: ele fica guardado com a página marcada.</Txt>
          <Row style={{ flexWrap: 'wrap' }}>
            <Btn
              title={nextUp ? `Pausar e começar ${nextUp.title}` : 'Pausar este livro'}
              onPress={() => {
                saveBook({ ...b, status: 'pausado', updatedAt: Date.now() });
                if (nextUp) {
                  saveBook({ ...nextUp, status: 'lendo', startedAt: Date.now(), updatedAt: Date.now() });
                  setSettings({ currentId: nextUp.id });
                }
              }}
            />
            <Btn title="Continuar com ele" kind="ghost" onPress={() => saveBook({ ...b, moodAck: sessions.filter((x) => x.bookId === b.id).length })} />
          </Row>
        </Card>
      ) : away >= 3 ? (
        <Card style={{ backgroundColor: c.soft, borderColor: 'transparent' }}>
          <Txt k="h3">Faz {away} dias. Tudo bem.</Txt>
          <Txt>Hoje vale só 1 minuto. Abra o livro na página {b.page || 1} e leia um parágrafo.</Txt>
        </Card>
      ) : null}

      <Card>
        <Row style={{ alignItems: 'flex-start', gap: 14 }}>
          <Pressable onPress={() => router.push({ pathname: '/livro/[id]', params: { id: b.id } })}>
            <Cover title={b.title} author={b.author} uri={b.cover} width={78} />
          </Pressable>
          <View style={[s.grow, { gap: 4 }]}>
            <Txt k="label">Lendo agora · {kindOf(b)}</Txt>
            <Txt k="h2" lines={3}>{b.title}</Txt>
            {b.author ? <Txt k="small" lines={1}>{b.author}</Txt> : null}
          </View>
        </Row>
        <BookEdge title={b.title} pct={pct} />
        <Txt style={{ fontVariant: ['tabular-nums'] }}>
          p. {b.page || 0} de {b.pages} · <Txt style={{ fontFamily: F.semi }}>{pct}%</Txt> · {fc.left} páginas pela frente
        </Txt>
        {fc.daysLeft ? (
          <Txt k="small">
            No seu ritmo ({Math.round(fc.perDay)} pág/dia), você termina em {fc.daysLeft} {fc.daysLeft === 1 ? 'dia' : 'dias'}, lá por {fc.date!.getDate()}/{fc.date!.getMonth() + 1}.
          </Txt>
        ) : null}
        {b.hook ? (
          <View style={{ backgroundColor: c.amberSoft, borderRadius: 10, padding: 12, gap: 4 }}>
            <Txt k="label">Gancho para hoje</Txt>
            <Txt k="quote">{b.hook}</Txt>
          </View>
        ) : null}
        {b.why ? (
          <View style={{ borderLeftWidth: 3, borderLeftColor: c.soft, paddingLeft: 10 }}>
            <Txt k="quote" style={{ color: c.muted, fontSize: 15 }}>{b.why}</Txt>
          </View>
        ) : null}
      </Card>

      <Btn
        big
        icon={timer ? '⏱️' : '📖'}
        title={timer ? 'Voltar para a leitura' : readToday >= goal ? 'Ler mais um pouco' : `Ler agora · ${minutes} min`}
        onPress={() => start(minutes)}
      />
      {!timer ? <Btn kind="link" title="Leu sem o cronômetro? Lançar à mão" onPress={() => router.push('/lancar')} /> : null}
      {other ? (
        <Btn kind="link" title={`Sem clima? Trocar para ${other.title} (${kindOf(other)})`} onPress={() => setSettings({ currentId: other.id })} />
      ) : nextUp ? (
        <Txt k="small" style={{ textAlign: 'center' }}>Dica: deixe um livro leve em rotação para os dias sem vontade. Próximo na fila: {nextUp.title}.</Txt>
      ) : null}

      <Row style={{ alignItems: 'stretch' }}>
        <Card style={[s.grow, { gap: 6 }]}>
          <Txt k="label">Sequência</Txt>
          <Txt k="h1" style={{ fontSize: 26 }}>🔥 {st.n}</Txt>
          <Row style={{ gap: 5 }}>
            {week.map((d) => {
              const k = dayKey(d);
              const on = !!mbd[k];
              const isToday = k === dayKey(today);
              return (
                <View
                  key={k}
                  style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: on ? c.accent : 'transparent', borderWidth: on ? 0 : 2, borderColor: isToday ? c.accent : c.line }}
                />
              );
            })}
          </Row>
          <Txt k="small">Folga da semana: {st.graceUsed ? 'usada' : 'disponível'}</Txt>
        </Card>
        <Card style={[s.grow, { gap: 6 }]}>
          <Txt k="label">Hoje</Txt>
          <Txt k="h1" style={{ fontSize: 26 }}>{fmtMinutes(readToday)}</Txt>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, (readToday / goal) * 100)}%`, height: 8, backgroundColor: readToday >= goal ? c.amber : c.accent }} />
          </View>
          <Txt k="small">{readToday >= goal ? 'Meta cumprida' : `Meta: ${goal} min`}</Txt>
        </Card>
      </Row>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt k="label">Últimos 7 dias</Txt>
          <Txt k="small">{fmtMinutes(last7.reduce((a, d) => a + (mbd[dayKey(d)] || 0), 0))} no total</Txt>
        </Row>
        <View style={{ height: 96, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          {last7.map((d, i) => {
            const v = mbd[dayKey(d)] || 0;
            return (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <View style={{ width: '80%', maxWidth: 28, height: Math.max(4, (v / max) * 70), borderRadius: 6, backgroundColor: v >= goal ? c.accent : c.soft }} />
                <Txt k="small" style={{ fontSize: 11, color: i === 6 ? c.ink : c.muted, fontFamily: i === 6 ? F.semi : F.body }}>{DOW[d.getDay()]}</Txt>
              </View>
            );
          })}
        </View>
      </Card>

      <Recs />
    </Screen>
  );
}
