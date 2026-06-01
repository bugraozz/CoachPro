import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../../api/axios';
import { useAuthStore } from '../../../stores/useAuthStore';

export default function StudentMessages() {
  const { user } = useAuthStore();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/messages');
      setContacts(res.data.contacts || []);
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
        <Text className="text-2xl font-bold text-text-primary mb-2">Mesajlar</Text>
        <Text className="text-text-secondary mb-6">Eğitmeninle buradan sohbet edebilirsin.</Text>

        {contacts.length > 0 ? (
          contacts.map((contact) => (
            <TouchableOpacity key={contact.id} onPress={() => router.push(`/chat/${contact.id}`)} className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-border-default flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-accent-orange/10 items-center justify-center mr-4">
                <Text className="text-accent-orange font-bold text-lg">{contact.name.charAt(0)}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-lg text-text-primary">{contact.name}</Text>
                <Text className="text-sm text-text-muted mt-1">Sohbeti açmak için dokunun</Text>
              </View>
              <Text className="text-accent-primary font-bold text-xs">Aç →</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View className="items-center py-10">
            <Text className="text-text-muted text-base">Henüz mesajlaşacak kimse yok.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
