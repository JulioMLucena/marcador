import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, View } from 'react-native';
import { bookColor, F } from '../lib/theme';
import { Cover } from './Cover';

const W = 130;
const H = Math.round(W * 1.5);
const PAPER = '#FBF7EE';
const COLORS = ['#1F5C4A', '#73C3A3', '#E2A84A', '#E0503A', '#4A90D9', '#F2C94C', '#B65FCF'];

// confetes que saem do miolo do livro: sobem num leque e caem com a gravidade
const PIECES = [...Array(46)].map((_, i) => {
  const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
  const v = 180 + Math.random() * 200;
  return {
    vx: Math.cos(a) * v,
    vy: Math.sin(a) * v,
    rot: (Math.random() - 0.5) * 1000,
    w: 6 + Math.random() * 5,
    h: 8 + Math.random() * 9,
    color: COLORS[i % COLORS.length],
  };
});
const STEPS = [0, 0.25, 0.5, 0.75, 1];

/** Livro que se abre soltando confetes e "Leitura concluída!"; chama onDone ao terminar (ou no toque). */
export function BookOpen({ title, author, cover, onDone }: { title: string; author?: string; cover?: string; onDone: () => void }) {
  const open = useRef(new Animated.Value(0)).current;
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
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (reduce) {
          open.setValue(1);
          text.setValue(1);
          t = setTimeout(finish, 1400);
          return;
        }
        Animated.sequence([
          Animated.delay(250),
          Animated.timing(open, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(burst, { toValue: 1, duration: 1700, easing: Easing.linear, useNativeDriver: true }),
            Animated.spring(text, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
          ]),
        ]).start();
        t = setTimeout(finish, 3300);
      });
    return () => clearTimeout(t);
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
      <Pressable onPress={finish} style={{ flex: 1, backgroundColor: '#000000cc', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Leitura concluída. Toque para continuar">
        <Animated.View style={{ width: W * 2, height: H, transform: [{ translateX: shift }, { scale: lift }] }}>
          {/* miolo: página da direita com linhas de texto */}
          <View style={{ position: 'absolute', left: W, top: 0, width: W, height: H, backgroundColor: PAPER, borderTopRightRadius: 4, borderBottomRightRadius: 4, padding: 14, paddingTop: 22, gap: 7, borderRightWidth: 3, borderRightColor: '#E7DFCC' }}>
            {[...Array(10)].map((_, i) => (
              <View key={i} style={{ height: 3, borderRadius: 2, backgroundColor: '#D9D0BC', width: i === 9 ? '55%' : '100%' }} />
            ))}
          </View>
          {/* capa: frente e verso giram juntos */}
          <Animated.View style={{ position: 'absolute', left: W, top: 0, transform: hinge(coverDeg) }}>
            <Animated.View style={{ opacity: front }}>
              <Cover title={title} author={author} uri={cover} width={W} />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', inset: 0, opacity: back, backgroundColor: PAPER, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: bookColor(title), transform: [{ scaleX: -1 }], alignItems: 'center', justifyContent: 'center' }}>
              <Animated.Text style={{ fontFamily: F.displayItalic, color: '#8A7E66', fontSize: 15 }}>fim</Animated.Text>
            </Animated.View>
          </Animated.View>
          {/* confetes saindo da lombada */}
          <View pointerEvents="none" style={{ position: 'absolute', left: W, top: H * 0.35 }}>
            {PIECES.map((p, i) => {
              const x = burst.interpolate({ inputRange: STEPS, outputRange: STEPS.map((s) => p.vx * s * 1.4) });
              const y = burst.interpolate({ inputRange: STEPS, outputRange: STEPS.map((s) => p.vy * s * 1.4 + 520 * s * s) });
              const r = burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] });
              const o = burst.interpolate({ inputRange: [0, 0.02, 0.75, 1], outputRange: [0, 1, 1, 0] });
              return (
                <Animated.View
                  key={i}
                  style={{ position: 'absolute', width: p.w, height: p.h, borderRadius: 1.5, backgroundColor: p.color, opacity: o, transform: [{ translateX: x }, { translateY: y }, { rotate: r }] }}
                />
              );
            })}
          </View>
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
          Leitura concluída!
        </Animated.Text>
        <Animated.Text style={{ marginTop: 8, color: '#ffffffaa', fontFamily: F.body, fontSize: 15, opacity: text }} numberOfLines={1}>
          {title}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}
