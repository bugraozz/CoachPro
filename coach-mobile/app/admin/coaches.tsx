import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../../api/axios';

export default function AdminCoachesScreen() {
  const [loading, setLoading] = useState(true);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [discountInputs, setDiscountInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    try {
      const res = await api.get('/admin/coaches');
      setCoaches(res.data.coaches || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (coachId: string, currentState: boolean) => {
    Alert.alert(
      currentState ? 'Eğitmeni Banla' : 'Eğitmeni Aktifleştir',
      'Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          style: currentState ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.post('/admin/coaches', { action: 'toggle_user_active', coachId, nextState: !currentState });
              fetchCoaches();
            } catch (error: any) {
              Alert.alert('Hata', error.response?.data?.error || 'İşlem başarısız');
            }
          }
        }
      ]
    );
  };

  const handleGrantAccess = async (coachId: string) => {
    Alert.alert(
      'Ücretsiz Erişim Tanımla',
      'Bu eğitmene sınırsız ücretsiz erişim vermek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Tanımla',
          onPress: async () => {
            try {
              await api.post('/admin/coaches', { action: 'grant_free_coach_access', coachId, permanent: true });
              Alert.alert('Başarılı', 'Erişim tanımlandı.');
              fetchCoaches();
            } catch (error: any) {
              Alert.alert('Hata', error.response?.data?.error || 'İşlem başarısız');
            }
          }
        }
      ]
    );
  };

  const handleSaveDiscount = async (coachId: string, amount: string) => {
    try {
      await api.post('/admin/coaches', { action: 'save_coach_discount', coachId, enabled: true, amount: Number(amount) });
      Alert.alert('Başarılı', 'İndirim/Komisyon kaydedildi.');
      fetchCoaches();
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.error || 'İşlem başarısız');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary">
        <ActivityIndicator size="large" color="#CD0000" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg-primary">
      <View className="p-4">
        {coaches.map((coach) => (
          <View key={coach.id} className="bg-white rounded-2xl p-4 mb-4 border border-border-default shadow-sm">
            <View className="flex-row justify-between items-start mb-2">
              <View>
                <Text className="text-lg font-bold text-text-primary">{coach.name}</Text>
                <Text className="text-sm text-text-secondary">{coach.email}</Text>
                <Text className="text-xs text-text-muted mt-1">Öğrenci Sayısı: {coach._count?.students || 0}</Text>
              </View>
              <View className={`px-2 py-1 rounded-full ${coach.active ? 'bg-green-100' : 'bg-red-100'}`}>
                <Text className={`text-xs font-bold ${coach.active ? 'text-green-700' : 'text-red-700'}`}>
                  {coach.active ? 'Aktif' : 'Banlı'}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2 pt-3 border-t border-border-default mb-3">
              <TouchableOpacity onPress={() => handleToggleActive(coach.id, coach.active)} className="flex-1 py-2 bg-gray-100 rounded-lg items-center">
                <Text className="text-sm font-semibold text-text-primary">{coach.active ? 'Banla' : 'Aktifleştir'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleGrantAccess(coach.id)} className="flex-1 py-2 bg-accent-primary rounded-lg items-center">
                <Text className="text-sm font-semibold text-white">Sınırsız Erişim</Text>
              </TouchableOpacity>
            </View>

            <View className="pt-2">
              <Text className="text-xs text-text-secondary mb-1">Eğitmene Özel İndirim / Komisyon Oranı</Text>
              <View className="flex-row gap-2 items-center">
                <TextInput
                  className="flex-1 px-3 py-2 rounded-lg border border-border-default bg-white text-text-primary"
                  placeholder="Oran (%)"
                  keyboardType="numeric"
                  defaultValue={String(coach.discount?.amount || 0)}
                  onChangeText={(val) => setDiscountInputs({ ...discountInputs, [coach.id]: val })}
                />
                <TouchableOpacity onPress={() => handleSaveDiscount(coach.id, discountInputs[coach.id] || String(coach.discount?.amount || 0))} className="px-4 py-2 bg-text-primary rounded-lg">
                  <Text className="text-white font-semibold">Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
