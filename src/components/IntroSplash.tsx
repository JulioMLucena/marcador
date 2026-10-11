import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { F, useColors } from '../lib/theme';

const BOOKS = ['#1F5C4A', '#E0573C', '#E2A84A', '#3E4C8A', '#2E7D4F', '#9A4F8C', '#1F5C4A'];
const W = 26;
const H = 104;
const GAP = 40;
const STEP = 150;
const FALL = 300;

/**
 * Abertura do app: uma fileira de livros cai como dominó e o último deitado vira a logo
 * (o livro verde com a fita vermelha). Toque pula.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const falls = useRef(BOOKS.map(() => new Animated.Value(0))).current;
  const row = useRef(new Animated.Value(1)).current;
  const logo = useRef(new Animated.Value(0)).current;
  const ribbon = useRef(new Animated.Value(0)).current;
  const all = useRef(new Animated.Value(1)).current;
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    Animated.timing(all, { toValue: 0, duration: 260, useNativeDriver: true }).start(onDone);
  };

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(150),
      Animated.stagger(
        STEP,
        falls.map((v) => Animated.timing(v, { toValue: 1, duration: FALL, easing: Easing.in(Easing.quad), useNativeDriver: true })),
      ),
      Animated.parallel([
        Animated.timing(row, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(logo, { toValue: 1, duration: 380, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      ]),
      Animated.timing(ribbon, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
      Animated.delay(450),
    ]);
    anim.start(({ finished }) => finished && finish());
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = BOOKS.length * GAP;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: all, zIndex: 10 }]}>
      <Pressable style={s.center} onPress={finish} accessibilityLabel="Pular abertura">
        {/* fileira de livros em pé; cada um gira pelo canto de baixo à direita */}
        <Animated.View style={{ width: total, height: H + 4, opacity: row, transform: [{ translateX: -GAP }] }}>
          {BOOKS.map((color, i) => {
            const last = i === BOOKS.length - 1;
            const deg = falls[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', last ? '90deg' : '68deg'] });
            // o anterior cai por cima do seguinte: desenha de trás para frente
            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute', left: i * GAP, bottom: 4, width: W, height: H, zIndex: BOOKS.length - i,
                  transform: [{ translateX: W / 2 }, { translateY: H / 2 }, { rotate: deg }, { translateX: -W / 2 }, { translateY: -H / 2 }],
                }}
              >
                <View style={{ flex: 1, backgroundColor: color, borderRadius: 4, padding: 4, justifyContent: 'space-between' }}>
                  <View style={{ height: 3, backgroundColor: '#ffffff55', borderRadius: 2 }} />
                  <View style={{ height: 3, backgroundColor: '#ffffff55', borderRadius: 2 }} />
                </View>
              </Animated.View>
            );
          })}
          <View style={{ position: 'absolute', left: -10, right: -H / 2, bottom: 0, height: 3, borderRadius: 2, backgroundColor: c.line }} />
        </Animated.View>

        {/* logo: o livro deitado com a fita */}
        <Animated.View style={[s.logo, { opacity: logo, transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
          <View style={{ width: 132, height: 92, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 132, height: 64, borderRadius: 10, backgroundColor: '#1F5C4A', flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: 4 }}>
              {[...Array(16)].map((_, i) => (
                <View key={i} style={{ width: 2, backgroundColor: '#3E8E6E' }} />
              ))}
            </View>
            <Animated.View
              style={{
                position: 'absolute', left: 74, top: 0, width: 20, height: 92, backgroundColor: '#E0533B',
                transform: [{ translateY: ribbon.interpolate({ inputRange: [0, 1], outputRange: [-36, 0] }) }],
                opacity: ribbon,
              }}
            >
              <View style={{ position: 'absolute', bottom: -1, left: 0, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c.bg }} />
            </Animated.View>
          </View>
          <Text style={{ fontFamily: F.displayBold, fontSize: 34, color: c.ink, marginTop: 14 }}>Marcador</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { position: 'absolute', alignItems: 'center' },
});
