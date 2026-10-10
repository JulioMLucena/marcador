import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { uid } from './dates';

const dir = () => {
  const d = new Directory(Paths.document, 'trechos');
  d.create({ idempotent: true, intermediates: true });
  return d;
};

/** Reduz a foto e guarda numa pasta do app que não é apagada pelo sistema. */
export async function keepPhoto(uri: string) {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 1400 }).renderAsync();
  const out = await ref.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  const dest = new File(dir(), `${uid()}.jpg`);
  new File(out.uri).moveSync(dest);
  return dest.uri;
}

export function dropPhoto(uri?: string | null) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {}
}
