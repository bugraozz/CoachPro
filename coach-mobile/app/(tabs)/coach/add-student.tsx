import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../../api/axios';

export default function AddStudentScreen() {
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [healthNotes, setHealthNotes] = useState('');

  const [genderModalVisible, setGenderModalVisible] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Ad Soyad alanı zorunludur.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/students', {
        name,
        email,
        phone,
        gender,
        age,
        height,
        currentWeight,
        targetWeight,
        healthNotes,
      });
      Alert.alert('Başarılı', 'Öğrenci başarıyla eklendi.');
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Hata', error.response?.data?.error || 'Öğrenci eklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{ padding: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Text style={{ color: '#CD0000', fontWeight: '600' }}>İptal</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0f172a' }}>Yeni Öğrenci</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        
        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 }}>Kişisel Bilgiler</Text>
          
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Ad Soyad *</Text>
          <TextInput
            style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a', marginBottom: 16 }}
            placeholder="Ad Soyad"
            value={name}
            onChangeText={setName}
          />

          <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>E-posta</Text>
          <TextInput
            style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a', marginBottom: 16 }}
            placeholder="ornek@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Telefon</Text>
          <TextInput
            style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a', marginBottom: 16 }}
            placeholder="Telefon numarası"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Cinsiyet</Text>
          <TouchableOpacity 
            onPress={() => setGenderModalVisible(true)}
            style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', marginBottom: 16 }}
          >
            <Text style={{ color: gender ? '#0f172a' : '#94a3b8' }}>{gender === 'male' ? 'Erkek' : gender === 'female' ? 'Kadın' : 'Cinsiyet Seçin'}</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Yaş</Text>
          <TextInput
            style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a', marginBottom: 16 }}
            placeholder="Yaş"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
          />
        </View>

        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 }}>Fiziksel Bilgiler</Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ width: '48%' }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Boy (cm)</Text>
              <TextInput
                style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                placeholder="Örn: 175"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: '48%' }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Kilo (kg)</Text>
              <TextInput
                style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a' }}
                placeholder="Örn: 70"
                value={currentWeight}
                onChangeText={setCurrentWeight}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Hedef Kilo (kg)</Text>
          <TextInput
            style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a', marginBottom: 16 }}
            placeholder="Örn: 65"
            value={targetWeight}
            onChangeText={setTargetWeight}
            keyboardType="numeric"
          />

          <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 6 }}>Sağlık Notları</Text>
          <TextInput
            style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#0f172a', minHeight: 80 }}
            placeholder="Önemli sağlık notları (Alerji, sakatlık vb.)"
            value={healthNotes}
            onChangeText={setHealthNotes}
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity 
          onPress={handleSave} 
          disabled={loading}
          style={{ width: '100%', height: 48, borderRadius: 8, backgroundColor: '#CD0000', alignItems: 'center', justifyContent: 'center' }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Öğrenciyi Kaydet</Text>}
        </TouchableOpacity>

      </ScrollView>

      {/* Gender Picker Modal */}
      <Modal visible={genderModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ width: '100%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' }}>Cinsiyet Seçin</Text>
            </View>
            <TouchableOpacity onPress={() => { setGender('male'); setGenderModalVisible(false); }} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
              <Text style={{ fontSize: 16, color: '#0f172a', textAlign: 'center' }}>Erkek</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setGender('female'); setGenderModalVisible(false); }} style={{ padding: 16 }}>
              <Text style={{ fontSize: 16, color: '#0f172a', textAlign: 'center' }}>Kadın</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setGenderModalVisible(false)} style={{ padding: 16, backgroundColor: '#f1f5f9' }}>
              <Text style={{ fontSize: 16, color: '#ef4444', textAlign: 'center', fontWeight: 'bold' }}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
