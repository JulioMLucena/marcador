import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { F, useColors } from '../../lib/theme';

type Icon = keyof typeof Ionicons.glyphMap;
const tab = (title: string, icon: Icon, active: Icon) => ({
  title,
  tabBarIcon: ({ color, focused }: { color: import('react-native').ColorValue; focused: boolean }) => <Ionicons name={focused ? active : icon} size={22} color={color as string} />,
});

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        tabBarLabelStyle: { fontFamily: F.semi, fontSize: 11 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={tab('Hoje', 'today-outline', 'today')} />
      <Tabs.Screen name="estante" options={tab('Estante', 'library-outline', 'library')} />
      <Tabs.Screen name="descobrir" options={tab('Descobrir', 'compass-outline', 'compass')} />
      <Tabs.Screen name="trechos" options={tab('Trechos', 'chatbox-ellipses-outline', 'chatbox-ellipses')} />
      <Tabs.Screen name="voce" options={tab('Você', 'trophy-outline', 'trophy')} />
    </Tabs>
  );
}
