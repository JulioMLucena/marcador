import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Platform, ToastAndroid } from 'react-native';
import { dropPhoto, keepCover } from '../lib/photos';
import { CoverSearch } from './CoverSearch';
import { Btn, Row } from './ui';

const toast = (m: string) => Platform.OS === 'android' && ToastAndroid.show(m, ToastAndroid.SHORT);

/** Botões para trocar a capa: buscar na web, da galeria, pela câmera ou remover. */
export function CoverPicker({
  cover, onChange, title, author, isbn,
}: { cover?: string; onChange: (uri: string | undefined) => void; title: string; author?: string; isbn?: string }) {
  const [searching, setSearching] = useState(false);
  const replace = (uri: string | undefined) => {
    if (cover?.startsWith('file://')) dropPhoto(cover);
    onChange(uri);
  };
  const pick = async (from: 'galeria' | 'camera') => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [2, 3], quality: 0.9 };
    try {
      if (from === 'camera') {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) return toast('Sem permissão para usar a câmera.');
      }
      const r = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets[0]) return;
      replace(await keepCover(r.assets[0].uri));
    } catch {
      toast('Não consegui usar essa imagem. Tente outra.');
    }
  };
  const small = { paddingVertical: 8, paddingHorizontal: 14 };
  return (
    <Row style={{ flexWrap: 'wrap', gap: 8 }}>
      {title.trim() ? <Btn title="Buscar capas" icon="🔎" kind="ghost" onPress={() => setSearching(true)} style={small} /> : null}
      <Btn title="Fotografar" icon="📷" kind="ghost" onPress={() => pick('camera')} style={small} />
      <Btn title="Galeria" icon="🖼️" kind="ghost" onPress={() => pick('galeria')} style={small} />
      {cover ? <Btn title="Remover" kind="link" onPress={() => replace(undefined)} /> : null}
      <CoverSearch
        visible={searching}
        title={title}
        author={author}
        isbn={isbn}
        current={cover}
        onClose={() => setSearching(false)}
        onPick={(u) => {
          setSearching(false);
          replace(u);
        }}
      />
    </Row>
  );
}
