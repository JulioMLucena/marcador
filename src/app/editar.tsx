import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Cover } from '../components/Cover';
import { CoverPicker } from '../components/CoverPicker';
import { Btn, Card, Row, Screen, Seg, Txt, s } from '../components/ui';
import { uid } from '../lib/dates';
import { askNotificationPermission } from '../lib/notify';
import { useStore } from '../lib/store';
import { F, useColors } from '../lib/theme';
import { searchBooks, guessFormat, type Found } from '../lib/search';
import { DENSO, kindOf, type Book, type BookStatus, type Format, type Kind } from '../lib/types';

type P = { id?: string; isbn?: string; title?: string; author?: string; pages?: string; cover?: string; status?: BookStatus; format?: Format; genres?: string };

export default function Livro() {
  const c = useColors();
  const p = useLocalSearchParams<P>();
  const { data, saveBook, deleteBook, saveList, current } = useStore();
  const editing = data.books.find((b) => b.id === p.id);
  const [title, setTitle] = useState(editing?.title ?? p.title ?? '');
  const [author, setAuthor] = useState(editing?.author ?? p.author ?? '');
  const [pages, setPages] = useState(String(editing?.pages ?? p.pages ?? ''));
  const [page, setPage] = useState(String(editing?.page ?? 0));
  const [why, setWhy] = useState(editing?.why ?? '');
  const [status, setStatus] = useState<BookStatus>(editing?.status ?? p.status ?? (current ? 'fila' : 'lendo'));
  const [kindManual, setKindManual] = useState(!!editing?.kindManual);
  const [kind, setKind] = useState<Kind>(editing ? kindOf(editing) : 'denso');
  const [confirmDel, setConfirmDel] = useState(false);
  const [cover, setCover] = useState<string | undefined>(editing?.cover ?? (p.cover || undefined));
  const [isbn, setIsbn] = useState(editing?.isbn ?? (p.isbn || undefined));
  const [format, setFormat] = useState<Format>(editing?.format ?? p.format ?? 'livro');
  const [genres, setGenres] = useState<string[] | undefined>(editing?.genres ?? (p.genres ? p.genres.split('|') : undefined));
  const [inLists, setInLists] = useState<string[]>(data.lists.filter((l) => editing && l.bookIds.includes(editing.id)).map((l) => l.id));
  const [newList, setNewList] = useState<string | null>(null);
  // sugestões pelo título só para livro novo digitado à mão
  const [hints, setHints] = useState<Found[] | null>(null);
  const [hintsOn, setHintsOn] = useState(!editing && !p.title && !p.isbn);
  const typed = useRef(false);
  const nPages = parseInt(pages, 10) || 0;

  useEffect(() => {
    if (!hintsOn || !typed.current || title.trim().length < 3) return setHints(null);
    let alive = true;
    setHints(null);
    const t = setTimeout(() => {
      searchBooks(title, (r) => alive && r.length && setHints(r)).then((r) => alive && setHints(r)).catch(() => alive && setHints([]));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [title, hintsOn]);

  const pickHint = (h: Found) => {
    setTitle(h.title);
    if (h.author) setAuthor(h.author);
    if (h.pages) setPages(String(h.pages));
    if (h.cover) setCover(h.cover);
    if (h.isbn) setIsbn(h.isbn);
    if (h.categories.length) setGenres(h.categories);
    setFormat(guessFormat(h));
    setHintsOn(false);
    setHints(null);
  };
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
      kind: shownKind, kindManual, cover: cover || undefined, isbn, format: format === 'livro' ? undefined : format, genres, updatedAt: now,
      ...(status === 'lendo' && !editing?.startedAt ? { startedAt: now } : {}),
      ...(status === 'lido' && !editing?.finishedAt ? { finishedAt: now } : {}),
    } as Book;
    saveBook(b);
    for (const l of data.lists) {
      const want = inLists.includes(l.id);
      if (want !== l.bookIds.includes(b.id)) saveList({ ...l, bookIds: want ? [...l.bookIds, b.id] : l.bookIds.filter((x) => x !== b.id) });
    }
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
            {input(title, (v) => { typed.current = true; setTitle(v); }, { placeholder: 'Livro, mangá ou HQ' })}
            <Txt k="label">Autor</Txt>
            {input(author, setAuthor, { placeholder: 'Opcional' })}
          </View>
        </Row>
        {hintsOn && typed.current && title.trim().length >= 3 ? (
          <Card style={{ gap: 0, paddingVertical: 8 }}>
            <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
              <Txt k="label">É algum destes?</Txt>
              <Btn title="Não, vou preencher" kind="link" onPress={() => setHintsOn(false)} />
            </Row>
            {!hints ? (
              <Row style={{ gap: 8, paddingVertical: 10 }}>
                <ActivityIndicator color={c.accent} />
                <Txt k="small">Procurando “{title.trim()}”…</Txt>
              </Row>
            ) : !hints.length ? (
              <Txt k="small" style={{ paddingVertical: 8 }}>Não achei esse título. Continue preenchendo à mão.</Txt>
            ) : (
              hints.map((h, i) => (
                <Pressable key={i} onPress={() => pickHint(h)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
                  <Cover title={h.title} author={h.author} uri={h.cover} width={40} />
                  <View style={[s.grow, { gap: 2 }]}>
                    <Txt lines={2} style={{ fontFamily: F.semi, fontSize: 15 }}>{h.title}</Txt>
                    <Txt k="small" lines={1}>{[h.author, h.pages ? `${h.pages} pág` : null].filter(Boolean).join(' · ')}</Txt>
                  </View>
                  <Txt style={{ color: c.accent, fontFamily: F.semi, fontSize: 14 }}>Usar</Txt>
                </Pressable>
              ))
            )}
          </Card>
        ) : null}
        <View style={{ gap: 6 }}>
          <Txt k="label">{cover ? 'Trocar a capa' : 'Sem capa? Adicione a sua'}</Txt>
          <CoverPicker cover={cover} onChange={setCover} title={title} author={author} isbn={isbn} />
        </View>
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
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt k="label">Colocar em listas</Txt>
            {newList === null ? <Btn title="+ Nova lista" kind="link" onPress={() => setNewList('')} /> : null}
          </Row>
          {data.lists.length ? (
            <Row style={{ flexWrap: 'wrap', gap: 8 }}>
              {data.lists.map((l) => {
                const on = inLists.includes(l.id);
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => setInLists(on ? inLists.filter((x) => x !== l.id) : [...inLists, l.id])}
                    style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.soft : 'transparent' }}
                  >
                    <Txt k="small" style={{ color: c.ink }}>{l.emoji ?? '📚'} {l.name}{on ? '  ✓' : ''}</Txt>
                  </Pressable>
                );
              })}
            </Row>
          ) : newList === null ? (
            <Txt k="small">Nenhuma lista ainda. Crie uma aqui mesmo.</Txt>
          ) : null}
          {newList !== null ? (
            <Row>
              <View style={s.grow}>{input(newList, setNewList, { placeholder: 'Nome da lista', autoFocus: true })}</View>
              <Btn
                title="Criar"
                disabled={!newList.trim()}
                onPress={() => {
                  const id = uid();
                  saveList({ id, name: newList.trim(), emoji: '📚', bookIds: [], createdAt: Date.now() });
                  setInLists([...inLists, id]);
                  setNewList(null);
                }}
              />
            </Row>
          ) : null}
        </Card>
        <Btn big title={editing ? 'Salvar' : 'Adicionar à estante'} onPress={save} disabled={!title.trim()} />
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
