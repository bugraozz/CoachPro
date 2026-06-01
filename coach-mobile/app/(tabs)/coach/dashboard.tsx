import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../../api/axios';
import { useAuthStore } from '../../../stores/useAuthStore';

export default function CoachDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
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

  const { stats, recentStudents, recentNotifications } = data || {};

  return (
    <ScrollView className="flex-1 bg-bg-primary">
      <View className="p-6">
        <View className="mb-8">
          <Text className="text-2xl font-bold text-text-primary">Hoş geldin, {user?.name}</Text>
          <Text className="text-text-secondary">Öğrencilerini yönet ve gelişimlerini takip et.</Text>
        </View>

        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity onPress={() => router.push('/analysis')} className="flex-1 h-12 rounded-xl bg-accent-primary items-center justify-center">
            <Text className="text-white font-semibold">Analizler</Text>
          </TouchableOpacity>
          {user?.role === 'super_admin' || user?.role === 'admin' ? (
            <TouchableOpacity onPress={() => router.push('/admin')} className="flex-1 h-12 rounded-xl bg-accent-orange items-center justify-center">
              <Text className="text-white font-semibold">Admin</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap justify-between mb-8">
          <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm mb-4 border border-border-default">
            <Text className="text-xs font-semibold text-text-muted uppercase mb-2">Toplam Öğrenci</Text>
            <Text className="text-2xl font-bold text-accent-primary">{stats?.totalStudents || 0}</Text>
          </View>
          <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm mb-4 border border-border-default">
            <Text className="text-xs font-semibold text-text-muted uppercase mb-2">Aktif Program</Text>
            <Text className="text-2xl font-bold text-accent-green">{stats?.activePrograms || 0}</Text>
          </View>
          <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-border-default">
            <Text className="text-xs font-semibold text-text-muted uppercase mb-2">Aktif Diyet</Text>
            <Text className="text-2xl font-bold text-accent-orange">{stats?.activeDiets || 0}</Text>
          </View>
          <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-border-default">
            <Text className="text-xs font-semibold text-text-muted uppercase mb-2">Referans Kodu</Text>
            <Text className="text-lg font-bold text-accent-cyan tracking-widest">{user?.referralCode || '—'}</Text>
          </View>
        </View>

        {/* Recent Students */}
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-border-default">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-text-primary">Öğrencilerim</Text>
            <Text className="text-sm font-semibold text-accent-primary">Tümünü Gör →</Text>
          </View>

          {recentStudents && recentStudents.length > 0 ? (
            recentStudents.map((student: any) => (
              <TouchableOpacity
                key={student.id}
                onPress={() => router.push(`/coach/student/${student.id}`)}
                className="flex-row items-center justify-between py-3 border-b border-border-default last:border-0"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-accent-purple/20 items-center justify-center mr-3">
                    <Text className="text-accent-purple font-bold">{student.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text className="font-semibold text-text-primary">{student.name}</Text>
                    <Text className="text-xs text-text-muted">{student.selectedPackage?.name || 'Paket yok'}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className={`text-xs font-semibold ${student.active ? 'text-accent-green' : 'text-accent-red'}`}>
                    {student.active ? 'Aktif' : 'Pasif'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text className="text-text-muted text-center py-4">Henüz öğrenciniz yok.</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
