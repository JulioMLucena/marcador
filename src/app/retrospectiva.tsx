import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Platform, Text, ToastAndroid, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Cover } from '../components/Cover';
import { Btn, Row, Screen, Txt } from '../components/ui';
import { DOW, fmtMinutes, MONTHS } from '../lib/dates';
import { monthRecap } from '../lib/stats';
import { useStore } from '../lib/store';
import { F } from '../lib/theme';
import { MOODS, type Mood } from '../lib/types';

// o cartão tem identidade própria, igual nos dois temas, porque vai para fora do app
const K = { bg: '#0F1D17', panel: '#17291F', ink: '#F1EEE4', muted: '#9DB3A6', amber: '#E8B04E', accent: '#73C3A3', dot: '#2A3F33' };
const toast = (m: string) => Platform.OS === 'android' && ToastAndroid.show(m, ToastAndroid.SHORT);

export default function Retrospectiva() {
  const { width } = useWindowDimensions();
  const { data } = useStore();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [busy, setBusy] = useState(false);
  const card = useRef<View>(null);
  const r = monthRecap(data, ym.y, ym.m);
  const W = Math.min(width - 32, 420);
  const H = Math.round((W * 16) / 9);
  const u = W / 360; // unidade de escala do cartão
  const isFuture = ym.y > now.getFullYear() || (ym.y === now.getFullYear() && ym.m > now.getMonth());

  const shift = (d: number) => setYm(({ y, m }) => ({ y: y + Math.floor((m + d) / 12), m: (m + d + 12) % 12 }));

  const snap = () => captureRef(card, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });

  const share = async () => {
    setBusy(true);
    try {
      const uri = await snap();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Postar a retrospectiva' });
    } catch {
      toast('Não consegui gerar a imagem. Tente de novo.');
    }
    setBusy(false);
  };
  const saveToGallery = async () => {
    setBusy(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) throw new Error('perm');
      await MediaLibrary.Asset.create(await snap());
      toast('Salvo na galeria');
    } catch {
      toast('Sem permissão para salvar na galeria.');
    }
    setBusy(false);
  };

  const moodTotal = r.moods.bom + r.moods.meh + r.moods.ruim;
  const stat = (v: string, l: string) => (
    <View style={{ flex: 1, backgroundColor: K.panel, borderRadius: 12 * u, padding: 10 * u }}>
      <Text style={{ color: K.ink, fontFamily: F.displayBold, fontSize: 22 * u }}>{v}</Text>
      <Text style={{ color: K.muted, fontFamily: F.medium, fontSize: 10.5 * u }}>{l}</Text>
    </View>
  );

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt k="h1">Retrospectiva</Txt>
        <Btn title="Fechar" kind="link" onPress={() => router.back()} />
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Btn title="‹" kind="ghost" onPress={() => shift(-1)} />
        <Txt k="h3">{MONTHS[ym.m]} de {ym.y}</Txt>
        <Btn title="›" kind="ghost" onPress={() => shift(1)} disabled={isFuture || (ym.y === now.getFullYear() && ym.m === now.getMonth())} />
      </Row>

      <View style={{ alignItems: 'center' }}>
        <View ref={card} collapsable={false} style={{ width: W, height: H, backgroundColor: K.bg, borderRadius: 18 * u, padding: 22 * u, justifyContent: 'space-between', overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: -120 * u, right: -90 * u, width: 300 * u, height: 300 * u, borderRadius: 150 * u, backgroundColor: K.amber, opacity: 0.12 }} />
          <View style={{ gap: 4 * u }}>
            <Text style={{ color: K.muted, fontFamily: F.semi, fontSize: 11 * u, letterSpacing: 2 * u }}>MARCADOR · {MONTHS[ym.m].toUpperCase()} {ym.y}</Text>
            <Text style={{ color: K.ink, fontFamily: F.displayBold, fontSize: 46 * u, lineHeight: 52 * u }}>{fmtMinutes(r.minutes)}</Text>
            <Text style={{ color: K.amber, fontFamily: F.displayItalic, fontSize: 17 * u }}>com um livro na mão</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 * u }}>
            {stat(r.pages.toLocaleString('pt-BR'), 'páginas')}
            {stat(String(r.days), r.days === 1 ? 'dia lendo' : 'dias lendo')}
            {stat(String(r.finished.length), r.finished.length === 1 ? 'livro lido' : 'livros lidos')}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 * u }}>
            {r.dayMarks.map((on, i) => (
              <View key={i} style={{ width: 14 * u, height: 14 * u, borderRadius: 4 * u, backgroundColor: on ? K.accent : K.dot }} />
            ))}
          </View>

          {r.topBook ? (
            <View style={{ flexDirection: 'row', gap: 14 * u, alignItems: 'center' }}>
              <Cover title={r.topBook.title} author={r.topBook.author} uri={r.topBook.cover} width={74 * u} />
              <View style={{ flex: 1, gap: 3 * u }}>
                <Text style={{ color: K.muted, fontFamily: F.semi, fontSize: 10 * u, letterSpacing: 1.5 * u }}>LIVRO DO MÊS</Text>
                <Text style={{ color: K.ink, fontFamily: F.display, fontSize: 18 * u }} numberOfLines={3}>{r.topBook.title}</Text>
                {r.topBook.author ? <Text style={{ color: K.muted, fontFamily: F.body, fontSize: 12 * u }} numberOfLines={1}>{r.topBook.author}</Text> : null}
              </View>
            </View>
          ) : (
            <Text style={{ color: K.muted, fontFamily: F.body, fontSize: 14 * u }}>Nenhuma leitura registrada neste mês ainda.</Text>
          )}

          {r.quote?.note ? (
            <View style={{ borderLeftWidth: 3 * u, borderLeftColor: K.amber, paddingLeft: 12 * u }}>
              <Text style={{ color: K.ink, fontFamily: F.displayItalic, fontSize: 15 * u, lineHeight: 22 * u }} numberOfLines={5}>“{r.quote.note}”</Text>
            </View>
          ) : null}

          {r.finished.length > 1 ? (
            <View style={{ flexDirection: 'row', gap: 6 * u }}>
              {r.finished.slice(0, 5).map((b) => (
                <Cover key={b.id} title={b.title} uri={b.cover} width={44 * u} />
              ))}
            </View>
          ) : null}

          <View style={{ gap: 6 * u }}>
            {moodTotal ? (
              <View style={{ flexDirection: 'row', height: 8 * u, borderRadius: 4 * u, overflow: 'hidden' }}>
                {(['bom', 'meh', 'ruim'] as Mood[]).map((k) =>
                  r.moods[k] ? <View key={k} style={{ flex: r.moods[k], backgroundColor: k === 'bom' ? K.accent : k === 'meh' ? K.amber : '#C9644F' }} /> : null,
                )}
              </View>
            ) : null}
            <Text style={{ color: K.muted, fontFamily: F.medium, fontSize: 11.5 * u }}>
              {r.bestDow >= 0 ? `Dia favorito: ${DOW[r.bestDow]}` : ''}
              {moodTotal ? `${r.bestDow >= 0 ? ' · ' : ''}${MOODS.bom.emoji} ${Math.round((r.moods.bom / moodTotal) * 100)}% das leituras animadas` : ''}
            </Text>
          </View>
        </View>
      </View>

      <Btn big icon="📲" title="Postar no Stories" onPress={share} disabled={busy} />
      <Txt k="small" style={{ textAlign: 'center' }}>Escolha o Instagram na lista e toque em Stories. Também funciona com WhatsApp, X e o que estiver instalado.</Txt>
      <Btn title="Salvar na galeria" kind="ghost" onPress={saveToGallery} disabled={busy} />
    </Screen>
  );
}
