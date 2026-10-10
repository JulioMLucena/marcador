import 'expo-router/entry';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widget/taskHandler';

if (Platform.OS === 'android') registerWidgetTaskHandler(widgetTaskHandler);
