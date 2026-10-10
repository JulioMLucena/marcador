import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, View } from 'react-native';
import * as Haptics from 'expo-haptics';

const COLORS = ['#1F5C4A', '#73C3A3', '#E2A84A', '#E0503A', '#4A90D9', '#F2C94C', '#B65FCF'];
type Piece = { x: number; dx: number; rot: number; w: number; h: number; color: string; delay: number };
const Ctx = createContext<(level?: 0 | 1 | 2 | 3) => void>(() => {});

/** Confete por cima de tudo. Nível 0 é um toque leve, 3 é a festa de livro terminado. */
export function ConfettiProvider({ children }: { children: ReactNode }) {
  const [burst, setBurst] = useState<{ key: number; pieces: Piece[]; dur: number } | null>(null);
  const t = useRef(new Animated.Value(0)).current;
  const fire = useCallback(
    async (level: 0 | 1 | 2 | 3 = 1) => {
      Haptics.notificationAsync(level >= 2 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (await AccessibilityInfo.isReduceMotionEnabled().catch(() => false)) return;
      const { width } = Dimensions.get('window');
      const n = [18, 40, 70, 120][level];
      const pieces = [...Array(n)].map(() => ({
        x: Math.random() * width,
        dx: (Math.random() - 0.5) * 160,
        rot: (Math.random() - 0.5) * 900,
        w: 6 + Math.random() * 6,
        h: 9 + Math.random() * 10,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * (level >= 2 ? 500 : 200),
      }));
      const dur = level >= 2 ? 3200 : 2000;
      t.setValue(0);
      setBurst({ key: Date.now(), pieces, dur });
      Animated.timing(t, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true }).start(() => setBurst(null));
    },
    [t],
  );
  const { height } = Dimensions.get('window');
  return (
    <Ctx.Provider value={fire}>
      {children}
      {burst ? (
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }} key={burst.key}>
          {burst.pieces.map((p, i) => {
            const start = p.delay / burst.dur;
            const y = t.interpolate({ inputRange: [0, start, 1], outputRange: [-30, -30, height + 40] });
            const x = t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] });
            const r = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] });
            const o = t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
            return (
              <Animated.View
                key={i}
                style={{ position: 'absolute', left: p.x, top: 0, width: p.w, height: p.h, backgroundColor: p.color, borderRadius: 1.5, opacity: o, transform: [{ translateY: y }, { translateX: x }, { rotate: r }] }}
              />
            );
          })}
        </View>
      ) : null}
    </Ctx.Provider>
  );
}

export const useConfetti = () => useContext(Ctx);
