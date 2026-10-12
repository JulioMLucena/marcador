import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, ToastAndroid, View } from 'react-native';
import { Cover } from '../components/Cover';
import { Impact, MoodPicker, NoteCard, NumberDial } from '../components/SessionBits';
import { Btn, Card, Row, Screen, Txt } from '../components/ui';
import { useCommitSession } from '../lib/commit';
import { addDays, dayKey, daysBetween, DOW, MONTHS, parseDay, uid } from '../lib/dates';
import { useStore } from '../lib/store';
import { F, useColors } from '../lib/theme';
import type { BookStatus, Mood, Session } from '../lib/types';

const ORDER: Record<BookStatus, number> = { lendo: 0, pausado: 1, fila: 2, lido: 3 };

/**
 * Lançar uma leitura feita sem o cronômetro: livro, dia, minutos e páginas.
 * Com `sid`, corrige uma leitura que já está no histórico (ou apaga).
 */
export default function Lancar() {
  const c = useColors();
  const { id, sid } = useLocalSearchParams<{ id?: string; sid?: string }>();
  const { data, current, draft, setDraft, saveSession, deleteSession } = useStore();
  const commit = useCommitSession();
  const [editing] = useState(() => (sid ? data.sessions.find((x) => x.id === sid) : undefined));
  const books = [...data.books].sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.updatedAt - a.updatedAt);
  const [bookId, setBookId] = useState(editing?.bookId || id || current?.id || books[0]?.id);
  const book = data.books.find((b) => b.id === bookId);
  const origBack = editing ? Math.max(0, daysBetween(parseDay(editing.day), new Date())) : 0;
  const [back, setBack] = useState(origBack);
  const [minutes, setMinutes] = useState(editing ? Math.round(editing.minutes || 0) : data.settings.goal || 15);
  const [from, setFrom] = useState(editing ? editing.fromPage : book?.page || 0);
  const [to, setTo] = useState(editing ? editing.toPage : book?.page || 0);
  const [mood, setMood] = useState<Mood | null>(editing?.mood ?? null);

  // o trecho começa vazio (o rascunho pode ter sobrado de outra tela), ou com o da leitura que está sendo corrigida
  useEffect(() => {
    setDraft({ note: editing?.note || '', photo: editing?.photo || null });
  }, [editing, setDraft]);

  const pick = (bid: string) => {
    const b = data.books.find((x) => x.id === bid);
    setBookId(bid);
    setFrom(b?.page || 0);
    setTo(b?.page || 0);
  };

  if (!book) {
    return (
      <Screen>
        <Txt k="h2">Cadastre um livro primeiro</Txt>
        <Btn title="Voltar" onPress={() => router.back()} />
      </Screen>
    );
  }

  const today = new Date();
  const day = addDays(today, -back);
  // horário da sessão: agora (menos os minutos) se for hoje, senão o fim da tarde daquele dia
  const start =
    editing && back === origBack ? editing.start
    : back === 0 ? Date.now() - minutes * 60000
    : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 19, 0).getTime();
  const max = book.pages || 99999;
  const session: Session = {
    id: editing?.id || uid(), bookId: book.id, start, day: dayKey(day), minutes,
    fromPage: Math.min(from, to), toPage: Math.min(max, to), mood, note: draft.note.trim() || null, photo: draft.photo,
  };
  // a leitura corrigida pode ser mais antiga que a última semana: o dia dela entra no fim
  const backs = [0, 1, 2, 3, 4, 5, 6, ...(origBack > 6 ? [origBack] : [])];

  const toast = (m: string) => Platform.OS === 'android' && ToastAndroid.show(m, ToastAndroid.SHORT);
  const save = () => {
    if (!editing) return commit(session, book, true);
    saveSession(session);
    setDraft({ note: '', photo: null });
    toast('Leitura corrigida');
    router.back();
  };
  const remove = () =>
    Alert.alert('Apagar esta leitura?', 'Ela sai do histórico, dos gráficos e da sequência.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          deleteSession(editing!.id);
          setDraft({ note: '', photo: null });
          toast('Leitura apagada');
          router.back();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={26} color={c.ink} />
          </Pressable>
        </Row>
        <View style={{ gap: 4 }}>
          <Txt k="h1">{editing ? 'Corrigir leitura' : 'Lançar leitura'}</Txt>
          <Txt k="muted">{editing ? 'Ajuste o que ficou errado. As contas e os gráficos se refazem.' : 'Leu sem o cronômetro? Conte aqui e as contas e gráficos se atualizam.'}</Txt>
        </View>

        <Card>
          <Txt k="label">Livro</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {books.map((b) => {
              const on = b.id === bookId;
              return (
                <Pressable key={b.id} onPress={() => pick(b.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ width: 76, gap: 4, opacity: on ? 1 : 0.55 }}>
                  <View style={{ borderRadius: 8, borderWidth: 2.5, borderColor: on ? c.accent : 'transparent', padding: 2 }}>
                    <Cover title={b.title} author={b.author} uri={b.cover} width={66} />
                  </View>
                  <Txt k="small" lines={2} style={{ fontSize: 12, color: on ? c.ink : c.muted, fontFamily: on ? F.semi : F.body }}>{b.title}</Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>

        <Card>
          <Txt k="label">Quando</Txt>
          <Row style={{ gap: 6 }}>
            {backs.map((n) => {
              const d = addDays(today, -n);
              const on = n === back;
              return (
                <Pressable
                  key={n}
                  onPress={() => setBack(n)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : c.surface }}
                >
                  <Txt k="small" style={{ fontSize: 11, color: on ? c.accentInk : c.muted }}>{n === 0 ? 'hoje' : n === 1 ? 'ontem' : n > 6 ? MONTHS[d.getMonth()].slice(0, 3) : DOW[d.getDay()]}</Txt>
                  <Txt style={{ fontFamily: F.semi, color: on ? c.accentInk : c.ink }}>{d.getDate()}</Txt>
                </Pressable>
              );
            })}
          </Row>
        </Card>

        <NumberDial label="Quantos minutos?" value={minutes} onChange={setMinutes} min={editing ? 0 : 1} max={600} unit="minutos" quick={[10, 15, 20, 30, 45, 60]} quickMode="set" />

        <NumberDial
          label="Até que página?"
          value={to}
          onChange={(v) => setTo(Math.max(v, 0))}
          max={max}
          unit={book.pages ? `de ${book.pages}` : undefined}
          quick={[5, 10, 20, 50]}
          hint={to > from ? `São ${to - from} páginas.` : 'Deixe igual se não quiser contar páginas.'}
        />
        <Card style={{ paddingVertical: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt k="small" style={{ color: c.ink }}>Começou na página</Txt>
            <Row style={{ gap: 6 }}>
              <Btn title="−" kind="ghost" onPress={() => setFrom(Math.max(0, from - 1))} style={{ paddingHorizontal: 14, paddingVertical: 6 }} />
              <Txt style={{ minWidth: 48, textAlign: 'center', fontFamily: F.semi, fontVariant: ['tabular-nums'] }}>{from}</Txt>
              <Btn title="+" kind="ghost" onPress={() => setFrom(Math.min(max, from + 1))} style={{ paddingHorizontal: 14, paddingVertical: 6 }} />
            </Row>
          </Row>
        </Card>

        <Impact session={session} book={book} />

        <NoteCard />
        <MoodPicker mood={mood} onChange={setMood} />

        <Btn big title={editing ? 'Guardar correção' : 'Guardar leitura'} onPress={save} />
        {editing ? <Btn kind="link" title="Apagar esta leitura" onPress={remove} fg={c.warn} style={{ alignSelf: 'center' }} /> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
