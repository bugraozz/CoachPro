import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../api/axios';
import { useAuthStore } from '../../stores/useAuthStore';

export default function AdminDashboardScreen() {
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setData(res.data);
    } catch (error) {
      console.error(error);
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

  return (
    <ScrollView className="flex-1 bg-bg-primary">
      <View className="p-6">
        <Text className="text-2xl font-bold text-text-primary mb-6">Süper Admin Paneli</Text>

        <View className="flex-row flex-wrap justify-between mb-6">
          <View className="w-[48%] bg-white p-4 rounded-2xl border border-border-default mb-4">
            <Text className="text-xs text-text-muted uppercase mb-1">Toplam Kullanıcı</Text>
            <Text className="text-2xl font-bold text-text-primary">{data?.totalUsers || 0}</Text>
          </View>
          <View className="w-[48%] bg-white p-4 rounded-2xl border border-border-default mb-4">
            <Text className="text-xs text-text-muted uppercase mb-1">Eğitmenler</Text>
            <Text className="text-2xl font-bold text-text-primary">{data?.totalCoaches || 0}</Text>
          </View>
          <View className="w-[48%] bg-white p-4 rounded-2xl border border-border-default mb-4">
            <Text className="text-xs text-text-muted uppercase mb-1">Öğrenciler</Text>
            <Text className="text-2xl font-bold text-text-primary">{data?.totalStudents || 0}</Text>
          </View>
          <View className="w-[48%] bg-white p-4 rounded-2xl border border-border-default mb-4">
            <Text className="text-xs text-text-muted uppercase mb-1">Yeni Üyeler (7G)</Text>
            <Text className="text-2xl font-bold text-text-primary">{data?.newUsersLast7Days || 0}</Text>
          </View>
          <View className="w-full bg-white p-4 rounded-2xl border border-border-default mb-4">
            <Text className="text-xs text-text-muted uppercase mb-1">Aylık Gelir</Text>
            <Text className="text-2xl font-bold text-green-600">₺{data?.monthRevenue || 0}</Text>
          </View>
        </View>

        <View className="gap-4">
          <TouchableOpacity onPress={() => router.push('/admin/users')} className="w-full p-4 rounded-2xl bg-white border border-border-default flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text-primary">Öğrenci Yönetimi</Text>
            <Text className="text-text-muted">&gt;</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/admin/coaches')} className="w-full p-4 rounded-2xl bg-white border border-border-default flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text-primary">Eğitmen Yönetimi</Text>
            <Text className="text-text-muted">&gt;</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/admin/transactions')} className="w-full p-4 rounded-2xl bg-white border border-border-default flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text-primary">Finans ve Ödemeler</Text>
            <Text className="text-text-muted">&gt;</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/admin/settings')} className="w-full p-4 rounded-2xl bg-white border border-border-default flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text-primary">Sistem Ayarları</Text>
            <Text className="text-text-muted">&gt;</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={() => {
            logout();
            router.replace('/(auth)/login');
          }} 
          className="w-full h-12 rounded-xl bg-red-50 border border-red-100 items-center justify-center mt-6"
        >
          <Text className="text-red-600 font-semibold">Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
