import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, ToastAndroid, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Book3D } from '../components/Book3D';
import { Btn, Row, Screen, Txt } from '../components/ui';
import { cardPalette, coverRgb, fallbackRgb } from '../lib/coverColor';
import { daysBetween, fmtMinutes, MONTHS } from '../lib/dates';
import { useStore } from '../lib/store';
import { F, useColors } from '../lib/theme';

// o cartão vai para fora do app, então não segue o tema: as cores saem da capa do livro
const K = { ink: '#F1EEE4', muted: '#F1EEE4b3' };
const toast = (m: string) => Platform.OS === 'android' && ToastAndroid.show(m, ToastAndroid.SHORT);
const short = (t: number) => {
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
};

/** Cartão 9:16 de livro terminado para postar nos stories. */
export default function Compartilhar() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const [busy, setBusy] = useState(false);
  // trecho escolhido para o cartão; sem escolha, vai o último salvo
  const [pick, setPick] = useState<number | null | undefined>(undefined);
  const card = useRef<View>(null);
  const b = data.books.find((x) => x.id === id);
  const [pal, setPal] = useState(() => cardPalette(fallbackRgb(b?.title ?? '')));
  const cover = b?.cover;
  const title = b?.title ?? '';
  useEffect(() => {
    let live = true;
    coverRgb(cover, title).then((rgb) => live && setPal(cardPalette(rgb)));
    return () => {
      live = false;
    };
  }, [cover, title]);
  const W = Math.min(width - 32, 420);
  const H = Math.round((W * 16) / 9);
  const u = W / 360;

  if (!b) return null;
  const ss = data.sessions.filter((s) => s.bookId === b.id);
  const mins = ss.reduce((a, s) => a + (s.minutes || 0), 0);
  const readDays = new Set(ss.map((s) => s.day)).size;
  const end = b.finishedAt ?? Date.now();
  const span = b.startedAt ? daysBetween(new Date(b.startedAt), new Date(end)) + 1 : readDays;
  // marcado como lido sem leituras registradas: sem ritmo para mostrar
  const perDay = readDays || span ? String(Math.round(b.pages / Math.max(1, readDays || span))) : '–';
  const year = new Date(end).getFullYear();
  const nth = data.books.filter((x) => x.status === 'lido' && x.finishedAt && new Date(x.finishedAt).getFullYear() === year && x.finishedAt <= end).length || 1;
  const notes = [...ss].reverse().filter((s) => s.note).map((s) => s.note!);
  const quote = pick === null ? undefined : notes[pick ?? 0];
  const good = ss.filter((s) => s.mood === 'bom').length;
  const rated = ss.filter((s) => s.mood).length;

  const snap = () => captureRef(card, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });
  const share = async () => {
    setBusy(true);
    try {
      await Sharing.shareAsync(await snap(), { mimeType: 'image/png', dialogTitle: 'Postar nos stories' });
    } catch {
      toast('Não consegui gerar a imagem. Tente de novo.');
    }
    setBusy(false);
  };
  const saveToGallery = async () => {
    setBusy(true);
    try {
      // carregado só aqui: o módulo não existe na prévia web
      const MediaLibrary = await import('expo-media-library');
      if (!(await MediaLibrary.requestPermissionsAsync(true)).granted) throw new Error('perm');
      await MediaLibrary.Asset.create(await snap());
      toast('Salvo na galeria');
    } catch {
      toast('Sem permissão para salvar na galeria.');
    }
    setBusy(false);
  };

  const stat = (v: string, l: string) => (
    <View style={{ flex: 1, backgroundColor: pal.panel, borderRadius: 12 * u, paddingVertical: 10 * u, paddingHorizontal: 8 * u, alignItems: 'center' }}>
      <Text style={{ color: K.ink, fontFamily: F.displayBold, fontSize: 21 * u }}>{v}</Text>
      <Text style={{ color: K.muted, fontFamily: F.medium, fontSize: 10.5 * u }}>{l}</Text>
    </View>
  );

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt k="h1">Stories</Txt>
        <Btn title="Fechar" kind="link" onPress={() => router.back()} />
      </Row>

      <View style={{ alignItems: 'center' }}>
        <View ref={card} collapsable={false} style={{ width: W, height: H, backgroundColor: pal.bg, borderRadius: 18 * u, padding: 24 * u, justifyContent: 'space-between', overflow: 'hidden' }}>
          {/* luz atrás do livro, na cor da capa: círculos empilhados fazem o degradê */}
          {[200, 170, 140, 112, 86].map((r) => (
            <View key={r} style={{ position: 'absolute', top: 245 * u - r * u, left: W / 2 - r * u, width: 2 * r * u, height: 2 * r * u, borderRadius: r * u, backgroundColor: pal.glow, opacity: 0.09 }} />
          ))}

          <View style={{ alignItems: 'center', gap: 2 * u }}>
            <Text style={{ color: K.muted, fontFamily: F.semi, fontSize: 11 * u, letterSpacing: 2.5 * u }}>LIVRO TERMINADO</Text>
            <Text style={{ color: pal.accent, fontFamily: F.displayItalic, fontSize: 28 * u }}>Terminei!</Text>
          </View>

          <View style={{ alignItems: 'center', gap: 12 * u }}>
            <Book3D title={b.title} author={b.author} uri={b.cover} width={(quote ? 140 : 160) * u} />
            <View style={{ alignItems: 'center', gap: 3 * u }}>
              <Text style={{ color: K.ink, fontFamily: F.displayBold, fontSize: 23 * u, lineHeight: 29 * u, textAlign: 'center' }} numberOfLines={2}>{b.title}</Text>
              {b.author ? <Text style={{ color: K.muted, fontFamily: F.body, fontSize: 13.5 * u }} numberOfLines={1}>{b.author}</Text> : null}
            </View>
          </View>

          <View style={{ gap: 8 * u }}>
            <Text style={{ color: K.ink, fontFamily: F.semi, fontSize: 14.5 * u, textAlign: 'center' }}>
              {span ? `Em ${span} ${span === 1 ? 'dia' : 'dias'}` : 'Lido'} · {nth}º livro de {year}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 * u }}>
              {stat(b.pages.toLocaleString('pt-BR'), 'páginas')}
              {stat(mins ? fmtMinutes(mins) : '–', 'de leitura')}
              {stat(perDay, 'pág por dia')}
            </View>
          </View>

          {quote ? (
            <View style={{ borderLeftWidth: 3 * u, borderLeftColor: pal.accent, paddingLeft: 12 * u }}>
              <Text style={{ color: K.ink, fontFamily: F.displayItalic, fontSize: 14.5 * u, lineHeight: 21 * u }} numberOfLines={4}>“{quote}”</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Text style={{ color: K.muted, fontFamily: F.medium, fontSize: 11 * u }}>
              {b.startedAt ? `${short(b.startedAt)} → ${short(end)}` : short(end)}
              {rated ? ` · 😍 ${Math.round((good / rated) * 100)}% com vontade` : ''}
            </Text>
            <Text style={{ color: pal.accent, fontFamily: F.displayBold, fontSize: 13 * u }}>Marcador</Text>
          </View>
        </View>
      </View>

      {notes.length > 1 ? (
        <View style={{ gap: 8 }}>
          <Txt k="label">Trecho no cartão</Txt>
          {[...notes.map((n, i) => ({ i: i as number | null, t: `“${n}”` })), { i: null, t: 'Sem trecho' }].map(({ i, t }) => {
            const on = (pick === undefined ? 0 : pick) === i;
            return (
              <Pressable
                key={String(i)}
                onPress={() => setPick(i)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={{ borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.line, backgroundColor: c.surface, borderRadius: 12, padding: 12 }}
              >
                <Txt k={i === null ? 'small' : 'quote'} lines={2} style={{ fontSize: 15 }}>{t}</Txt>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Btn big icon="📲" title="Postar no Stories" onPress={share} disabled={busy} />
      <Txt k="small" style={{ textAlign: 'center' }}>Escolha o Instagram na lista e toque em Stories.</Txt>
      <Btn title="Salvar na galeria" kind="ghost" onPress={saveToGallery} disabled={busy} />
    </Screen>
  );
}
