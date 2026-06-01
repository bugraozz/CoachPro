import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../../api/axios';
import { useAuthStore } from '../../../stores/useAuthStore';

export default function StudentDashboard() {
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

  const { user: studentData, activeProgram, activeDiet } = data || {};

  return (
    <ScrollView className="flex-1 bg-bg-primary">
      <View className="p-6">
        <View className="mb-8">
          <Text className="text-2xl font-bold text-text-primary">Merhaba, {user?.name}</Text>
          <Text className="text-text-secondary">
            {studentData?.coach ? `Eğitmenin: ${studentData.coach.name}` : 'Eğitmen atanmamış.'}
          </Text>
        </View>

        <TouchableOpacity onPress={() => router.push('/analysis')} className="mb-6 h-12 rounded-xl bg-accent-primary items-center justify-center">
          <Text className="text-white font-semibold">Vücut Analizi</Text>
        </TouchableOpacity>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap justify-between mb-8">
          <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm mb-4 border border-border-default">
            <Text className="text-xs font-semibold text-text-muted uppercase mb-2">Mevcut Kilo</Text>
            <Text className="text-2xl font-bold text-accent-primary">{studentData?.currentWeight || '—'}</Text>
            <Text className="text-xs text-text-muted">kg</Text>
          </View>
          <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm mb-4 border border-border-default">
            <Text className="text-xs font-semibold text-text-muted uppercase mb-2">Hedef Kilo</Text>
            <Text className="text-2xl font-bold text-accent-green">{studentData?.targetWeight || '—'}</Text>
            <Text className="text-xs text-text-muted">kg</Text>
          </View>
          <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-border-default">
            <Text className="text-xs font-semibold text-text-muted uppercase mb-2">Boy</Text>
            <Text className="text-2xl font-bold text-accent-orange">{studentData?.height || '—'}</Text>
            <Text className="text-xs text-text-muted">cm</Text>
          </View>
          <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-border-default">
            <Text className="text-xs font-semibold text-text-muted uppercase mb-2">BMI</Text>
            <Text className="text-2xl font-bold text-accent-cyan">
              {studentData?.currentWeight && studentData?.height 
                ? (studentData.currentWeight / ((studentData.height/100)**2)).toFixed(1) 
                : '—'}
            </Text>
            <Text className="text-xs text-text-muted">endeks</Text>
          </View>
        </View>

        {/* Active Program */}
        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-border-default">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-text-primary">Aktif Program</Text>
            <Text className="text-sm font-semibold text-accent-purple">Detay →</Text>
          </View>
          {activeProgram ? (
            <View>
              <Text className="text-base font-semibold text-text-primary mb-2">{activeProgram.name}</Text>
              <View className="flex-row items-center bg-accent-primary/10 self-start px-2 py-1 rounded-full mb-4">
                <Text className="text-accent-primary text-xs font-bold">{activeProgram.days?.length || 0} gün / hafta</Text>
              </View>
              {activeProgram.days?.slice(0,3).map((day: any) => (
                <View key={day.id} className="flex-row justify-between items-center bg-bg-primary p-3 rounded-lg mb-2">
                  <Text className="font-medium text-text-primary">{day.dayName}</Text>
                  <Text className="text-xs text-text-muted">{day.exercises?.length || 0} egzersiz</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-text-muted text-sm">Henüz program atanmamış</Text>
          )}
        </View>

        {/* Active Diet */}
        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-border-default">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-text-primary">Aktif Diyet</Text>
            <Text className="text-sm font-semibold text-accent-orange">Detay →</Text>
          </View>
          {activeDiet ? (
            <View>
              <Text className="text-base font-semibold text-text-primary mb-2">{activeDiet.name}</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                <View className="bg-accent-green/10 px-2 py-1 rounded-full"><Text className="text-accent-green text-xs font-bold">{activeDiet.dailyCalorieTarget} kcal</Text></View>
                <View className="bg-accent-cyan/10 px-2 py-1 rounded-full"><Text className="text-accent-cyan text-xs font-bold">{activeDiet.proteinTarget}g prot</Text></View>
              </View>
              {activeDiet.meals?.slice(0,3).map((meal: any) => (
                <View key={meal.id} className="flex-row justify-between items-center bg-bg-primary p-3 rounded-lg mb-2">
                  <Text className="font-medium text-text-primary">{meal.name}</Text>
                  <Text className="text-xs text-text-muted">{meal.foods?.length || 0} besin</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-text-muted text-sm">Henüz diyet atanmamış</Text>
          )}
        </View>

      </View>
    </ScrollView>
  );
}
