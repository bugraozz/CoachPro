import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../../api/axios';

export default function CoachStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data.students);
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

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <ScrollView className="flex-1 bg-bg-primary">
      <View className="p-6">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-text-primary">Öğrencilerim</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/coach/add-student')} className="bg-accent-primary px-4 py-2 rounded-lg">
            <Text className="text-white font-semibold">Yeni Ekle</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary mb-6 shadow-sm"
          placeholder="Öğrenci ara..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => (
            <TouchableOpacity key={student.id} onPress={() => router.push(`/coach/student/${student.id}`)} className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-border-default flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-accent-primary/10 items-center justify-center mr-4">
                  <Text className="text-accent-primary font-bold text-lg">{student.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text className="font-semibold text-lg text-text-primary">{student.name}</Text>
                  <Text className="text-xs text-text-muted mt-1">{student.email}</Text>
                </View>
              </View>
              <View className="items-end">
                <View className={`px-2 py-1 rounded-full mb-1 ${student.active ? 'bg-accent-green/10' : 'bg-bg-tertiary'}`}>
                  <Text className={`text-[10px] font-bold ${student.active ? 'text-accent-green' : 'text-text-muted'}`}>
                    {student.active ? 'Aktif' : 'Pasif'}
                  </Text>
                </View>
                <Text className="text-xs text-text-muted">{student.programs?.length > 0 ? 'Prog. Var' : 'Prog. Yok'}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="items-center py-10">
            <Text className="text-text-muted text-base">Sonuç bulunamadı.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
