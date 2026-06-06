import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../api/axios';

export default function AdminUsersScreen() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setStudents(res.data.students || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId: string, currentState: boolean) => {
    Alert.alert(
      currentState ? 'Kullanıcıyı Banla' : 'Kullanıcıyı Aktifleştir',
      'Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          style: currentState ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.post('/admin/users', { action: 'toggle_user_active', userId, nextState: !currentState });
              fetchUsers();
            } catch (error: any) {
              Alert.alert('Hata', error.response?.data?.error || 'İşlem başarısız');
            }
          }
        }
      ]
    );
  };

  const handleGiftMembership = async (userId: string) => {
    Alert.alert(
      'Üyelik Hediye Et',
      'Kullanıcıya 30 günlük ücretsiz üyelik tanımlamak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Hediye Et',
          onPress: async () => {
            try {
              await api.post('/admin/users', { action: 'gift_student_membership', userId, days: 30 });
              Alert.alert('Başarılı', 'Üyelik hediye edildi.');
              fetchUsers();
            } catch (error: any) {
              Alert.alert('Hata', error.response?.data?.error || 'İşlem başarısız');
            }
          }
        }
      ]
    );
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
      <View className="p-4">
        {students.map((student) => (
          <View key={student.id} className="bg-white rounded-2xl p-4 mb-4 border border-border-default shadow-sm">
            <View className="flex-row justify-between items-start mb-2">
              <View>
                <Text className="text-lg font-bold text-text-primary">{student.name}</Text>
                <Text className="text-sm text-text-secondary">{student.email}</Text>
                <Text className="text-xs text-text-muted mt-1">
                  Kayıt: {new Date(student.createdAt).toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <View className={`px-2 py-1 rounded-full ${student.active ? 'bg-green-100' : 'bg-red-100'}`}>
                <Text className={`text-xs font-bold ${student.active ? 'text-green-700' : 'text-red-700'}`}>
                  {student.active ? 'Aktif' : 'Banlı'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mb-4">
              <Text className="text-sm text-text-secondary mr-2">Eğitmen:</Text>
              <Text className="text-sm font-semibold text-text-primary">{student.coach?.name || '-'}</Text>
            </View>

            <View className="flex-row flex-wrap gap-2 pt-3 border-t border-border-default">
              <TouchableOpacity onPress={() => handleToggleActive(student.id, student.active)} className="px-3 py-2 bg-gray-100 rounded-lg">
                <Text className="text-sm font-semibold text-text-primary">{student.active ? 'Hesabı Dondur' : 'Hesabı Aç'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleGiftMembership(student.id)} className="px-3 py-2 bg-accent-primary rounded-lg">
                <Text className="text-sm font-semibold text-white">Süre Hediye Et (+30G)</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
