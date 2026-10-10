import 'expo-router/entry';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widget/taskHandler';
// a tarefa de preços precisa ser definida no início, antes do app abrir
import './src/lib/prices';

if (Platform.OS === 'android') registerWidgetTaskHandler(widgetTaskHandler);
