import TextRecognition, { type TextLine } from '@react-native-ml-kit/text-recognition';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Row } from '../components/ui';
import { keepPhoto } from '../lib/photos';
import { useStore } from '../lib/store';
import { F } from '../lib/theme';

type Shot = { uri: string; width: number; height: number; lines: TextLine[] };

/** Fotografa a página, reconhece o texto e deixa escolher as linhas da frase com o dedo. */
export default function Ocr() {
  const ins = useSafeAreaInsets();
  const cam = useRef<CameraView>(null);
  const [perm, ask] = useCameraPermissions();
  const { draft, setDraft } = useStore();
  const [shot, setShot] = useState<Shot | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [err, setErr] = useState<string | null>(null);

  if (!perm) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!perm.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B100E', padding: 24, justifyContent: 'center', gap: 16 }}>
        <Text style={{ color: '#E9EEE9', fontFamily: F.display, fontSize: 22 }}>Preciso da câmera para ler a página</Text>
        <Btn title="Permitir câmera" onPress={ask} />
        <Btn title="Voltar" kind="link" onPress={() => router.back()} />
      </View>
    );
  }

  const take = async () => {
    if (!cam.current || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const p = await cam.current.takePictureAsync({ quality: 0.85 });
      const uri = await keepPhoto(p.uri);
      const r = await TextRecognition.recognize(uri);
      const lines = r.blocks.flatMap((b) => b.lines).filter((l) => l.text.trim().length > 1);
      const size = await Image.loadAsync(uri);
      setShot({ uri, width: size.width, height: size.height, lines });
      setPicked(new Set());
      if (!lines.length) setErr('Não achei texto nessa foto. Tente com mais luz e a página reta.');
    } catch {
      setErr('Não consegui ler a foto. Tente de novo.');
    }
    setBusy(false);
  };

  const done = (withText: boolean) => {
    const text = shot ? [...picked].sort((a, b) => a - b).map((i) => shot.lines[i].text).join(' ').replace(/-\s+/g, '').replace(/\s+/g, ' ').trim() : '';
    setDraft({ note: withText && text ? (draft.note ? `${draft.note}\n${text}` : text) : draft.note, photo: shot?.uri ?? draft.photo });
    router.back();
  };

  if (shot) {
    const scale = box.w && shot.width ? Math.min(box.w / shot.width, box.h / shot.height) : 0;
    const ox = (box.w - shot.width * scale) / 2;
    const oy = (box.h - shot.height * scale) / 2;
    const text = [...picked].sort((a, b) => a - b).map((i) => shot.lines[i].text).join(' ');
    return (
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: ins.top, paddingBottom: ins.bottom + 12 }}>
        <Text style={{ color: '#fff', fontFamily: F.semi, fontSize: 15, textAlign: 'center', padding: 10 }}>
          Toque nas linhas da frase que você quer guardar
        </Text>
        <View style={{ flex: 1 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <Image source={{ uri: shot.uri }} style={{ position: 'absolute', inset: 0 }} contentFit="contain" />
          {scale
            ? shot.lines.map((l, i) =>
                l.frame ? (
                  <Pressable
                    key={i}
                    onPress={() => setPicked((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
                    style={{
                      position: 'absolute', left: ox + l.frame.left * scale - 2, top: oy + l.frame.top * scale - 2,
                      width: l.frame.width * scale + 4, height: l.frame.height * scale + 4, borderRadius: 3,
                      backgroundColor: picked.has(i) ? '#E2A84A88' : '#ffffff18', borderWidth: 1, borderColor: picked.has(i) ? '#E2A84A' : '#ffffff40',
                    }}
                  />
                ) : null,
              )
            : null}
        </View>
        {err ? <Text style={{ color: '#E48370', textAlign: 'center', padding: 8, fontFamily: F.medium }}>{err}</Text> : null}
        <ScrollView style={{ maxHeight: 90, marginHorizontal: 16, marginVertical: 8 }}>
          <Text style={{ color: '#E9EEE9', fontFamily: F.displayItalic, fontSize: 15 }}>{text || 'Nenhuma linha escolhida ainda.'}</Text>
        </ScrollView>
        <Row style={{ paddingHorizontal: 16, gap: 10 }}>
          <Btn title="Tirar outra" kind="ghost" fg="#E9EEE9" onPress={() => setShot(null)} style={{ flex: 1, borderColor: '#333' }} />
          <Btn title={picked.size ? 'Usar frase' : 'Só a foto'} fg="#0B1410" onPress={() => done(true)} style={{ flex: 1, backgroundColor: '#73C3A3', borderColor: '#73C3A3' }} />
        </Row>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cam} style={{ flex: 1 }} facing="back" />
      <View style={{ position: 'absolute', top: ins.top + 12, left: 16, right: 16 }}>
        <Text style={{ color: '#fff', fontFamily: F.semi, fontSize: 16, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 6 }}>
          Enquadre a página com boa luz
        </Text>
      </View>
      {err ? <Text style={{ position: 'absolute', bottom: ins.bottom + 130, left: 16, right: 16, color: '#E48370', textAlign: 'center', fontFamily: F.medium }}>{err}</Text> : null}
      <View style={{ position: 'absolute', bottom: ins.bottom + 28, left: 0, right: 0, alignItems: 'center', gap: 14 }}>
        <Pressable onPress={take} accessibilityLabel="Fotografar" style={{ width: 78, height: 78, borderRadius: 39, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <ActivityIndicator color="#fff" /> : <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' }} />}
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#fff', fontFamily: F.medium }}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}
