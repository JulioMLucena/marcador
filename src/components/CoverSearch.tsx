import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { findCovers } from '../lib/search';
import { F, useColors } from '../lib/theme';
import { Row, Txt } from './ui';

/** Grade de capas achadas na web, uma por edição; o leitor escolhe a dele. */
export function CoverSearch({
  visible, title, author, isbn, current, onPick, onClose,
}: {
  visible: boolean; title: string; author?: string; isbn?: string; current?: string;
  onPick: (uri: string) => void; onClose: () => void;
}) {
  const c = useColors();
  const ins = useSafeAreaInsets();
  const [covers, setCovers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [broken, setBroken] = useState<Record<string, true>>({});
  // a busca pode ser trocada: outro título, o nome da edição, a editora…
  const [q, setQ] = useState({ title, author: author || '' });
  const [typed, setTyped] = useState(title);

  useEffect(() => {
    if (visible) {
      setQ({ title, author: author || '' });
      setTyped(title);
    }
  }, [visible, title, author]);

  useEffect(() => {
    if (!visible || !q.title.trim()) return;
    let alive = true;
    setCovers([]);
    setBroken({});
    setLoading(true);
    findCovers(q.title, q.author || undefined, q.title === title ? isbn : undefined, (c) => alive && setCovers(c))
      .then((c) => alive && setCovers(c))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [visible, q, title, isbn]);

  const shown = covers.filter((u) => !broken[u]);
  const search = () => {
    const t = typed.trim();
    if (!t) return;
    // texto diferente do título: busca solta, sem prender ao autor
    setQ(t === title ? { title, author: author || '' } : { title: t, author: '' });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: ins.top + 12 }}>
        <Row style={{ justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt k="h2">Escolha a capa</Txt>
            <Txt k="small" lines={1}>{title}{author ? ` · ${author}` : ''}</Txt>
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
            <Ionicons name="close" size={28} color={c.ink} />
          </Pressable>
        </Row>
        <Row style={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={search}
            returnKeyType="search"
            placeholder="Título, edição ou editora"
            placeholderTextColor={c.muted}
            style={{ flex: 1, fontFamily: F.body, fontSize: 15, color: c.ink, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }}
          />
          <Pressable onPress={search} accessibilityRole="button" accessibilityLabel="Buscar capas" style={{ backgroundColor: c.accent, borderRadius: 12, padding: 10 }}>
            <Ionicons name="search" size={20} color={c.accentInk} />
          </Pressable>
        </Row>
        {!shown.length && loading ? (
          <Row style={{ gap: 10, justifyContent: 'center', paddingTop: 60 }}>
            <ActivityIndicator color={c.accent} />
            <Txt k="muted">Procurando edições…</Txt>
          </Row>
        ) : !shown.length ? (
          <View style={{ padding: 24, gap: 8 }}>
            <Txt k="h3">Não achei capas na web</Txt>
            <Txt k="muted">Tente escrever o título de outro jeito acima, ou feche e use “Fotografar capa” para tirar uma foto da sua edição.</Txt>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: ins.bottom + 24, gap: 14 }}>
            <Row style={{ gap: 8 }}>
              {loading ? <ActivityIndicator size="small" color={c.accent} /> : null}
              <Txt k="small" style={{ flex: 1 }}>
                {loading
                  ? `${shown.length} até agora, procurando mais…`
                  : shown.length === 1
                    ? 'Só achei esta capa. Se a sua edição for outra, busque de outro jeito ou fotografe a capa.'
                    : `${shown.length} capas de edições diferentes. Toque na que é igual à sua.`}
              </Txt>
            </Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {shown.map((u) => {
                const on = u === current;
                return (
                  <Pressable key={u} onPress={() => onPick(u)} style={{ width: '30.5%' }} accessibilityRole="button" accessibilityLabel="Usar esta capa">
                    <View style={{ aspectRatio: 2 / 3, borderRadius: 6, overflow: 'hidden', backgroundColor: c.line, borderWidth: on ? 3 : 0, borderColor: c.accent }}>
                      <Image
                        source={{ uri: u }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                        onError={() => setBroken((b) => ({ ...b, [u]: true }))}
                        // o Open Library devolve uma imagem 1x1 quando não tem capa
                        onLoad={(e) => e.source.width < 10 && setBroken((b) => ({ ...b, [u]: true }))}
                      />
                    </View>
                    {on ? <Txt k="small" style={{ color: c.accent, textAlign: 'center', marginTop: 4 }}>Atual</Txt> : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
