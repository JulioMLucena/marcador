import * as ImagePicker from 'expo-image-picker';
import { Platform, ToastAndroid } from 'react-native';
import { dropPhoto, keepCover } from '../lib/photos';
import { Btn, Row } from './ui';

const toast = (m: string) => Platform.OS === 'android' && ToastAndroid.show(m, ToastAndroid.SHORT);

/** Botões para trocar a capa: da galeria, pela câmera ou remover. */
export function CoverPicker({ cover, onChange }: { cover?: string; onChange: (uri: string | undefined) => void }) {
  const pick = async (from: 'galeria' | 'camera') => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [2, 3], quality: 0.9 };
    try {
      if (from === 'camera') {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) return toast('Sem permissão para usar a câmera.');
      }
      const r = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets[0]) return;
      const uri = await keepCover(r.assets[0].uri);
      if (cover?.startsWith('file://')) dropPhoto(cover);
      onChange(uri);
    } catch {
      toast('Não consegui usar essa imagem. Tente outra.');
    }
  };
  return (
    <Row style={{ flexWrap: 'wrap', gap: 8 }}>
      <Btn title="Galeria" icon="🖼️" kind="ghost" onPress={() => pick('galeria')} style={{ paddingVertical: 8, paddingHorizontal: 14 }} />
      <Btn title="Fotografar capa" icon="📷" kind="ghost" onPress={() => pick('camera')} style={{ paddingVertical: 8, paddingHorizontal: 14 }} />
      {cover ? (
        <Btn
          title="Remover"
          kind="link"
          onPress={() => {
            if (cover.startsWith('file://')) dropPhoto(cover);
            onChange(undefined);
          }}
        />
      ) : null}
    </Row>
  );
}
