import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../../../api/axios';

function safeParseJson(value: string, fallback: any) {
  try {
    const parsed = JSON.parse(value);
    return parsed;
  } catch {
    return fallback;
  }
}

export default function CoachStudentDetail() {
  const params = useLocalSearchParams<{ studentId?: string }>();
  const studentId = useMemo(() => String(params.studentId || ''), [params.studentId]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);
  const [savingDiet, setSavingDiet] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [healthNotes, setHealthNotes] = useState('');
  const [active, setActive] = useState(true);
  const [genderModalVisible, setGenderModalVisible] = useState(false);

  useEffect(() => {
    if (studentId) fetchStudent();
  }, [studentId]);

  const fetchStudent = async () => {
    try {
      const res = await api.get(`/students/${studentId}`);
      setStudent(res.data);
      setName(res.data.name || '');
      setEmail(res.data.email || '');
      setPhone(res.data.phone || '');
      setGender(res.data.gender || '');
      setAge(res.data.age ? String(res.data.age) : '');
      setHeight(res.data.height ? String(res.data.height) : '');
      setCurrentWeight(res.data.currentWeight ? String(res.data.currentWeight) : '');
      setTargetWeight(res.data.targetWeight ? String(res.data.targetWeight) : '');
      setHealthNotes(res.data.healthNotes || '');
      setActive(Boolean(res.data.active));
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Öğrenci bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSavingProfile(true);
      await api.put(`/students/${studentId}`, {
        name,
        email,
        phone,
        gender,
        age,
        height,
        currentWeight,
        targetWeight,
        healthNotes,
        active,
      });
      Alert.alert('Başarılı', 'Öğrenci bilgileri güncellendi.');
      await fetchStudent();
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.error || 'Öğrenci güncellenemedi.');
    } finally {
      setSavingProfile(false);
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
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-accent-primary font-semibold">Geri</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/chat/${studentId}`)}>
            <Text className="text-accent-primary font-semibold">Sohbet</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-border-default">
          <Text className="text-2xl font-bold text-text-primary mb-1">{student?.name}</Text>
          <Text className="text-text-muted mb-4">Öğrenci detay ve yönetim ekranı</Text>
          <Text className="text-xs text-text-muted">Bu ekrandan profil, program, diyet ve mesaj yönetimi yapılır.</Text>
        </View>

        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-border-default">
          <Text className="text-lg font-bold text-text-primary mb-4">Profil Bilgileri</Text>
          {[
            ['Ad Soyad', name, setName, 'Ad Soyad'],
            ['E-posta', email, setEmail, 'ornek@email.com'],
            ['Telefon', phone, setPhone, 'Telefon'],
          ].map(([label, value, setter, placeholder]) => (
            <View key={String(label)} className="mb-4">
              <Text className="text-sm font-medium text-text-secondary mb-1.5">{label as string}</Text>
              <TextInput
                className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base"
                placeholder={placeholder as string}
                placeholderTextColor="#64748b"
                value={String(value)}
                onChangeText={setter as (v: string) => void}
              />
            </View>
          ))}

          <View className="mb-4">
            <Text className="text-sm font-medium text-text-secondary mb-1.5">Cinsiyet</Text>
            <TouchableOpacity onPress={() => setGenderModalVisible(true)} className="w-full px-4 py-3 rounded-lg border border-border-default bg-white">
              <Text className={gender ? 'text-text-primary text-base' : 'text-[#64748b] text-base'}>
                {gender === 'male' ? 'Erkek' : gender === 'female' ? 'Kadın' : 'Cinsiyet Seçin'}
              </Text>
            </TouchableOpacity>
          </View>

          {[
            ['Yaş', age, setAge, 'Yaş'],
            ['Boy (cm)', height, setHeight, 'Boy'],
            ['Mevcut Kilo', currentWeight, setCurrentWeight, 'Kilo'],
            ['Hedef Kilo', targetWeight, setTargetWeight, 'Hedef kilo'],
          ].map(([label, value, setter, placeholder]) => (
            <View key={String(label)} className="mb-4">
              <Text className="text-sm font-medium text-text-secondary mb-1.5">{label as string}</Text>
              <TextInput
                className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base"
                placeholder={placeholder as string}
                placeholderTextColor="#64748b"
                value={String(value)}
                onChangeText={setter as (v: string) => void}
              />
            </View>
          ))}

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-text-secondary">Aktif</Text>
            <Switch value={active} onValueChange={setActive} />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-text-secondary mb-1.5">Sağlık Notları</Text>
            <TextInput
              className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base"
              placeholder="Sağlık notları"
              placeholderTextColor="#64748b"
              value={healthNotes}
              onChangeText={setHealthNotes}
              multiline
            />
          </View>

          <TouchableOpacity onPress={saveProfile} disabled={savingProfile} className="w-full h-12 rounded-lg bg-accent-primary items-center justify-center">
            {savingProfile ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Profili Güncelle</Text>}
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-border-default">
          <Text className="text-lg font-bold text-text-primary mb-2">Öğrenci Yönetimi</Text>
          <Text className="text-sm text-text-muted mb-4">Bu öğrenci için yeni antrenman veya beslenme planı oluşturun.</Text>
          <TouchableOpacity onPress={() => router.push(`/coach/student/create-program?studentId=${studentId}`)} className="w-full h-12 rounded-lg bg-accent-green items-center justify-center mb-3">
            <Text className="text-white font-semibold">Antrenman Programı Ekle</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/coach/student/create-diet?studentId=${studentId}`)} className="w-full h-12 rounded-lg bg-accent-orange items-center justify-center">
            <Text className="text-white font-semibold">Diyet Planı Ekle</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={genderModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="w-full bg-white rounded-2xl overflow-hidden">
            <View className="p-5 border-b border-border-default">
              <Text className="text-lg font-bold text-text-primary text-center">Cinsiyet Seçin</Text>
            </View>
            <TouchableOpacity onPress={() => { setGender('male'); setGenderModalVisible(false); }} className="p-4 border-b border-border-default">
              <Text className="text-base text-text-primary text-center">Erkek</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setGender('female'); setGenderModalVisible(false); }} className="p-4 border-b border-border-default">
              <Text className="text-base text-text-primary text-center">Kadın</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setGenderModalVisible(false)} className="p-4 bg-bg-secondary">
              <Text className="text-base text-accent-red text-center font-bold">İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}
