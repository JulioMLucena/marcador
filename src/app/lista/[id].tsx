import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Cover } from '../../components/Cover';
import { Btn, Card, Row, Screen, Txt, s } from '../../components/ui';
import { uid } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { F, useColors } from '../../lib/theme';
import type { Book, BookStatus } from '../../lib/types';

const EMOJIS = ['📚', '🏖️', '🎁', '🌙', '🧠', '❤️', '🔥', '🌎'];
const STATUS_LABEL: Record<BookStatus, string> = { lendo: 'Lendo', fila: 'Na fila', pausado: 'Pausado', lido: 'Lido' };

export default function Lista() {
  const c = useColors();
  const p = useLocalSearchParams<{ id: string; book?: string }>();
  const { data, saveList, deleteList } = useStore();
  const list = data.lists.find((l) => l.id === p.id);
  const isNew = !list;
  const [name, setName] = useState(list?.name ?? '');
  const [emoji, setEmoji] = useState(list?.emoji ?? EMOJIS[0]);
  const [editing, setEditing] = useState(isNew);
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const inList = list ? (list.bookIds.map((id) => data.books.find((b) => b.id === id)).filter(Boolean) as Book[]) : [];
  const others = data.books.filter((b) => !list?.bookIds.includes(b.id));
  const read = inList.filter((b) => b.status === 'lido').length;

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
          ) : (
            <Card style={{ backgroundColor: c.soft, borderColor: 'transparent' }}>
              <Txt>Lista vazia. Adicione livros da sua estante.</Txt>
            </Card>
          )}

          {adding ? (
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt k="label">Toque para adicionar</Txt>
                <Btn title="Pronto" kind="link" onPress={() => setAdding(false)} />
              </Row>
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
