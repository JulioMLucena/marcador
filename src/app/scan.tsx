import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn } from '../components/ui';
import { looksLikeIsbn, lookupIsbn } from '../lib/lookup';
import { F } from '../lib/theme';

export default function Scan() {
  const ins = useSafeAreaInsets();
  const [perm, ask] = useCameraPermissions();
  const [state, setState] = useState<'scan' | 'busy' | 'miss'>('scan');
  const [code, setCode] = useState('');
  const locked = useRef(false);

  if (!perm) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!perm.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B100E', padding: 24, justifyContent: 'center', gap: 16 }}>
        <Text style={{ color: '#E9EEE9', fontFamily: F.display, fontSize: 22 }}>Preciso da câmera para ler o código de barras do livro</Text>
        <Btn title="Permitir câmera" onPress={ask} />
        <Btn title="Digitar à mão" kind="link" onPress={() => router.replace('/editar')} />
      </View>
    );
  }

  const onScan = async ({ data }: { data: string }) => {
    if (locked.current || !looksLikeIsbn(data)) return;
    locked.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCode(data);
    setState('busy');
    const info = await lookupIsbn(data).catch(() => null);
    if (!info) {
      setState('miss');
      return;
    }
    router.replace({
      pathname: '/editar',
      params: { isbn: info.isbn, title: info.title, author: info.author ?? '', pages: String(info.pages ?? ''), cover: info.cover ?? '' },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }}
        onBarcodeScanned={state === 'scan' ? onScan : undefined}
      />
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: '78%', height: 150, borderRadius: 18, borderWidth: 3, borderColor: state === 'scan' ? '#ffffffcc' : '#E2A84A' }} />
      </View>
      <View style={{ position: 'absolute', top: ins.top + 16, left: 20, right: 20, gap: 6 }}>
        <Text style={{ color: '#fff', fontFamily: F.display, fontSize: 22, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 8 }}>
          Código de barras atrás do livro
        </Text>
        <Text style={{ color: '#ffffffcc', fontFamily: F.body, fontSize: 14, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 8 }}>
          O que começa com 978 ou 979 é o ISBN
        </Text>
      </View>
      <View style={{ position: 'absolute', bottom: ins.bottom + 24, left: 20, right: 20, gap: 12, alignItems: 'center' }}>
        {state === 'busy' ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#000b', padding: 14, borderRadius: 14 }}>
            <ActivityIndicator color="#E2A84A" />
            <Text style={{ color: '#fff', fontFamily: F.medium }}>Procurando o livro {code}…</Text>
          </View>
        ) : state === 'miss' ? (
          <View style={{ backgroundColor: '#000d', padding: 16, borderRadius: 14, gap: 10, alignSelf: 'stretch' }}>
            <Text style={{ color: '#fff', fontFamily: F.medium, textAlign: 'center' }}>Não achei esse livro ({code}). Você pode preencher à mão, e eu já deixo o ISBN anotado.</Text>
            <Btn title="Preencher à mão" onPress={() => router.replace({ pathname: '/editar', params: { isbn: code } })} />
            <Btn title="Tentar de novo" kind="link" fg="#fff" onPress={() => { locked.current = false; setState('scan'); }} />
          </View>
        ) : (
          <Pressable onPress={() => router.replace('/editar')} style={{ backgroundColor: '#000b', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 }}>
            <Text style={{ color: '#fff', fontFamily: F.medium }}>Sem código? Digitar à mão</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
