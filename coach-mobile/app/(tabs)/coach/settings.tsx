import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../../api/axios';
import { useAuthStore } from '../../../stores/useAuthStore';

export default function CoachSettings() {
  const { user, logout } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async () => {
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
      await api.post('/user/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
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

  const handleLogout = async () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Çıkış Yap", 
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-bg-primary">
      <View className="p-6">
        <Text className="text-2xl font-bold text-text-primary mb-6">Ayarlar</Text>

        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-border-default items-center">
           <View className="w-20 h-20 rounded-full bg-accent-primary flex items-center justify-center mb-4">
              <Text className="text-white text-3xl font-bold">{user?.name?.charAt(0) || 'U'}</Text>
           </View>
           <Text className="text-xl font-bold text-text-primary">{user?.name}</Text>
           <Text className="text-text-muted mt-1">{user?.email}</Text>
           <View className="mt-3 bg-accent-primary/10 px-3 py-1 rounded-full">
             <Text className="text-accent-primary font-bold text-xs uppercase">{user?.role === 'coach' ? 'Eğitmen' : user?.role}</Text>
           </View>
        </View>

          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-border-default">
            <Text className="text-lg font-bold text-text-primary mb-4">Şifre Değiştir</Text>

            <View className="mb-4">
              <Text className="text-sm font-medium text-text-secondary mb-1.5">Mevcut Şifre</Text>
              <TextInput
                className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base"
                placeholder="Mevcut şifreniz"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-text-secondary mb-1.5">Yeni Şifre</Text>
              <TextInput
                className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base"
                placeholder="En az 12 karakter"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-text-secondary mb-1.5">Yeni Şifre Tekrar</Text>
              <TextInput
                className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary text-base"
                placeholder="Yeni şifreyi tekrar girin"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity onPress={handleChangePassword} disabled={savingPassword} className="w-full h-12 rounded-lg bg-accent-primary items-center justify-center mb-2">
              {savingPassword ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Şifreyi Güncelle</Text>}
            </TouchableOpacity>
          </View>

        <View className="bg-white rounded-2xl shadow-sm border border-border-default overflow-hidden mb-6">
          <TouchableOpacity className="p-4 border-b border-border-default flex-row justify-between items-center">
             <Text className="text-base font-semibold text-text-primary">Profil Bilgilerini Düzenle</Text>
             <Text className="text-text-muted">{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity className="p-4 border-b border-border-default flex-row justify-between items-center">
             <Text className="text-base font-semibold text-text-primary">Bildirim Ayarları</Text>
             <Text className="text-text-muted">{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity className="p-4 flex-row justify-between items-center">
             <Text className="text-base font-semibold text-text-primary">Şifre Değiştir</Text>
             <Text className="text-text-muted">{'>'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={handleLogout}
          className="w-full h-14 rounded-xl bg-white border border-accent-red items-center justify-center shadow-sm"
        >
           <Text className="text-accent-red text-base font-bold">Çıkış Yap</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}
