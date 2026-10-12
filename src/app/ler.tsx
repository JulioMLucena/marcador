import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as IntentLauncher from 'expo-intent-launcher';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useConfetti } from '../components/Confetti';
import { Btn, Row } from '../components/ui';
import { fmtClock } from '../lib/dates';
import { askNotificationPermission } from '../lib/notify';
import { useStore, withLive } from '../lib/store';
import { F } from '../lib/theme';
import type { SoundId } from '../lib/types';

const SOUNDS: { id: SoundId; label: string; src?: number }[] = [
  { id: 'chuva', label: 'Chuva', src: require('../../assets/sounds/chuva.wav') },
  { id: 'ondas', label: 'Ondas', src: require('../../assets/sounds/ondas.wav') },
  { id: 'marrom', label: 'Ruído marrom', src: require('../../assets/sounds/marrom.wav') },
  { id: 'nenhum', label: 'Silêncio' },
];

// o modo foco é sempre escuro, como uma luz de leitura
const BG = '#0B100E';
const INK = '#E9EEE9';
const MUTED = '#8A9A91';
const ACCENT = '#73C3A3';
const AMBER = '#E2A84A';
const SPOTIFY = '#1DB954';

const elapsedOf = (t: { start: number; pausedMs: number; pausedAt: number | null }) =>
  Math.max(0, Math.floor(((t.pausedAt || Date.now()) - t.start - (t.pausedMs || 0)) / 1000));

export default function Ler() {
  useKeepAwake();
  const ins = useSafeAreaInsets();
  const confetti = useConfetti();
  const { timer, setTimer, data, setSettings, setFinish } = useStore();
  const book = data.books.find((b) => b.id === timer?.bookId);
  const [, tick] = useState(0);
  const sound = data.settings.sound;
  const player = useAudioPlayer(SOUNDS.find((x) => x.id === sound)?.src ?? null);
  const glow = useRef(new Animated.Value(0)).current;
  const { fim } = useLocalSearchParams<{ fim?: string }>();
  // ao terminar, o cronômetro some antes da troca de tela; sem isto a tela voltava para o Hoje por cima do Terminar
  const leaving = useRef(false);
  const [linking, setLinking] = useState(false);
  const [link, setLink] = useState(data.settings.playlist || '');

  useFocusEffect(
    useCallback(() => {
      if (!timer && !leaving.current) router.replace('/');
    }, [timer]),
  );

  // a notificação ao vivo precisa da permissão de avisos
  useEffect(() => {
    askNotificationPermission().catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);

  useEffect(() => {
    player.loop = true;
    player.volume = 0.7;
    if (sound !== 'nenhum' && timer && !timer.pausedAt) player.play();
    else player.pause();
  }, [player, sound, timer]);

  const el = timer ? elapsedOf(timer) : 0;
  const target = (timer?.target || 5) * 60;
  const reached = el >= target;

  useEffect(() => {
    if (!timer || !reached) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
    if (!timer.cheered) {
      setTimer({ ...timer, cheered: true });
      confetti(1);
    }
  }, [reached, timer, glow, setTimer, confetti]);

  // botão Terminei da notificação abre esta tela com ?fim=1
  const stopRef = useRef(() => {});
  useEffect(() => {
    if (fim && timer) stopRef.current();
  }, [fim, timer]);

  if (!timer) return null;
  const R = 112;
  const C = 2 * Math.PI * R;
  const frac = Math.min(1, el / target);

  const togglePause = () =>
    setTimer(timer.pausedAt ? { ...timer, pausedMs: timer.pausedMs + Date.now() - timer.pausedAt, pausedAt: null } : { ...timer, pausedAt: Date.now() });

  const stop = () => {
    if (leaving.current) return;
    leaving.current = true;
    // se pausou pela notificação com o app fechado, vale o tempo de lá
    const t = withLive(timer);
    setFinish({ bookId: t.bookId, start: t.start, minutes: elapsedOf(t) / 60, fromPage: t.fromPage });
    setTimer(null);
    player.pause();
    router.replace('/terminar');
  };

  const playlist = data.settings.playlist;
  const openPlaylist = (url = playlist) => {
    if (!url) return;
    // o som ambiente sai para a playlist tocar sozinha
    if (sound !== 'nenhum') setSettings({ sound: 'nenhum' });
    Linking.openURL(url).catch(() => {});
  };
  const savePlaylist = () => {
    const url = link.trim().match(/https?:\/\/\S+|spotify:\S+/)?.[0];
    if (!url) return;
    setSettings({ playlist: url });
    setLinking(false);
    openPlaylist(url);
  };
  stopRef.current = stop;

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: ins.top + 16, paddingBottom: ins.bottom + 16, paddingHorizontal: 20, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ color: MUTED, fontFamily: F.semi, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' }}>Modo foco</Text>
        <Text style={{ color: INK, fontFamily: F.display, fontSize: 22, textAlign: 'center' }} numberOfLines={2}>
          {book?.title}
        </Text>
        <Text style={{ color: MUTED, fontFamily: F.body, fontSize: 15 }}>Comece na página {book?.page || 1}</Text>
        {book?.hook ? (
          <Text style={{ color: AMBER, fontFamily: F.displayItalic, fontSize: 15, textAlign: 'center', maxWidth: 320, marginTop: 4 }}>{book.hook}</Text>
        ) : null}
      </View>

      <Pressable onPress={togglePause} accessibilityLabel={timer.pausedAt ? 'Continuar' : 'Pausar'} style={{ alignItems: 'center' }}>
        <Animated.View style={{ width: 260, height: 260, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] }) }}>
          <Svg width={260} height={260} viewBox="0 0 260 260" style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={130} cy={130} r={R} stroke="#1E2A24" strokeWidth={12} fill="none" />
            <Circle
              cx={130} cy={130} r={R} stroke={reached ? AMBER : ACCENT} strokeWidth={12} fill="none" strokeLinecap="round"
              strokeDasharray={`${C}`} strokeDashoffset={C * (1 - frac)}
            />
          </Svg>
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Text style={{ color: INK, fontFamily: F.display, fontSize: 56, fontVariant: ['tabular-nums'] }}>{fmtClock(el)}</Text>
            <Text style={{ color: reached ? AMBER : MUTED, fontFamily: F.medium, fontSize: 14 }}>
              {timer.pausedAt ? 'Pausado. Toque para seguir.' : reached ? 'Meta cumprida. Pode seguir.' : `meta de ${timer.target} min`}
            </Text>
          </View>
        </Animated.View>
      </Pressable>

      <View style={{ gap: 14 }}>
        <Row style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
          {SOUNDS.map((x) => (
            <Pressable
              key={x.id}
              onPress={() => setSettings({ sound: x.id })}
              accessibilityRole="button"
              accessibilityState={{ selected: sound === x.id }}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: sound === x.id ? ACCENT : '#2A3530', backgroundColor: sound === x.id ? '#73C3A322' : 'transparent' }}
            >
              <Text style={{ color: sound === x.id ? ACCENT : MUTED, fontFamily: F.medium, fontSize: 14 }}>{x.label}</Text>
            </Pressable>
          ))}
        </Row>
        {linking ? (
          <View style={{ gap: 8 }}>
            <TextInput
              value={link}
              onChangeText={setLink}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Cole o link da playlist"
              placeholderTextColor={MUTED}
              style={{ color: INK, fontFamily: F.body, fontSize: 15, borderWidth: 1, borderColor: '#2A3530', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}
            />
            <Text style={{ color: MUTED, fontFamily: F.body, fontSize: 12, textAlign: 'center' }}>No Spotify: abra a playlist, toque em ⋯ › Compartilhar › Copiar link.</Text>
            <Row style={{ gap: 10 }}>
              <Btn title="Cancelar" kind="ghost" onPress={() => setLinking(false)} fg={INK} style={{ flex: 1, borderColor: '#2A3530' }} />
              <Btn title="Salvar e tocar" onPress={savePlaylist} fg="#0B1410" style={{ flex: 1, backgroundColor: SPOTIFY, borderColor: SPOTIFY }} />
            </Row>
          </View>
        ) : (
          <Row style={{ justifyContent: 'center', gap: 14 }}>
            <Pressable onPress={() => (playlist ? openPlaylist() : setLinking(true))} accessibilityRole="button" style={{ padding: 6 }}>
              <Text style={{ color: SPOTIFY, fontFamily: F.semi, fontSize: 14 }}>🎵 {playlist ? 'Tocar minha playlist' : 'Ligar minha playlist do Spotify'}</Text>
            </Pressable>
            {playlist ? (
              <Pressable onPress={() => setLinking(true)} accessibilityRole="button" style={{ padding: 6 }}>
                <Text style={{ color: MUTED, fontFamily: F.body, fontSize: 13, textDecorationLine: 'underline' }}>trocar</Text>
              </Pressable>
            ) : null}
          </Row>
        )}
        {Platform.OS === 'android' ? (
          <Pressable onPress={() => IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.ZEN_MODE_SETTINGS).catch(() => {})} style={{ alignSelf: 'center', padding: 6 }}>
            <Text style={{ color: MUTED, fontFamily: F.medium, fontSize: 14, textDecorationLine: 'underline' }}>🔕 Ligar o não perturbe do celular</Text>
          </Pressable>
        ) : null}
        <Row style={{ gap: 10 }}>
          <Btn title={timer.pausedAt ? 'Continuar' : 'Pausar'} kind="ghost" onPress={togglePause} fg={INK} style={{ flex: 1, borderColor: '#2A3530' }} />
          <Btn title="Terminei" onPress={stop} fg="#0B1410" style={{ flex: 1, backgroundColor: ACCENT, borderColor: ACCENT }} />
        </Row>
        <Pressable onPress={() => { setTimer(null); router.replace('/'); }} style={{ alignSelf: 'center', padding: 4 }}>
          <Text style={{ color: MUTED, fontFamily: F.body, fontSize: 13 }}>Descartar esta sessão</Text>
        </Pressable>
      </View>
    </View>
  );
}
