import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { api } from '../../../api/axios';

export default function StudentProgress() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Şimdilik mock veya sadece API'dan mevcut kilonuzu çekelim (Progress endpointi henuz tam olusmadi ama dashboarddan cekilebilir)
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await api.get('/dashboard'); // İleride /progress API'si eklenebilir
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary">
        <ActivityIndicator size="large" color="#CD0000" />
      </View>
    );
  }

  const user = data?.user;

  return (
    <ScrollView className="flex-1 bg-bg-primary">
      <View className="p-6">
        <Text className="text-2xl font-bold text-text-primary mb-6">Gelişim Takibi</Text>

        <View className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-border-default">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-text-primary">Kilo Takibi</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <View>
              <Text className="text-sm text-text-muted">Mevcut Kilo</Text>
              <Text className="text-2xl font-bold text-accent-primary">{user?.currentWeight || '—'} kg</Text>
            </View>
            <View className="items-end">
              <Text className="text-sm text-text-muted">Hedef</Text>
              <Text className="text-2xl font-bold text-accent-green">{user?.targetWeight || '—'} kg</Text>
            </View>
          </View>
          
          <View className="h-2 bg-bg-tertiary rounded-full mt-4 overflow-hidden">
             <View className="h-full bg-accent-primary rounded-full" style={{ width: '60%' }}></View>
          </View>
          <Text className="text-xs text-text-muted mt-2 text-center">Hedefe yaklaşıyorsunuz!</Text>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm border border-border-default items-center py-10">
           <View className="w-16 h-16 rounded-full bg-accent-purple/10 items-center justify-center mb-3">
             <Text className="text-accent-purple font-bold text-xl">AI</Text>
           </View>
           <Text className="text-lg font-bold text-text-primary mb-2 text-center">Vücut Postür Analizi</Text>
           <Text className="text-sm text-text-muted text-center mb-4">
             Yapay zeka destekli analiz yakında mobil uygulamada da sizlerle olacak. Web panelinden fotoğraf yükleyerek analizinizi görebilirsiniz.
           </Text>
        </View>

      </View>
    </ScrollView>
  );
}
