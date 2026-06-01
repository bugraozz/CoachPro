import React, { useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../api/axios';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [devLink, setDevLink] = useState('');

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const res = await api.post('/auth/forgot-password', { email });
      setDevLink(String(res.data?.devLink || ''));
      Alert.alert('Başarılı', res.data?.message || 'İşlem tamamlandı.');
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.error || 'İşlem başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg-primary">
      <View className="p-6 pt-16">
        <View className="bg-white rounded-3xl p-6 border border-border-default shadow-sm">
          <Text className="text-3xl font-bold text-text-primary mb-2">Şifremi Unuttum</Text>
          <Text className="text-text-secondary mb-6">Kayıtlı e-posta adresine sıfırlama linki gönderelim.</Text>

          <Text className="text-sm font-medium text-text-secondary mb-1.5">E-posta</Text>
          <TextInput
            className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary text-base mb-5"
            placeholder="ornek@email.com"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TouchableOpacity onPress={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl bg-accent-primary items-center justify-center mb-4">
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Link Gönder</Text>}
          </TouchableOpacity>

          {devLink ? (
            <View className="bg-accent-green/10 rounded-2xl p-4 mb-4 border border-accent-green/20">
              <Text className="text-sm font-semibold text-accent-green mb-1">Geliştirme linki</Text>
              <Text className="text-xs text-text-secondary">{devLink}</Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} className="w-full h-12 rounded-xl bg-white border border-border-default items-center justify-center">
            <Text className="text-text-primary font-semibold">Giriş ekranına dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}