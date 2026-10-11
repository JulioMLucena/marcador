import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { Cover } from '../../components/Cover';
import { Btn, Card, Row, Screen, Txt, s } from '../../components/ui';
import { uid } from '../../lib/dates';
import { openObra } from '../../lib/nav';
import { searchBooks, guessFormat, norm, sized, type Found } from '../../lib/search';
import { useStore } from '../../lib/store';
import { F, useColors } from '../../lib/theme';
import type { Book, BookStatus, Want } from '../../lib/types';

const EMOJIS = ['📚', '🏖️', '🎁', '🌙', '🧠', '❤️', '🔥', '🌎'];
const STATUS_LABEL: Record<BookStatus, string> = { lendo: 'Lendo', fila: 'Na fila', pausado: 'Pausado', lido: 'Lido' };

export default function Lista() {
  const c = useColors();
  const p = useLocalSearchParams<{ id: string; book?: string }>();
  const { data, saveList, deleteList, saveBook } = useStore();
  const list = data.lists.find((l) => l.id === p.id);
  const isNew = !list;
  const [name, setName] = useState(list?.name ?? '');
  const [emoji, setEmoji] = useState(list?.emoji ?? EMOJIS[0]);
  const [editing, setEditing] = useState(isNew);
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Found[] | null>(null);

  // busca simples pelo título, para pôr na lista livros que você ainda não tem
  useEffect(() => {
    if (q.trim().length < 3) return setHits(null);
    let alive = true;
    setHits(null);
    const t = setTimeout(() => searchBooks(q, (r) => alive && r.length && setHits(r)).then((r) => alive && setHits(r)).catch(() => alive && setHits([])), 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const inList = list ? (list.bookIds.map((id) => data.books.find((b) => b.id === id)).filter(Boolean) as Book[]) : [];
  const others = data.books.filter((b) => !list?.bookIds.includes(b.id));
  const read = inList.filter((b) => b.status === 'lido').length;
  const wants = list?.wants ?? [];
  const sameBook = (a: { title: string }, b: { title: string }) => norm(a.title.split(':')[0]) === norm(b.title.split(':')[0]);

  const addWant = (f: Found) => {
    if (!list) return;
    const shelf = data.books.find((b) => sameBook(b, f));
    // já está na estante: entra como livro da estante mesmo
    if (shelf) {
      if (!list.bookIds.includes(shelf.id)) saveList({ ...list, bookIds: [...list.bookIds, shelf.id] });
    } else if (!wants.some((w) => sameBook(w, f))) {
      const w: Want = { title: f.title, author: f.author, cover: f.cover, pages: f.pages, isbn: f.isbn, gid: f.gid, olKey: f.olKey, olEdition: f.olEdition, categories: f.categories, addedAt: Date.now() };
      saveList({ ...list, wants: [w, ...wants] });
    }
    setQ('');
  };
  /** Comprou: vira livro da estante (na fila) e continua na lista. */
  const bought = (w: Want) => {
    if (!list) return;
    const now = Date.now();
    const id = uid();
    const format = guessFormat({ title: w.title, categories: w.categories ?? [] });
    saveBook({ id, title: w.title, author: w.author, pages: w.pages || 1, page: 0, cover: w.cover, isbn: w.isbn, genres: w.categories, format: format === 'livro' ? undefined : format, status: 'fila', createdAt: now, updatedAt: now });
    saveList({ ...list, bookIds: [...list.bookIds, id], wants: wants.filter((x) => x !== w) });
  };

  const save = () => {
    if (!name.trim()) return;
    if (list) {
      saveList({ ...list, name: name.trim(), emoji });
      setEditing(false);
    } else {
      const id = uid();
      saveList({ id, name: name.trim(), emoji, bookIds: p.book ? [p.book] : [], createdAt: Date.now() });
      router.replace({ pathname: '/lista/[id]', params: { id } });
    }
  };

  const nameForm = (
    <Card>
      <Txt k="label">Nome da lista</Txt>
      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus={isNew}
        placeholder="Ex.: Para as férias"
        placeholderTextColor={c.muted}
        onSubmitEditing={save}
        style={{ fontFamily: F.body, fontSize: 17, color: c.ink, backgroundColor: c.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: c.line }}
      />
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {EMOJIS.map((e) => (
          <Pressable
            key={e}
            onPress={() => setEmoji(e)}
            style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: e === emoji ? c.soft : 'transparent', borderWidth: 1, borderColor: e === emoji ? c.accent : c.line }}
          >
            <Txt style={{ fontSize: 20 }}>{e}</Txt>
          </Pressable>
        ))}
      </Row>
      <Btn title={isNew ? 'Criar lista' : 'Salvar'} onPress={save} disabled={!name.trim()} />
    </Card>
  );

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={26} color={c.ink} />
        </Pressable>
        {!isNew && !editing ? (
          <Pressable
            onPress={() => setEditing(true)}
            hitSlop={12}
            accessibilityLabel="Renomear lista"
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="pencil" size={18} color={c.ink} />
          </Pressable>
        ) : null}
      </Row>

      {isNew ? <Txt k="h1">Nova lista</Txt> : editing ? nameForm : (
        <View style={{ gap: 4 }}>
          <Txt k="h1">{list.emoji} {list.name}</Txt>
          <Txt k="small">
            {inList.length} {inList.length === 1 ? 'livro' : 'livros'}
            {inList.length ? ` · ${read} ${read === 1 ? 'lido' : 'lidos'}` : ''}
            {wants.length ? ` · ${wants.length} pra comprar` : ''}
          </Txt>
        </View>
      )}
      {isNew ? nameForm : null}

      {list ? (
        <>
          {inList.length ? (
            <Card style={{ gap: 0 }}>
              {inList.map((b, i) => (
                <Row key={b.id} style={{ gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <Pressable onPress={() => router.push({ pathname: '/livro/[id]', params: { id: b.id } })} style={[s.grow, { flexDirection: 'row', gap: 12, alignItems: 'center' }]}>
                    <Cover title={b.title} author={b.author} uri={b.cover} width={44} />
                    <View style={[s.grow, { gap: 2 }]}>
                      <Txt lines={2} style={{ fontFamily: F.semi, fontSize: 15 }}>{b.title}</Txt>
                      <Txt k="small" lines={1}>{[b.author, STATUS_LABEL[b.status]].filter(Boolean).join(' · ')}</Txt>
                    </View>
                  </Pressable>
                  <Pressable
                    hitSlop={10}
                    accessibilityLabel={`Tirar ${b.title} da lista`}
                    onPress={() => saveList({ ...list, bookIds: list.bookIds.filter((x) => x !== b.id) })}
                  >
                    <Ionicons name="close-circle-outline" size={22} color={c.muted} />
                  </Pressable>
                </Row>
              ))}
            </Card>
          ) : !wants.length ? (
            <Card style={{ backgroundColor: c.soft, borderColor: 'transparent' }}>
              <Txt>Lista vazia. Adicione livros da sua estante ou busque os que você quer comprar.</Txt>
            </Card>
          ) : null}

          {wants.length ? (
            <Card style={{ gap: 0 }}>
              <Txt k="label" style={{ marginBottom: 4 }}>Pra comprar</Txt>
              {wants.map((w, i) => (
                <Row key={w.title + w.addedAt} style={{ gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <Pressable onPress={() => openObra(w)} style={[s.grow, { flexDirection: 'row', gap: 12, alignItems: 'center' }]} accessibilityRole="button">
                    <View style={{ opacity: 0.85 }}>
                      <Cover title={w.title} author={w.author} uri={sized(w.cover, 200)} width={44} />
                    </View>
                    <View style={[s.grow, { gap: 2 }]}>
                      <Txt lines={2} style={{ fontFamily: F.semi, fontSize: 15 }}>{w.title}</Txt>
                      <Txt k="small" lines={1}>{[w.author?.split(',')[0], 'Ver preços'].filter(Boolean).join(' · ')}</Txt>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => bought(w)}
                    accessibilityLabel={`Comprei ${w.title}`}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: c.accent }}
                  >
                    <Txt k="small" style={{ color: c.accent, fontFamily: F.semi }}>Comprei</Txt>
                  </Pressable>
                  <Pressable hitSlop={10} accessibilityLabel={`Tirar ${w.title} da lista`} onPress={() => saveList({ ...list, wants: wants.filter((x) => x !== w) })}>
                    <Ionicons name="close-circle-outline" size={22} color={c.muted} />
                  </Pressable>
                </Row>
              ))}
              <Txt k="small" style={{ marginTop: 6 }}>Toque em Comprei quando ele chegar: o livro vai para a sua estante.</Txt>
            </Card>
          ) : null}

          {adding ? (
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt k="label">Adicionar à lista</Txt>
                <Btn title="Pronto" kind="link" onPress={() => setAdding(false)} />
              </Row>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Buscar livro que você ainda não tem"
                placeholderTextColor={c.muted}
                returnKeyType="search"
                style={{ fontFamily: F.body, fontSize: 16, color: c.ink, backgroundColor: c.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: c.line }}
              />
              {q.trim().length >= 3 ? (
                hits === null ? (
                  <ActivityIndicator color={c.accent} style={{ alignSelf: 'flex-start' }} />
                ) : hits.length ? (
                  <View style={{ gap: 0 }}>
                    {hits.map((h, i) => (
                      <Pressable key={h.title + i} onPress={() => addWant(h)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                        <Cover title={h.title} author={h.author} uri={sized(h.cover, 200)} width={36} />
                        <View style={[s.grow, { gap: 1 }]}>
                          <Txt lines={2} style={{ fontFamily: F.semi, fontSize: 14.5 }}>{h.title}</Txt>
                          {h.author ? <Txt k="small" lines={1}>{h.author}</Txt> : null}
                        </View>
                        <Ionicons name="add-circle" size={26} color={c.accent} />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Txt k="small">Não achei. Tente só uma parte do título.</Txt>
                )
              ) : null}
              <Txt k="label" style={{ marginTop: 6 }}>Da sua estante</Txt>
              {others.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {others.map((b) => (
                    <Pressable key={b.id} onPress={() => saveList({ ...list, bookIds: [...list.bookIds, b.id] })} style={{ width: '22%', gap: 4 }}>
                      <Cover title={b.title} author={b.author} uri={b.cover} width={70} />
                      <Txt k="small" lines={2} style={{ fontSize: 11.5 }}>{b.title}</Txt>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Txt k="small">Todos os livros da estante já estão nesta lista.</Txt>
              )}
            </Card>
          ) : (
            <Btn title="Adicionar livros" icon="➕" kind="ghost" onPress={() => setAdding(true)} />
          )}

          <Btn
            title={confirmDel ? 'Toque de novo para apagar a lista' : 'Apagar lista'}
            kind={confirmDel ? 'danger' : 'link'}
            fg={confirmDel ? undefined : c.warn}
            onPress={() => {
              if (!confirmDel) return setConfirmDel(true);
              deleteList(list.id);
              router.back();
            }}
          />
          <Txt k="small" style={{ textAlign: 'center' }}>Apagar a lista não apaga os livros da estante.</Txt>
        </>
      ) : null}
    </Screen>
  );
}
