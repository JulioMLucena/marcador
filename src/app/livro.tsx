import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { Cover } from '../components/Cover';
import { Btn, Card, Row, Screen, Seg, Txt, s } from '../components/ui';
import { uid } from '../lib/dates';
import { askNotificationPermission } from '../lib/notify';
import { useStore } from '../lib/store';
import { F, useColors } from '../lib/theme';
import { DENSO, kindOf, type Book, type BookStatus, type Kind } from '../lib/types';

type P = { id?: string; isbn?: string; title?: string; author?: string; pages?: string; cover?: string };

export default function Livro() {
  const c = useColors();
  const p = useLocalSearchParams<P>();
  const { data, saveBook, deleteBook, current } = useStore();
  const editing = data.books.find((b) => b.id === p.id);
  const [title, setTitle] = useState(editing?.title ?? p.title ?? '');
  const [author, setAuthor] = useState(editing?.author ?? p.author ?? '');
  const [pages, setPages] = useState(String(editing?.pages ?? p.pages ?? ''));
  const [page, setPage] = useState(String(editing?.page ?? 0));
  const [why, setWhy] = useState(editing?.why ?? '');
  const [status, setStatus] = useState<BookStatus>(editing?.status ?? (current ? 'fila' : 'lendo'));
  const [kindManual, setKindManual] = useState(!!editing?.kindManual);
  const [kind, setKind] = useState<Kind>(editing ? kindOf(editing) : 'denso');
  const [confirmDel, setConfirmDel] = useState(false);
  const cover = editing?.cover ?? p.cover ?? undefined;
  const nPages = parseInt(pages, 10) || 0;
  const shownKind: Kind = kindManual ? kind : nPages >= DENSO ? 'denso' : 'leve';

  const input = (value: string, set: (v: string) => void, extra: object = {}) => (
    <TextInput
      value={value}
      onChangeText={set}
      placeholderTextColor={c.muted}
      style={{ fontFamily: F.body, fontSize: 16, color: c.ink, backgroundColor: c.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: c.line }}
      {...extra}
    />
  );

  const save = async () => {
    if (!title.trim()) return;
    const now = Date.now();
    const b: Book = {
      ...(editing ?? { id: uid(), createdAt: now }),
      title: title.trim(), author: author.trim() || undefined, pages: Math.max(1, nPages || 1),
      page: Math.max(0, parseInt(page, 10) || 0), why: why.trim() || undefined, status,
      kind: shownKind, kindManual, cover: cover || undefined, isbn: editing?.isbn ?? p.isbn ?? undefined, updatedAt: now,
      ...(status === 'lendo' && !editing?.startedAt ? { startedAt: now } : {}),
      ...(status === 'lido' && !editing?.finishedAt ? { finishedAt: now } : {}),
    } as Book;
    saveBook(b);
    if (status === 'lendo') askNotificationPermission().catch(() => {});
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt k="h1">{editing ? 'Editar livro' : 'Novo livro'}</Txt>
          <Btn title="Fechar" kind="link" onPress={() => router.back()} />
        </Row>
        <Row style={{ alignItems: 'flex-start', gap: 14 }}>
          <Cover title={title || 'Livro'} author={author} uri={cover} width={92} />
          <View style={[s.grow, { gap: 8 }]}>
            <Txt k="label">Título</Txt>
            {input(title, setTitle, { placeholder: 'Ex.: Torto Arado' })}
            <Txt k="label">Autor</Txt>
            {input(author, setAuthor, { placeholder: 'Opcional' })}
          </View>
        </Row>
        <Card>
          <Row>
            <View style={[s.grow, { gap: 6 }]}>
              <Txt k="label">Página atual</Txt>
              {input(page, setPage, { keyboardType: 'number-pad' })}
            </View>
            <View style={[s.grow, { gap: 6 }]}>
              <Txt k="label">Total de páginas</Txt>
              {input(pages, setPages, { keyboardType: 'number-pad' })}
            </View>
          </Row>
          <Txt k="label">Peso</Txt>
          <Seg
            value={shownKind}
            options={[{ v: 'denso', label: 'Denso' }, { v: 'leve', label: 'Leve' }]}
            onChange={(v) => { setKind(v); setKindManual(true); }}
          />
          <Row style={{ flexWrap: 'wrap', gap: 4 }}>
            <Txt k="small">
              {kindManual ? 'Você escolheu o peso.' : nPages ? `Automático pelas páginas: ${DENSO} ou mais é denso.` : `Preencha o total de páginas: ${DENSO} ou mais é denso.`}
            </Txt>
            {kindManual ? <Btn title="Voltar ao automático" kind="link" onPress={() => setKindManual(false)} /> : null}
          </Row>
        </Card>
        <Card>
          <Txt k="label">Por que estou lendo isso?</Txt>
          {input(why, setWhy, { placeholder: 'Ex.: quero entender como funciona a memória', multiline: true, style: { minHeight: 70, fontFamily: F.displayItalic, fontSize: 16, color: c.ink, backgroundColor: c.bg, borderRadius: 12, padding: 12, textAlignVertical: 'top' } })}
          <Txt k="small">Essa frase aparece toda vez que você abre o livro. Ela é o lembrete do motivo quando a vontade cair.</Txt>
        </Card>
        <Card>
          <Txt k="label">Situação</Txt>
          <Seg
            value={status}
            options={[{ v: 'lendo', label: 'Lendo' }, { v: 'fila', label: 'Na fila' }, { v: 'pausado', label: 'Pausado' }, { v: 'lido', label: 'Lido' }]}
            onChange={setStatus}
          />
        </Card>
        <Btn big title="Salvar livro" onPress={save} disabled={!title.trim()} />
        {editing ? (
          <Btn
            title={confirmDel ? 'Toque de novo para apagar o livro e suas leituras' : 'Apagar livro'}
            kind={confirmDel ? 'danger' : 'link'}
            fg={confirmDel ? undefined : c.warn}
            onPress={() => {
              if (!confirmDel) return setConfirmDel(true);
              deleteBook(editing.id);
              router.back();
            }}
          />
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
