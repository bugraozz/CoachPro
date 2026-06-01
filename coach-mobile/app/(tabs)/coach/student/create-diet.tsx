import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../../../api/axios';

interface Food {
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  name: string;
  foods: Food[];
}

export default function CreateDietScreen() {
  const params = useLocalSearchParams<{ studentId: string }>();
  const studentId = params.studentId;

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState('');
  const [proteinTarget, setProteinTarget] = useState('');
  const [carbsTarget, setCarbsTarget] = useState('');
  const [fatTarget, setFatTarget] = useState('');
  const [waterTarget, setWaterTarget] = useState('3000');

  const [meals, setMeals] = useState<Meal[]>([
    {
      name: 'Kahvaltı',
      foods: [
        { name: '', amount: 100, unit: 'g', calories: 0, protein: 0, carbs: 0, fat: 0 }
      ]
    }
  ]);

  const addMeal = () => {
    setMeals([...meals, { name: `${meals.length + 1}. Öğün`, foods: [] }]);
  };

  const removeMeal = (mealIndex: number) => {
    setMeals(meals.filter((_, idx) => idx !== mealIndex));
  };

  const addFood = (mealIndex: number) => {
    const newMeals = [...meals];
    newMeals[mealIndex].foods.push({
      name: '', amount: 100, unit: 'g', calories: 0, protein: 0, carbs: 0, fat: 0
    });
    setMeals(newMeals);
  };

  const removeFood = (mealIndex: number, foodIndex: number) => {
    const newMeals = [...meals];
    newMeals[mealIndex].foods = newMeals[mealIndex].foods.filter((_, idx) => idx !== foodIndex);
    setMeals(newMeals);
  };

  const updateFood = (mealIndex: number, foodIndex: number, field: keyof Food, value: any) => {
    const newMeals = [...meals];
    newMeals[mealIndex].foods[foodIndex] = {
      ...newMeals[mealIndex].foods[foodIndex],
      [field]: value
    };
    setMeals(newMeals);
  };

  const updateMealName = (mealIndex: number, newName: string) => {
    const newMeals = [...meals];
    newMeals[mealIndex].name = newName;
    setMeals(newMeals);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Diyet adı zorunludur.');
      return;
    }

    for (const meal of meals) {
      if (!meal.name.trim()) {
        Alert.alert('Hata', 'Tüm öğünlerin adı olmalıdır.');
        return;
      }
      for (const food of meal.foods) {
        if (!food.name.trim()) {
          Alert.alert('Hata', 'Tüm besinlerin adı olmalıdır.');
          return;
        }
      }
    }

    setLoading(true);
    try {
      await api.post('/diet', {
        studentId,
        name,
        dailyCalorieTarget: Number(dailyCalorieTarget || 0),
        proteinTarget: Number(proteinTarget || 0),
        carbsTarget: Number(carbsTarget || 0),
        fatTarget: Number(fatTarget || 0),
        waterTarget: Number(waterTarget || 3000),
        meals
      });
      Alert.alert('Başarılı', 'Diyet planı oluşturuldu.');
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Hata', error.response?.data?.error || 'Diyet oluşturulamadı.');
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
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>Yeni Diyet Planı</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        
        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 }}>Diyet Hedefleri</Text>
          
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Diyet Adı *</Text>
          <TextInput
            style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a', marginBottom: 16 }}
            placeholder="Örn: 2000 Kalori Definasyon"
            value={name}
            onChangeText={setName}
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <View style={{ width: '48%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Kalori (kcal)</Text>
              <TextInput
                style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                placeholder="2000"
                value={dailyCalorieTarget}
                onChangeText={setDailyCalorieTarget}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: '48%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Su (ml)</Text>
              <TextInput
                style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                placeholder="3000"
                value={waterTarget}
                onChangeText={setWaterTarget}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: '31%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Protein (g)</Text>
              <TextInput
                style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                placeholder="150"
                value={proteinTarget}
                onChangeText={setProteinTarget}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: '31%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Karb. (g)</Text>
              <TextInput
                style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                placeholder="200"
                value={carbsTarget}
                onChangeText={setCarbsTarget}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: '31%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Yağ (g)</Text>
              <TextInput
                style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                placeholder="70"
                value={fatTarget}
                onChangeText={setFatTarget}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {meals.map((meal, mIdx) => (
          <View key={mIdx} style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <TextInput
                style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: '#0f172a', paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginRight: 12 }}
                value={meal.name}
                onChangeText={(val) => updateMealName(mIdx, val)}
                placeholder="Öğün Adı"
              />
              <TouchableOpacity onPress={() => removeMeal(mIdx)} style={{ padding: 8, backgroundColor: '#fee2e2', borderRadius: 8 }}>
                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Öğünü Sil</Text>
              </TouchableOpacity>
            </View>

            {meal.foods.map((food, fIdx) => (
              <View key={fIdx} style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontWeight: '600', color: '#0f172a' }}>{fIdx + 1}. Besin</Text>
                  <TouchableOpacity onPress={() => removeFood(mIdx, fIdx)}>
                    <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12 }}>Kaldır</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a', marginBottom: 8 }}
                  placeholder="Besin Adı (Örn: Tavuk Göğsü)"
                  value={food.name}
                  onChangeText={(val) => updateFood(mIdx, fIdx, 'name', val)}
                />

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ flex: 1, minWidth: '45%' }}>
                    <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Miktar</Text>
                    <TextInput
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                      value={String(food.amount)}
                      onChangeText={(val) => updateFood(mIdx, fIdx, 'amount', Number(val))}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: '45%' }}>
                    <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Birim</Text>
                    <TextInput
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                      placeholder="g, porsiyon vb."
                      value={food.unit}
                      onChangeText={(val) => updateFood(mIdx, fIdx, 'unit', val)}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: '22%' }}>
                    <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Kalori</Text>
                    <TextInput
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                      value={String(food.calories)}
                      onChangeText={(val) => updateFood(mIdx, fIdx, 'calories', Number(val))}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: '22%' }}>
                    <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Pro (g)</Text>
                    <TextInput
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                      value={String(food.protein)}
                      onChangeText={(val) => updateFood(mIdx, fIdx, 'protein', Number(val))}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: '22%' }}>
                    <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Karb (g)</Text>
                    <TextInput
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                      value={String(food.carbs)}
                      onChangeText={(val) => updateFood(mIdx, fIdx, 'carbs', Number(val))}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: '22%' }}>
                    <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Yağ (g)</Text>
                    <TextInput
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                      value={String(food.fat)}
                      onChangeText={(val) => updateFood(mIdx, fIdx, 'fat', Number(val))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

              </View>
            ))}

            <TouchableOpacity onPress={() => addFood(mIdx)} style={{ width: '100%', paddingVertical: 12, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: '#0f172a', fontWeight: '600' }}>+ Besin Ekle</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity onPress={addMeal} style={{ width: '100%', paddingVertical: 14, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed' }}>
          <Text style={{ color: '#334155', fontWeight: 'bold', fontSize: 16 }}>+ Yeni Öğün Ekle</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleSave} 
          disabled={loading}
          style={{ width: '100%', height: 52, borderRadius: 12, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', shadowColor: '#f97316', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Diyeti Kaydet</Text>}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
