import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { bookColor, F } from '../lib/theme';

/** Capa do livro; sem imagem, desenha uma capa simples com a cor do livro. */
export function Cover({ title, author, uri, width = 72 }: { title: string; author?: string; uri?: string; width?: number }) {
  const [failedUri, setFailed] = useState<string | null>(null);
  const failed = !!uri && failedUri === uri;
  const height = Math.round(width * 1.5);
  const frame = { width, height, borderRadius: 4, overflow: 'hidden' as const, backgroundColor: bookColor(title) };
  if (uri && !failed) {
    return (
      <View style={[frame, { elevation: 4 }]}>
        <Image source={{ uri }} style={{ width, height }} contentFit="cover" transition={250} onError={() => setFailed(uri)} />
      </View>
    );
  }
  return (
    <View style={[frame, { padding: width / 9, justifyContent: 'space-between', elevation: 4, borderLeftWidth: width / 14, borderLeftColor: '#00000033' }]}>
      <Text style={{ color: '#fff', fontFamily: F.displayBold, fontSize: width / 6.5 }} numberOfLines={4}>
        {title}
      </Text>
      {author ? (
        <Text style={{ color: '#ffffffcc', fontFamily: F.body, fontSize: width / 10 }} numberOfLines={2}>
          {author}
        </Text>
      ) : null}
    </View>
  );
}
