import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { BookEdge } from '../../components/BookEdge';
import { Cover } from '../../components/Cover';
import { CoverPicker } from '../../components/CoverPicker';
import { Btn, Card, Row, Screen, Txt, s } from '../../components/ui';
import { DOW, fmtMinutes, fmtTime, MONTHS } from '../../lib/dates';
import { forecast } from '../../lib/stats';
import { pctOf, useStore } from '../../lib/store';
import { F, useColors } from '../../lib/theme';
import { kindOf, MOODS, type BookStatus, type Mood } from '../../lib/types';

const STATUS: { v: BookStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { v: 'lendo', label: 'Lendo', icon: 'book' },
  { v: 'fila', label: 'Na fila', icon: 'time' },
  { v: 'pausado', label: 'Pausado', icon: 'pause' },
  { v: 'lido', label: 'Lido', icon: 'checkmark-circle' },
];

const shortDate = (t: number) => {
  const d = new Date(t);
  return `${d.getDate()} de ${MONTHS[d.getMonth()].slice(0, 3)}`;
};
const when = (t: number) => {
  const d = new Date(t);
  return `${DOW[d.getDay()]}, ${shortDate(t)} · ${fmtTime(d.getHours(), d.getMinutes())}`;
};
const period = (h: number) => (h < 5 ? 'de madrugada' : h < 12 ? 'de manhã' : h < 18 ? 'à tarde' : 'à noite');

export default function LivroDetalhe() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveBook, saveList, setSettings, setTimer, timer } = useStore();
  const b = data.books.find((x) => x.id === id);
  const [allHistory, setAllHistory] = useState(false);

  if (!b) {
    return (
      <Screen>
        <Txt k="h2">Esse livro não está mais na estante</Txt>
        <Btn title="Voltar" onPress={() => router.back()} />
      </Screen>
    );
  }

  const ss = data.sessions.filter((x) => x.bookId === b.id).sort((x, y) => y.start - x.start);
  const minutes = ss.reduce((a, x) => a + (x.minutes || 0), 0);
  const pagesRead = ss.reduce((a, x) => a + Math.max(0, (x.toPage || 0) - (x.fromPage || 0)), 0);
  const days = new Set(ss.map((x) => x.day)).size;
  const perHour = minutes ? Math.round((pagesRead / minutes) * 60) : 0;
  const pct = pctOf(b);
  const fc = forecast(b, data.sessions);
  const moods = (['bom', 'meh', 'ruim'] as Mood[]).map((m) => ({ m, n: ss.filter((x) => x.mood === m).length }));
  const moodTotal = moods.reduce((a, x) => a + x.n, 0);
  const hours = ss.map((x) => new Date(x.start).getHours());
  const fav = hours.length
    ? Object.entries(hours.reduce<Record<string, number>>((a, h) => ({ ...a, [period(h)]: (a[period(h)] || 0) + 1 }), {})).sort((x, y) => y[1] - x[1])[0][0]
    : null;
  const lists = data.lists;

  const setStatus = (st: BookStatus) => {
    if (st === b.status) return;
    const now = Date.now();
    saveBook({
      ...b, status: st, updatedAt: now,
      ...(st === 'lendo' && !b.startedAt ? { startedAt: now } : {}),
      ...(st === 'lido' ? { finishedAt: b.finishedAt ?? now, page: b.pages } : {}),
    });
    if (st === 'lendo') setSettings({ currentId: b.id });
  };

  const readNow = () => {
    setSettings({ currentId: b.id });
    if (!timer) setTimer({ bookId: b.id, start: Date.now(), pausedMs: 0, pausedAt: null, target: data.settings.goal, fromPage: b.page || 0 });
    router.push('/ler');
  };

  const stats: [string, string][] = [
    ['Leituras', String(ss.length)],
    ['Tempo total', fmtMinutes(minutes)],
    ['Páginas lidas', String(pagesRead)],
    ['Dias lendo', String(days)],
    ['Por leitura', ss.length ? fmtMinutes(minutes / ss.length) : '–'],
    ['Ritmo', perHour ? `${perHour} pág/h` : '–'],
  ];

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={26} color={c.ink} />
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/editar', params: { id: b.id } })}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Editar livro"
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="pencil" size={18} color={c.ink} />
        </Pressable>
      </Row>

      <Row style={{ alignItems: 'flex-start', gap: 16 }}>
        <Cover title={b.title} author={b.author} uri={b.cover} width={112} />
        <View style={[s.grow, { gap: 4 }]}>
          <Txt k="label">{kindOf(b)} · {b.pages} páginas</Txt>
          <Txt k="h2" lines={4}>{b.title}</Txt>
          {b.author ? <Txt k="muted" lines={2}>{b.author}</Txt> : null}
          {b.startedAt ? (
            <Txt k="small" style={{ marginTop: 4 }}>
              {b.finishedAt ? `Lido de ${shortDate(b.startedAt)} a ${shortDate(b.finishedAt)}` : `Começou em ${shortDate(b.startedAt)}`}
            </Txt>
          ) : null}
        </View>
      </Row>
      {!b.cover ? (
        <Card style={{ backgroundColor: c.soft, borderColor: 'transparent', gap: 8 }}>
          <Txt k="h3">Sem capa ainda</Txt>
          <Txt k="small">Tire uma foto da capa ou escolha uma imagem. Ela aparece na estante e no widget.</Txt>
          <CoverPicker cover={b.cover} onChange={(cover) => saveBook({ ...b, cover, updatedAt: Date.now() })} />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {STATUS.map((o) => {
          const on = b.status === o.v;
          return (
            <Pressable
              key={o.v}
              onPress={() => setStatus(o.v)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{
                flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 14,
                backgroundColor: on ? c.accent : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.line,
              }}
            >
              <Ionicons name={on ? o.icon : (`${o.icon}-outline` as keyof typeof Ionicons.glyphMap)} size={22} color={on ? c.accentInk : c.ink} />
              <Txt k="small" style={{ color: on ? c.accentInk : c.ink, fontFamily: F.semi }}>{o.label}</Txt>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <BookEdge title={b.title} pct={pct} />
        <Txt style={{ fontVariant: ['tabular-nums'] }}>
          p. {b.page || 0} de {b.pages} · <Txt style={{ fontFamily: F.semi }}>{pct}%</Txt>
          {b.status !== 'lido' ? ` · faltam ${fc.left}` : ''}
        </Txt>
        {b.status === 'lendo' && fc.daysLeft ? (
          <Txt k="small">No seu ritmo, termina em {fc.daysLeft} {fc.daysLeft === 1 ? 'dia' : 'dias'}, lá por {fc.date!.getDate()}/{fc.date!.getMonth() + 1}.</Txt>
        ) : null}
        {b.why ? (
          <View style={{ borderLeftWidth: 3, borderLeftColor: c.soft, paddingLeft: 10 }}>
            <Txt k="quote" style={{ color: c.muted, fontSize: 15 }}>{b.why}</Txt>
          </View>
        ) : null}
      </Card>
      {b.status === 'lendo' ? <Btn big icon={timer ? '⏱️' : '📖'} title={timer ? 'Voltar para a leitura' : 'Ler agora'} onPress={readNow} /> : null}

      <Card>
        <Txt k="label">Sua leitura em números</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
          {stats.map(([k, v]) => (
            <View key={k} style={{ width: '33.3%', gap: 2 }}>
              <Txt k="h2" style={{ fontSize: 20 }}>{v}</Txt>
              <Txt k="small">{k}</Txt>
            </View>
          ))}
        </View>
        {fav ? <Txt k="small">Você costuma ler este livro {fav}.</Txt> : null}
      </Card>

      {moodTotal ? (
        <Card>
          <Txt k="label">Como foi a vontade</Txt>
          {moods.map(({ m, n }) => (
            <Row key={m} style={{ gap: 10 }}>
              <Txt style={{ width: 24, fontSize: 18 }}>{MOODS[m].emoji}</Txt>
              <Txt k="small" style={{ width: 70, color: c.ink }}>{MOODS[m].label}</Txt>
              <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: c.bg, overflow: 'hidden' }}>
                <View style={{ width: `${(n / moodTotal) * 100}%`, height: 10, borderRadius: 5, backgroundColor: m === 'bom' ? c.accent : m === 'meh' ? c.amber : c.warn }} />
              </View>
              <Txt k="small" style={{ width: 22, textAlign: 'right' }}>{n}</Txt>
            </Row>
          ))}
        </Card>
      ) : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt k="label">Listas</Txt>
          <Btn title="+ Nova lista" kind="link" onPress={() => router.push({ pathname: '/lista/[id]', params: { id: 'nova', book: b.id } })} />
        </Row>
        {lists.length ? (
          <Row style={{ flexWrap: 'wrap', gap: 8 }}>
            {lists.map((l) => {
              const on = l.bookIds.includes(b.id);
              return (
                <Pressable
                  key={l.id}
                  onPress={() => saveList({ ...l, bookIds: on ? l.bookIds.filter((x) => x !== b.id) : [...l.bookIds, b.id] })}
                  style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.soft : 'transparent' }}
                >
                  <Txt k="small" style={{ color: c.ink }}>{l.emoji ?? '📚'} {l.name}</Txt>
                  {on ? <Ionicons name="checkmark" size={14} color={c.accent} /> : null}
                </Pressable>
              );
            })}
          </Row>
        ) : (
          <Txt k="small">Junte livros em listas como “Férias” ou “Para presentear”.</Txt>
        )}
      </Card>

      <Card style={{ gap: 0 }}>
        <Txt k="label" style={{ marginBottom: 6 }}>Histórico de leitura</Txt>
        {ss.length ? (
          (allHistory ? ss : ss.slice(0, 5)).map((x, i) => (
            <View key={x.id} style={{ paddingVertical: 10, gap: 3, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt style={{ fontFamily: F.semi, fontSize: 15 }}>{when(x.start)}</Txt>
                {x.mood ? <Txt style={{ fontSize: 17 }}>{MOODS[x.mood].emoji}</Txt> : null}
              </Row>
              <Txt k="small">
                {fmtMinutes(x.minutes)} · p. {x.fromPage} → {x.toPage}
                {x.toPage > x.fromPage ? ` (${x.toPage - x.fromPage} pág)` : ''}
              </Txt>
              {x.note ? <Txt k="quote" lines={2} style={{ fontSize: 14, color: c.muted }}>“{x.note}”</Txt> : null}
            </View>
          ))
        ) : (
          <Txt k="small">Nenhuma leitura registrada ainda. Toque em Ler agora e o cronômetro guarda tudo aqui.</Txt>
        )}
        {ss.length > 5 ? (
          <Btn title={allHistory ? 'Mostrar menos' : `Ver as ${ss.length} leituras`} kind="link" onPress={() => setAllHistory(!allHistory)} style={{ marginTop: 4 }} />
        ) : null}
      </Card>
    </Screen>
  );
}
