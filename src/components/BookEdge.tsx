import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { bookColor, useColors } from '../lib/theme';

/** A borda das páginas vista de cima: a parte lida fica dourada e o marcador anda até a página atual. */
export function BookEdge({ title, pct }: { title: string; pct: number }) {
  const c = useColors();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: pct, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, v]);
  const width = v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const lines = (color: string, n: number) =>
    [...Array(n)].map((_, i) => <View key={i} style={{ width: 1, height: '100%', backgroundColor: color, opacity: 0.55 }} />);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`${pct}% do livro lido`}
      style={{ height: 36, borderRadius: 4, borderLeftWidth: 8, borderRightWidth: 8, borderColor: bookColor(title), backgroundColor: c.bg, marginVertical: 6 }}
    >
      <View style={{ position: 'absolute', inset: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 1 }}>
        {lines(c.line, 60)}
      </View>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width, backgroundColor: c.amber, overflow: 'hidden' }}>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>{lines('#00000040', 60)}</View>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', top: -9, left: width, marginLeft: -7 }}>
        <View style={{ width: 14, height: 46, backgroundColor: c.warn, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
        <View style={{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 6, borderLeftColor: c.warn, borderRightColor: c.warn, borderTopColor: 'transparent', marginTop: -6 }} />
      </Animated.View>
    </View>
  );
}
