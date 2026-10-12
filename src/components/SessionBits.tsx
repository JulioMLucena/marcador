import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, TextInput, View } from 'react-native';
import { dayKey, fmtMinutes } from '../lib/dates';
import { minutesByDay, streak } from '../lib/stats';
import { useStore } from '../lib/store';
import { F, bookColor, useColors } from '../lib/theme';
import { MOODS, type Book, type Mood, type Session } from '../lib/types';
import { Btn, Card, Row, Txt, s } from './ui';

/** Número grande com − e +, e atalhos que somam (+5, +10…) ou fixam um valor. */
export function NumberDial({
  label, value, onChange, min = 0, max = 99999, unit, quick = [], quickMode = 'add', hint,
}: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string;
  quick?: number[]; quickMode?: 'add' | 'set'; hint?: string;
}) {
  const c = useColors();
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v)));
  return (
    <Card>
      <Txt k="label">{label}</Txt>
      <Row>
        <Btn title="−" kind="ghost" onPress={() => onChange(clamp(value - 1))} style={{ paddingHorizontal: 20 }} />
        <View style={[s.grow, { alignItems: 'center' }]}>
          <TextInput
            value={String(value)}
            onChangeText={(t) => onChange(clamp(parseInt(t.replace(/\D/g, ''), 10) || 0))}
            keyboardType="number-pad"
            selectTextOnFocus
            accessibilityLabel={label}
            style={{ alignSelf: 'stretch', textAlign: 'center', fontFamily: F.display, fontSize: 40, color: c.ink, backgroundColor: c.bg, borderRadius: 14, paddingVertical: 4, fontVariant: ['tabular-nums'] }}
          />
          {unit ? <Txt k="small" style={{ marginTop: 2 }}>{unit}</Txt> : null}
        </View>
        <Btn title="+" kind="ghost" onPress={() => onChange(clamp(value + 1))} style={{ paddingHorizontal: 20 }} />
      </Row>
      {quick.length ? (
        <Row style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
          {quick.map((q) => {
            const on = quickMode === 'set' && value === q;
            return (
              <Pressable
                key={q}
                onPress={() => onChange(clamp(quickMode === 'add' ? value + q : q))}
                accessibilityRole="button"
                style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.soft : c.surface }}
              >
                <Txt k="small" style={{ color: on ? c.accent : c.ink, fontFamily: F.semi }}>{quickMode === 'add' ? (q > 0 ? `+${q}` : `${q}`) : q}</Txt>
              </Pressable>
            );
          })}
        </Row>
      ) : null}
      {hint ? <Txt k="small" style={{ textAlign: 'center' }}>{hint}</Txt> : null}
    </Card>
  );
}

export function MoodPicker({ mood, onChange }: { mood: Mood | null; onChange: (m: Mood | null) => void }) {
  const c = useColors();
  return (
    <Card>
      <Txt k="label">Como foi a vontade?</Txt>
      <Row style={{ gap: 8 }}>
        {(Object.keys(MOODS) as Mood[]).map((k) => (
          <Pressable
            key={k}
            onPress={() => onChange(mood === k ? null : k)}
            accessibilityRole="button"
            accessibilityState={{ selected: mood === k }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: mood === k ? c.accent : c.line, backgroundColor: mood === k ? c.soft : c.surface }}
          >
            <Txt style={{ fontSize: 30, lineHeight: 36 }}>{MOODS[k].emoji}</Txt>
            <Txt k="small" style={{ color: c.ink, fontFamily: mood === k ? F.semi : F.body }}>{MOODS[k].label}</Txt>
          </Pressable>
        ))}
      </Row>
    </Card>
  );
}

/** Trecho do dia: texto livre ou frase tirada da foto da página. Usa o rascunho do app (o OCR escreve nele). */
export function NoteCard() {
  const c = useColors();
  const { draft, setDraft } = useStore();
  return (
    <Card>
      <Txt k="label">Trecho do dia</Txt>
      <TextInput
        value={draft.note}
        onChangeText={(t) => setDraft({ ...draft, note: t })}
        placeholder="Copie uma frase que marcou ou escreva uma linha sobre o que leu"
        placeholderTextColor={c.muted}
        multiline
        style={{ minHeight: 90, fontFamily: F.displayItalic, fontSize: 16, color: c.ink, backgroundColor: c.bg, borderRadius: 12, padding: 12, textAlignVertical: 'top' }}
      />
      {draft.photo ? (
        <View>
          <Image source={{ uri: draft.photo }} style={{ width: '100%', height: 180, borderRadius: 10 }} contentFit="cover" />
          <Pressable onPress={() => setDraft({ ...draft, photo: null })} style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#000a', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Txt k="small" style={{ color: '#fff' }}>Remover foto</Txt>
          </Pressable>
        </View>
      ) : null}
      <Btn title="Fotografar a página e escolher a frase" icon="📷" kind="ghost" onPress={() => router.push('/ocr')} />
    </Card>
  );
}

function Bar({ from, to, color, base }: { from: number; to: number; color: string; base: string }) {
  const c = useColors();
  const v = useRef(new Animated.Value(to)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: to, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [to, v]);
  const pct = (x: number) => `${Math.max(0, Math.min(100, x))}%` as const;
  return (
    <View style={{ height: 12, borderRadius: 6, backgroundColor: c.line, overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: color, width: v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }} />
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct(from), backgroundColor: base }} />
    </View>
  );
}

/**
 * O que esta leitura muda, recalculado a cada ajuste: minutos do dia contra a meta,
 * sequência, quanto do livro andou e o ritmo da sessão.
 */
export function Impact({ session, book }: { session: Session; book: Book }) {
  const c = useColors();
  const { data } = useStore();
  const goal = data.settings.goal;
  const dayBefore = minutesByDay(data.sessions)[session.day] || 0;
  const dayAfter = dayBefore + session.minutes;
  const stBefore = streak(data.sessions).n;
  const stAfter = streak([...data.sessions, session]).n;
  const pages = Math.max(0, session.toPage - session.fromPage);
  const pctBefore = book.pages ? ((book.page || 0) / book.pages) * 100 : 0;
  const pctAfter = book.pages ? (Math.max(book.page || 0, session.toPage) / book.pages) * 100 : 0;
  const perHour = session.minutes >= 1 && pages ? Math.round((pages / session.minutes) * 60) : 0;
  const isToday = session.day === dayKey(new Date());
  const left = book.pages ? Math.max(0, book.pages - Math.max(book.page || 0, session.toPage)) : 0;

  return (
    <Card style={{ gap: 14 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt k="label">O que muda com esta leitura</Txt>
        {perHour ? <Txt k="small" style={{ color: c.accent, fontFamily: F.semi }}>{perHour} pág/h</Txt> : null}
      </Row>

      <View style={{ gap: 6 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt k="small" style={{ color: c.ink, fontFamily: F.semi }}>{isToday ? 'Hoje' : 'Nesse dia'}</Txt>
          <Txt k="small">
            {dayBefore ? `${fmtMinutes(dayBefore)} + ` : ''}{fmtMinutes(session.minutes)} = <Txt k="small" style={{ color: c.ink, fontFamily: F.semi }}>{fmtMinutes(dayAfter)}</Txt>
          </Txt>
        </Row>
        <Bar from={(dayBefore / goal) * 100} to={(dayAfter / goal) * 100} color={dayAfter >= goal ? c.amber : c.accent} base={c.muted + '88'} />
        <Txt k="small">{dayAfter >= goal ? (dayBefore >= goal ? 'Meta do dia já estava cumprida. Leitura extra!' : 'Com esta leitura a meta do dia fica cumprida 🎉') : `Faltam ${fmtMinutes(goal - dayAfter)} para a meta de ${goal} min`}</Txt>
      </View>

      {book.pages ? (
        <View style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt k="small" style={{ color: c.ink, fontFamily: F.semi }} lines={1}>{book.title}</Txt>
            <Txt k="small">{Math.round(pctBefore)}% → <Txt k="small" style={{ color: c.ink, fontFamily: F.semi }}>{Math.round(pctAfter)}%</Txt></Txt>
          </Row>
          <Bar from={pctBefore} to={pctAfter} color={c.amber} base={bookColor(book.title)} />
          <Txt k="small">{pages ? `+${pages} ${pages === 1 ? 'página' : 'páginas'}` : 'Nenhuma página nova'}{left ? ` · faltam ${left}` : book.status !== 'lido' && pages ? ' · último capítulo! 🎉' : ''}</Txt>
        </View>
      ) : null}

      <Row style={{ justifyContent: 'space-between' }}>
        <Txt k="small" style={{ color: c.ink, fontFamily: F.semi }}>Sequência</Txt>
        <Txt k="small">
          🔥 {stBefore}{stAfter !== stBefore ? <Txt k="small" style={{ color: c.amber, fontFamily: F.semi }}>{`  →  ${stAfter} dias`}</Txt> : ' dias'}
        </Txt>
      </Row>
    </Card>
  );
}
