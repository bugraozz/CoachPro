import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { AUTH_ORIGIN } from '../../api/axios';
import { useAuthStore } from '../../stores/useAuthStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'E-posta ve şifre gereklidir.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${AUTH_ORIGIN}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      
      if (res.ok && data?.token) {
        await login(data.user, data.token);
        if (data.user.role === 'admin' || data.user.role === 'super_admin') {
          router.replace('/admin');
        } else if (data.user.role === 'coach') {
          router.replace('/(tabs)/coach');
        } else {
          router.replace('/(tabs)/student');
        }
      } else if (data?.requiresPayment && data?.paymentAccessToken && data?.user?.id) {
        router.replace({
          pathname: '/(auth)/payment',
          params: {
            userId: data.user.id,
            paymentToken: data.paymentAccessToken,
            role: data.user.role,
          },
        });
      } else {
        Alert.alert('Hata', data?.error || 'Giriş yapılırken bir hata oluştu.');
      }
    } catch (error: any) {
      const pendingUser = error?.response?.data?.user;
      const paymentAccessToken = error?.response?.data?.paymentAccessToken;
      if (error?.response?.data?.requiresPayment && pendingUser?.id && paymentAccessToken) {
        router.replace({
          pathname: '/(auth)/payment',
          params: {
            userId: pendingUser.id,
            paymentToken: paymentAccessToken,
            role: pendingUser.role,
          },
        });
        return;
      }

      const msg = error?.response?.data?.error || 'Giriş yapılırken bir hata oluştu.';
      Alert.alert('Hata', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 px-6 justify-center pt-10">
        <View className="mb-10 items-center">
          <View className="w-16 h-16 rounded-2xl bg-accent-primary flex items-center justify-center mb-4">
            <Text className="text-white text-2xl font-bold">CP</Text>
          </View>
          <Text className="text-3xl font-bold text-text-primary mb-2 text-center">Tekrar Hoş Geldiniz</Text>
          <Text className="text-text-secondary text-base text-center">
            E-posta ve şifreniz ile giriş yapın
          </Text>
        </View>

        <View className="bg-white rounded-2xl border border-border-default shadow-sm p-6 mb-6">
          <View className="mb-5">
            <Text className="text-sm font-medium text-text-secondary mb-1.5">E-posta</Text>
            <TextInput
              className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base"
              placeholder="ornek@email.com"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-sm font-medium text-text-secondary">Şifre</Text>
            </View>
            <TextInput
              className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base"
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity 
            onPress={handleLogin} 
            disabled={loading}
            className="w-full h-12 rounded-lg bg-accent-primary flex flex-row items-center justify-center"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">Giriş Yap</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-2">
          <Text className="text-text-secondary text-sm">Hesabınız yok mu? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text className="text-accent-primary text-sm font-semibold">Kayıt Ol</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} className="mt-4 items-center">
          <Text className="text-text-secondary text-sm font-medium">Şifremi unuttum</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
