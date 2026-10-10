import { useColorScheme } from 'react-native';

const light = {
  bg: '#EEF1EC',
  surface: '#FFFFFF',
  ink: '#18231E',
  muted: '#5B6A62',
  line: '#D5DDD6',
  accent: '#1F5C4A',
  accentInk: '#FFFFFF',
  soft: '#DCE8E1',
  amber: '#B9781A',
  amberSoft: '#F5E6C8',
  warn: '#A23B2A',
};
const dark: typeof light = {
  bg: '#0E1512',
  surface: '#16201B',
  ink: '#E4EAE5',
  muted: '#93A39A',
  line: '#26332C',
  accent: '#73C3A3',
  accentInk: '#0B1410',
  soft: '#1C2E26',
  amber: '#E2A84A',
  amberSoft: '#2E2617',
  warn: '#E48370',
};
export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const F = {
  display: 'Literata_600SemiBold',
  displayBold: 'Literata_700Bold',
  displayItalic: 'Literata_400Regular_Italic',
  body: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semi: 'Figtree_600SemiBold',
};

/** Cor própria de cada livro, derivada do título. */
export function hue(s: string) {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
export const bookColor = (title: string) => {
  const h = hue(title);
  return `hsl(${h}, ${45 + (h % 4) * 7}%, ${34 + (h % 3) * 6}%)`;
};
