import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { api } from '../api/axios';
import { useAuthStore } from '../stores/useAuthStore';
import '../global.css';

let Notifications: any = null;

const isExpoGoAndroid = Constants.executionEnvironment === ExecutionEnvironment.StoreClient && Platform.OS === 'android';

if (!isExpoGoAndroid) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (error) {
    console.warn('Failed to load expo-notifications', error);
  }
}

export default function RootLayout() {
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (user && token && Platform.OS !== 'web') {
      registerForPushNotificationsAsync().then(pushToken => {
        if (pushToken) {
          api.post('/user/device-token', { token: pushToken, platform: Platform.OS })
            .catch(err => console.log('Failed to save push token', err));
        }
      });
    }
  }, [user, token]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[userId]" />
        <Stack.Screen name="analysis" />
        <Stack.Screen name="admin" />
      </Stack>
    </SafeAreaProvider>
  );
}

async function registerForPushNotificationsAsync() {
  if (!Notifications) return null;

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId: 'coach-mobile' })).data;
  } catch (e) {
    console.log(e);
  }

  return token;
}
