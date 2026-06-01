import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { api } from '../../../api/axios';
import { useAuthStore } from '../../../stores/useAuthStore';

export default function StudentProfile() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [healthNotes, setHealthNotes] = useState('');
  const [genderModalVisible, setGenderModalVisible] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/dashboard');
      const profile = res.data?.user || {};
      setName(user?.name || '');
      setPhone(profile.phone || '');
      setGender(profile.gender || '');
      setAge(profile.age ? String(profile.age) : '');
      setHeight(profile.height ? String(profile.height) : '');
      setCurrentWeight(profile.currentWeight ? String(profile.currentWeight) : '');
      setTargetWeight(profile.targetWeight ? String(profile.targetWeight) : '');
      setHealthNotes(profile.healthNotes || '');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSavingProfile(true);
      await api.post('/user/update-profile', {
        name,
        phone,
        gender,
        age,
        height,
        currentWeight,
        targetWeight,
        healthNotes,
      });
      Alert.alert('Başarılı', 'Profil güncellendi.');
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.error || 'Profil güncellenemedi.');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (newPassword.length < 12) {
      Alert.alert('Hata', 'Yeni şifre en az 12 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor.');
      return;
    }

    try {
      setSavingPassword(true);
      await api.post('/user/change-password', { currentPassword, newPassword, confirmPassword });
      Alert.alert('Başarılı', 'Şifreniz güncellendi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.error || 'Şifre değiştirilemedi.');
    } finally {
      setSavingPassword(false);
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
        <Text className="text-2xl font-bold text-text-primary mb-2">Profilim</Text>
        <Text className="text-text-secondary mb-6">Kişisel bilgilerini ve şifreni buradan güncelle.</Text>

        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-border-default">
          <Text className="text-lg font-bold text-text-primary mb-4">Bilgiler</Text>
          <Text className="text-sm font-medium text-text-secondary mb-1.5">Ad Soyad</Text>
          <TextInput className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base mb-4" value={name} onChangeText={setName} />
          <Text className="text-sm font-medium text-text-secondary mb-1.5">Telefon</Text>
          <TextInput className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base mb-4" value={phone} onChangeText={setPhone} />
          <Text className="text-sm font-medium text-text-secondary mb-1.5">Cinsiyet</Text>
          <TouchableOpacity onPress={() => setGenderModalVisible(true)} className="w-full px-4 py-3 rounded-lg border border-border-default bg-white mb-4">
            <Text className={gender ? 'text-text-primary text-base' : 'text-[#64748b] text-base'}>
              {gender === 'male' ? 'Erkek' : gender === 'female' ? 'Kadın' : 'Cinsiyet Seçin'}
            </Text>
          </TouchableOpacity>
          <View className="flex-row gap-3 mb-4">
            <TextInput className="flex-1 px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary" placeholder="Yaş" keyboardType="numeric" value={age} onChangeText={setAge} />
            <TextInput className="flex-1 px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary" placeholder="Boy (cm)" keyboardType="numeric" value={height} onChangeText={setHeight} />
          </View>
          <View className="flex-row gap-3 mb-4">
            <TextInput className="flex-1 px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary" placeholder="Mevcut kilo" keyboardType="numeric" value={currentWeight} onChangeText={setCurrentWeight} />
            <TextInput className="flex-1 px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary" placeholder="Hedef kilo" keyboardType="numeric" value={targetWeight} onChangeText={setTargetWeight} />
          </View>
          <Text className="text-sm font-medium text-text-secondary mb-1.5">Sağlık Notları</Text>
          <TextInput className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base mb-4" value={healthNotes} onChangeText={setHealthNotes} multiline />
          <TouchableOpacity onPress={saveProfile} disabled={savingProfile} className="w-full h-12 rounded-lg bg-accent-primary items-center justify-center">
            {savingProfile ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Profili Güncelle</Text>}
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm border border-border-default">
          <Text className="text-lg font-bold text-text-primary mb-4">Şifre Değiştir</Text>
          <Text className="text-sm font-medium text-text-secondary mb-1.5">Mevcut Şifre</Text>
          <TextInput className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base mb-4" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
          <Text className="text-sm font-medium text-text-secondary mb-1.5">Yeni Şifre</Text>
          <TextInput className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base mb-4" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
          <Text className="text-sm font-medium text-text-secondary mb-1.5">Yeni Şifre Tekrar</Text>
          <TextInput className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base mb-4" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
          <TouchableOpacity onPress={changePassword} disabled={savingPassword} className="w-full h-12 rounded-lg bg-accent-orange items-center justify-center">
            {savingPassword ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Şifreyi Güncelle</Text>}
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
