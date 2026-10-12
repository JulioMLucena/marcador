import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, Text, View } from 'react-native';
import { bookColor, F } from '../lib/theme';
import { Cover } from './Cover';

const W = 130;
const H = Math.round(W * 1.5);
const PAPER = '#FBF7EE';
const COLORS = ['#1F5C4A', '#73C3A3', '#E2A84A', '#E0503A', '#4A90D9', '#F2C94C', '#B65FCF'];

// confetes que nascem atrás do livro e escapam pelas bordas: leque para cima e para os lados,
// em duas levas, girando e "virando" no ar (scaleX) enquanto caem com a gravidade
const STEPS = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
const PIECES = [...Array(90)].map((_, i) => {
  const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
  const v = 230 + Math.random() * 200;
  const kind = i % 3; // 0 papel, 1 bolinha, 2 tirinha
  return {
    vx: Math.cos(a) * v,
    vy: Math.sin(a) * v,
    rot: (Math.random() - 0.5) * 900,
    flips: 0.8 + Math.random() * 1.6,
    w: kind === 1 ? 9 : kind === 2 ? 5 : 9 + Math.random() * 5,
    h: kind === 1 ? 9 : kind === 2 ? 18 + Math.random() * 8 : 11 + Math.random() * 7,
    round: kind === 1,
    delay: i % 2 ? 0 : 0.12 + Math.random() * 0.1,
    color: COLORS[i % COLORS.length],
  };
});
const GRAVITY = 520;
const pop = (k: number) => 1 - (1 - k) ** 3;

type Props = {
  title: string;
  author?: string;
  cover?: string;
  /** false: o livro abre (livro terminado). true: começa aberto e fecha (meta do dia). */
  close?: boolean;
  headline: string;
  sub?: string;
  onDone: () => void;
};

/** Livro que abre ou fecha soltando confetes e um título; chama onDone ao terminar (ou no toque). */
export function BookOpen({ title, author, cover, close = false, headline, sub, onDone }: Props) {
  const from = close ? 1 : 0;
  const to = close ? 0 : 1;
  const open = useRef(new Animated.Value(from)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    Animated.timing(fade, { toValue: 0, duration: 280, useNativeDriver: true }).start(onDone);
  };

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let h: ReturnType<typeof setTimeout>;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (reduce) {
          open.setValue(to);
          text.setValue(1);
          t = setTimeout(finish, 1400);
          return;
        }
        Animated.sequence([
          Animated.delay(250),
          Animated.timing(open, { toValue: to, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(burst, { toValue: 1, duration: 2300, easing: Easing.linear, useNativeDriver: true }),
            Animated.spring(text, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
          ]),
        ]).start();
        h = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), 1150);
        t = setTimeout(finish, 3700);
      });
    return () => {
      clearTimeout(t);
      clearTimeout(h);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a capa gira pela lombada (borda esquerda): passa por 90° e mostra o verso, que vira a página da esquerda
  const hinge = (deg: Animated.AnimatedInterpolation<string>) => [{ perspective: 900 }, { translateX: -W / 2 }, { rotateY: deg }, { translateX: W / 2 }];
  const coverDeg = open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-180deg'] });
  const front = open.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [1, 1, 0, 0] });
  const back = open.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [0, 0, 1, 1] });
  // fechado o livro fica centrado; aberto, a lombada vai para o meio
  const shift = open.interpolate({ inputRange: [0, 1], outputRange: [-W / 2, 0] });
  const lift = open.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });

  return (
    <Animated.View style={{ position: 'absolute', inset: 0, opacity: fade }}>
      <Pressable onPress={finish} style={{ flex: 1, backgroundColor: '#000000cc', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${headline} Toque para continuar`}>
        <Animated.View style={{ width: W * 2, height: H, transform: [{ translateX: shift }, { scale: lift }] }}>
          {/* confetes: desenhados antes do livro, então saem de trás dele */}
          <View pointerEvents="none" style={{ position: 'absolute', left: close ? W * 1.5 : W, top: H / 2 }}>
            {PIECES.map((p, i) => {
              // tempo de cada pedaço: parado atrás do livro até a sua leva sair
              const inR = STEPS.map((k) => p.delay + k * (1 - p.delay));
              const at = (f: (k: number) => number) => burst.interpolate({ inputRange: [0, ...inR], outputRange: [f(0), ...STEPS.map(f)] });
              // estouro rápido que desacelera (ease-out), depois a gravidade puxa para baixo
              const x = at((k) => p.vx * pop(k) * 1.2);
              const y = at((k) => p.vy * pop(k) * 1.2 + GRAVITY * k * k);
              // vira de lado sem sumir de vez (nunca fica mais fino que 35%)
              const flip = at((k) => { const v = Math.cos(k * p.flips * Math.PI * 2); return Math.sign(v || 1) * Math.max(0.35, Math.abs(v)); });
              const r = at((k) => k * p.rot);
              const rot = r.interpolate({ inputRange: [-1000, 1000], outputRange: ['-1000deg', '1000deg'] });
              const o = burst.interpolate({ inputRange: [0, p.delay, p.delay + 0.01, 0.8, 1], outputRange: [0, 0, 1, 1, 0] });
              return (
                <Animated.View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: -p.w / 2,
                    top: -p.h / 2,
                    width: p.w,
                    height: p.h,
                    borderRadius: p.round ? p.w / 2 : 1.5,
                    backgroundColor: p.color,
                    opacity: o,
                    transform: [{ translateX: x }, { translateY: y }, { rotate: rot }, { scaleX: flip }],
                  }}
                />
              );
            })}
          </View>
          {/* miolo: página da direita com linhas de texto */}
          <View style={{ position: 'absolute', left: W, top: 0, width: W, height: H, backgroundColor: PAPER, borderTopRightRadius: 4, borderBottomRightRadius: 4, padding: 14, paddingTop: 22, gap: 7, borderRightWidth: 3, borderRightColor: '#E7DFCC' }}>
            {[...Array(10)].map((_, i) => (
              <View key={i} style={{ height: 3, borderRadius: 2, backgroundColor: '#D9D0BC', width: i === 9 ? '55%' : '100%' }} />
            ))}
            {close ? null : <Text style={{ fontFamily: F.displayItalic, color: '#8A7E66', fontSize: 15, alignSelf: 'center', marginTop: 10 }}>fim</Text>}
          </View>
          {/* fitinha marcando a página: fica para fora do livro fechado */}
          {close ? <View style={{ position: 'absolute', left: W * 1.72, top: H - 6, width: 12, height: 30, backgroundColor: '#E0503A', borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} /> : null}
          {/* capa: frente e verso giram juntos */}
          <Animated.View style={{ position: 'absolute', left: W, top: 0, transform: hinge(coverDeg) }}>
            <Animated.View style={{ opacity: front }}>
              <Cover title={title} author={author} uri={cover} width={W} />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', inset: 0, opacity: back, backgroundColor: PAPER, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: bookColor(title) }} />
          </Animated.View>
        </Animated.View>
        <Animated.Text
          style={{
            marginTop: 34,
            color: '#fff',
            fontFamily: F.displayBold,
            fontSize: 30,
            textAlign: 'center',
            opacity: text,
            transform: [{ scale: text.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }}
        >
          {headline}
        </Animated.Text>
        <Animated.Text style={{ marginTop: 8, color: '#ffffffaa', fontFamily: F.body, fontSize: 15, opacity: text }} numberOfLines={1}>
          {sub ?? title}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}
