import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/useAuthStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { user, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

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

  if (user.role === 'super_admin' || user.role === 'admin') {
    return <Redirect href="/admin" />;
  }

  if (user.role === 'coach') {
    return <Redirect href="/(tabs)/coach" />;
  }

  return <Redirect href="/(tabs)/student" />;
}
