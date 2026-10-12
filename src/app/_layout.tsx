import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Literata_400Regular_Italic } from '@expo-google-fonts/literata/400Regular_Italic';
import { Literata_600SemiBold } from '@expo-google-fonts/literata/600SemiBold';
import { Literata_700Bold } from '@expo-google-fonts/literata/700Bold';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { ConfettiProvider } from '../components/Confetti';
import { IntroSplash } from '../components/IntroSplash';
import { StoreProvider, useStore } from '../lib/store';
import { useColors } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Nav() {
  const c = useColors();
  const { ready } = useStore();
  const [a] = useFonts({ Literata_600SemiBold, Literata_700Bold, Literata_400Regular_Italic });
  const [b] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold });
  // a prévia web não tem notificações; Platform.OS não muda, então a ordem dos hooks é estável
  const [intro, setIntro] = useState(true);
  const last = Platform.OS === 'web' ? null : Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (a && b && ready) SplashScreen.hideAsync().catch(() => {});
  }, [a, b, ready]);

  useEffect(() => {
    const open = last?.notification.request.content.data?.open;
    if (ready && typeof open === 'string') router.push(open as '/ler');
  }, [last, ready]);

  if (!a || !b || !ready) return null;
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="ler" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="terminar" options={{ gestureEnabled: false }} />
        <Stack.Screen name="lancar" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="scan" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ocr" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="livro/[id]" />
        <Stack.Screen name="lista/[id]" />
        <Stack.Screen name="obra" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="genero/[id]" />
        <Stack.Screen name="editar" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="retrospectiva" />
        <Stack.Screen name="compartilhar" />
        <Stack.Screen name="plus" />
        <Stack.Screen name="artigo" />
        <Stack.Screen name="terminado" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="meta" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack>
      {intro ? <IntroSplash onDone={() => setIntro(false)} /> : null}
    </>
  );
}

export default function Root() {
  return (
    <StoreProvider>
      <ConfettiProvider>
        <Nav />
      </ConfettiProvider>
    </StoreProvider>
  );
}
