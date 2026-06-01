import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { api } from '../../api/axios';
import { useAuthStore } from '../../stores/useAuthStore';

export default function ChatScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const otherUserId = useMemo(() => String(params.userId || ''), [params.userId]);
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (otherUserId) fetchMessages();
  }, [otherUserId]);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${otherUserId}`);
      setMessages(res.data.messages || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      setSending(true);
      await api.post(`/messages/${otherUserId}`, { content: trimmed });
      setContent('');
      await fetchMessages();
    } catch (error: any) {
      console.error(error);
    } finally {
      setSending(false);
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-bg-primary">
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-accent-primary font-semibold">Geri</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Sohbet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 12 }}>
        {messages.length > 0 ? (
          messages.map((message) => {
            const isMine = message.senderId === user?.id;
            return (
              <View key={message.id} className={`mb-3 flex-row ${isMine ? 'justify-end' : 'justify-start'}`}>
                <View className={`max-w-[80%] rounded-2xl px-4 py-3 ${isMine ? 'bg-accent-primary' : 'bg-white border border-border-default'}`}>
                  <Text className={isMine ? 'text-white' : 'text-text-primary'}>{message.content}</Text>
                  <Text className={`text-[10px] mt-2 ${isMine ? 'text-red-100' : 'text-text-muted'}`}>
                    {new Date(message.createdAt).toLocaleString('tr-TR')}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View className="items-center py-10">
            <Text className="text-text-muted">Henüz mesaj yok.</Text>
          </View>
        )}
      </ScrollView>

      <View className="p-4 bg-white border-t border-border-default flex-row gap-3">
        <TextInput
          className="flex-1 px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary"
          placeholder="Mesaj yazın..."
          placeholderTextColor="#64748b"
          value={content}
          onChangeText={setContent}
          multiline
        />
        <TouchableOpacity onPress={handleSend} disabled={sending} className="px-5 rounded-xl bg-accent-primary items-center justify-center">
          <Text className="text-white font-semibold">{sending ? '...' : 'Gönder'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
