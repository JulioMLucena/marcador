import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { inflate } from 'pako';
import { Platform } from 'react-native';
import { hue } from './theme';

/** Cor de fundo quando não dá para ler a capa: a mesma cor própria do livro. */
export const fallbackRgb = (title: string): [number, number, number] => hslToRgb(hue(title), 0.45, 0.4);

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return [f(0), f(8), f(4)];
}

export function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

const b64 = (s: string) => {
  const bin = globalThis.atob ? globalThis.atob(s) : '';
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/** Lê o pixel de um PNG 1x1 (o resultado de encolher a capa até um ponto): a cor média da capa. */
function pngPixel(png: Uint8Array): [number, number, number] | null {
  const u32 = (i: number) => ((png[i] << 24) | (png[i + 1] << 16) | (png[i + 2] << 8) | png[i + 3]) >>> 0;
  let i = 8;
  let colorType = 6;
  const idat: Uint8Array[] = [];
  while (i < png.length) {
    const len = u32(i);
    const type = String.fromCharCode(png[i + 4], png[i + 5], png[i + 6], png[i + 7]);
    if (type === 'IHDR') colorType = png[i + 8 + 9];
    if (type === 'IDAT') idat.push(png.subarray(i + 8, i + 8 + len));
    if (type === 'IEND') break;
    i += 12 + len;
  }
  if (!idat.length) return null;
  const all = new Uint8Array(idat.reduce((a, x) => a + x.length, 0));
  let o = 0;
  for (const x of idat) {
    all.set(x, o);
    o += x.length;
  }
  const raw = inflate(all);
  // byte 0 é o filtro da linha; num pixel só, os bytes seguintes já são a cor
  if (colorType === 0 || colorType === 4) return [raw[1], raw[1], raw[1]];
  return [raw[1], raw[2], raw[3]];
}

/** Cor média da capa (encolhida em dois passos até 1 pixel, para pegar a média e não um ponto só). Sem capa ou se falhar, a cor própria do livro. */
export async function coverRgb(uri: string | undefined, title: string): Promise<[number, number, number]> {
  if (!uri) return fallbackRgb(title);
  try {
    let src = uri;
    if (Platform.OS !== 'web' && /^https?:/.test(uri)) {
      const f = await File.downloadFileAsync(uri, new File(Paths.cache, `cor-${Date.now()}.jpg`), { idempotent: true });
      src = f.uri;
    }
    const ref = await ImageManipulator.manipulate(src).resize({ width: 8, height: 12 }).resize({ width: 1, height: 1 }).renderAsync();
    const out = await ref.saveAsync({ format: SaveFormat.PNG, base64: true });
    const px = out.base64 ? pngPixel(b64(out.base64)) : null;
    return px ?? fallbackRgb(title);
  } catch {
    return fallbackRgb(title);
  }
}

/** Fundo do cartão: a cor da capa, escurecida para o texto claro ficar legível. */
export function cardPalette(rgb: [number, number, number]) {
  const [h, s, l] = rgbToHsl(rgb);
  const sat = Math.min(0.55, Math.max(0.18, s));
  const hex = (c: [number, number, number]) => `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  return {
    bg: hex(hslToRgb(h, sat, Math.min(0.26, Math.max(0.16, l * 0.5)))),
    glow: hex(hslToRgb(h, Math.min(0.7, sat + 0.15), 0.5)),
    panel: hex(hslToRgb(h, sat * 0.9, 0.32)),
    accent: hex(hslToRgb(h, Math.min(0.8, sat + 0.25), 0.72)),
  };
}
