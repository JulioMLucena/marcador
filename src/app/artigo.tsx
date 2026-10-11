import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Screen, Txt } from '../components/ui';
import { bundledArtigos, loadArtigos, type Artigo } from '../lib/artigos';
import { MONTHS } from '../lib/dates';
import { F, useColors } from '../lib/theme';

/** Um artigo da equipe do Marcador. */
export default function ArtigoScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [arts, setArts] = useState<Artigo[]>(bundledArtigos);
  useEffect(() => {
    loadArtigos().then(setArts).catch(() => {});
  }, []);
  const a = arts.find((x) => x.id === id);
  if (!a) return null;
  const [y, m, d] = a.date.split('-').map(Number);
  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Voltar">
        <Ionicons name="chevron-back" size={26} color={c.ink} />
      </Pressable>
      <View style={{ height: 150, borderRadius: 18, backgroundColor: a.color, alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={{ fontSize: 64, lineHeight: 76 }}>{a.emoji}</Txt>
      </View>
      <View style={{ gap: 6 }}>
        <Txt style={{ color: c.amber, fontFamily: F.semi, fontSize: 12, letterSpacing: 1.5 }}>MARCADOR+ · DA EQUIPE</Txt>
        <Txt k="h1" style={{ fontSize: 28, lineHeight: 34 }}>{a.title}</Txt>
        {a.subtitle ? <Txt style={{ color: c.muted, fontSize: 17 }}>{a.subtitle}</Txt> : null}
        <Txt k="small">{a.author} · {d} de {MONTHS[m - 1].toLowerCase()} de {y} · {a.minutes} min</Txt>
      </View>
      {a.body.map((p, i) =>
        p.startsWith('## ') ? (
          <Txt key={i} k="h3" style={{ marginTop: 6 }}>{p.slice(3)}</Txt>
        ) : (
          <Txt key={i} style={{ fontSize: 16.5, lineHeight: 26 }}>{p}</Txt>
        ),
      )}
    </Screen>
  );
}
