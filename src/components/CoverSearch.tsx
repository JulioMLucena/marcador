import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { findCovers } from '../lib/search';
import { useColors } from '../lib/theme';
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
  const [covers, setCovers] = useState<string[] | null>(null);
  const [broken, setBroken] = useState<Record<string, true>>({});

  useEffect(() => {
    if (!visible || !title.trim()) return;
    setCovers(null);
    setBroken({});
    findCovers(title, author, isbn).then(setCovers).catch(() => setCovers([]));
  }, [visible, title, author, isbn]);

  const shown = (covers || []).filter((u) => !broken[u]);

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
        {!covers ? (
          <Row style={{ gap: 10, justifyContent: 'center', paddingTop: 60 }}>
            <ActivityIndicator color={c.accent} />
            <Txt k="muted">Procurando edições…</Txt>
          </Row>
        ) : !shown.length ? (
          <View style={{ padding: 24, gap: 8 }}>
            <Txt k="h3">Não achei capas na web</Txt>
            <Txt k="muted">Feche e use “Fotografar capa” para tirar uma foto da sua edição.</Txt>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: ins.bottom + 24, gap: 14 }}>
            <Txt k="small">
              {shown.length === 1
                ? 'Só achei esta capa. Se a sua edição for outra, feche e fotografe a capa.'
                : `${shown.length} capas de edições diferentes. Toque na que é igual à sua.`}
            </Txt>
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
