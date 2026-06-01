import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/useAuthStore';
import { View, ActivityIndicator } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../api/axios';

export default function Index() {
  const { user, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

    // Push token registration is handled in _layout.tsx

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary">
        <ActivityIndicator size="large" color="#CD0000" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role === 'coach' || user.role === 'super_admin' || user.role === 'admin') {
    return <Redirect href="/(tabs)/coach" />;
  }

  return <Redirect href="/(tabs)/student" />;
}
