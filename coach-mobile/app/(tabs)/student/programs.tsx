import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { api } from '../../../api/axios';

export default function StudentPrograms() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const res = await api.get('/programs');
      setPrograms(res.data.programs);
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

  return (
    <ScrollView className="flex-1 bg-bg-primary">
      <View className="p-6">
        <Text className="text-2xl font-bold text-text-primary mb-6">Programlarım</Text>

        {programs.length > 0 ? (
          programs.map((program) => (
            <View key={program.id} className={`bg-white rounded-2xl p-5 mb-5 shadow-sm border ${program.status === 'active' ? 'border-accent-primary' : 'border-border-default'}`}>
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-lg font-bold text-text-primary">{program.name}</Text>
                  <Text className="text-sm text-text-muted mt-1">{program.category}</Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${program.status === 'active' ? 'bg-accent-primary/10' : 'bg-bg-tertiary'}`}>
                  <Text className={`text-xs font-bold ${program.status === 'active' ? 'text-accent-primary' : 'text-text-muted'}`}>
                    {program.status === 'active' ? 'Aktif' : 'Pasif'}
                  </Text>
                </View>
              </View>

              {program.days?.map((day: any) => (
                <View key={day.id} className="mb-3">
                  <Text className="font-semibold text-text-secondary mb-2">{day.dayName}</Text>
                  {day.exercises?.map((ex: any) => (
                    <View key={ex.id} className="bg-bg-primary rounded-lg p-3 mb-2 flex-row justify-between items-center">
                      <View>
                        <Text className="font-medium text-text-primary">{ex.name}</Text>
                        <Text className="text-xs text-text-muted mt-0.5">{ex.muscleGroup}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-semibold text-accent-primary">{ex.sets}x{ex.reps}</Text>
                        {ex.weight && <Text className="text-xs text-text-muted">{ex.weight} kg</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))
        ) : (
          <View className="items-center py-10">
            <Text className="text-text-muted text-base">Henüz atanmış bir programınız yok.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
