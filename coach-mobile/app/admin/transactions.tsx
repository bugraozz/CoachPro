import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { api } from '../../api/axios';

export default function AdminTransactionsScreen() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/admin/transactions');
      setTransactions(res.data.transactions || []);
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
      <View className="p-4">
        {transactions.length === 0 && (
          <View className="items-center justify-center py-10">
            <Text className="text-text-muted">İşlem bulunamadı.</Text>
          </View>
        )}
        {transactions.map((tx) => (
          <View key={tx.id} className="bg-white rounded-2xl p-4 mb-4 border border-border-default shadow-sm">
            <View className="flex-row justify-between items-start mb-2">
              <View>
                <Text className="text-lg font-bold text-text-primary">₺{tx.amount}</Text>
                <Text className="text-xs text-text-muted mt-1">ID: {tx.id.substring(0, 8)}...</Text>
                <Text className="text-xs text-text-muted">Tarih: {new Date(tx.createdAt).toLocaleString('tr-TR')}</Text>
              </View>
              <View className="px-2 py-1 rounded-full bg-green-100">
                <Text className="text-xs font-bold text-green-700">Ödendi</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
