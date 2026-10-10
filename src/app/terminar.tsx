import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, ToastAndroid, View } from 'react-native';
import { useConfetti } from '../components/Confetti';
import { Btn, Card, Row, Screen, Txt } from '../components/ui';
import { dayKey, uid } from '../lib/dates';
import { minutesByDay, streak } from '../lib/stats';
import { useStore } from '../lib/store';
import { F, useColors } from '../lib/theme';
import { MOODS, type Mood } from '../lib/types';

const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];
const toast = (m: string) => Platform.OS === 'android' && ToastAndroid.show(m, ToastAndroid.SHORT);

export default function Terminar() {
  const c = useColors();
  const confetti = useConfetti();
  const { finish, setFinish, data, saveBook, saveSession, draft, setDraft } = useStore();
  const book = data.books.find((b) => b.id === finish?.bookId);
  const [page, setPage] = useState(String(book?.page || finish?.fromPage || 0));
  const [mood, setMood] = useState<Mood | null>(null);

  if (!finish || !book) {
    return (
      <Screen>
        <Txt k="h2">Nada para guardar agora</Txt>
        <Btn title="Voltar" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const save = () => {
    const toPage = Math.max(0, Math.min(book.pages || 99999, parseInt(page, 10) || 0));
    const s = {
      id: uid(), bookId: book.id, start: finish.start, day: dayKey(new Date(finish.start)),
      minutes: Math.round(finish.minutes * 10) / 10, fromPage: finish.fromPage, toPage, mood,
      note: draft.note.trim() || null, photo: draft.photo,
    };
    const before = minutesByDay(data.sessions)[s.day] || 0;
    const stBefore = streak(data.sessions).n;
    const stNow = streak([...data.sessions, s]).n;
    saveSession(s);
    const finished = !!book.pages && toPage >= book.pages && book.status !== 'lido';
    saveBook({ ...book, page: toPage, updatedAt: Date.now(), ...(finished ? { status: 'lido' as const, finishedAt: Date.now(), hook: undefined } : {}) });
    setDraft({ note: '', photo: null });
    setFinish(null);
    if (finished) {
      router.replace({ pathname: '/terminado', params: { id: book.id } });
      return;
    }
    if (MILESTONES.includes(stNow) && stNow > stBefore) {
      confetti(3);
      toast(`${stNow} dias seguidos lendo!`);
    } else if (before < data.settings.goal && before + s.minutes >= data.settings.goal) {
      confetti(2);
      toast('Meta do dia cumprida');
    } else {
      confetti(0);
      toast('Sessão guardada');
    }
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Txt k="h1">Boa leitura</Txt>
          <Txt k="muted">{Math.max(1, Math.round(finish.minutes))} min</Txt>
        </Row>
        <Card>
          <Txt k="label">Em que página você parou?</Txt>
          <Row>
            <Btn title="−" kind="ghost" onPress={() => setPage(String(Math.max(0, (parseInt(page, 10) || 0) - 1)))} />
            <TextInput
              value={page}
              onChangeText={setPage}
              keyboardType="number-pad"
              selectTextOnFocus
              style={{ flex: 1, textAlign: 'center', fontFamily: F.display, fontSize: 34, color: c.ink, backgroundColor: c.bg, borderRadius: 12, paddingVertical: 6 }}
            />
            <Btn title="+" kind="ghost" onPress={() => setPage(String((parseInt(page, 10) || 0) + 1))} />
          </Row>
          <Txt k="small" style={{ textAlign: 'center' }}>
            Você começou na {finish.fromPage}. São {Math.max(0, (parseInt(page, 10) || 0) - finish.fromPage)} páginas hoje, de {book.pages}.
          </Txt>
        </Card>

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

        <Card>
          <Txt k="label">Como foi a vontade?</Txt>
          <Row style={{ gap: 8 }}>
            {(Object.keys(MOODS) as Mood[]).map((k) => (
              <Pressable
                key={k}
                onPress={() => setMood(k)}
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

        <Btn big title="Guardar sessão" onPress={save} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
