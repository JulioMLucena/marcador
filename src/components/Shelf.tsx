import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { pctOf } from '../lib/store';
import { bookColor, F, hue } from '../lib/theme';
import type { Book } from '../lib/types';
import { Cover } from './Cover';

const FRAME = '#141414';
const BACK = '#24170f';
const GLOW = '#ff8a3d';
const CUBBY_H = 156;

type Cubby = { kind: 'face' | 'stand' | 'stack' | 'empty'; books: Book[] };

const spineW = (b: Book) => Math.round(Math.min(34, Math.max(17, (b.pages || 200) / 14)));
const spineH = (b: Book) => 104 + (hue(b.title) % 6) * 7;

function SlideIn({ i, children }: { i: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 450, delay: i * 40, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [i, v]);
  return <Animated.View style={{ opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>{children}</Animated.View>;
}

function Spine({ b, onPress }: { b: Book; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={`${b.title}, ${b.status === 'lido' ? 'lido' : b.status === 'pausado' ? 'pausado' : 'lendo'}`} onPress={onPress}>
      <View
        style={{
          width: spineW(b), height: spineH(b), backgroundColor: bookColor(b.title), borderTopLeftRadius: 2, borderTopRightRadius: 2,
          borderLeftWidth: 2, borderLeftColor: '#ffffff30', borderRightWidth: 3, borderRightColor: '#00000040',
          alignItems: 'center', justifyContent: 'center', overflow: 'hidden', opacity: b.status === 'pausado' ? 0.45 : 1,
        }}
      >
        <View style={{ position: 'absolute', top: 8, left: 0, right: 0, height: 2, backgroundColor: '#ffffff30' }} />
        <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, height: 2, backgroundColor: '#00000035' }} />
        <Text
          numberOfLines={1}
          style={{ width: spineH(b) - 22, transform: [{ rotate: '-90deg' }], color: '#fff', fontFamily: F.display, fontSize: 11, textAlign: 'center' }}
        >
          {b.title}
        </Text>
      </View>
    </Pressable>
  );
}

function Lying({ b, i, width, onPress }: { b: Book; i: number; width: number; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={`${b.title}, na fila`} onPress={onPress}>
      <View
        style={{
          width: width * (0.74 + (hue(b.title) % 5) * 0.04), height: Math.max(14, spineW(b) * 0.75), backgroundColor: bookColor(b.title),
          borderRadius: 2, borderTopWidth: 2, borderTopColor: '#ffffff30', borderLeftWidth: 5, borderLeftColor: '#00000030',
          justifyContent: 'center', paddingHorizontal: 6, marginLeft: i % 2 ? 6 : 0,
        }}
      >
        <Text numberOfLines={1} style={{ color: '#fff', fontFamily: F.display, fontSize: 10 }}>
          {b.title}
        </Text>
      </View>
    </Pressable>
  );
}

/** Estante em nichos escuros com luz quente atrás. Lendo fica de frente, fila deitada, o resto em pé. */
export function Shelf({ books, onOpen }: { books: Book[]; onOpen: (b: Book) => void }) {
  const [w, setW] = useState(0);
  const inner = Math.max(60, (w - 14 - 14) / 3 - 12);
  const cubbies: Cubby[] = [];
  for (const b of books.filter((x) => x.status === 'lendo')) cubbies.push({ kind: 'face', books: [b] });
  const queue = books.filter((x) => x.status === 'fila');
  for (let i = 0; i < queue.length; i += 5) cubbies.push({ kind: 'stack', books: queue.slice(i, i + 5) });
  for (const k of ['pausado', 'lido'] as const) {
    let cur: Cubby | null = null;
    let used = 0;
    for (const b of books.filter((x) => x.status === k)) {
      if (!cur || used + spineW(b) + 2 > inner) {
        cur = { kind: 'stand', books: [] };
        cubbies.push(cur);
        used = 0;
      }
      cur.books.push(b);
      used += spineW(b) + 2;
    }
  }
  const total = Math.max(9, Math.ceil((cubbies.length + 1) / 3) * 3);
  while (cubbies.length < total) cubbies.push({ kind: 'empty', books: [] });
  let n = 0;
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ backgroundColor: FRAME, padding: 7, borderRadius: 6, shadowColor: GLOW, shadowOpacity: 0.6, shadowRadius: 24, elevation: 10 }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {cubbies.map((cb, ci) => (
          <View
            key={ci}
            style={{ width: (w - 14 - 14) / 3, height: CUBBY_H, backgroundColor: BACK, borderRadius: 2, overflow: 'hidden', justifyContent: 'flex-end' }}
          >
            {/* luz quente vinda de trás */}
            <View style={{ position: 'absolute', top: -40, left: '-20%', right: '-20%', height: 150, borderRadius: 200, backgroundColor: GLOW, opacity: 0.16 }} />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, backgroundColor: '#00000055' }} />
            {cb.kind === 'face' ? (
              <View style={{ alignItems: 'center', paddingBottom: 2 }}>
                <SlideIn i={n++}>
                  <Pressable onPress={() => onOpen(cb.books[0])} accessibilityLabel={`${cb.books[0].title}, lendo, ${pctOf(cb.books[0])}%`}>
                    <Cover title={cb.books[0].title} author={cb.books[0].author} uri={cb.books[0].cover} width={Math.min(88, inner - 6)} />
                    <View style={{ position: 'absolute', top: -2, right: 8, width: 8, height: 30, backgroundColor: '#e0503a' }} />
                    <View style={{ height: 4, marginTop: 4, borderRadius: 2, backgroundColor: '#ffffff25' }}>
                      <View style={{ width: `${pctOf(cb.books[0])}%`, height: 4, borderRadius: 2, backgroundColor: '#ffc062' }} />
                    </View>
                  </Pressable>
                </SlideIn>
              </View>
            ) : cb.kind === 'stack' ? (
              <View style={{ flexDirection: 'column-reverse', gap: 2, paddingHorizontal: 6 }}>
                {cb.books.map((b, i) => (
                  <SlideIn key={b.id} i={n++}>
                    <Lying b={b} i={i} width={inner} onPress={() => onOpen(b)} />
                  </SlideIn>
                ))}
              </View>
            ) : cb.kind === 'stand' ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingHorizontal: 6 }}>
                {cb.books.map((b) => (
                  <SlideIn key={b.id} i={n++}>
                    <Spine b={b} onPress={() => onOpen(b)} />
                  </SlideIn>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
