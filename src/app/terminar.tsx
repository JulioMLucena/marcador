import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Cover } from '../components/Cover';
import { Impact, MoodPicker, NoteCard, NumberDial } from '../components/SessionBits';
import { Btn, Card, Row, Screen, Txt, s } from '../components/ui';
import { useCommitSession } from '../lib/commit';
import { dayKey, fmtMinutes, uid } from '../lib/dates';
import { useStore } from '../lib/store';
import { type Mood, type Session } from '../lib/types';

export default function Terminar() {
  const { finish, setFinish, data, draft } = useStore();
  const commit = useCommitSession();
  const book = data.books.find((b) => b.id === finish?.bookId);
  const [minutes, setMinutes] = useState(Math.max(1, Math.round(finish?.minutes || 0)));
  const [page, setPage] = useState(book?.page || finish?.fromPage || 0);
  const [mood, setMood] = useState<Mood | null>(null);

  if (!finish || !book) {
    return (
      <Screen>
        <Txt k="h2">Nada para guardar agora</Txt>
        <Btn title="Voltar" onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  }

  const max = book.pages || 99999;
  const session: Session = {
    id: uid(), bookId: book.id, start: finish.start, day: dayKey(new Date(finish.start)),
    minutes, fromPage: finish.fromPage, toPage: Math.min(max, page), mood,
    note: draft.note.trim() || null, photo: draft.photo,
  };
  const read = Math.max(0, page - finish.fromPage);

  const save = () => {
    setFinish(null);
    commit(session, book);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Row style={{ gap: 14, alignItems: 'center' }}>
          <Cover title={book.title} author={book.author} uri={book.cover} width={58} />
          <Txt k="h1" style={s.grow}>Boa leitura!</Txt>
        </Row>
        <Card style={{ alignItems: 'center', paddingVertical: 18, gap: 4 }}>
          <Txt k="label">Você leu</Txt>
          <Txt k="h1" style={{ fontSize: 44 }}>{fmtMinutes(minutes)}</Txt>
          <Txt k="small" style={{ textAlign: 'center' }}>
            {read ? `${read} ${read === 1 ? 'página' : 'páginas'} de ${book.title}` : `de ${book.title}`}
          </Txt>
        </Card>

        <NumberDial
          label="Em que página você parou?"
          value={page}
          onChange={setPage}
          max={max}
          unit={book.pages ? `de ${book.pages}` : undefined}
          quick={[5, 10, 20, 50]}
          hint={`Você começou na ${finish.fromPage}.`}
        />

        <Impact session={session} book={book} />

        <NoteCard />
        <MoodPicker mood={mood} onChange={setMood} />

        <NumberDial
          label="Tempo de leitura (ajuste se esqueceu de parar)"
          value={minutes}
          onChange={setMinutes}
          min={1}
          max={600}
          unit="minutos"
          quick={[-10, -5, 5, 10]}
        />

        <Btn big title="Guardar leitura" onPress={save} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
