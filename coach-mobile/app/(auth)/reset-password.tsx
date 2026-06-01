import React, { useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../api/axios';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(String(params.token || ''));
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token || !newPassword) {
      Alert.alert('Hata', 'Token ve yeni şifre gereklidir.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/reset-password', { token, newPassword });
      Alert.alert('Başarılı', res.data?.message || 'Şifre güncellendi.');
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.error || 'Şifre güncellenemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg-primary">
      <View className="p-6 pt-16">
        <View className="bg-white rounded-3xl p-6 border border-border-default shadow-sm">
          <Text className="text-3xl font-bold text-text-primary mb-2">Yeni Şifre Belirle</Text>
          <Text className="text-text-secondary mb-6">E-posta ile gelen token ile şifreni yenile.</Text>

          <Text className="text-sm font-medium text-text-secondary mb-1.5">Token</Text>
          <TextInput
            className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary text-base mb-4"
            placeholder="Reset token"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            value={token}
            onChangeText={setToken}
          />

          <Text className="text-sm font-medium text-text-secondary mb-1.5">Yeni Şifre</Text>
          <TextInput
            className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary text-base mb-5"
            placeholder="En az 6 karakter"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <TouchableOpacity onPress={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl bg-accent-primary items-center justify-center mb-4">
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Şifreyi Güncelle</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} className="w-full h-12 rounded-xl bg-white border border-border-default items-center justify-center">
            <Text className="text-text-primary font-semibold">Giriş ekranına dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}