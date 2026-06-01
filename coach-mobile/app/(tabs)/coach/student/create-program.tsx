import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../../../api/axios';

interface Exercise {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  weight: number;
  restSeconds: number;
}

interface ProgramDay {
  dayName: string;
  exercises: Exercise[];
}

export default function CreateProgramScreen() {
  const params = useLocalSearchParams<{ studentId: string }>();
  const studentId = params.studentId;

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Fitness');
  const [days, setDays] = useState<ProgramDay[]>([
    {
      dayName: '1. Gün',
      exercises: [
        { name: '', muscleGroup: '', sets: 3, reps: '10', weight: 0, restSeconds: 60 }
      ]
    }
  ]);

  const addDay = () => {
    setDays([...days, { dayName: `${days.length + 1}. Gün`, exercises: [] }]);
  };

  const removeDay = (dayIndex: number) => {
    setDays(days.filter((_, idx) => idx !== dayIndex));
  };

  const addExercise = (dayIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].exercises.push({
      name: '', muscleGroup: '', sets: 3, reps: '10', weight: 0, restSeconds: 60
    });
    setDays(newDays);
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].exercises = newDays[dayIndex].exercises.filter((_, idx) => idx !== exerciseIndex);
    setDays(newDays);
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, field: keyof Exercise, value: any) => {
    const newDays = [...days];
    newDays[dayIndex].exercises[exerciseIndex] = {
      ...newDays[dayIndex].exercises[exerciseIndex],
      [field]: value
    };
    setDays(newDays);
  };

  const updateDayName = (dayIndex: number, newName: string) => {
    const newDays = [...days];
    newDays[dayIndex].dayName = newName;
    setDays(newDays);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Program adı zorunludur.');
      return;
    }

    // Basic validation
    for (const day of days) {
      if (!day.dayName.trim()) {
        Alert.alert('Hata', 'Tüm günlerin adı olmalıdır.');
        return;
      }
      for (const ex of day.exercises) {
        if (!ex.name.trim()) {
          Alert.alert('Hata', 'Tüm egzersizlerin adı olmalıdır.');
          return;
        }
      }
    }

    setLoading(true);
    try {
      await api.post('/programs', {
        studentId,
        name,
        category,
        days
      });
      Alert.alert('Başarılı', 'Program oluşturuldu.');
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Hata', error.response?.data?.error || 'Program oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{ padding: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#CD0000', fontWeight: '600' }}>İptal</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>Yeni Program</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        
        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 }}>Program Detayları</Text>
          
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Program Adı *</Text>
          <TextInput
            style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a', marginBottom: 16 }}
            placeholder="Örn: Hipertrofi Programı"
            value={name}
            onChangeText={setName}
          />

          <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Kategori</Text>
          <TextInput
            style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
            placeholder="Örn: Fitness"
            value={category}
            onChangeText={setCategory}
          />
        </View>

        {days.map((day, dIdx) => (
          <View key={dIdx} style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <TextInput
                style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: '#0f172a', paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginRight: 12 }}
                value={day.dayName}
                onChangeText={(val) => updateDayName(dIdx, val)}
                placeholder="Gün Adı"
              />
              <TouchableOpacity onPress={() => removeDay(dIdx)} style={{ padding: 8, backgroundColor: '#fee2e2', borderRadius: 8 }}>
                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Günü Sil</Text>
              </TouchableOpacity>
            </View>

            {day.exercises.map((ex, eIdx) => (
              <View key={eIdx} style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontWeight: '600', color: '#0f172a' }}>{eIdx + 1}. Egzersiz</Text>
                  <TouchableOpacity onPress={() => removeExercise(dIdx, eIdx)}>
                    <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12 }}>Kaldır</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a', marginBottom: 8 }}
                  placeholder="Egzersiz Adı (Örn: Bench Press)"
                  value={ex.name}
                  onChangeText={(val) => updateExercise(dIdx, eIdx, 'name', val)}
                />

                <TextInput
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a', marginBottom: 8 }}
                  placeholder="Kas Grubu (Örn: Göğüs)"
                  value={ex.muscleGroup}
                  onChangeText={(val) => updateExercise(dIdx, eIdx, 'muscleGroup', val)}
                />

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ flex: 1, minWidth: '45%' }}>
                    <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Set Sayısı</Text>
                    <TextInput
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                      value={String(ex.sets)}
                      onChangeText={(val) => updateExercise(dIdx, eIdx, 'sets', Number(val))}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: '45%' }}>
                    <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Tekrar</Text>
                    <TextInput
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                      value={ex.reps}
                      onChangeText={(val) => updateExercise(dIdx, eIdx, 'reps', val)}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: '45%' }}>
                    <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Ağırlık (kg)</Text>
                    <TextInput
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                      value={String(ex.weight)}
                      onChangeText={(val) => updateExercise(dIdx, eIdx, 'weight', Number(val))}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: '45%' }}>
                    <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Dinlenme (sn)</Text>
                    <TextInput
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                      value={String(ex.restSeconds)}
                      onChangeText={(val) => updateExercise(dIdx, eIdx, 'restSeconds', Number(val))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

              </View>
            ))}

            <TouchableOpacity onPress={() => addExercise(dIdx)} style={{ width: '100%', paddingVertical: 12, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: '#0f172a', fontWeight: '600' }}>+ Egzersiz Ekle</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity onPress={addDay} style={{ width: '100%', paddingVertical: 14, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed' }}>
          <Text style={{ color: '#334155', fontWeight: 'bold', fontSize: 16 }}>+ Yeni Gün Ekle</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleSave} 
          disabled={loading}
          style={{ width: '100%', height: 52, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Programı Kaydet</Text>}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
