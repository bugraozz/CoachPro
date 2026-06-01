import React, { useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../api/axios';

export default function PaymentScreen() {
  const params = useLocalSearchParams<{ userId?: string; paymentToken?: string; role?: string }>();
  const userId = useMemo(() => String(params.userId || ''), [params.userId]);
  const paymentToken = useMemo(() => String(params.paymentToken || ''), [params.paymentToken]);
  const role = useMemo(() => String(params.role || ''), [params.role]);
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  const startPayment = async () => {
    if (!userId || !paymentToken) {
      Alert.alert('Hata', 'Ödeme bilgileri eksik.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/payments/create-checkout-session', {
        userId,
        paymentToken,
      });

      const url = String(res.data?.url || '').trim();
      if (!url) {
        throw new Error('Ödeme sayfası oluşturulamadı.');
      }

      setPaymentUrl(url);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Ödeme Hazır', 'Ödeme bağlantısı oluşturuldu ancak açılamadı. Bağlantıyı tarayıcıda açın.', [
          { text: 'Tamam' },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.error || error.message || 'Ödeme başlatılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg-primary">
      <View className="p-6 pt-16">
        <View className="bg-white rounded-3xl p-6 border border-border-default shadow-sm">
          <View className="w-16 h-16 rounded-2xl bg-accent-primary items-center justify-center mb-5">
            <Text className="text-white text-2xl font-bold">CP</Text>
          </View>

          <Text className="text-3xl font-bold text-text-primary mb-2">Ödeme Adımı</Text>
          <Text className="text-text-secondary mb-6">
            {role === 'coach'
              ? 'Eğitmen aboneliğini tamamlamak için ödeme sayfasını açın.'
              : 'Öğrenci paketinizi tamamlamak için ödeme sayfasını açın.'}
          </Text>

          <View className="bg-accent-primary/8 rounded-2xl p-4 mb-6 border border-accent-primary/15">
            <Text className="text-sm text-text-secondary mb-1">Kullanıcı</Text>
            <Text className="text-base font-semibold text-text-primary">{userId}</Text>
          </View>

          {paymentUrl ? (
            <View className="bg-accent-green/10 rounded-2xl p-4 mb-6 border border-accent-green/20">
              <Text className="text-sm font-semibold text-accent-green mb-1">Ödeme bağlantısı oluşturuldu</Text>
              <Text className="text-xs text-text-secondary">İşlem tamamlandıktan sonra uygulamaya dönüp giriş yapabilirsiniz.</Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={startPayment} disabled={loading} className="w-full h-12 rounded-xl bg-accent-primary items-center justify-center mb-3">
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Ödemeyi Başlat</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} className="w-full h-12 rounded-xl bg-white border border-border-default items-center justify-center">
            <Text className="text-text-primary font-semibold">Giriş Ekranına Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}