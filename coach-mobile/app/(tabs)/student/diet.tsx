import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { api } from '../../../api/axios';

export default function StudentDiet() {
  const [dietPlans, setDietPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDietPlans();
  }, []);

  const fetchDietPlans = async () => {
    try {
      const res = await api.get('/diet');
      setDietPlans(res.data.dietPlans);
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
        <Text className="text-2xl font-bold text-text-primary mb-6">Diyet Planım</Text>

        {dietPlans.length > 0 ? (
          dietPlans.map((plan) => (
            <View key={plan.id} className={`bg-white rounded-2xl p-5 mb-5 shadow-sm border ${plan.active ? 'border-accent-orange' : 'border-border-default'}`}>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-text-primary">{plan.name}</Text>
                <View className={`px-3 py-1 rounded-full ${plan.active ? 'bg-accent-orange/10' : 'bg-bg-tertiary'}`}>
                  <Text className={`text-xs font-bold ${plan.active ? 'text-accent-orange' : 'text-text-muted'}`}>
                    {plan.active ? 'Aktif' : 'Pasif'}
                  </Text>
                </View>
              </View>

              <View className="flex-row flex-wrap gap-2 mb-6">
                <View className="bg-accent-green/10 px-3 py-1.5 rounded-full"><Text className="text-accent-green text-xs font-bold">{plan.dailyCalorieTarget} kcal</Text></View>
                <View className="bg-accent-cyan/10 px-3 py-1.5 rounded-full"><Text className="text-accent-cyan text-xs font-bold">{plan.proteinTarget}g Protein</Text></View>
                <View className="bg-accent-yellow/10 px-3 py-1.5 rounded-full"><Text className="text-accent-yellow text-xs font-bold">{plan.carbsTarget}g Karb</Text></View>
                <View className="bg-accent-primary/10 px-3 py-1.5 rounded-full"><Text className="text-accent-primary text-xs font-bold">{plan.fatTarget}g Yağ</Text></View>
              </View>

              {plan.meals?.map((meal: any) => (
                <View key={meal.id} className="mb-4">
                  <Text className="font-bold text-text-secondary mb-2">{meal.name}</Text>
                  {meal.foods?.map((food: any) => (
                    <View key={food.id} className="bg-bg-primary rounded-lg p-3 mb-2 flex-row justify-between items-center border border-border-default">
                      <View>
                        <Text className="font-medium text-text-primary">{food.name}</Text>
                        <Text className="text-xs text-text-muted mt-0.5">{food.amount} {food.unit}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-semibold text-text-primary">{food.calories} kcal</Text>
                        <Text className="text-xs text-text-muted">{food.protein}P • {food.carbs}K • {food.fat}Y</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))
        ) : (
          <View className="items-center py-10">
            <Text className="text-text-muted text-base">Henüz atanmış bir diyetiniz yok.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
