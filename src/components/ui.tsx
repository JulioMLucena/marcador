import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, useColors } from '../lib/theme';

export function Screen({ children, scroll = true, pad = true }: { children: ReactNode; scroll?: boolean; pad?: boolean }) {
  const c = useColors();
  const ins = useSafeAreaInsets();
  const inner = { paddingHorizontal: pad ? 16 : 0, paddingTop: ins.top + 14, paddingBottom: ins.bottom + 28, gap: 16 };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: c.bg }, inner]}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={inner} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 }, style]}>{children}</View>;
}

type TxtKind = 'h1' | 'h2' | 'h3' | 'body' | 'muted' | 'small' | 'label' | 'quote';
export function Txt({ k = 'body', children, style, lines }: { k?: TxtKind; children: ReactNode; style?: StyleProp<TextStyle>; lines?: number }) {
  const c = useColors();
  const base: Record<TxtKind, TextStyle> = {
    h1: { fontFamily: F.display, fontSize: 28, color: c.ink, letterSpacing: -0.3 },
    h2: { fontFamily: F.display, fontSize: 21, color: c.ink },
    h3: { fontFamily: F.display, fontSize: 17, color: c.ink },
    body: { fontFamily: F.body, fontSize: 16, color: c.ink, lineHeight: 22 },
    muted: { fontFamily: F.body, fontSize: 15, color: c.muted, lineHeight: 21 },
    small: { fontFamily: F.body, fontSize: 13, color: c.muted, lineHeight: 18 },
    label: { fontFamily: F.semi, fontSize: 11.5, color: c.muted, letterSpacing: 1, textTransform: 'uppercase' },
    quote: { fontFamily: F.displayItalic, fontSize: 17, color: c.ink, lineHeight: 25 },
  };
  return (
    <Text style={[base[k], style]} numberOfLines={lines}>
      {children}
    </Text>
  );
}

export function Btn({
  title, onPress, kind = 'primary', big, disabled, style, icon, fg: fgOverride,
}: {
  fg?: string;
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'link' | 'danger'; big?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; icon?: string;
}) {
  const c = useColors();
  const bg = kind === 'primary' ? c.accent : kind === 'danger' ? c.warn : 'transparent';
  const fg = fgOverride ?? (kind === 'primary' ? c.accentInk : kind === 'danger' ? c.bg : kind === 'link' ? c.accent : c.ink);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor: kind === 'ghost' ? c.line : bg,
          borderWidth: kind === 'link' ? 0 : 1,
          borderRadius: big ? 18 : 999,
          paddingVertical: big ? 18 : kind === 'link' ? 6 : 11,
          paddingHorizontal: kind === 'link' ? 0 : 18,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && big ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <Text style={{ fontSize: big ? 20 : 16 }}>{icon}</Text> : null}
      <Text style={{ color: fg, fontFamily: F.semi, fontSize: big ? 18 : 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.v === value;
        return (
          <Pressable
            key={o.v}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.v)}
            style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : c.surface }}
          >
            <Text style={{ color: on ? c.accentInk : c.ink, fontFamily: F.medium, fontSize: 15 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const Row = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>{children}</View>
);

export const s = StyleSheet.create({ grow: { flex: 1, minWidth: 0 } });
